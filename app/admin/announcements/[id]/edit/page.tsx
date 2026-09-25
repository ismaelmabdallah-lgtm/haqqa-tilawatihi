import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
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
};

export default async function EditAnnouncementPage({
  params,
}: PageProps) {
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

  const { id } = await params;
  const announcementId = Number(id);

  if (!Number.isFinite(announcementId)) {
    notFound();
  }

  const { data: announcement, error } =
    await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .maybeSingle();

  if (error) {
    console.error("Load announcement error:", error);
    notFound();
  }

  if (!announcement) {
    notFound();
  }

  const typedAnnouncement =
    announcement as Announcement;

  let currentImageUrl: string | null = null;

  if (typedAnnouncement.storage_path) {
    const { data: signedData } =
      await supabaseAdmin.storage
        .from("educational-files")
        .createSignedUrl(
          typedAnnouncement.storage_path,
          60 * 60
        );

    currentImageUrl =
      signedData?.signedUrl ?? null;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/announcements"
            className="mb-5 inline-flex rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
          >
            → العودة إلى الإعلانات
          </Link>

          <p className="mb-2 text-sm font-bold text-[var(--primary)]">
            📢 إدارة المحتوى
          </p>

          <h1 className="text-3xl font-black text-[var(--foreground)]">
            تعديل الإعلان
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            عدّل بيانات الإعلان ثم احفظ التغييرات.
          </p>
        </div>

        {/* Form */}
        <form
          action="/api/admin/announcements"
          method="POST"
          encType="multipart/form-data"
          className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8"
        >
          <input
            type="hidden"
            name="action"
            value="update"
          />

          <input
            type="hidden"
            name="id"
            value={typedAnnouncement.id}
          />

          {/* Type */}
          <div className="mb-6">
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              نوع الإعلان
            </label>

            <select
              id="type"
              name="type"
              defaultValue={typedAnnouncement.type}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            >
              <option value="text">
                📝 إعلان نصي
              </option>

              <option value="image">
                🖼️ إعلان بصورة
              </option>

              <option value="link">
                🔗 إعلان برابط
              </option>
            </select>
          </div>

          {/* Title */}
          <div className="mb-6">
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              عنوان الإعلان
            </label>

            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={200}
              defaultValue={typedAnnouncement.title}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          {/* Body */}
          <div className="mb-6">
            <label
              htmlFor="body"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              نص الإعلان
              <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                اختياري
              </span>
            </label>

            <textarea
              id="body"
              name="body"
              rows={8}
              maxLength={5000}
              defaultValue={typedAnnouncement.body ?? ""}
              className="w-full resize-y rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          {/* Current image */}
          {currentImageUrl && (
            <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <p className="mb-3 text-sm font-black text-[var(--foreground)]">
                🖼️ الصورة الحالية
              </p>

              <div className="overflow-hidden rounded-2xl bg-white">
                <img
                  src={currentImageUrl}
                  alt={typedAnnouncement.title}
                  className="max-h-[450px] w-full object-contain"
                />
              </div>

              <p className="mt-3 text-xs text-[var(--muted)]">
                إذا اخترت صورة جديدة، سيتم استبدال الصورة الحالية.
              </p>
            </div>
          )}

          {/* New image */}
          <div className="mb-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--background)] p-5">
            <label
              htmlFor="image"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              🖼️ صورة جديدة
              <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                اختياري
              </span>
            </label>

            <input
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-sm"
            />

            <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
              JPG, PNG, WEBP, GIF — الحد الأقصى 10MB.
            </p>
          </div>

          {/* Link */}
          <div className="mb-6">
            <label
              htmlFor="link_url"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              🔗 الرابط
              <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                اختياري
              </span>
            </label>

            <input
              id="link_url"
              name="link_url"
              type="url"
              maxLength={2000}
              defaultValue={typedAnnouncement.link_url ?? ""}
              placeholder="https://example.com"
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          {/* Date */}
          <div className="mb-6">
            <label
              htmlFor="date"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              تاريخ الإعلان
            </label>

            <input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={typedAnnouncement.date}
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          {/* Active */}
          <div className="mb-8 rounded-2xl bg-[var(--background)] p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                value="true"
                defaultChecked={typedAnnouncement.is_active}
                className="h-5 w-5 accent-[var(--primary)]"
              />

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  الإعلان مفعّل
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  عند تفعيل الإعلان سيظهر للطلاب والزوار.
                </p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-black text-white transition hover:bg-[var(--primary-dark)]"
            >
              💾 حفظ التعديلات
            </button>

            <Link
              href="/admin/announcements"
              className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-5 py-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}