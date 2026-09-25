import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AdminResourcesPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: levels, error } = await supabase
    .from("levels")
    .select("id, title, description, order")
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="text-3xl">⚠️</div>

          <h1 className="mt-4 text-lg font-bold text-[var(--foreground)]">
            حدث خطأ أثناء تحميل المستويات
          </h1>

          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            تعذر تحميل المستويات من قاعدة البيانات.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg text-white">
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

          <a
            href="/admin"
            className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
          >
            لوحة المشرف
          </a>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-8 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
          <a
            href="/admin"
            className="transition hover:text-[var(--primary)]"
          >
            لوحة المشرف
          </a>

          <span>←</span>

          <span className="text-[var(--foreground)]">
            المواد التعليمية
          </span>
        </div>

        {/* Intro */}
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-2xl">
              📘
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)] sm:text-2xl">
                المواد التعليمية
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                اختر المستوى الذي تريد إدارة مادته التعليمية وملخصه
                وشروحاته.
              </p>
            </div>
          </div>
        </div>

        {/* Levels */}
        <div className="mt-8">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              اختر المستوى
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              ستتمكن لاحقًا من إضافة المادة والملخص والروابط لكل مستوى.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {levels?.map((level) => (
              <a
                key={level.id}
                href={`/admin/resources/${level.id}`}
                className="group rounded-2xl border border-[var(--border)] bg-white p-5 text-right shadow-sm transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]">
                    {String(level.order).padStart(2, "0")}
                  </div>

                  <span className="text-lg text-[var(--muted)] transition group-hover:translate-x-[-3px] group-hover:text-[var(--primary)]">
                    ←
                  </span>
                </div>

                <h4 className="mt-5 font-bold text-[var(--foreground)]">
                  {level.title}
                </h4>

                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  {level.description}
                </p>

                <div className="mt-5 text-sm font-medium text-[var(--primary)]">
                  إدارة المواد ←
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}