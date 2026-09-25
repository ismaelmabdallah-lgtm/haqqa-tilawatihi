import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PageProps = {
  params: Promise<{
    levelId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type Resource = {
  id: number;
  level_id: number;
  title: string;
  type: string;
  url: string | null;
  storage_path: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
};

function getResourceTypeLabel(type: string) {
  switch (type) {
    case "curriculum":
      return "المنهج الدراسي";

    case "summary":
      return "الملخص";

    case "video":
      return "شرح / فيديو";

    case "link":
      return "رابط خارجي";

    case "exam":
      return "اختبار جاهز";

    case "pdf":
      return "PDF";

    case "file":
      return "ملف";

    default:
      return type;
  }
}

function getResourceTypeIcon(type: string) {
  switch (type) {
    case "curriculum":
      return "📘";

    case "summary":
      return "📝";

    case "video":
      return "🎥";

    case "link":
      return "🔗";

    case "exam":
      return "📄";

    case "pdf":
      return "📕";

    case "file":
      return "📎";

    default:
      return "📁";
  }
}

function getResourceTypeBadgeClass(type: string) {
  switch (type) {
    case "curriculum":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "summary":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "video":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "link":
      return "bg-sky-50 text-sky-700 border-sky-200";

    case "exam":
      return "bg-amber-50 text-amber-700 border-amber-200";

    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

async function verifyAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminUser, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !adminUser) {
    redirect("/admin");
  }

  return user;
}

async function toggleResourceAction(formData: FormData) {
  "use server";

  await verifyAdmin();

  const resourceId = Number(formData.get("resourceId"));
  const currentActive =
    formData.get("currentActive") === "true";

  if (!Number.isInteger(resourceId)) {
    redirect("/admin/resources");
  }

  const { data: resource } = await supabaseAdmin
    .from("resources")
    .select("id, level_id")
    .eq("id", resourceId)
    .maybeSingle();

  if (!resource) {
    redirect("/admin/resources");
  }

  const { error } = await supabaseAdmin
    .from("resources")
    .update({
      is_active: !currentActive,
    })
    .eq("id", resourceId);

  if (error) {
    redirect(
      `/admin/resources/${resource.level_id}?error=${encodeURIComponent(
        "تعذر تغيير حالة المادة."
      )}`
    );
  }

  redirect(`/admin/resources/${resource.level_id}`);
}

async function moveResourceAction(formData: FormData) {
  "use server";

  await verifyAdmin();

  const resourceId = Number(formData.get("resourceId"));
  const direction = String(formData.get("direction") || "");

  if (
    !Number.isInteger(resourceId) ||
    !["up", "down"].includes(direction)
  ) {
    redirect("/admin/resources");
  }

  const { data: currentResource } = await supabaseAdmin
    .from("resources")
    .select("id, level_id")
    .eq("id", resourceId)
    .maybeSingle();

  if (!currentResource) {
    redirect("/admin/resources");
  }

  const { data: resources, error: resourcesError } =
    await supabaseAdmin
      .from("resources")
      .select("id, order")
      .eq("level_id", currentResource.level_id)
      .order("order", {
        ascending: true,
      })
      .order("id", {
        ascending: true,
      });

  if (
    resourcesError ||
    !resources ||
    resources.length <= 1
  ) {
    redirect(`/admin/resources/${currentResource.level_id}`);
  }

  const currentIndex = resources.findIndex(
    (resource) => resource.id === resourceId
  );

  if (currentIndex === -1) {
    redirect(`/admin/resources/${currentResource.level_id}`);
  }

  const targetIndex =
    direction === "up"
      ? currentIndex - 1
      : currentIndex + 1;

  if (
    targetIndex < 0 ||
    targetIndex >= resources.length
  ) {
    redirect(`/admin/resources/${currentResource.level_id}`);
  }

  /*
   * نعيد بناء الترتيب بالكامل أولًا.
   * هذا مهم لأن بعض المواد القديمة قد تكون جميعها
   * تحمل order = 0.
   */
  const reordered = [...resources];

  const [movedItem] = reordered.splice(
    currentIndex,
    1
  );

  reordered.splice(
    targetIndex,
    0,
    movedItem
  );

  /*
   * نضع قيمًا سالبة مؤقتة حتى لا تتعارض
   * القيم القديمة أثناء إعادة الترتيب.
   */
  for (let index = 0; index < reordered.length; index++) {
    const resource = reordered[index];

    const { error } = await supabaseAdmin
      .from("resources")
      .update({
        order: -(index + 1),
      })
      .eq("id", resource.id);

    if (error) {
      redirect(
        `/admin/resources/${currentResource.level_id}?error=${encodeURIComponent(
          "تعذر تحديث ترتيب المواد."
        )}`
      );
    }
  }

  /*
   * بعد وضع القيم المؤقتة، نعطي كل مادة
   * ترتيبها النهائي.
   */
  for (let index = 0; index < reordered.length; index++) {
    const resource = reordered[index];

    const { error } = await supabaseAdmin
      .from("resources")
      .update({
        order: index + 1,
      })
      .eq("id", resource.id);

    if (error) {
      redirect(
        `/admin/resources/${currentResource.level_id}?error=${encodeURIComponent(
          "تعذر حفظ الترتيب النهائي."
        )}`
      );
    }
  }

  redirect(`/admin/resources/${currentResource.level_id}`);
}

async function deleteResourceAction(formData: FormData) {
  "use server";

  await verifyAdmin();

  const resourceId = Number(formData.get("resourceId"));

  if (!Number.isInteger(resourceId)) {
    redirect("/admin/resources");
  }

  const { data: resource } = await supabaseAdmin
    .from("resources")
    .select(
      "id, level_id, storage_path, title"
    )
    .eq("id", resourceId)
    .maybeSingle();

  if (!resource) {
    redirect("/admin/resources");
  }

  const { error: deleteError } = await supabaseAdmin
    .from("resources")
    .delete()
    .eq("id", resourceId);

  if (deleteError) {
    redirect(
      `/admin/resources/${resource.level_id}?error=${encodeURIComponent(
        `تعذر حذف المادة: ${deleteError.message}`
      )}`
    );
  }

  /*
   * إذا كانت المادة مرتبطة بملف في Storage،
   * نحذف الملف أيضًا.
   */
  if (resource.storage_path) {
    const { error: storageError } =
      await supabaseAdmin.storage
        .from("educational-files")
        .remove([
          resource.storage_path,
        ]);

    if (storageError) {
      console.error(
        "Storage cleanup failed:",
        storageError
      );
    }
  }

  redirect(`/admin/resources/${resource.level_id}`);
}

export default async function AdminResourcesLevelPage({
  params,
  searchParams,
}: PageProps) {
  const { levelId } = await params;
  const { error: errorMessage } =
    await searchParams;

  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId)) {
    notFound();
  }

  await verifyAdmin();

  const { data: level, error: levelError } =
    await supabaseAdmin
      .from("levels")
      .select(
        "id, title, description, order, is_active"
      )
      .eq("id", numericLevelId)
      .maybeSingle();

  if (levelError || !level) {
    notFound();
  }

  const {
    data: resources,
    error: resourcesError,
  } = await supabaseAdmin
    .from("resources")
    .select(
      "id, level_id, title, type, url, storage_path, order, is_active, created_at"
    )
    .eq("level_id", numericLevelId)
    .order("order", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  const resourceList: Resource[] =
    resources ?? [];

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
              ت
            </div>

            <div>
              <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
                إدارة المواد التعليمية
              </h1>

              <p className="text-xs text-[var(--muted)]">
                لوحة المشرف
              </p>
            </div>
          </div>

          <Link
            href="/admin"
            className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
          >
            لوحة المشرف
          </Link>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <Link
            href="/admin"
            className="transition hover:text-[var(--primary)]"
          >
            لوحة المشرف
          </Link>

          <span>←</span>

          <Link
            href="/admin/resources"
            className="transition hover:text-[var(--primary)]"
          >
            المواد التعليمية
          </Link>

          <span>←</span>

          <span className="text-[var(--foreground)]">
            {level.title}
          </span>
        </div>

        {/* Level Header */}
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-2xl">
                📘
              </div>

              <div>
                <div className="mb-1 text-sm font-medium text-[var(--primary)]">
                  المستوى {level.order}
                </div>

                <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
                  {level.title}
                </h2>

                {level.description && (
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                    {level.description}
                  </p>
                )}
              </div>
            </div>

            <Link
              href={`/admin/resources/${numericLevelId}/new`}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-dark)]"
            >
              <span>＋</span>
              إضافة مادة
            </Link>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
            <div className="font-bold">
              تنبيه
            </div>

            <div className="mt-1">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-[var(--foreground)]">
              {resourceList.length}
            </div>

            <div className="mt-1 text-sm text-[var(--muted)]">
              إجمالي المواد
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-[var(--primary)]">
              {
                resourceList.filter(
                  (resource) =>
                    resource.is_active
                ).length
              }
            </div>

            <div className="mt-1 text-sm text-[var(--muted)]">
              مواد منشورة
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
            <div className="text-2xl font-bold text-[var(--gold)]">
              {
                resourceList.filter(
                  (resource) =>
                    resource.type === "exam"
                ).length
              }
            </div>

            <div className="mt-1 text-sm text-[var(--muted)]">
              اختبارات جاهزة
            </div>
          </div>
        </div>

        {/* Resources */}
        <div className="mt-8">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              مواد المستوى
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              يمكنك ترتيب المواد وتعديلها أو تعطيلها أو حذفها.
            </p>
          </div>

          {resourcesError ? (
            <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="text-3xl">
                ⚠️
              </div>

              <h3 className="mt-4 font-bold text-red-700">
                تعذر تحميل المواد
              </h3>

              <p className="mt-2 text-sm text-[var(--muted)]">
                حدث خطأ أثناء جلب المواد من قاعدة البيانات.
              </p>
            </div>
          ) : resourceList.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-10 text-center shadow-sm">
              <div className="text-4xl">
                📚
              </div>

              <h3 className="mt-4 text-lg font-bold text-[var(--foreground)]">
                لا توجد مواد حتى الآن
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-[var(--muted)]">
                لم تتم إضافة أي مادة لهذا المستوى. يمكنك
                البدء بإضافة المنهج أو الملخص أو أي مصدر
                تعليمي آخر.
              </p>

              <Link
                href={`/admin/resources/${numericLevelId}/new`}
                className="mt-6 inline-flex rounded-2xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
              >
                ＋ إضافة أول مادة
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {resourceList.map(
                (resource, index) => (
                  <div
                    key={resource.id}
                    className={`rounded-3xl border bg-white p-5 shadow-sm transition ${
                      resource.is_active
                        ? "border-[var(--border)]"
                        : "border-dashed border-gray-300 opacity-75"
                    }`}
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      {/* Main info */}
                      <div className="flex min-w-0 items-start gap-4">
                        {/* Order */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </div>

                        {/* Icon */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--background)] text-xl">
                          {getResourceTypeIcon(
                            resource.type
                          )}
                        </div>

                        {/* Text */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="break-words text-base font-bold text-[var(--foreground)]">
                              {resource.title}
                            </h4>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getResourceTypeBadgeClass(
                                resource.type
                              )}`}
                            >
                              {getResourceTypeLabel(
                                resource.type
                              )}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
                            <span>
                              الترتيب:{" "}
                              {resource.order}
                            </span>

                            <span>•</span>

                            <span>
                              {resource.storage_path
                                ? "ملف مرفوع"
                                : resource.url
                                ? "رابط خارجي"
                                : "بدون مصدر"}
                            </span>

                            <span>•</span>

                            <span
                              className={
                                resource.is_active
                                  ? "font-medium text-emerald-600"
                                  : "font-medium text-gray-500"
                              }
                            >
                              {resource.is_active
                                ? "منشورة"
                                : "غير منشورة"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {/* Up */}
                        <form
                          action={
                            moveResourceAction
                          }
                        >
                          <input
                            type="hidden"
                            name="resourceId"
                            value={resource.id}
                          />

                          <input
                            type="hidden"
                            name="direction"
                            value="up"
                          />

                          <button
                            type="submit"
                            disabled={index === 0}
                            title="تحريك لأعلى"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↑
                          </button>
                        </form>

                        {/* Down */}
                        <form
                          action={
                            moveResourceAction
                          }
                        >
                          <input
                            type="hidden"
                            name="resourceId"
                            value={resource.id}
                          />

                          <input
                            type="hidden"
                            name="direction"
                            value="down"
                          />

                          <button
                            type="submit"
                            disabled={
                              index ===
                              resourceList.length -
                                1
                            }
                            title="تحريك لأسفل"
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ↓
                          </button>
                        </form>

                        {/* Preview */}
                        {(resource.url ||
                          resource.storage_path) && (
                          <a
                            href={
                              resource.url ??
                              "#"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
                          >
                            فتح
                          </a>
                        )}

                        {/* Edit */}
                        <Link
                          href={`/admin/resources/${numericLevelId}/edit/${resource.id}`}
                          className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--primary)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
                        >
                          تعديل
                        </Link>

                        {/* Toggle */}
                        <form
                          action={
                            toggleResourceAction
                          }
                        >
                          <input
                            type="hidden"
                            name="resourceId"
                            value={resource.id}
                          />

                          <input
                            type="hidden"
                            name="currentActive"
                            value={
                              resource.is_active
                                ? "true"
                                : "false"
                            }
                          />

                          <button
                            type="submit"
                            className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                              resource.is_active
                                ? "border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {resource.is_active
                              ? "تعطيل"
                              : "نشر"}
                          </button>
                        </form>

                        {/* Delete */}
                        <form
                          action={
                            deleteResourceAction
                          }
                        >
                          <input
                            type="hidden"
                            name="resourceId"
                            value={resource.id}
                          />

                          <button
                            type="submit"
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                          >
                            حذف
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}