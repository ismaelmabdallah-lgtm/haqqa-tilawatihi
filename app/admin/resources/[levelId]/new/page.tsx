import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{
    levelId: string;
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

export default async function NewResourcePage({
  params,
  searchParams,
}: PageProps) {
  const { levelId } = await params;
  const { error } = await searchParams;

  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId)) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) {
    redirect("/admin");
  }

  const { data: level, error: levelError } =
    await supabase
      .from("levels")
      .select("id, title, description, order")
      .eq("id", numericLevelId)
      .single();

  if (levelError || !level) {
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
                إضافة مادة تعليمية
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
            إضافة مادة
          </span>
        </div>

        {/* Intro */}
        <div className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-2xl">
              ➕
            </div>

            <div>
              <p className="text-sm font-medium text-[var(--primary)]">
                {level.title}
              </p>

              <h2 className="mt-1 text-xl font-bold text-[var(--foreground)] sm:text-2xl">
                إضافة مادة تعليمية جديدة
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                أضف المنهج أو الملخص أو الشرح أو الاختبار الجاهز
                الخاص بهذا المستوى.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
            <div className="font-bold">
              تعذر حفظ المادة
            </div>

            <div className="mt-1">
              {error}
            </div>
          </div>
        )}

        {/* Form */}
        <form
          action="/api/admin/resources"
          method="POST"
          encType="multipart/form-data"
          className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Hidden level */}
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
                placeholder="مثال: منهج أحكام التجويد - المستوى الأول"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />

              <p className="mt-2 text-xs text-[var(--muted)]">
                هذا الاسم سيظهر للطلاب في صفحة المستوى.
              </p>
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
                defaultValue="curriculum"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                {resourceTypes.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {resourceTypes.map((type) => (
                  <div
                    key={type.value}
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
                  >
                    <div className="text-sm font-bold text-[var(--foreground)]">
                      {type.label}
                    </div>

                    <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {type.description}
                    </div>
                  </div>
                ))}
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
                  اختياري عند رفع ملف
                </span>
              </label>

              <input
                id="url"
                name="url"
                type="url"
                placeholder="https://..."
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-left text-sm text-[var(--foreground)] outline-none transition placeholder:text-gray-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
                dir="ltr"
              />

              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                استخدم هذا الحقل إذا كانت المادة عبارة عن فيديو
                أو رابط خارجي. عند رفع ملف يمكنك تركه فارغًا.
              </p>
            </div>

            {/* File */}
            <div>
              <label
                htmlFor="file"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                رفع ملف
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
                  الملفات المدعومة: PDF، Word، PowerPoint، TXT.
                  الحد الأقصى لحجم الملف 20MB.
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
                defaultValue="0"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />

              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                الرقم الأصغر يظهر أولًا. يمكنك استخدام 1 للمنهج،
                2 للملخص، 3 للشرح، وهكذا.
              </p>
            </div>

            {/* Active */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="is_active"
                  value="true"
                  defaultChecked
                  className="mt-1 h-5 w-5 rounded border-gray-300 text-[var(--primary)] accent-[var(--primary)]"
                />

                <span>
                  <span className="block text-sm font-bold text-[var(--foreground)]">
                    نشر المادة مباشرة
                  </span>

                  <span className="mt-1 block text-xs leading-6 text-[var(--muted)]">
                    إذا كان الخيار مفعّلًا فستظهر المادة للطلاب
                    مباشرة. يمكنك تعطيلها لاحقًا من قائمة المواد.
                  </span>
                </span>
              </label>
            </div>

            {/* Information */}
            <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-light)] p-4">
              <div className="flex items-start gap-3">
                <div className="text-xl">💡</div>

                <div>
                  <h3 className="text-sm font-bold text-[var(--primary-dark)]">
                    ملاحظة
                  </h3>

                  <p className="mt-1 text-xs leading-6 text-[var(--primary-dark)]">
                    المنهج والملخص والاختبار الجاهز يمكن رفعها
                    كملفات. أما الشرح والفيديو فيمكن إضافة رابط
                    خارجي لهما.
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
                حفظ المادة
              </button>
            </div>
          </div>
        </form>
      </section>
    </main>
  );
}