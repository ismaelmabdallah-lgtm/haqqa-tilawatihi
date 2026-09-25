import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export default async function AdminQuestionsPage() {
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

  const { data: levels, error } = await supabaseAdmin
    .from("levels")
    .select("id, title, description, order, is_active")
    .order("order", { ascending: true });

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-red-200 bg-white p-6 text-center">
            <div className="text-3xl">⚠️</div>

            <h1 className="mt-3 text-lg font-bold">
              حدث خطأ أثناء تحميل المستويات
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              {error.message}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const activeLevels =
    levels?.filter((level) => level.is_active) ?? [];

  return (
    <main
      className="min-h-screen bg-[var(--background)]"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-bold text-[var(--primary)] hover:text-[var(--primary-dark)]"
          >
            ← العودة إلى لوحة المشرف
          </Link>

          <div className="mt-6 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-4xl">📝</div>

                <h1 className="mt-3 text-2xl font-black text-[var(--foreground)]">
                  بنك الأسئلة
                </h1>

                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  اختر المستوى لإدارة الأبواب والأسئلة الخاصة به.
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--primary-light)] px-5 py-4 text-center">
                <div className="text-2xl font-black text-[var(--primary)]">
                  {activeLevels.length}
                </div>

                <div className="mt-1 text-xs font-bold text-[var(--muted)]">
                  مستويات متاحة
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Levels */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {activeLevels.map((level, index) => (
            <Link
              key={level.id}
              href={`/admin/questions/${level.id}`}
              className="group rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-xl">
                  📝
                </div>

                <span className="text-xs font-bold text-[var(--muted)]">
                  #{index + 1}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-black text-[var(--foreground)]">
                {level.title}
              </h2>

              <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">
                {level.description ||
                  "إدارة أبواب وأسئلة هذا المستوى."}
              </p>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-[var(--background)] px-4 py-3">
                <span className="text-sm font-bold text-[var(--primary)]">
                  إدارة بنك الأسئلة
                </span>

                <span className="text-lg transition group-hover:-translate-x-1">
                  ←
                </span>
              </div>
            </Link>
          ))}
        </div>

        {activeLevels.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-white p-10 text-center">
            <div className="text-4xl">📭</div>

            <p className="mt-4 font-bold text-[var(--foreground)]">
              لا توجد مستويات متاحة حاليًا.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}