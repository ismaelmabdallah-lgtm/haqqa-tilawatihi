import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function TajweedLevelsPage() {
  const { data: levels, error } = await supabaseAdmin
    .from("levels")
    .select("id, title, description, order")
    .eq("is_active", true)
    .order("order", { ascending: true });

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="mb-5 inline-flex items-center rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
          >
            ← الرئيسية
          </Link>

          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm md:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-3xl">
                📖
              </div>

              <div>
                <p className="mb-2 text-sm font-bold text-[var(--primary)]">
                  أحكام التجويد
                </p>

                <h1 className="text-3xl font-black text-[var(--foreground)]">
                  مستويات أحكام التجويد
                </h1>

                <p className="mt-3 max-w-2xl leading-7 text-[var(--muted)]">
                  اختر المستوى الذي تريد الدخول إليه للوصول إلى المادة
                  التعليمية والملخصات والشروحات والاختبارات الإلكترونية.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center">
            <div className="text-3xl">⚠️</div>

            <h2 className="mt-3 text-lg font-black text-red-700">
              حدث خطأ أثناء تحميل المستويات
            </h2>

            <p className="mt-2 text-sm text-red-600">
              حاول تحديث الصفحة مرة أخرى.
            </p>
          </div>
        )}

        {/* Empty */}
        {!error && (!levels || levels.length === 0) && (
          <div className="rounded-3xl border border-[var(--border)] bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📚</div>

            <h2 className="mt-4 text-xl font-black text-[var(--foreground)]">
              لا توجد مستويات متاحة حاليًا
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              سيتم إضافة المستويات التعليمية قريبًا.
            </p>
          </div>
        )}

        {/* Levels */}
        {!error && levels && levels.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {levels.map((level) => (
              <Link
                key={level.id}
                href={`/tajweed/${level.id}`}
                className="group rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-2xl transition group-hover:scale-105">
                    📚
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-black text-[var(--foreground)]">
                      {level.title}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {level.description ||
                        "الوصول إلى محتوى هذا المستوى واختباراته."}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
                      الدخول إلى المستوى
                      <span className="transition group-hover:-translate-x-1">
                        ←
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}