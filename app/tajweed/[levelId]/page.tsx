import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import QuizSection from "./QuizSection";

type LevelPageProps = {
  params: Promise<{
    levelId: string;
  }>;
};

type Resource = {
  id: number;
  title: string;
  type: string;
  url: string | null;
  storage_path: string | null;
  order: number;
};

type DisplayResource = Resource & {
  displayUrl: string | null;
};

type Chapter = {
  id: number;
  title: string;
  order: number;
  activeQuestionCount: number;
};

type QuizSettings = {
  number_of_questions: number;
  distribution_mode: "equal";
  question_order_mode: "by_chapter" | "mixed";
  is_active: boolean;
};

export default async function LevelPage({ params }: LevelPageProps) {
  const { levelId } = await params;
  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId)) {
    notFound();
  }

  // ==========================================
  // Get level
  // ==========================================
  const { data: level, error: levelError } = await supabase
    .from("levels")
    .select("id, title, description, order")
    .eq("id", numericLevelId)
    .eq("is_active", true)
    .single();

  if (levelError || !level) {
    notFound();
  }

  // ==========================================
  // Get educational resources
  // ==========================================
  const { data: resources, error: resourcesError } = await supabase
    .from("resources")
    .select("id, title, type, url, storage_path, order")
    .eq("level_id", numericLevelId)
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (resourcesError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f9f8] px-4 font-sans" dir="rtl">
        <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">
            ⚠️
          </div>
          <h1 className="mt-5 text-lg font-black text-[#17251f]">
            حدث خطأ أثناء تحميل المحتوى
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#6a776f]">
            تعذر تحميل المواد التعليمية. حاول تحديث الصفحة مرة أخرى.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[#13593b] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#0f442d]"
          >
            العودة إلى الرئيسية
          </a>
        </div>
      </main>
    );
  }

  // ==========================================
  // Load chapters + quiz settings + questions
  // ==========================================
  const [
    { data: chapters },
    { data: quizSettings },
    { data: activeQuestions },
  ] = await Promise.all([
    supabase
      .from("chapters")
      .select("id, title, order")
      .eq("level_id", numericLevelId)
      .eq("is_active", true)
      .order("order", { ascending: true }),

    supabase
      .from("quiz_settings")
      .select("number_of_questions, distribution_mode, question_order_mode, is_active")
      .eq("level_id", numericLevelId)
      .maybeSingle(),

    supabaseAdmin
      .from("questions")
      .select("id, chapter_id")
      .eq("level_id", numericLevelId)
      .eq("is_active", true),
  ]);

  // ==========================================
  // Count active questions per chapter
  // ==========================================
  const questionCounts = new Map<number, number>();
  for (const question of activeQuestions ?? []) {
    const currentCount = questionCounts.get(question.chapter_id) ?? 0;
    questionCounts.set(question.chapter_id, currentCount + 1);
  }

  const activeChapters: Chapter[] = (chapters ?? []).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    activeQuestionCount: questionCounts.get(chapter.id) ?? 0,
  }));

  const settings: QuizSettings = {
    number_of_questions: quizSettings?.number_of_questions ?? 15,
    distribution_mode: quizSettings?.distribution_mode ?? "equal",
    question_order_mode: quizSettings?.question_order_mode ?? "by_chapter",
    is_active: quizSettings?.is_active ?? true,
  };

  // ==========================================
  // Prepare resources
  // ==========================================
  const allResources: Resource[] = resources ?? [];
  const displayResources: DisplayResource[] = allResources.map((resource) => ({
    ...resource,
    displayUrl: resource.url || resource.storage_path,
  }));

  const curriculum = displayResources.filter((r) => r.type === "curriculum");
  const summaries = displayResources.filter((r) => r.type === "summary");
  const explanations = displayResources.filter((r) => r.type === "video" || r.type === "link");
  const exams = displayResources.filter((r) => r.type === "exam");

  return (
    <main className="min-h-screen bg-[#f8faf9] text-[#1c2923]" dir="rtl">

      {/* ========================================
          1. Header مع الشعار الإسلامي الفاخر
      ======================================== */}
      <header className="sticky top-0 z-40 border-b border-[#e5ece8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">

          <a
            href="/"
            className="group flex items-center gap-3 transition-opacity hover:opacity-95"
            aria-label="العودة إلى الصفحة الرئيسية"
          >
            {/* الشعار المخصص (أيقونة النجمة الثمانية والمصحف) */}
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#124d35] to-[#0a2e20] p-2 shadow-sm shadow-[#124d35]/20 ring-1 ring-emerald-950/5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-full w-full text-[#e8c67c]"
              >
                {/* زخرفة النجمة الثمانية الخارجية */}
                <path
                  d="M12 2L14.7 4.7L18.5 4.5L19.5 8.2L22.5 10.5L21.5 14.2L23 17.5L19.5 19L17.5 22.5L13.8 21.8L12 24L10.2 21.8L6.5 22.5L4.5 19L1 17.5L2.5 14.2L1.5 10.5L4.5 8.2L5.5 4.5L9.3 4.7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="0.8"
                  strokeOpacity="0.45"
                  fill="none"
                />
                {/* رسمة المصحف الشريف بتفاصيل أنيقة */}
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
          </a>

          <a
            href="/tajweed"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-900/10 bg-[#eef5f1] px-3.5 py-2 text-xs font-bold text-[#144d34] transition hover:bg-[#144d34] hover:text-white hover:shadow-sm"
          >
            <span>أحكام التجويد</span>
            <span className="text-[10px]">←</span>
          </a>
        </div>
      </header>

      {/* ========================================
          Main Content
      ======================================== */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">

        {/* Breadcrumb */}
        <nav
          aria-label="مسار الصفحة"
          className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-[#76857d]"
        >
          <a href="/" className="transition hover:text-[#124d35]">
            الرئيسية
          </a>
          <span className="text-[#a5b2ab]">/</span>
          <a href="/tajweed" className="transition hover:text-[#124d35]">
            أحكام التجويد
          </a>
          <span className="text-[#a5b2ab]">/</span>
          <span className="font-bold text-[#1a2f26]">{level.title}</span>
        </nav>

        {/* ========================================
            2. Hero Banner الملكي الفاخر للمستوى
        ======================================== */}
        <section className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c3826] via-[#124d35] to-[#1c6b4b] p-6 shadow-xl shadow-[#0c3826]/10 sm:p-9">
          {/* زخرفة خلفية إسلامية دقيقة */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)`,
              backgroundSize: "100px 100px",
            }}
          />

          {/* وهج ضوئي خفيف في الزاوية */}
          <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-[#34d399]/15 blur-3xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              {/* شارة رقم المستوى بستايل زجاجي راقٍ */}
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-emerald-100 shadow-inner backdrop-blur-md">
                <span className="h-2 w-2 rounded-full bg-[#f6d37a] shadow-[0_0_8px_#f6d37a]" />
                <span>المستوى {level.order}</span>
              </div>

              {/* عنوان المستوى */}
              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
                {level.title}
              </h2>

              {/* الوصف */}
              {level.description && (
                <p className="max-w-2xl text-xs font-normal leading-relaxed text-emerald-100/90 sm:text-sm">
                  {level.description}
                </p>
              )}
            </div>

            {/* أيقونة رمزية جانبية فخمة */}
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

        {/* ========================================
            أبواب المستوى
        ======================================== */}
        {activeChapters.length > 0 && (
          <section className="mb-8">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#efeae0] text-sm text-[#8c6b2d]">
                📚
              </div>
              <div>
                <h3 className="text-base font-black text-[#192b23]">
                  أبواب المستوى
                </h3>
                <p className="text-[11px] text-[#76857d]">
                  الأبواب والدروس المقررة في هذا المستوى
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeChapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="group flex items-center gap-3 rounded-2xl border border-[#e4ede8] bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f7f5ed] text-xs font-black text-[#8c6b2d] ring-1 ring-[#e8dfcb]">
                    {index + 1}
                  </div>
                  <span className="min-w-0 text-sm font-bold text-[#23352c] group-hover:text-[#124d35]">
                    {chapter.title}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ========================================
            المادة التعليمية
        ======================================== */}
        <section id="curriculum" className="mb-8 scroll-mt-20">
          <SectionHeading
            icon="📘"
            title="المادة التعليمية"
            description="المنهاج والكتب المعتمدة لهذا المستوى."
            color="green"
          />
          {curriculum.length > 0 ? (
            <div className="grid gap-2.5">
              {curriculum.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon="📘"
                  color="green"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة المادة التعليمية بعد." />
          )}
        </section>

        {/* ========================================
            الملخصات
        ======================================== */}
        <section id="summary" className="mb-8 scroll-mt-20">
          <SectionHeading
            icon="📄"
            title="الملخصات"
            description="ملخصات تفصيلية وجداول لتيسير الحفظ والمراجعة."
            color="blue"
          />
          {summaries.length > 0 ? (
            <div className="grid gap-2.5">
              {summaries.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon="📄"
                  color="blue"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم يتم رفع أي ملخصات لهذا المستوى بعد." />
          )}
        </section>

        {/* ========================================
            الشروحات
        ======================================== */}
        <section id="explanations" className="mb-8 scroll-mt-20">
          <SectionHeading
            icon="🎥"
            title="الشروحات والدروس"
            description="تسجيلات مرئية ودروس مسجلة لشرح المادة."
            color="purple"
          />
          {explanations.length > 0 ? (
            <div className="grid gap-2.5">
              {explanations.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon={resource.type === "video" ? "🎥" : "🔗"}
                  color="purple"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة شروحات فيديو بعد." />
          )}
        </section>

        {/* ========================================
            اختبارات جاهزة
        ======================================== */}
        <section className="mb-8">
          <SectionHeading
            icon="📝"
            title="نماذج اختبارات سابقة"
            description="نماذج امتحانات أوقاف سابقة للتدريب والاطلاع."
            color="gold"
          />
          {exams.length > 0 ? (
            <div className="grid gap-2.5">
              {exams.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon="📝"
                  color="gold"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة اختبارات سابقة بعد." />
          )}
        </section>

        {/* ========================================
            الاختبارات الإلكترونية
        ======================================== */}
        <section id="quizzes" className="mb-10 scroll-mt-20">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eaf4ef] text-sm text-[#144d34]">
              ✨
            </div>
            <div>
              <h3 className="text-base font-black text-[#192b23]">
                الاختبارات الإلكترونية التفاعلية
              </h3>
              <p className="text-[11px] text-[#76857d]">
                تدرّب على أسئلة الأبواب واختبر تحصيلك فوراً مع التصحيح التلقائي.
              </p>
            </div>
          </div>

          <QuizSection
            levelId={numericLevelId}
            levelTitle={level.title}
            chapters={activeChapters}
            settings={settings}
          />
        </section>

      </section>

      {/* ========================================
          Footer
      ======================================== */}
      <footer className="mt-12 border-t border-[#d8e5df] bg-[#0c2f21] py-8 text-white">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="text-sm font-bold tracking-wide">
            حَقَّ تِلَاوَتِهِ
          </p>
          <p className="mt-1 text-xs text-emerald-200/80">
            منصة إتقان تلاوة القرآن الكريم
          </p>
          <p className="mt-3 text-[11px] text-emerald-300/50">
            من إعداد وإشراف دار القرآن في مسجد النبي شعيب عليه السلام
          </p>
        </div>
      </footer>

    </main>
  );
}

// ==========================================
// مكون رأس القسم
// ==========================================
function SectionHeading({
  icon,
  title,
  description,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  color: "green" | "blue" | "purple" | "gold";
}) {
  const colors = {
    green: { box: "bg-[#eaf4ef] text-[#13593b]" },
    blue: { box: "bg-[#edf4f9] text-[#2c6591]" },
    purple: { box: "bg-[#f3edf7] text-[#6d448c]" },
    gold: { box: "bg-[#fbf4e4] text-[#8f6e2b]" },
  };

  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${colors[color].box}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-bold text-[#1b2b24] sm:text-base">{title}</h3>
        <p className="text-[11px] text-[#73827a]">{description}</p>
      </div>
    </div>
  );
}

// ==========================================
// كرت المادة التعليمية
// ==========================================
function ResourceCard({
  resource,
  icon,
  color,
}: {
  resource: DisplayResource;
  icon: string;
  color: "green" | "blue" | "purple" | "gold";
}) {
  const resourceUrl = resource.displayUrl;

  const btnStyles = {
    green: "bg-[#13593b] hover:bg-[#0f442d]",
    blue: "bg-[#275e88] hover:bg-[#1f4a6b]",
    purple: "bg-[#673e86] hover:bg-[#52306c]",
    gold: "bg-[#8f6e2b] hover:bg-[#725721]",
  };

  return (
    <div className="flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border border-[#e4ede8] bg-white px-4 py-3 shadow-sm transition hover:border-[#cbddd3] hover:shadow-md">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f7f5] text-base">
          {icon}
        </div>
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-[#23352c]">
            {resource.title}
          </h4>
          <p className="mt-0.5 text-[10px] font-medium text-[#7c8b83]">
            {getResourceTypeLabel(resource.type)}
          </p>
        </div>
      </div>

      {resourceUrl ? (
        <a
          href={resourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition ${btnStyles[color]}`}
        >
          <span>فتح</span>
          <span className="text-[10px]">←</span>
        </a>
      ) : (
        <span className="shrink-0 rounded-lg bg-[#f0f3f1] px-3 py-1.5 text-[10px] font-medium text-[#7f8e86]">
          غير متاح
        </span>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d8e4dc] bg-white px-5 py-6 text-center">
      <p className="text-xs font-medium text-[#7b8a82]">{text}</p>
    </div>
  );
}

function getResourceTypeLabel(type: string) {
  switch (type) {
    case "curriculum":
      return "المادة التعليمية الرسمية";
    case "summary":
      return "ملخص شامل";
    case "video":
      return "شرح مرئي";
    case "link":
      return "رابط خارجي";
    case "exam":
      return "امتحان أوقاف سابق";
    case "pdf":
      return "ملف PDF";
    default:
      return "محتوى تعليمي";
  }
}