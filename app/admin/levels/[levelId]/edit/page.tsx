import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

type PageProps = {
  params: Promise<{
    levelId: string;
  }>;
};

export default async function EditLevelPage({
  params,
}: PageProps) {
  const { levelId } = await params;

  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId) || numericLevelId <= 0) {
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
    redirect("/admin/login");
  }

  const { data: level, error } = await supabase
    .from("levels")
    .select(
      "id, title, description, order, is_active"
    )
    .eq("id", numericLevelId)
    .maybeSingle();

  if (error || !level) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div>
            <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
              تعديل المستوى
            </h1>

            <p className="text-xs text-[var(--muted)]">
              {level.title}
            </p>
          </div>

          <Link
            href="/admin/levels"
            className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
          >
            ← المستويات
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-medium text-[var(--primary)]">
              ✏️ تعديل
            </p>

            <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)]">
              تعديل المستوى
            </h2>
          </div>

          <form
            action="/api/admin/levels"
            method="POST"
            className="space-y-6"
          >
            <input
              type="hidden"
              name="action"
              value="update"
            />

            <input
              type="hidden"
              name="id"
              value={level.id}
            />

            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                اسم المستوى
              </label>

              <input
                id="title"
                name="title"
                type="text"
                required
                defaultValue={level.title}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                الوصف
              </label>

              <textarea
                id="description"
                name="description"
                rows={4}
                defaultValue={level.description || ""}
                className="w-full resize-none rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            {/* Order */}
            <div>
              <label
                htmlFor="order"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                الترتيب
              </label>

              <input
                id="order"
                name="order"
                type="number"
                min="0"
                defaultValue={level.order}
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            {/* Active */}
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={level.is_active}
                className="h-4 w-4 accent-[var(--primary)]"
              />

              <span>
                <span className="block text-sm font-bold text-[var(--foreground)]">
                  تفعيل المستوى
                </span>

                <span className="mt-1 block text-xs text-[var(--muted)]">
                  عند إلغاء التفعيل لن يظهر للطلاب.
                </span>
              </span>
            </label>

            {/* Buttons */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/levels"
                className="rounded-xl border border-[var(--border)] px-5 py-3 text-center text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--background)]"
              >
                إلغاء
              </Link>

              <button
                type="submit"
                className="rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}