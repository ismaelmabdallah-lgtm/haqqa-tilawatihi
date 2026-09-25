import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/admin/login");
  }

  // التحقق أن المستخدم Admin فعليًا
  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !adminUser) {
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg text-white">
              ت
            </div>

            <div>
              <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
                لوحة المشرف
              </h1>

              <p className="text-xs text-[var(--muted)]">
                مسجد النبي شعيب عليه السلام
              </p>
            </div>
          </div>

          <a
            href="/"
            className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
          >
            الموقع
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-medium text-[var(--primary)]">
            مرحبًا بك
          </p>

          <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            لوحة إدارة أحكام التجويد
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
            من هنا ستتمكن من إدارة المستويات والمواد التعليمية والأسئلة
            والاختبارات والإعلانات.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* المستويات */}
          <Link href="/admin/levels">
  <AdminCard
    icon="📚"
    title="المستويات"
    description="إضافة وتعديل وترتيب مستويات أحكام التجويد."
  />
</Link>

          {/* المواد التعليمية */}
          <Link href="/admin/resources">
            <AdminCard
              icon="📘"
              title="المواد التعليمية"
              description="إضافة المادة والملخص والشروحات والاختبارات الجاهزة."
            />
          </Link>

          {/* بنك الأسئلة */}
          <Link href="/admin/questions">
            <AdminCard
              icon="📝"
              title="بنك الأسئلة"
              description="إدارة الأسئلة وتصنيفها حسب Chapters."
            />
          </Link>

          {/* إعدادات الاختبارات */}
          <Link href="/admin/quiz-settings">
            <AdminCard
              icon="⚙️"
              title="إعدادات الاختبارات"
              description="تحديد عدد الأسئلة وطريقة توزيعها."
            />
          </Link>

          {/* الإعلانات */}
          <Link href="/admin/announcements">
  <AdminCard
    icon="📢"
    title="الإعلانات"
    description="إضافة وتعديل وإدارة الإعلانات."
  />
</Link>
        </div>
      </section>
    </main>
  );
}

function AdminCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-light)] text-xl">
        {icon}
      </div>

      <h3 className="mt-5 font-bold text-[var(--foreground)]">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </div>
  );
}