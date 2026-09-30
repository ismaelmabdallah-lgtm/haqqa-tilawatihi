import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PageProps = {
  params: Promise<{
    levelId: string;
    resourceId: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

const resourceTypes = [
  {
    value: "curriculum",
    label: "المنهج الدراسي",
    description: "الملف الأساسي الكامل للمستوى.",
  },
  {
    value: "summary",
    label: "الملخص",
    description: "ملخص المادة الكامل للمستوى.",
  },
  {
    value: "video",
    label: "شرح / فيديو",
    description: "رابط فيديو أو شرح خارجي.",
  },
  {
    value: "link",
    label: "رابط خارجي",
    description: "رابط لمصدر أو صفحة تعليمية.",
  },
  {
    value: "exam",
    label: "اختبار جاهز",
    description: "ملف اختبار جاهز للعرض والتحميل للطالب.",
  },
];

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

async function updateResource(formData: FormData) {
  "use server";

  await verifyAdmin();

  const resourceId = Number(
    formData.get("resourceId")
  );

  const levelId = Number(
    formData.get("levelId")
  );

  const title = String(
    formData.get("title") || ""
  ).trim();

  const type = String(
    formData.get("type") || ""
  ).trim();

  const urlValue = String(
    formData.get("url") || ""
  ).trim();

  const orderValue = Number(
    formData.get("order") ?? "0"
  );

  const isActive =
    formData.get("is_active") === "true";

  if (
    !Number.isInteger(resourceId) ||
    !Number.isInteger(levelId)
  ) {
    redirect("/admin/resources");
  }

  if (!title) {
    redirect(
      `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
        "عنوان المادة مطلوب."
      )}`
    );
  }

  const allowedTypes = [
    "curriculum",
    "summary",
    "video",
    "link",
    "exam",
  ];

  if (!allowedTypes.includes(type)) {
    redirect(
      `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
        "نوع المادة غير صحيح."
      )}`
    );
  }

  if (
    !Number.isInteger(orderValue) ||
    orderValue < 0
  ) {
    redirect(
      `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
        "ترتيب المادة يجب أن يكون رقمًا صحيحًا موجبًا أو صفرًا."
      )}`
    );
  }

  /*
   * جلب المادة الحالية.
   */
  const {
    data: existingResource,
    error: existingError,
  } = await supabaseAdmin
    .from("resources")
    .select(
      "id, level_id, title, type, url, storage_path, order, is_active"
    )
    .eq("id", resourceId)
    .eq("level_id", levelId)
    .maybeSingle();

  if (
    existingError ||
    !existingResource
  ) {
    redirect(
      `/admin/resources/${levelId}?error=${encodeURIComponent(
        "المادة المطلوبة غير موجودة."
      )}`
    );
  }

  /*
   * إذا كان النوع فيديو أو رابط خارجي،
   * يجب أن يكون هناك رابط.
   */
  if (
    (type === "video" ||
      type === "link") &&
    !urlValue
  ) {
    redirect(
      `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
        "يجب إدخال الرابط الخارجي لهذا النوع من المواد."
      )}`
    );
  }

  let finalUrl: string | null =
    urlValue || null;

  let finalStoragePath =
    existingResource.storage_path;

  const file = formData.get("file");

  let newStoragePath: string | null = null;

  /*
   * إذا رفع المشرف ملفًا جديدًا،
   * نرفعه أولًا قبل تعديل قاعدة البيانات.
   */
  if (
    file instanceof File &&
    file.size > 0
  ) {
    const maxFileSize =
  50 * 1024 * 1024;

    if (file.size > maxFileSize) {
      redirect(
        `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
          "حجم الملف كبير جدًا. الحد الأقصى هو 50MB."
        )}`
      );
    }

    const allowedMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain",
    ];

    if (
      !allowedMimeTypes.includes(
        file.type
      )
    ) {
      redirect(
        `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
          "نوع الملف غير مدعوم. استخدم PDF أو Word أو PowerPoint أو TXT."
        )}`
      );
    }

    const extension =
      file.name
        .split(".")
        .pop()
        ?.toLowerCase()
        .replace(
          /[^a-z0-9]/g,
          ""
        ) || "file";

    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;

    newStoragePath =
      `${levelId}/${uniqueName}`;

    const fileBuffer =
      await file.arrayBuffer();

    const {
      error: uploadError,
    } = await supabaseAdmin.storage
      .from("educational-files")
      .upload(
        newStoragePath,
        fileBuffer,
        {
          contentType:
            file.type,
          upsert: false,
        }
      );

    if (uploadError) {
      redirect(
        `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
          `فشل رفع الملف: ${uploadError.message}`
        )}`
      );
    }

    /*
     * إنشاء رابط مؤقت للملف الجديد.
     */
    const {
      data: signedUrlData,
      error: signedUrlError,
    } =
      await supabaseAdmin.storage
        .from("educational-files")
        .createSignedUrl(
          newStoragePath,
          60 * 60 * 24 * 30
        );

    if (
      signedUrlError ||
      !signedUrlData?.signedUrl
    ) {
      await supabaseAdmin.storage
        .from("educational-files")
        .remove([
          newStoragePath,
        ]);

      redirect(
        `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
          `فشل إنشاء رابط الملف: ${
            signedUrlError?.message ||
            "تعذر إنشاء الرابط."
          }`
        )}`
      );
    }

    finalUrl =
      signedUrlData.signedUrl;

    finalStoragePath =
      newStoragePath;
  }

  /*
   * إذا أصبح النوع رابطًا خارجيًا أو فيديو
   * ولم نرفع ملفًا جديدًا، نحذف الملف القديم
   * من Storage لأن المادة لم تعد تعتمد عليه.
   */
  const shouldRemoveOldFile =
    Boolean(
      existingResource.storage_path &&
        (
          newStoragePath ||
          type === "video" ||
          type === "link"
        )
    );

  const oldStoragePath =
    existingResource.storage_path;

  /*
   * تحديث سجل المادة.
   */
  const {
    error: updateError,
  } = await supabaseAdmin
    .from("resources")
    .update({
      title,
      type,
      url: finalUrl,
      storage_path:
        finalStoragePath,
      order: orderValue,
      is_active: isActive,
    })
    .eq("id", resourceId)
    .eq("level_id", levelId);

  if (updateError) {
    /*
     * إذا رفعنا ملفًا جديدًا ثم فشل تحديث
     * قاعدة البيانات، نحذف الملف الجديد
     * حتى لا يبقى ملفًا يتيمًا.
     */
    if (newStoragePath) {
      await supabaseAdmin.storage
        .from("educational-files")
        .remove([
          newStoragePath,
        ]);
    }

    redirect(
      `/admin/resources/${levelId}/edit/${resourceId}?error=${encodeURIComponent(
        `فشل تحديث المادة: ${updateError.message}`
      )}`
    );
  }

  /*
   * بعد نجاح التحديث نحذف الملف القديم.
   */
  if (
    shouldRemoveOldFile &&
    oldStoragePath &&
    oldStoragePath !== finalStoragePath
  ) {
    const {
      error: removeOldFileError,
    } = await supabaseAdmin.storage
      .from("educational-files")
      .remove([
        oldStoragePath,
      ]);

    if (removeOldFileError) {
      console.error(
        "Failed to remove old resource file:",
        removeOldFileError
      );
    }
  }

  /*
   * إذا انتقلنا من ملف إلى رابط خارجي،
   * يجب أن يصبح storage_path فارغًا.
   */
  if (
    (type === "video" ||
      type === "link") &&
    !newStoragePath
  ) {
    await supabaseAdmin
      .from("resources")
      .update({
        storage_path: null,
      })
      .eq("id", resourceId)
      .eq("level_id", levelId);
  }

  redirect(
    `/admin/resources/${levelId}`
  );
}

export default async function EditResourcePage({
  params,
  searchParams,
}: PageProps) {
  const {
    levelId,
    resourceId,
  } = await params;

  const {
    error: errorMessage,
  } = await searchParams;

  const numericLevelId =
    Number(levelId);

  const numericResourceId =
    Number(resourceId);

  if (
    !Number.isInteger(
      numericLevelId
    ) ||
    !Number.isInteger(
      numericResourceId
    )
  ) {
    notFound();
  }

  await verifyAdmin();

  /*
   * جلب المستوى.
   */
  const {
    data: level,
    error: levelError,
  } = await supabaseAdmin
    .from("levels")
    .select(
      "id, title, description, order"
    )
    .eq("id", numericLevelId)
    .maybeSingle();

  if (levelError || !level) {
    notFound();
  }

  /*
   * جلب المادة.
   */
  const {
    data: resource,
    error: resourceError,
  } = await supabaseAdmin
    .from("resources")
    .select(
      "id, level_id, title, type, url, storage_path, order, is_active"
    )
    .eq("id", numericResourceId)
    .eq("level_id", numericLevelId)
    .maybeSingle();

  if (
    resourceError ||
    !resource
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white">
              ت
            </div>

            <div>
              <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
                تعديل مادة تعليمية
              </h1>

              <p className="text-xs text-[var(--muted)]">
                لوحة المشرف
              </p>
            </div>
          </div>

          <Link
            href={`/admin/resources/${numericLevelId}`}
            className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
          >
            العودة للمواد
          </Link>
        </div>
      </header>

      {/* Content */}
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
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

          <Link
            href={`/admin/resources/${numericLevelId}`}
            className="transition hover:text-[var(--primary)]"
          >
            {level.title}
          </Link>

          <span>←</span>

          <span className="text-[var(--foreground)]">
            تعديل المادة
          </span>
        </div>

        {/* Intro */}
        <div className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-2xl">
              ✏️
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--primary)]">
                {level.title}
              </p>

              <h2 className="mt-1 break-words text-xl font-bold text-[var(--foreground)] sm:text-2xl">
                تعديل: {resource.title}
              </h2>

              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                يمكنك تعديل بيانات المادة أو استبدال الملف أو
                تغيير ترتيبها وحالتها.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
            <div className="font-bold">
              تعذر تحديث المادة
            </div>

            <div className="mt-1">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Form */}
        <form
          action={updateResource}
          encType="multipart/form-data"
          className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8"
        >
          <input
            type="hidden"
            name="resourceId"
            value={numericResourceId}
          />

          <input
            type="hidden"
            name="levelId"
            value={numericLevelId}
          />

          <div className="space-y-7">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                عنوان المادة
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={resource.title}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            {/* Type */}
            <div>
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                نوع المادة
              </label>

              <select
                id="type"
                name="type"
                required
                defaultValue={
                  resource.type
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                {resourceTypes.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  )
                )}
              </select>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {resourceTypes.map(
                  (type) => (
                    <div
                      key={type.value}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                    >
                      <div className="text-sm font-bold text-[var(--foreground)]">
                        {type.label}
                      </div>

                      <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        {
                          type.description
                        }
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* URL */}
            <div>
              <label
                htmlFor="url"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                الرابط الخارجي
                <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                  اختياري عند استخدام ملف
                </span>
              </label>

              <input
                id="url"
                name="url"
                type="url"
                defaultValue={
                  resource.url ?? ""
                }
                placeholder="https://..."
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm text-[var(--foreground)] outline-none transition placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
                dir="ltr"
              />

              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                استخدم الرابط للشرح أو الفيديو أو أي مصدر
                خارجي. إذا أردت الاعتماد على ملف مرفوع، يمكنك
                ترك الحقل فارغًا.
              </p>
            </div>

            {/* Current file */}
            {resource.storage_path && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="text-xl">
                    📎
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-emerald-800">
                      يوجد ملف مرفوع حاليًا
                    </h3>

                    <p className="mt-1 break-all text-xs leading-6 text-emerald-700">
                      {resource.storage_path}
                    </p>

                    {resource.url && (
                      <a
                        href={
                          resource.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-sm font-bold text-emerald-800 underline"
                      >
                        فتح الملف الحالي
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Replace file */}
            <div>
              <label
                htmlFor="file"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                استبدال الملف
                <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                  اختياري
                </span>
              </label>

              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4">
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
                  className="block w-full text-sm text-[var(--foreground)] file:mr-0 file:rounded-xl file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2.5 file:font-bold file:text-white hover:file:bg-[var(--primary-dark)]"
                />

                <p className="mt-3 text-xs leading-6 text-[var(--muted)]">
                  إذا لم تختر ملفًا جديدًا فسيبقى الملف الحالي
                  كما هو. الملفات المدعومة: PDF، Word، PowerPoint،
                  TXT. الحد الأقصى 20MB.
                </p>
              </div>
            </div>

            {/* Order */}
            <div>
              <label
                htmlFor="order"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                ترتيب المادة
              </label>

              <input
                id="order"
                name="order"
                type="number"
                min="0"
                step="1"
                defaultValue={
                  resource.order
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />

              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                الرقم الأصغر يظهر أولًا.
              </p>
            </div>

            {/* Active */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked={
                    resource.is_active
                  }
                  className="mt-1 h-5 w-5 rounded border-gray-300 accent-[var(--primary)]"
                />

                <span>
                  <span className="block text-sm font-bold text-[var(--foreground)]">
                    نشر المادة
                  </span>

                  <span className="mt-1 block text-xs leading-6 text-[var(--muted)]">
                    عند تفعيل هذا الخيار ستظهر المادة للطلاب.
                    عند إلغاء التفعيل ستبقى محفوظة في لوحة
                    المشرف لكنها لن تظهر للطلاب.
                  </span>
                </span>
              </label>
            </div>

            {/* Warning */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">
                  ⚠️
                </div>

                <div>
                  <h3 className="text-sm font-bold text-amber-800">
                    تنبيه عند استبدال الملف
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-amber-700">
                    عند رفع ملف جديد سيتم استخدام الملف الجديد
                    وحذف الملف القديم من التخزين بعد نجاح عملية
                    التحديث.
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:justify-end">
              <Link
                href={`/admin/resources/${numericLevelId}`}
                className="rounded-2xl border border-[var(--border)] bg-white px-6 py-3 text-center text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--background)]"
              >
                إلغاء
              </Link>

              <button
                type="submit"
                className="rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--primary-dark)]"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}