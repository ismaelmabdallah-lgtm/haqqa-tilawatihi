import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SearchParams = {
  success?: string;
  error?: string;
};

type Announcement = {
  id: number;
  title: string;
  body: string | null;
  date: string;
  type: "text" | "image" | "link";
  image_url: string | null;
  storage_path: string | null;
  link_url: string | null;
  is_active: boolean;
  created_at: string;
};

export default async function AdminAnnouncementsPage({
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

  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const announcements = (data ?? []) as Announcement[];

  const announcementsWithImages = await Promise.all(
    announcements.map(async (announcement) => {
      let imageUrl: string | null = null;

      if (
        announcement.type === "image" &&
        announcement.storage_path
      ) {
        const { data: signedData } =
          await supabaseAdmin.storage
            .from("educational-files")
            .createSignedUrl(
              announcement.storage_path,
              60 * 60
            );

        imageUrl = signedData?.signedUrl ?? null;
      }

      return {
        ...announcement,
        generatedImageUrl: imageUrl,
      };
    })
  );

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-bold text-[var(--primary)]">
              📢 إدارة المحتوى
            </p>

            <h1 className="text-3xl font-black text-[var(--foreground)]">
              إدارة الإعلانات
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              أضف وعدّل الإعلانات التي تظهر للطلاب والزوار.
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
              الإعلانات
            </h2>

            <p className="mt-1 text-sm text-[var(--muted)]">
              جميع الإعلانات تظهر هنا للمشرف، سواء كانت مفعّلة أو مخفية.
            </p>
          </div>

          <Link
            href="/admin/announcements/new"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white transition hover:bg-[var(--primary-dark)]"
          >
            + إضافة إعلان
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
            حدث خطأ أثناء تحميل الإعلانات.
          </div>
        )}

        {/* Empty */}
        {!error &&
          announcementsWithImages.length === 0 && (
            <div className="rounded-3xl border border-[var(--border)] bg-white p-10 text-center shadow-sm">
              <div className="text-5xl">📢</div>

              <h3 className="mt-4 text-xl font-black">
                لا توجد إعلانات
              </h3>

              <p className="mt-2 text-sm text-[var(--muted)]">
                أضف أول إعلان من الزر أعلاه.
              </p>
            </div>
          )}

        {/* Announcements */}
        {!error &&
          announcementsWithImages.length > 0 && (
            <div className="grid gap-5">
              {announcementsWithImages.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`rounded-3xl border bg-white p-6 shadow-sm ${
                    announcement.is_active
                      ? "border-[var(--border)]"
                      : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex flex-col gap-5">
                    {/* Top */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${
                            announcement.is_active
                              ? "bg-[var(--primary-light)]"
                              : "bg-gray-200"
                          }`}
                        >
                          {announcement.type === "image"
                            ? "🖼️"
                            : announcement.type === "link"
                              ? "🔗"
                              : "📢"}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black text-[var(--foreground)]">
                              {announcement.title}
                            </h3>

                            {announcement.type === "image" && (
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                                صورة
                              </span>
                            )}

                            {announcement.type === "link" && (
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                                رابط
                              </span>
                            )}

                            {announcement.type === "text" && (
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                                نص
                              </span>
                            )}

                            {announcement.is_active ? (
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                مفعّل
                              </span>
                            ) : (
                              <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
                                مخفي
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-sm text-[var(--muted)]">
                            📅 تاريخ الإعلان:{" "}
                            <strong className="text-[var(--foreground)]">
                              {announcement.date}
                            </strong>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Image */}
                    {announcement.type === "image" &&
                      announcement.generatedImageUrl && (
                        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
                          <img
                            src={announcement.generatedImageUrl}
                            alt={announcement.title}
                            className="max-h-[500px] w-full object-contain"
                          />
                        </div>
                      )}

                    {/* Body */}
                    {announcement.body && (
                      <div className="rounded-2xl bg-[var(--background)] p-5">
                        <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--foreground)]">
                          {announcement.body}
                        </p>
                      </div>
                    )}

                    {/* Link */}
                    {announcement.link_url && (
                      <a
                        href={announcement.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden text-ellipsis whitespace-nowrap rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--primary)] hover:bg-[var(--primary-light)]"
                      >
                        🔗 {announcement.link_url}
                      </a>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/announcements/${announcement.id}/edit`}
                        className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
                      >
                        ✏️ تعديل
                      </Link>

                      <form
                        action="/api/admin/announcements"
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
                          value={announcement.id}
                        />

                        <button
                          type="submit"
                          className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                            announcement.is_active
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-[var(--primary-light)] text-[var(--primary-dark)] hover:bg-[#dcece4]"
                          }`}
                        >
                          {announcement.is_active
                            ? "👁️ إخفاء"
                            : "👁️ إظهار"}
                        </button>
                      </form>

                      <form
                        action="/api/admin/announcements"
                        method="POST"
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="delete"
                        />

                        <input
                          type="hidden"
                          name="id"
                          value={announcement.id}
                        />

                        <button
                          type="submit"
                          className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100"
                        >
                          🗑️ حذف
                        </button>
                      </form>
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