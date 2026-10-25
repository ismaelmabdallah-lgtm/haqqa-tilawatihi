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
    <main className="min-h-screen bg-[#f8faf9] text-[#1c2923]" dir="rtl">
      {/* 1. الترويسة الموحدة مع الشعار الإسلامي */}
      <header className="sticky top-0 z-40 border-b border-[#e5ece8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-95"
            aria-label="العودة إلى الصفحة الرئيسية"
          >
            {/* الشعار الهندسي الموحد */}
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

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-[#eef5f1] px-3.5 py-2 text-xs font-bold text-[#144d34] transition hover:bg-[#144d34] hover:text-white"
          >
            <span>← الرئيسية</span>
          </Link>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* مسار التنقل (Breadcrumb) */}
        <nav
          aria-label="مسار الصفحة"
          className="mb-5 flex items-center gap-2 text-xs font-medium text-[#76857d]"
        >
          <Link href="/" className="transition hover:text-[#124d35]">
            الرئيسية
          </Link>
          <span className="text-[#a5b2ab]">/</span>
          <span className="font-bold text-[#1a2f26]">أحكام التجويد</span>
        </nav>

        {/* 2. Hero Banner الزمردي الفاخر */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c3826] via-[#124d35] to-[#1c6b4b] p-6 shadow-xl shadow-[#0c3826]/10 sm:p-9">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
              backgroundSize: "100px 100px",
            }}
          />
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#34d399]/15 blur-3xl" />

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between text-white">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-emerald-100 backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#f6d37a] shadow-[0_0_8px_#f6d37a]" />
                <span>مستويات الدراسة والتقييم</span>
              </div>

              <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                مستويات أحكام التجويد
              </h1>

              <p className="max-w-2xl text-xs font-normal leading-relaxed text-emerald-100/90 sm:text-sm">
                اختر المستوى للوصول إلى المنهاج الكامل، الملخصات المعتمدة، الشروحات المرئية، وبنك الاختبارات الإلكترونية التفاعلية.
              </p>
            </div>

            <div className="hidden sm:flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white shadow-2xl backdrop-blur-md">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-10 w-10 text-[#f7dc8d]"
                strokeWidth="1.6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
          </div>
        </section>

        {/* حالة الخطأ */}
        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <div className="text-3xl">⚠️</div>
            <h2 className="mt-3 text-lg font-black text-red-700">
              حدث خطأ أثناء تحميل المستويات
            </h2>
            <p className="mt-2 text-sm text-red-600">
              يرجى التحقق من الاتصال وإعادة تحديث الصفحة.
            </p>
          </div>
        )}

        {/* حالة عدم وجود مستويات */}
        {!error && (!levels || levels.length === 0) && (
          <div className="rounded-3xl border border-dashed border-[#d8e4dc] bg-white p-12 text-center shadow-sm">
            <div className="text-4xl">📚</div>
            <h2 className="mt-4 text-lg font-black text-[#1b2b24]">
              لا توجد مستويات متاحة حالياً
            </h2>
            <p className="mt-2 text-xs text-[#7b8a82]">
              سيتم نشر وتفعيل المستويات قريباً بإذن الله.
            </p>
          </div>
        )}

        {/* 3. شبكة بطاقات المستويات العصرية */}
        {!error && levels && levels.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {levels.map((level) => (
              <Link
                key={level.id}
                href={`/tajweed/${level.id}`}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#e4ede8] bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:border-emerald-200 hover:shadow-xl"
              >
                {/* شريط تمييز جانبي يظهر عند التحويم */}
                <div className="absolute inset-y-0 right-0 w-1.5 bg-[#124d35] opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ef] text-sm font-black text-[#124d35] ring-1 ring-[#cde3d6] transition-transform group-hover:scale-105">
                    0{level.order}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-[#1b2b24] transition-colors group-hover:text-[#124d35] sm:text-xl">
                      {level.title}
                    </h2>

                    <p className="mt-2 text-xs leading-relaxed text-[#73827a] sm:text-sm">
                      {level.description ||
                        "الوصول إلى محتوى هذا المستوى، الملخصات، والاختبارات التفاعلية."}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#f0f4f2] pt-4">
                  <span className="text-xs font-bold text-[#144d34]">
                    الدخول إلى المادة والدروس
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f4f7f5] text-xs font-bold text-[#144d34] transition-all group-hover:bg-[#124d35] group-hover:text-white group-hover:-translate-x-1">
                    ←
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* التذييل (Footer) */}
      <footer className="mt-14 border-t border-[#d8e5df] bg-[#0c2f21] py-8 text-white">
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
        </div>
      </footer>
    </main>
  );
}