import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import DeleteLevelButton from "./DeleteLevelButton";

type SearchParams = {
  success?: string;
  error?: string;
};

export default async function AdminLevelsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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
    .select("*")
    .order("order", { ascending: true });

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold text-[var(--primary)]">
              📚 إدارة المحتوى
            </p>

            <h1 className="text-3xl font-black text-[var(--foreground)]">
              إدارة المستويات
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              أضف وعدّل مستويات أحكام التجويد وحدد ترتيبها وحالتها.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
          >
            ← لوحة المشرف
          </Link>
        </div>

        {/* Messages */}
        {params.success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
            {params.success}
          </div>
        )}

        {params.error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            {params.error}
          </div>
        )}

        {/* Title + Add */}
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)]">
              المستويات
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              جميع المستويات تظهر هنا للمشرف، سواء كانت مفعّلة أو مخفية.
            </p>
          </div>

          <Link
            href="/admin/levels/new"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white transition hover:bg-[var(--primary-dark)]"
          >
            + إضافة مستوى
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            حدث خطأ أثناء تحميل المستويات.
          </div>
        )}

        {/* Empty */}
        {!error && (!levels || levels.length === 0) && (
          <div className="rounded-3xl border border-[var(--border)] bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">📚</div>

            <h3 className="mt-4 text-xl font-black">
              لا توجد مستويات
            </h3>

            <p className="mt-2 text-sm text-[var(--muted)]">
              أضف أول مستوى من الزر أعلاه.
            </p>
          </div>
        )}

        {/* Levels */}
        {!error && levels && levels.length > 0 && (
          <div className="grid gap-5">
            {levels.map((level) => (
              <div
                key={level.id}
                className={`rounded-3xl border bg-white p-6 shadow-sm ${
                  level.is_active
                    ? "border-[var(--border)]"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* Info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                        level.is_active
                          ? "bg-[var(--primary-light)]"
                          : "bg-gray-200"
                      }`}
                    >
                      📚
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black text-[var(--foreground)]">
                          {level.title}
                        </h3>

                        {level.is_active ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            مفعّل
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
                            مخفي
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                        {level.description || "لا يوجد وصف لهذا المستوى."}
                      </p>

                      <p className="mt-2 text-sm text-[var(--muted)]">
                        الترتيب:{" "}
                        <strong className="text-[var(--foreground)]">
                          {level.order}
                        </strong>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {/* Edit */}
                    <Link
                      href={`/admin/levels/${level.id}/edit`}
                      className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
                    >
                      ✏️ تعديل
                    </Link>

                    {/* Toggle */}
                    <form
                      action="/api/admin/levels"
                      method="POST"
                    >
                      <input
                        type="hidden"
                        name="action"
                        value="toggle"
                      />

                      <input
                        type="hidden"
                        name="id"
                        value={level.id}
                      />

                      <button
                        type="submit"
                        className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                          level.is_active
                            ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            : "bg-[var(--primary-light)] text-[var(--primary-dark)] hover:bg-[#dcece4]"
                        }`}
                      >
                        {level.is_active ? "👁️ إخفاء" : "👁️ إظهار"}
                      </button>
                    </form>

                    {/* Delete */}
                    <DeleteLevelButton
                      levelId={level.id}
                      levelTitle={level.title}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}