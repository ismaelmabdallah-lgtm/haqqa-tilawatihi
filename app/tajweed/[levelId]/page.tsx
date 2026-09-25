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
  // Load quiz settings, chapters and
  // active question counts
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
  // Create fresh signed URLs for resources
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
    <main className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-3"
            aria-label="العودة إلى الصفحة الرئيسية"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-white shadow-sm">
              ت
            </div>

            <div>
              <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
                مسجد النبي شعيب عليه السلام
              </h1>

              <p className="text-xs text-[var(--muted)]">
                منصة أحكام التجويد
              </p>
            </div>
          </a>

          <a
            href="/tajweed"
            className="rounded-xl bg-[var(--primary-light)] px-3 py-2 text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--primary)] hover:text-white"
          >
            أحكام التجويد
          </a>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        {/* Breadcrumb */}
        <nav
          aria-label="مسار الصفحة"
          className="mb-7 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]"
        >
          <a
            href="/"
            className="transition hover:text-[var(--primary)]"
          >
            الرئيسية
          </a>

          <span>←</span>

          <a
            href="/tajweed"
            className="transition hover:text-[var(--primary)]"
          >
            أحكام التجويد
          </a>

          <span>←</span>

          <span className="font-bold text-[var(--foreground)]">
            {level.title}
          </span>
        </nav>

        {/* Level Hero */}
        <section className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm">
          <div className="border-r-4 border-[var(--primary)] p-6 sm:p-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-3xl">
                📖
              </div>

              <div className="min-w-0">
                <div className="mb-2 inline-flex rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
                  المستوى {level.order}
                </div>

                <h2 className="text-2xl font-black text-[var(--foreground)] sm:text-3xl">
                  {level.title}
                </h2>

                {level.description && (
                  <p className="mt-3 max-w-3xl text-sm leading-8 text-[var(--muted)] sm:text-base">
                    {level.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Quick Navigation */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickLink
            href="#curriculum"
            icon="📘"
            title="المادة التعليمية"
          />

          <QuickLink
            href="#summary"
            icon="📄"
            title="الملخص"
          />

          <QuickLink
            href="#explanations"
            icon="🎥"
            title="الشروحات"
          />

          <QuickLink
            href="#quizzes"
            icon="📝"
            title="الاختبارات"
          />
        </div>

        {/* Curriculum */}
        <section
          id="curriculum"
          className="mt-10 scroll-mt-24"
        >
          <SectionHeading
            icon="📘"
            title="المادة التعليمية"
            description="المادة التعليمية الكاملة لهذا المستوى."
          />

          {curriculum.length > 0 ? (
            <div className="grid gap-4">
              {curriculum.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon="📘"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة المادة التعليمية بعد." />
          )}
        </section>

        {/* Summary */}
        <section
          id="summary"
          className="mt-10 scroll-mt-24"
        >
          <SectionHeading
            icon="📄"
            title="ملخص المستوى"
            description="ملخص المادة التعليمية لهذا المستوى."
          />

          {summaries.length > 0 ? (
            <div className="grid gap-4">
              {summaries.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon="📄"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة الملخص بعد." />
          )}
        </section>

        {/* Explanations */}
        <section
          id="explanations"
          className="mt-10 scroll-mt-24"
        >
          <SectionHeading
            icon="🎥"
            title="الدروس والشروحات"
            description="الشروحات والروابط التعليمية الخاصة بهذا المستوى."
          />

          {explanations.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {explanations.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon={
                    resource.type === "video"
                      ? "🎥"
                      : "🔗"
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة شروحات أو روابط بعد." />
          )}
        </section>

        {/* Ready-made exams */}
        <section className="mt-10">
          <SectionHeading
            icon="📄"
            title="اختبارات جاهزة"
            description="اختبارات وملفات جاهزة يمكن للطالب الاطلاع عليها اختياريًا."
          />

          {exams.length > 0 ? (
            <div className="grid gap-4">
              {exams.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  icon="📝"
                />
              ))}
            </div>
          ) : (
            <EmptyCard text="لم تتم إضافة اختبارات جاهزة بعد." />
          )}
        </section>

        {/* Electronic Quizzes */}
        <section
          id="quizzes"
          className="mt-10 scroll-mt-24"
        >
          <div className="mb-5 rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-2xl">
                📝
              </div>

              <div>
                <h3 className="text-xl font-black text-[var(--foreground)] sm:text-2xl">
                  الاختبارات الإلكترونية
                </h3>

                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  اختبر فهمك للمادة من خلال اختبار شامل للمستوى أو تدرب على باب محدد.
                </p>
              </div>
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

      {/* Footer */}
      <footer className="mt-6 border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-7 text-center sm:px-6">
          <p className="text-sm font-bold text-[var(--foreground)]">
            مسجد النبي شعيب عليه السلام
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            منصة أحكام التجويد
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
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary-light)] text-xl">
          {icon}
        </div>

        <div>
          <h3 className="text-xl font-black text-[var(--foreground)]">
            {title}
          </h3>

          <p className="mt-1 text-sm text-[var(--muted)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Quick Link
// ==========================================

function QuickLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: string;
  title: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 shadow-sm transition hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--background)] text-lg transition group-hover:bg-white">
        {icon}
      </div>

      <span className="flex-1 text-sm font-bold text-[var(--foreground)]">
        {title}
      </span>

      <span className="text-sm text-[var(--muted)] transition group-hover:text-[var(--primary)]">
        ←
      </span>
    </a>
  );
}

// ==========================================
// Resource Card
// ==========================================

function ResourceCard({
  resource,
  icon,
}: {
  resource: DisplayResource;
  icon: string;
}) {
  const resourceUrl = resource.displayUrl;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-xl">
            {icon}
          </div>

          <div className="min-w-0">
            <h4 className="font-black leading-7 text-[var(--foreground)]">
              {resource.title}
            </h4>

            <p className="mt-1 text-xs font-medium text-[var(--muted)]">
              {getResourceTypeLabel(resource.type)}
            </p>
          </div>
        </div>

        {resourceUrl ? (
          <a
            href={resourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            فتح المحتوى
            <span className="mr-2">←</span>
          </a>
        ) : (
          <span className="text-sm text-[var(--muted)]">
            المحتوى غير متاح حاليًا
          </span>
        )}
      </div>
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
    <div className="rounded-3xl border border-dashed border-[var(--border)] bg-white p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--background)] text-2xl">
        📭
      </div>

      <p className="mt-3 text-sm font-medium text-[var(--muted)]">
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