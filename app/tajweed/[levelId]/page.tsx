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

export default async function LevelPage({
  params,
}: LevelPageProps) {
  const { levelId } = await params;

  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId)) {
    notFound();
  }

  // ==========================================
  // Get level
  // ==========================================

  const { data: level, error: levelError } =
    await supabase
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

  const { data: resources, error: resourcesError } =
    await supabase
      .from("resources")
      .select(
        "id, title, type, url, storage_path, order"
      )
      .eq("level_id", numericLevelId)
      .eq("is_active", true)
      .order("order", {
        ascending: true,
      });

  if (resourcesError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-3xl">
            ⚠️
          </div>

          <h1 className="mt-5 text-lg font-black text-[var(--foreground)]">
            حدث خطأ أثناء تحميل المحتوى
          </h1>

          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            تعذر تحميل المواد التعليمية. حاول تحديث الصفحة مرة أخرى.
          </p>

          <a
            href="/"
            className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
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
      .order("order", {
        ascending: true,
      }),

    supabase
      .from("quiz_settings")
      .select(
        "number_of_questions, distribution_mode, question_order_mode, is_active"
      )
      .eq("level_id", numericLevelId)
      .maybeSingle(),

    /*
     * Questions are protected by RLS.
     * We use supabaseAdmin only to calculate
     * active question counts.
     *
     * Question contents are never sent
     * to the browser from this page.
     */
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
    const currentCount =
      questionCounts.get(question.chapter_id) ?? 0;

    questionCounts.set(
      question.chapter_id,
      currentCount + 1
    );
  }

  // ==========================================
  // Prepare chapters for QuizSection
  // ==========================================

  const activeChapters: Chapter[] = (
    chapters ?? []
  ).map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    activeQuestionCount:
      questionCounts.get(chapter.id) ?? 0,
  }));

  // ==========================================
  // Quiz settings
  // ==========================================

  const settings: QuizSettings = {
    number_of_questions:
      quizSettings?.number_of_questions ?? 15,

    distribution_mode:
      quizSettings?.distribution_mode ?? "equal",

    question_order_mode:
      quizSettings?.question_order_mode ?? "by_chapter",

    is_active:
      quizSettings?.is_active ?? true,
  };

  // ==========================================
  // Create fresh signed URLs
  // ==========================================

  const allResources: Resource[] =
    resources ?? [];

  const displayResources: DisplayResource[] =
    await Promise.all(
      allResources.map(async (resource) => {
        if (resource.storage_path) {
          const {
            data: signedUrlData,
            error: signedUrlError,
          } = await supabaseAdmin.storage
            .from("educational-files")
            .createSignedUrl(
              resource.storage_path,
              60 * 60
            );

          if (
            !signedUrlError &&
            signedUrlData?.signedUrl
          ) {
            return {
              ...resource,
              displayUrl:
                signedUrlData.signedUrl,
            };
          }

          return {
            ...resource,
            displayUrl: null,
          };
        }

        return {
          ...resource,
          displayUrl: resource.url,
        };
      })
    );

  // ==========================================
  // Categorize resources
  // ==========================================

  const curriculum =
    displayResources.filter(
      (resource) =>
        resource.type === "curriculum"
    );

  const summaries =
    displayResources.filter(
      (resource) =>
        resource.type === "summary"
    );

  const explanations =
    displayResources.filter(
      (resource) =>
        resource.type === "video" ||
        resource.type === "link"
    );

  const exams =
    displayResources.filter(
      (resource) =>
        resource.type === "exam"
    );

  // ==========================================
  // Page
  // ==========================================

  return (
    <main className="min-h-screen bg-[#f6f8f6]">

      {/* ========================================
          Header
      ======================================== */}

      <header className="sticky top-0 z-40 border-b border-[#dfe8e2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

          <a
            href="/"
            className="flex items-center gap-2.5"
            aria-label="العودة إلى الصفحة الرئيسية"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1f6b4f] text-base font-bold text-white shadow-sm">
              ت
            </div>

            <div>
              <h1 className="text-sm font-bold text-[#17251f]">
                حَقَّ تِلَاوَتِهِ
              </h1>

              <p className="text-[11px] text-[#6a776f]">
                منصة إتقان تلاوة القرآن الكريم
              </p>
            </div>
          </a>

          <a
            href="/tajweed"
            className="rounded-xl bg-[#edf5f0] px-3 py-2 text-xs font-bold text-[#1f6b4f] transition hover:bg-[#1f6b4f] hover:text-white"
          >
            أحكام التجويد
          </a>
        </div>
      </header>

      {/* ========================================
          Main
      ======================================== */}

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">

        {/* Breadcrumb */}

        <nav
          aria-label="مسار الصفحة"
          className="mb-4 flex flex-wrap items-center gap-2 text-xs text-[#748078]"
        >
          <a
            href="/"
            className="transition hover:text-[#1f6b4f]"
          >
            الرئيسية
          </a>

          <span>←</span>

          <a
            href="/tajweed"
            className="transition hover:text-[#1f6b4f]"
          >
            أحكام التجويد
          </a>

          <span>←</span>

          <span className="font-bold text-[#17251f]">
            {level.title}
          </span>
        </nav>

        {/* ========================================
            Level Header
        ======================================== */}

        <section className="overflow-hidden rounded-2xl border border-[#dce7e0] bg-gradient-to-l from-[#e8f3ed] via-white to-white shadow-sm">
          <div className="flex items-center gap-4 border-r-4 border-[#1f6b4f] px-5 py-5 sm:px-7">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1f6b4f] text-2xl text-white shadow-sm">
              📖
            </div>

            <div className="min-w-0">
              <div className="mb-1 inline-flex rounded-full bg-[#dceee5] px-2.5 py-1 text-[10px] font-bold text-[#1f6b4f]">
                المستوى {level.order}
              </div>

              <h2 className="text-xl font-black text-[#17251f] sm:text-2xl">
                {level.title}
              </h2>

              {level.description && (
                <p className="mt-1 text-xs leading-6 text-[#68756e] sm:text-sm">
                  {level.description}
                </p>
              )}
            </div>

          </div>
        </section>

        {/* ========================================
            Chapters
        ======================================== */}

        {activeChapters.length > 0 && (
          <section className="mt-5">

            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1e9d8] text-sm">
                📚
              </div>

              <div>
                <h3 className="text-base font-black text-[#17251f]">
                  أبواب المستوى
                </h3>

                <p className="text-[11px] text-[#748078]">
                  الأبواب التي يتضمنها هذا المستوى
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {activeChapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className="flex items-center gap-3 rounded-xl border border-[#e4e8e4] bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f5f0e5] text-xs font-black text-[#9a7835]">
                    {index + 1}
                  </div>

                  <span className="min-w-0 text-sm font-bold text-[#27352e]">
                    {chapter.title}
                  </span>
                </div>
              ))}
            </div>

          </section>
        )}

        {/* ========================================
            Educational Material
        ======================================== */}

        <section
          id="curriculum"
          className="mt-7 scroll-mt-20"
        >
          <SectionHeading
            icon="📘"
            title="المادة التعليمية"
            description="المادة التعليمية الكاملة لهذا المستوى."
            color="green"
          />

          {curriculum.length > 0 ? (
            <div className="grid gap-2">
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
            Summary
        ======================================== */}

        <section
          id="summary"
          className="mt-7 scroll-mt-20"
        >
          <SectionHeading
            icon="📄"
            title="الملخص"
            description="ملخص المادة التعليمية لهذا المستوى."
            color="blue"
          />

          {summaries.length > 0 ? (
            <div className="grid gap-2">
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
            <EmptyCard text="لم تتم إضافة الملخص بعد." />
          )}
        </section>

        {/* ========================================
            Explanations
        ======================================== */}

        <section
          id="explanations"
          className="mt-7 scroll-mt-20"
        >
          <SectionHeading
            icon="🎥"
            title="الشروحات"
            description="الدروس والروابط التعليمية الخاصة بهذا المستوى."
            color="purple"
          />

          {explanations.length > 0 ? (
            <div className="grid gap-2">
              {explanations.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon={
                    resource.type === "video"
                      ? "🎥"
                      : "🔗"
                  }
                  color="purple"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة شروحات أو روابط بعد." />
          )}
        </section>

        {/* ========================================
            Ready-made Exams
        ======================================== */}

        <section className="mt-7">
          <SectionHeading
            icon="📝"
            title="اختبارات جاهزة"
            description="ملفات اختبارات يمكن للطالب الاطلاع عليها اختياريًا."
            color="gold"
          />

          {exams.length > 0 ? (
            <div className="grid gap-2">
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
            <EmptyCard text="لم تتم إضافة اختبارات جاهزة بعد." />
          )}
        </section>

        {/* ========================================
            Electronic Quizzes
        ======================================== */}

        <section
          id="quizzes"
          className="mt-7 scroll-mt-20"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9f3ee] text-sm">
              📝
            </div>

            <div>
              <h3 className="text-base font-black text-[#17251f]">
                الاختبارات الإلكترونية
              </h3>

              <p className="text-[11px] text-[#748078]">
                اختبر فهمك للمادة وتدرّب على الأبواب.
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

      <footer className="mt-8 border-t border-[#dfe8e2] bg-[#173f31]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center sm:px-6">
          <p className="text-sm font-bold text-white">
            حَقَّ تِلَاوَتِهِ
          </p>

          <p className="mt-1 text-[11px] text-[#c7d8cf]">
            منصة إتقان تلاوة القرآن الكريم
          </p>

          <p className="mt-2 text-[10px] text-[#a9c1b5]">
            من إعداد وإشراف دار القرآن في مسجد النبي شعيب عليه السلام
          </p>
        </div>
      </footer>

    </main>
  );
}

// ==========================================
// Section Heading
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
    green: {
      box: "bg-[#e8f3ed]",
      text: "text-[#1f6b4f]",
    },
    blue: {
      box: "bg-[#eaf1f7]",
      text: "text-[#416b8d]",
    },
    purple: {
      box: "bg-[#f0ebf5]",
      text: "text-[#765b91]",
    },
    gold: {
      box: "bg-[#f5efdf]",
      text: "text-[#94743a]",
    },
  };

  const current = colors[color];

  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${current.box}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <h3
          className={`text-base font-black ${current.text}`}
        >
          {title}
        </h3>

        <p className="text-[11px] text-[#748078]">
          {description}
        </p>
      </div>
    </div>
  );
}

// ==========================================
// Resource Card
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

  const colors = {
    green: {
      icon: "bg-[#e8f3ed] text-[#1f6b4f]",
      button: "bg-[#1f6b4f] hover:bg-[#174f3b]",
    },
    blue: {
      icon: "bg-[#eaf1f7] text-[#416b8d]",
      button: "bg-[#416b8d] hover:bg-[#345974]",
    },
    purple: {
      icon: "bg-[#f0ebf5] text-[#765b91]",
      button: "bg-[#765b91] hover:bg-[#624a79]",
    },
    gold: {
      icon: "bg-[#f5efdf] text-[#94743a]",
      button: "bg-[#94743a] hover:bg-[#795f30]",
    },
  };

  const current = colors[color];

  return (
    <div className="flex min-h-[62px] items-center gap-3 rounded-xl border border-[#e1e7e3] bg-white px-3 py-2.5 shadow-sm transition hover:shadow-md">

      {/* Icon */}

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base ${current.icon}`}
      >
        {icon}
      </div>

      {/* Title */}

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-bold text-[#24332c]">
          {resource.title}
        </h4>

        <p className="mt-0.5 text-[10px] font-medium text-[#7a867f]">
          {getResourceTypeLabel(resource.type)}
        </p>
      </div>

      {/* Open */}

      {resourceUrl ? (
        <a
          href={resourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex shrink-0 items-center justify-center rounded-lg px-3.5 py-2 text-xs font-bold text-white transition ${current.button}`}
        >
          فتح
          <span className="mr-1.5">←</span>
        </a>
      ) : (
        <span className="shrink-0 rounded-lg bg-[#f1f3f1] px-3 py-2 text-[10px] font-medium text-[#7b857f]">
          غير متاح
        </span>
      )}

    </div>
  );
}

// ==========================================
// Empty Card
// ==========================================

function EmptyCard({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[#dce4df] bg-white px-5 py-5 text-center">
      <p className="text-xs font-medium text-[#7a867f]">
        {text}
      </p>
    </div>
  );
}

// ==========================================
// Resource Type Label
// ==========================================

function getResourceTypeLabel(type: string) {
  switch (type) {
    case "curriculum":
      return "المادة التعليمية";

    case "summary":
      return "ملخص";

    case "video":
      return "شرح فيديو";

    case "link":
      return "رابط تعليمي";

    case "exam":
      return "اختبار جاهز";

    case "pdf":
      return "ملف PDF";

    case "file":
      return "ملف تعليمي";

    default:
      return "محتوى تعليمي";
  }
}