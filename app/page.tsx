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
    .select("id, title, body, date, type, storage_path, link_url")
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
    <main className="min-h-screen overflow-x-hidden bg-[#f8faf9] text-[#1c2923]" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#e5ece8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-95"
            aria-label="الرئيسية"
          >
            {/* الشعار الإسلامي الموحد */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#124d35] to-[#0a2e20] p-2 shadow-sm shadow-[#124d35]/20 ring-1 ring-emerald-950/5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full text-[#e8c67c]"
              >
                <path
                  d="M12 2L14.7 4.7L18.5 4.5L19.5 8.2L22.5 10.5L21.5 14.2L23 17.5L19.5 19L17.5 22.5L13.8 21.8L12 24L10.2 21.8L6.5 22.5L4.5 19L1 17.5L2.5 14.2L1.5 10.5L4.5 8.2L5.5 4.5L9.3 4.7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeOpacity="0.45"
                  fill="none"
                />
                <path
                  d="M12 7.5V17.5M12 7.5C10.5 6.2 7 6.2 5 7.5V17.5C7 16.2 10.5 16.2 12 17.5M12 7.5C13.5 6.2 17 6.2 19 7.5V17.5C17 16.2 13.5 16.2 12 17.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wide text-[#143d2b]">
                  حَقَّ تِلَاوَتِهِ
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              </div>
              <p className="text-[11px] font-medium text-[#6c7d74]">
                منصة إتقان تلاوة القرآن الكريم
              </p>
            </div>
          </Link>

          <a
            href="#levels"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-[#eef5f1] px-4 py-2 text-xs font-bold text-[#144d34] transition hover:bg-[#144d34] hover:text-white"
          >
            <span>أحكام التجويد</span>
            <span className="text-[10px]">↓</span>
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0c3826] via-[#124d35] to-[#1c6b4b] text-white">
        {/* خلفية زخرفية */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
            backgroundSize: "100px 100px",
          }}
        />

        {/* إضاءات جمالية */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#34d399]/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-[#d4af37]/15 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            {/* الشارة الزجاجية */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-bold text-emerald-100 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-[#f6d37a] shadow-[0_0_8px_#f6d37a]" />
              <span>منصة إتقان تلاوة القرآن الكريم</span>
            </div>

            <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              حَقَّ تِلَاوَتِهِ
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-emerald-100/90 sm:text-base">
              تعلّم أحكام التجويد بطريقة سهلة وميسرة، من خلال
              المنهاج الشامل، الملخصات، الشروحات المرئية، وبنك الاختبارات الإلكترونية التفاعلية.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#levels"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#f6d37a] px-6 py-3 text-xs font-black text-[#143d2b] shadow-lg shadow-black/10 transition hover:bg-[#fad887] hover:shadow-xl sm:text-sm"
              >
                <span>ابدأ التعلم الآن</span>
                <span>←</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        
        {/* قسم مستويات التجويد */}
        <section id="levels" className="mb-10 scroll-mt-20">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#eaf4ef] text-base text-[#13593b]">
                📚
              </div>
              <div>
                <h3 className="text-lg font-black text-[#192b23] sm:text-2xl">
                  مستويات التجويد
                </h3>
                <p className="text-xs text-[#76857d]">
                  اختر المستوى المناسب للبدء بالدراسة والمراجعة
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LevelCard
              title="المستوى الأول"
              subtitle="مبادئ التجويد وأحكام النون والميم"
              number="01"
              href="/tajweed/1"
              bgStyle="bg-gradient-to-br from-[#f2f8f4] to-[#e4f1e9] border-[#c9e1d3] text-[#13593b]"
              badgeStyle="bg-[#13593b] text-white"
            />

            <LevelCard
              title="المستوى الثاني"
              subtitle="المدود والمخارج والصفات"
              number="02"
              href="/tajweed/2"
              bgStyle="bg-gradient-to-br from-[#f0f4fa] to-[#e2ebf7] border-[#ccdbed] text-[#24588d]"
              badgeStyle="bg-[#24588d] text-white"
            />

            <LevelCard
              title="المستوى الثالث"
              subtitle="الوقف والابتداء والفرش"
              number="03"
              href="/tajweed/3"
              bgStyle="bg-gradient-to-br from-[#faf6eb] to-[#f5edd7] border-[#e8dbb9] text-[#8c6b24]"
              badgeStyle="bg-[#8c6b24] text-white"
            />

            <LevelCard
              title="مستوى الإجازة"
              subtitle="إتقان الرواية والتحريرات"
              number="04"
              href="/tajweed/4"
              bgStyle="bg-gradient-to-br from-[#f7f2fb] to-[#ece1f5] border-[#dfcee8] text-[#6d3e8e]"
              badgeStyle="bg-[#6d3e8e] text-white"
            />
          </div>
        </section>

        {/* قسم الإعلانات */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fbf3df] text-base text-[#917028]">
                📢
              </div>
              <div>
                <h3 className="text-lg font-black text-[#192b23] sm:text-2xl">
                  لوحة الإعلانات والتنبيهات
                </h3>
                <p className="text-xs text-[#76857d]">
                  آخر المواعيد، الاختبارات، والأخبار الرسمية
                </p>
              </div>
            </div>
          </div>

          {announcementsWithImages.length > 0 ? (
            <div className="space-y-3.5">
              {announcementsWithImages.map((announcement) => (
                <article
                  key={announcement.id}
                  className="overflow-hidden rounded-2xl border border-[#e4ede8] bg-white shadow-sm transition hover:border-[#cbddd3] hover:shadow-md"
                >
                  <div className="border-r-4 border-[#b8944d]">
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
                      <div className="flex min-w-0 items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                            announcement.type === "image"
                              ? "bg-purple-50 text-purple-700"
                              : announcement.type === "link"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {announcement.type === "image"
                            ? "🖼️"
                            : announcement.type === "link"
                              ? "🔗"
                              : "📢"}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-base font-bold leading-7 text-[#1b2b24]">
                            {announcement.title}
                          </h4>

                          <time
                            dateTime={announcement.date}
                            className="mt-0.5 block text-[11px] font-medium text-[#7a8a81]"
                          >
                            📅 {formatArabicDate(announcement.date)}
                          </time>
                        </div>
                      </div>
                    </div>

                    {/* محتوى النص */}
                    {announcement.body && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <div className="rounded-xl bg-[#f8faf9] px-4 py-3">
                          <p className="whitespace-pre-line text-xs leading-relaxed text-[#2c3d34] sm:text-sm">
                            {announcement.body}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* محتوى الصورة */}
                    {announcement.type === "image" && announcement.imageUrl && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <div className="overflow-hidden rounded-xl border border-[#e4ede8] bg-[#f8faf9]">
                          {announcement.link_url ? (
                            <a
                              href={announcement.link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={announcement.imageUrl}
                                alt={announcement.title}
                                className="mx-auto block max-h-[380px] w-auto max-w-full object-contain transition duration-200 hover:scale-[1.01]"
                              />
                            </a>
                          ) : (
                            <img
                              src={announcement.imageUrl}
                              alt={announcement.title}
                              className="mx-auto block max-h-[380px] w-auto max-w-full object-contain"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* زر الرابط */}
                    {announcement.type === "link" && announcement.link_url && (
                      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <a
                          href={announcement.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-[#13593b] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#0f442d]"
                        >
                          <span>فتح الرابط</span>
                          <span>↗</span>
                        </a>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d8e4dc] bg-white px-6 py-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f4f7f5] text-xl">
                📢
              </div>
              <p className="mt-3 text-sm font-bold text-[#1b2b24]">
                لا توجد إعلانات حالياً
              </p>
              <p className="mt-1 text-xs text-[#7b8a82]">
                ستظهر هنا المواعيد المهمة وتنبيهات الاختبارات عند نشرها.
              </p>
            </div>
          )}
        </section>

      </section>

      {/* Footer */}
      <footer className="border-t border-[#d8e5df] bg-[#0c2f21] py-8 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-sm font-bold tracking-wide">
            حَقَّ تِلَاوَتِهِ
          </p>
          <p className="mt-1 text-xs text-emerald-200/80">
            منصة إتقان تلاوة القرآن الكريم
          </p>
          <div className="mx-auto my-4 h-px max-w-xs bg-white/10" />
          <p className="text-[11px] text-emerald-300/60">
            من إعداد وإشراف دار القرآن في مسجد النبي شعيب عليه السلام
          </p>
          <p className="mt-2 text-xs text-emerald-100/70">
            للتواصل مع المطور:{" "}
            <a
              href="tel:0786050144"
              className="font-bold text-[#f6d37a] hover:underline"
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
  subtitle,
  number,
  href,
  bgStyle,
  badgeStyle,
}: {
  title: string;
  subtitle: string;
  number: string;
  href: string;
  bgStyle: string;
  badgeStyle: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md active:scale-[0.98] ${bgStyle}`}
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black shadow-sm ${badgeStyle}`}
        >
          {number}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/70 text-xs font-bold text-gray-700 opacity-60 transition group-hover:translate-x-[-2px] group-hover:opacity-100">
          ←
        </span>
      </div>

      <div className="mt-4">
        <h4 className="text-base font-black">
          {title}
        </h4>
        <p className="mt-1 text-[11px] font-medium opacity-80">
          {subtitle}
        </p>
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