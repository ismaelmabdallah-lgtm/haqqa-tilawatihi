import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase-admin";

type Announcement = {
  id: number;
  title: string;
  body: string | null;
  date: string;
  type: "text" | "image" | "link";
  storage_path: string | null;
  link_url: string | null;
};

type AnnouncementWithImage = Announcement & {
  imageUrl: string | null;
};

export default async function Home() {
  const { data: announcements, error } = await supabaseAdmin
    .from("announcements")
    .select(
      "id, title, body, date, type, storage_path, link_url"
    )
    .eq("is_active", true)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Load announcements error:", error);
  }

  const announcementsWithImages: AnnouncementWithImage[] =
    await Promise.all(
      (announcements ?? []).map(async (announcement) => {
        let imageUrl: string | null = null;

        if (
          announcement.type === "image" &&
          announcement.storage_path
        ) {
          const { data: signedData, error: signedError } =
            await supabaseAdmin.storage
              .from("educational-files")
              .createSignedUrl(
                announcement.storage_path,
                60 * 60
              );

          if (signedError) {
            console.error(
              "Create announcement image signed URL error:",
              signedError
            );
          }

          imageUrl = signedData?.signedUrl ?? null;
        }

        return {
          ...announcement,
          imageUrl,
        };
      })
    );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#173f31]/95 text-white shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4b56b]/30 bg-[#d4b56b]/15 text-lg font-black text-[#e8ce91]">
              ت
            </div>

            <div>
              <h1 className="text-sm font-black sm:text-base">
                حَقَّ تِلَاوَتِهِ
              </h1>

              <p className="text-[11px] text-white/65 sm:text-xs">
                منصة إتقان تلاوة القرآن الكريم
              </p>
            </div>
          </Link>

          <div className="hidden rounded-full border border-[#d4b56b]/20 bg-white/5 px-4 py-2 text-sm font-bold text-[#e8ce91] sm:block">
            📖 أحكام التجويد
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-[#173f31] text-white">
        {/* Decorative shapes */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#d4b56b]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#2f8063]/25 blur-3xl" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.05]">
          <div className="absolute right-[12%] top-8 text-8xl">
            ۞
          </div>
          <div className="absolute bottom-4 left-[15%] text-7xl">
            ۞
          </div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d4b56b]/30 bg-white/10 text-3xl shadow-lg backdrop-blur">
              📖
            </div>

            <div className="mb-3 inline-flex rounded-full border border-[#d4b56b]/25 bg-[#d4b56b]/10 px-4 py-1.5 text-xs font-bold text-[#e8ce91]">
              منصة إتقان تلاوة القرآن الكريم
            </div>

            <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              حَقَّ تِلَاوَتِهِ
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
              تعلّم أحكام التجويد بطريقة سهلة ومنظمة، من خلال
              المواد التعليمية والملخصات والدروس والاختبارات
              الإلكترونية.
            </p>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-9">
        {/* Announcements */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5ead0] text-base">
                  📢
                </span>

                <h3 className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
                  الإعلانات
                </h3>
              </div>

              <p className="mt-1 mr-10 text-xs text-[var(--muted)]">
                آخر المواعيد والتنبيهات المهمة
              </p>
            </div>
          </div>

          {announcementsWithImages.length > 0 ? (
            <div className="space-y-3">
              {announcementsWithImages.map(
                (announcement) => (
                  <article
                    key={announcement.id}
                    className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-sm transition duration-200 hover:shadow-md"
                  >
                    <div className="border-r-4 border-[#b8944d]">
                      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                              announcement.type === "image"
                                ? "bg-purple-50"
                                : announcement.type ===
                                    "link"
                                  ? "bg-blue-50"
                                  : "bg-[var(--primary-light)]"
                            }`}
                          >
                            {announcement.type === "image"
                              ? "🖼️"
                              : announcement.type ===
                                  "link"
                                ? "🔗"
                                : "📢"}
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-base font-black leading-7 text-[var(--foreground)] sm:text-lg">
                              {announcement.title}
                            </h4>

                            <time
                              dateTime={announcement.date}
                              className="mt-0.5 block text-[11px] font-bold text-[var(--muted)]"
                            >
                              📅{" "}
                              {formatArabicDate(
                                announcement.date
                              )}
                            </time>
                          </div>
                        </div>
                      </div>

                      {/* Text Announcement */}
                      {announcement.type === "text" &&
                        announcement.body && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                            <div className="rounded-xl bg-[var(--background)] px-4 py-3">
                              <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">
                                {announcement.body}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Image Announcement */}
                      {announcement.type === "image" &&
                        announcement.imageUrl && (
                          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--background)]">
                              {announcement.link_url ? (
                                <a
                                  href={
                                    announcement.link_url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`فتح رابط ${announcement.title}`}
                                  className="block"
                                >
                                  <img
                                    src={
                                      announcement.imageUrl
                                    }
                                    alt={
                                      announcement.title
                                    }
                                    className="mx-auto block max-h-[360px] w-auto max-w-full object-contain transition duration-200 hover:scale-[1.01]"
                                  />
                                </a>
                              ) : (
                                <img
                                  src={
                                    announcement.imageUrl
                                  }
                                  alt={
                                    announcement.title
                                  }
                                  className="mx-auto block max-h-[360px] w-auto max-w-full object-contain"
                                />
                              )}
                            </div>
                          </div>
                        )}

                      {/* Optional text under image */}
                      {announcement.type === "image" &&
                        announcement.body && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                            <div className="rounded-xl bg-[var(--background)] px-4 py-3">
                              <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">
                                {announcement.body}
                              </p>
                            </div>
                          </div>
                        )}

                      {/* Link Announcement */}
                      {announcement.type === "link" &&
                        announcement.body && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                            <div className="rounded-xl bg-[var(--background)] px-4 py-3">
                              <p className="whitespace-pre-line text-sm leading-7 text-[var(--foreground)]">
                                {announcement.body}
                              </p>
                            </div>
                          </div>
                        )}

                      {announcement.type === "link" &&
                        announcement.link_url && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                            <a
                              href={
                                announcement.link_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-black text-white transition hover:bg-[var(--primary-dark)] sm:w-auto"
                            >
                              فتح الرابط
                              <span>↗</span>
                            </a>
                          </div>
                        )}

                      {/* Fallback if image is missing */}
                      {announcement.type === "image" &&
                        !announcement.imageUrl && (
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                            <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4 text-center">
                              <p className="text-sm font-bold text-red-700">
                                تعذر تحميل صورة الإعلان
                                حاليًا.
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[var(--border)] bg-white px-6 py-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-light)] text-xl">
                📢
              </div>

              <p className="mt-3 font-black text-[var(--foreground)]">
                لا توجد إعلانات حاليًا
              </p>

              <p className="mt-1 text-xs text-[var(--muted)]">
                ستظهر هنا الإعلانات والمواعيد المهمة عند
                نشرها.
              </p>
            </div>
          )}
        </section>

        {/* Levels */}
        <section id="levels" className="mt-8 sm:mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--primary-light)] text-base">
                  📚
                </span>

                <h3 className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
                  مستويات التجويد
                </h3>
              </div>

              <p className="mt-1 mr-10 text-xs text-[var(--muted)]">
                اختر المستوى المناسب وابدأ التعلم
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <LevelCard
              title="المستوى الأول"
              number="01"
              href="/tajweed/1"
              className="bg-[#eaf5ef] text-[#1f6b4f] border-[#cce5d8]"
              badgeClassName="bg-[#1f6b4f] text-white"
            />

            <LevelCard
              title="المستوى الثاني"
              number="02"
              href="/tajweed/2"
              className="bg-[#eef2fb] text-[#405a9b] border-[#d7dff2]"
              badgeClassName="bg-[#405a9b] text-white"
            />

            <LevelCard
              title="المستوى الثالث"
              number="03"
              href="/tajweed/3"
              className="bg-[#f8f1df] text-[#987638] border-[#eadbb7]"
              badgeClassName="bg-[#b8944d] text-white"
            />

            <LevelCard
              title="مستوى الإجازة"
              number="04"
              href="/tajweed/4"
              className="bg-[#f3ebf8] text-[#76518d] border-[#e3d3ed]"
              badgeClassName="bg-[#76518d] text-white"
            />
          </div>
        </section>
      </section>

      {/* Footer */}
      <footer className="mt-2 border-t border-[var(--border)] bg-[#173f31] text-white">
        <div className="mx-auto max-w-6xl px-4 py-7 text-center sm:px-6">
          <p className="text-base font-black">
            حَقَّ تِلَاوَتِهِ
          </p>

          <p className="mt-1 text-sm font-bold text-[#e8ce91]">
            منصة إتقان تلاوة القرآن الكريم
          </p>

          <div className="mx-auto my-4 h-px max-w-xs bg-white/10" />

          <p className="text-xs leading-6 text-white/60">
            من إعداد وإشراف دار القرآن في مسجد النبي شعيب
            عليه السلام
          </p>
          <p className="mt-2 text-sm text-white/70">
  للتواصل مع المطور:
  <a
    href="tel:0786050144"
    className="mr-1 font-semibold text-[var(--gold)] hover:underline"
    dir="ltr"
  >
    0786050144
  </a>
</p>
        </div>
      </footer>
    </main>
  );
}

function LevelCard({
  title,
  number,
  href,
  className,
  badgeClassName,
}: {
  title: string;
  number: string;
  href: string;
  className: string;
  badgeClassName: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex min-h-[96px] items-center justify-between gap-2 overflow-hidden rounded-2xl border p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] sm:min-h-[108px] sm:rounded-2xl sm:p-4 ${className}`}
    >
      <div className="min-w-0">
        <span
          className={`mb-2 inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-[10px] font-black ${badgeClassName}`}
        >
          {number}
        </span>

        <h4 className="text-sm font-black leading-6 sm:text-base">
          {title}
        </h4>
      </div>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-sm font-black opacity-70 transition group-hover:translate-x-[-2px] group-hover:opacity-100">
        ←
      </span>
    </Link>
  );
}

function formatArabicDate(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return new Intl.DateTimeFormat("ar-JO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}