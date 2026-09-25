import { notFound } from "next/navigation";
import QuizRunner from "./QuizRunner";
type QuizPageProps = {
  params: Promise<{
    levelId: string;
  }>;

  searchParams: Promise<{
    mode?: string;
    chapterId?: string;
  }>;
};

export default async function QuizPage({
  params,
  searchParams,
}: QuizPageProps) {
  const { levelId } = await params;
  const query = await searchParams;

  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId)) {
    notFound();
  }

  const mode =
    query.mode === "chapter"
      ? "chapter"
      : "comprehensive";

  const chapterId =
    query.chapterId
      ? Number(query.chapterId)
      : null;

  if (
    mode === "chapter" &&
    (!chapterId ||
      !Number.isInteger(chapterId))
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg text-white">
              ت
            </div>

            <div>
              <h1 className="text-sm font-bold text-[var(--foreground)] sm:text-base">
                مسجد النبي شعيب عليه السلام
              </h1>

              <p className="text-xs text-[var(--muted)]">
                أحكام التجويد
              </p>
            </div>
          </a>

          <a
            href={`/tajweed/${numericLevelId}`}
            className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] transition hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
          >
            العودة للمستوى
          </a>
        </div>
      </header>

      <QuizRunner
        levelId={numericLevelId}
        mode={mode}
        chapterId={chapterId}
      />
    </main>
  );
}