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
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white shadow-sm">
              ت
            </div>

            <div>
              <h1 className="text-sm font-black text-[var(--foreground)] sm:text-base">
                حَقَّ تِلَاوَتِهِ
              </h1>

              <p className="text-xs text-[var(--muted)]">
                منصة إتقان تلاوة القرآن الكريم
              </p>
            </div>
          </Link>

          <div className="hidden rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary)] sm:block">
            📖 أحكام التجويد
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[var(--primary-light)] text-4xl shadow-sm">
              📖
            </div>

            <div className="mb-4 inline-flex rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm font-bold text-[var(--primary)]">
              منصة إتقان تلاوة القرآن الكريم
            </div>

            <h2 className="text-4xl font-black leading-tight text-[var(--foreground)] sm:text-6xl">
              حَقَّ تِلَاوَتِهِ
            </h2>

            <p className="mt-3 text-lg font-bold text-[var(--primary)] sm:text-xl">
              منصة إتقان تلاوة القرآن الكريم
            </p>

            <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[var(--muted)] sm:text-lg">
              تعلّم أحكام التجويد بطريقة سهلة ومنظمة، من خلال المواد
              التعليمية والملخصات والدروس والاختبارات الإلكترونية.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/tajweed/1"
                className="rounded-2xl bg-[var(--primary)] px-7 py-4 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-dark)]"
              >
                ابدأ من المستوى الأول
              </Link>

              <a
                href="#levels"
                className="rounded-2xl border border-[var(--border)] bg-white px-7 py-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
              >
                استعرض المستويات
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Levels */}
        <section id="levels">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--primary)]">
                مستويات التعلم
              </p>

              <h3 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
                اختر مستواك
              </h3>
            </div>

            <p className="text-sm leading-6 text-[var(--muted)]">
              ابدأ من المستوى المناسب لك وتقدم خطوة بخطوة.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <LevelCard
              title="المستوى الأول"
              description="ابدأ من الأساسيات"
              number="01"
              href="/tajweed/1"
            />

            <LevelCard
              title="المستوى الثاني"
              description="طوّر معرفتك بالتجويد"
              number="02"
              href="/tajweed/2"
            />

            <LevelCard
              title="المستوى الثالث"
              description="انتقل إلى مستوى متقدم"
              number="03"
              href="/tajweed/3"
            />

            <LevelCard
              title="مستوى الإجازة"
              description="للمستوى المتقدم"
              number="04"
              href="/tajweed/4"
            />
          </div>
        </section>

        {/* Announcements */}
        <section className="mt-14">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[var(--primary)]">
                📢 آخر الأخبار
              </p>

              <h3 className="mt-1 text-2xl font-black text-[var(--foreground)] sm:text-3xl">
                إعلانات مهمة
              </h3>
            </div>

            <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-[#f7f1e5] text-xl sm:flex">
              📢
            </div>
          </div>

          {announcementsWithImages.length > 0 ? (
            <div className="space-y-4">
              {announcementsWithImages.map(
                (announcement) => (
                  <article
                    key={announcement.id}
                    className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="border-r-4 border-[var(--primary)] p-5 sm:p-6">
                      {/* Announcement Header */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                              announcement.type === "image"
                                ? "bg-purple-100"
                                : announcement.type ===
                                    "link"
                                  ? "bg-blue-100"
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
                            <h4 className="text-lg font-black leading-8 text-[var(--foreground)]">
                              {announcement.title}
                            </h4>

                            <time
                              dateTime={announcement.date}
                              className="mt-1 block text-xs font-bold text-[var(--muted)]"
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
                          <div className="mt-5 rounded-2xl bg-[var(--background)] px-4 py-4">
                            <p className="whitespace-pre-line text-sm leading-8 text-[var(--foreground)]">
                              {announcement.body}
                            </p>
                          </div>
                        )}

                      {/* Image Announcement */}
                      {announcement.type === "image" &&
                        announcement.imageUrl && (
                          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--background)]">
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
                                  className="max-h-[650px] w-full object-contain transition duration-200 hover:scale-[1.01]"
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
                                className="max-h-[650px] w-full object-contain"
                              />
                            )}
                          </div>
                        )}

                      {/* Optional text under image */}
                      {announcement.type === "image" &&
                        announcement.body && (
                          <div className="mt-4 rounded-2xl bg-[var(--background)] px-4 py-4">
                            <p className="whitespace-pre-line text-sm leading-8 text-[var(--foreground)]">
                              {announcement.body}
                            </p>
                          </div>
                        )}

                      {/* Link Announcement */}
                      {announcement.type === "link" &&
                        announcement.body && (
                          <div className="mt-5 rounded-2xl bg-[var(--background)] px-4 py-4">
                            <p className="whitespace-pre-line text-sm leading-8 text-[var(--foreground)]">
                              {announcement.body}
                            </p>
                          </div>
                        )}

                      {announcement.type === "link" &&
                        announcement.link_url && (
                          <div className="mt-5">
                            <a
                              href={
                                announcement.link_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-black text-white transition hover:bg-[var(--primary-dark)] sm:w-auto"
                            >
                              فتح الرابط
                              <span>↗</span>
                            </a>
                          </div>
                        )}

                      {/* Fallback if image is missing */}
                      {announcement.type === "image" &&
                        !announcement.imageUrl && (
                          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-5 text-center">
                            <p className="text-sm font-bold text-red-700">
                              تعذر تحميل صورة الإعلان حاليًا.
                            </p>
                          </div>
                        )}
                    </div>
                  </article>
                )
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-[var(--border)] bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-2xl">
                📢
              </div>

              <p className="mt-4 font-black text-[var(--foreground)]">
                لا توجد إعلانات حاليًا
              </p>

              <p className="mt-2 text-sm text-[var(--muted)]">
                ستظهر هنا الإعلانات والمواعيد المهمة عند نشرها.
              </p>
            </div>
          )}
        </section>

        {/* About */}
        <section className="mt-14">
          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-2xl">
                📖
              </div>

              <div>
                <p className="text-sm font-bold text-[var(--primary)]">
                  عن المنصة
                </p>

                <h3 className="mt-1 text-xl font-black text-[var(--foreground)]">
                  حَقَّ تِلَاوَتِهِ
                </h3>

                <p className="mt-3 text-sm leading-8 text-[var(--muted)]">
                  منصة إتقان تلاوة القرآن الكريم، تهدف إلى تسهيل تعلم أحكام
                  التجويد ومراجعتها من خلال المواد التعليمية والملخصات
                  والدروس والاختبارات الإلكترونية، بطريقة منظمة وسهلة
                  للطلاب والمتعلمين.
                </p>
              </div>
            </div>
          </div>
        </section>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6">
          <p className="text-base font-black text-[var(--foreground)]">
            حَقَّ تِلَاوَتِهِ
          </p>

          <p className="mt-1 text-sm font-bold text-[var(--primary)]">
            منصة إتقان تلاوة القرآن الكريم
          </p>

          <div className="mx-auto my-4 h-px max-w-xs bg-[var(--border)]" />

          <p className="text-xs leading-6 text-[var(--muted)]">
            من إعداد وإشراف دار القرآن في مسجد النبي شعيب عليه السلام
          </p>
        </div>
      </footer>
    </main>
  );
}

function LevelCard({
  title,
  description,
  number,
  href,
}: {
  title: string;
  description: string;
  number: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-sm font-black text-[var(--primary)]">
          {number}
        </div>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--background)] text-lg text-[var(--muted)] transition group-hover:bg-[var(--primary-light)] group-hover:text-[var(--primary)]">
          ←
        </span>
      </div>

      <h4 className="mt-6 text-lg font-black text-[var(--foreground)]">
        {title}
      </h4>

      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
        {description}
      </p>

      <div className="mt-5 text-xs font-bold text-[var(--primary)]">
        دخول المستوى ←
      </div>
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