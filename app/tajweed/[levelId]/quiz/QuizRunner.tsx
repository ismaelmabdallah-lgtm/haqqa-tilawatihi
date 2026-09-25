"use client";

import { useEffect, useMemo, useState } from "react";

type QuizMode = "comprehensive" | "chapter";

type Option = {
  key: string;
  text: string;
};

type QuizQuestion = {
  id: number;
  number: number;
  chapterId: number;
  questionText: string;
  options: Option[];
};

type QuizData = {
  mode: QuizMode;
  levelId: number;
  levelTitle: string;
  chapterId?: number;
  chapterTitle?: string;
  numberOfQuestions: number;
  questions: QuizQuestion[];
};

type QuizRunnerProps = {
  levelId: number;
  mode: QuizMode;
  chapterId: number | null;
};

type ChapterAnalysis = {
  chapterId: number;
  chapterTitle: string;
  total: number;
  correct: number;
  wrong: number;
  percentage: number;
};

type ReviewItem = {
  questionId: number;
  chapterId: number;
  chapterTitle: string;
  questionText: string;
  selectedOption: string | null;
  selectedOptionText: string | null;
  correctOption: string;
  correctOptionText: string;
  explanation: string | null;
  isCorrect: boolean;
};

type QuizResult = {
  levelId: number;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  chapterAnalysis: ChapterAnalysis[];
  review: ReviewItem[];
};

export default function QuizRunner({
  levelId,
  mode,
  chapterId,
}: QuizRunnerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<number, string>>(
    {}
  );

  const [bookmarks, setBookmarks] = useState<
    Record<number, boolean>
  >({});

  const [submitting, setSubmitting] = useState(false);

  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true);
        setError("");
        setResult(null);
        setAnswers({});
        setBookmarks({});
        setCurrentIndex(0);

        const response = await fetch("/api/quiz/start", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            levelId,
            mode,
            ...(mode === "chapter" ? { chapterId } : {}),
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "تعذر بدء الاختبار."
          );
        }

        setQuiz(data.quiz);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "حدث خطأ أثناء بدء الاختبار."
        );
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [levelId, mode, chapterId]);

  const answeredCount = useMemo(() => {
    return Object.keys(answers).length;
  }, [answers]);

  function selectAnswer(
    questionId: number,
    optionKey: string
  ) {
    if (result || submitting) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionKey,
    }));
  }

  function toggleBookmark(questionId: number) {
    if (result || submitting) {
      return;
    }

    setBookmarks((previous) => ({
      ...previous,
      [questionId]: !previous[questionId],
    }));
  }

  function goPrevious() {
    setCurrentIndex((previous) =>
      Math.max(previous - 1, 0)
    );
  }

  function goNext() {
    if (!quiz) {
      return;
    }

    setCurrentIndex((previous) =>
      Math.min(
        previous + 1,
        quiz.questions.length - 1
      )
    );
  }

  function jumpToQuestion(index: number) {
    if (result || submitting) {
      return;
    }

    setCurrentIndex(index);
  }

  async function handleSubmit() {
    if (!quiz || submitting) {
      return;
    }

    const unanswered =
      quiz.questions.length - answeredCount;

    if (unanswered > 0) {
      const confirmed = window.confirm(
        `تبقى ${unanswered} أسئلة بدون إجابة. هل تريد إنهاء الاختبار؟`
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");

      const submittedAnswers = quiz.questions.map(
        (question) => ({
          questionId: question.id,
          selectedOption:
            answers[question.id] ?? null,
        })
      );

      const response = await fetch(
        "/api/quiz/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            levelId,
            answers: submittedAnswers,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            "حدث خطأ أثناء تصحيح الاختبار."
        );
      }

      setResult(data.result);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تصحيح الاختبار."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-[var(--primary)]" />

          <p className="mt-5 text-sm font-bold text-[var(--foreground)]">
            جارٍ تجهيز الاختبار...
          </p>

          <p className="mt-2 text-xs text-[var(--muted)]">
            يتم اختيار الأسئلة وترتيب الخيارات عشوائيًا.
          </p>
        </div>
      </section>
    );
  }

  if (error && !quiz) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">⚠️</div>

          <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
            تعذر بدء الاختبار
          </h2>

          <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
            {error || "حدث خطأ غير متوقع."}
          </p>

          <a
            href={`/tajweed/${levelId}`}
            className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            العودة إلى المستوى
          </a>
        </div>
      </section>
    );
  }

  if (!quiz) {
    return null;
  }

  if (result) {
    return (
      <ResultView
        levelId={levelId}
        mode={mode}
        chapterId={chapterId}
        quiz={quiz}
        result={result}
      />
    );
  }

  const currentQuestion =
    quiz.questions[currentIndex];

  if (!currentQuestion) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="text-4xl">⚠️</div>

          <h2 className="mt-4 text-xl font-bold text-[var(--foreground)]">
            لا يوجد سؤال حالي
          </h2>

          <p className="mt-3 text-sm text-[var(--muted)]">
            تعذر تحميل السؤال الحالي.
          </p>

          <a
            href={`/tajweed/${levelId}`}
            className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-bold text-white"
          >
            العودة إلى المستوى
          </a>
        </div>
      </section>
    );
  }

  const progress =
    ((currentIndex + 1) /
      quiz.questions.length) *
    100;

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--primary)]">
              {mode === "comprehensive"
                ? "🎯 الاختبار الشامل"
                : "🎯 اختبار التدريب"}
            </p>

            <h2 className="mt-1 text-xl font-bold text-[var(--foreground)] sm:text-2xl">
              {quiz.levelTitle}
            </h2>

            {quiz.chapterTitle && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                الباب: {quiz.chapterTitle}
              </p>
            )}
          </div>

          <div className="rounded-xl bg-[var(--primary-light)] px-4 py-3 text-center">
            <div className="text-xs text-[var(--muted)]">
              التقدم
            </div>

            <div className="mt-1 font-bold text-[var(--primary)]">
              {currentIndex + 1} /{" "}
              {quiz.questions.length}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-[var(--primary)]">
                السؤال {currentQuestion.number}
              </p>

              <h3 className="mt-3 text-lg font-bold leading-8 text-[var(--foreground)] sm:text-xl">
                {currentQuestion.questionText}
              </h3>
            </div>

            <button
              type="button"
              onClick={() =>
                toggleBookmark(
                  currentQuestion.id
                )
              }
              disabled={submitting}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition ${
                bookmarks[currentQuestion.id]
                  ? "border-amber-300 bg-amber-50 text-amber-600"
                  : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--primary-light)]"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-label="وضع علامة للمراجعة"
              title="وضع علامة للمراجعة"
            >
              {bookmarks[currentQuestion.id]
                ? "★"
                : "☆"}
            </button>
          </div>

          <div className="mt-7 grid gap-3">
            {currentQuestion.options.map(
              (option, index) => {
                const selected =
                  answers[currentQuestion.id] ===
                  option.key;

                const letters = [
                  "أ",
                  "ب",
                  "ج",
                  "د",
                ];

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      selectAnswer(
                        currentQuestion.id,
                        option.key
                      )
                    }
                    disabled={submitting}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-right transition ${
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary-light)]"
                        : "border-[var(--border)] bg-white hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        selected
                          ? "bg-[var(--primary)] text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {letters[index]}
                    </span>

                    <span
                      className={`text-sm leading-7 ${
                        selected
                          ? "font-bold text-[var(--primary-dark)]"
                          : "text-[var(--foreground)]"
                      }`}
                    >
                      {option.text}
                    </span>
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goPrevious}
              disabled={
                currentIndex === 0 ||
                submitting
              }
              className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← السابق
            </button>

            {currentIndex ===
            quiz.questions.length - 1 ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "جارٍ التصحيح..."
                  : "إنهاء الاختبار ✓"}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                التالي →
              </button>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:self-start">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[var(--foreground)]">
              أسئلة الاختبار
            </h3>

            <span className="text-xs text-[var(--muted)]">
              {answeredCount}/
              {quiz.questions.length}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">
            {quiz.questions.map(
              (question, index) => {
                const isCurrent =
                  index === currentIndex;

                const isAnswered = Boolean(
                  answers[question.id]
                );

                const isBookmarked = Boolean(
                  bookmarks[question.id]
                );

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() =>
                      jumpToQuestion(index)
                    }
                    disabled={submitting}
                    className={`relative flex h-10 items-center justify-center rounded-xl border text-xs font-bold transition ${
                      isCurrent
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : isAnswered
                        ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary-dark)]"
                        : "border-[var(--border)] bg-white text-[var(--muted)] hover:bg-[var(--primary-light)]"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {index + 1}

                    {isBookmarked && (
                      <span className="absolute -right-1 -top-1 text-[10px] text-amber-500">
                        ★
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-6 space-y-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-[var(--primary)]" />
              السؤال الحالي
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-[var(--primary)] bg-[var(--primary-light)]" />
              تمت الإجابة
            </div>

            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded border border-[var(--border)] bg-white" />
              لم تتم الإجابة
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-500">
                ★
              </span>
              للمراجعة
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ResultView({
  levelId,
  mode,
  chapterId,
  quiz,
  result,
}: {
  levelId: number;
  mode: QuizMode;
  chapterId: number | null;
  quiz: QuizData;
  result: QuizResult;
}) {
  const percentageColor =
    result.percentage >= 80
      ? "text-emerald-600"
      : result.percentage >= 50
      ? "text-amber-600"
      : "text-red-600";

  return (
    <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Result Hero */}
      <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-10">
        <div className="text-center">
          <div className="text-5xl">
            {result.percentage >= 80
              ? "🎉"
              : result.percentage >= 50
              ? "👏"
              : "📚"}
          </div>

          <p className="mt-4 text-sm font-bold text-[var(--primary)]">
            تم تصحيح الاختبار
          </p>

          <h2 className="mt-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
            {quiz.levelTitle}
          </h2>

          {quiz.chapterTitle && (
            <p className="mt-2 text-sm text-[var(--muted)]">
              {quiz.chapterTitle}
            </p>
          )}

          <div className="mt-7">
            <div
              className={`text-6xl font-black ${percentageColor}`}
            >
              {result.percentage}%
            </div>

            <p className="mt-3 text-sm text-[var(--muted)]">
              {result.correctCount} من{" "}
              {result.totalQuestions} إجابة صحيحة
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            icon="📊"
            title="النتيجة"
            value={`${result.correctCount}/${result.totalQuestions}`}
          />

          <StatCard
            icon="✓"
            title="إجابات صحيحة"
            value={String(
              result.correctCount
            )}
          />

          <StatCard
            icon="✕"
            title="إجابات خاطئة"
            value={String(result.wrongCount)}
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <a
            href={`/tajweed/${levelId}/quiz?mode=${mode}${
              mode === "chapter"
                ? `&chapterId=${chapterId}`
                : ""
            }`}
            className="rounded-xl bg-[var(--primary)] px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
          >
            🔄 إعادة الاختبار
          </a>

          <a
            href={`/tajweed/${levelId}`}
            className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-center text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
          >
            📚 العودة إلى المستوى
          </a>
        </div>
      </div>

      {/* Chapter Analysis */}
      {result.chapterAnalysis.length > 0 && (
        <section className="mt-6">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-[var(--foreground)]">
              📊 تحليل الاختبار حسب الأبواب
            </h3>

            <p className="mt-1 text-sm text-[var(--muted)]">
              يوضح هذا القسم أداءك في كل باب من أبواب
              الاختبار.
            </p>
          </div>

          <div className="grid gap-4">
            {result.chapterAnalysis.map(
              (chapter) => (
                <div
                  key={chapter.chapterId}
                  className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-bold text-[var(--foreground)]">
                        {chapter.chapterTitle}
                      </h4>

                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {chapter.correct} صحيحة من{" "}
                        {chapter.total}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xl font-black text-[var(--primary)]">
                        {chapter.percentage}%
                      </div>

                      <div className="mt-1 text-xs text-[var(--muted)]">
                        ✓ {chapter.correct}{" "}
                        <span className="mx-1">
                          |
                        </span>
                        ✕ {chapter.wrong}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[var(--primary)] transition-all"
                      style={{
                        width: `${chapter.percentage}%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Review */}
      <section className="mt-8">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-[var(--foreground)]">
            📖 مراجعة الأسئلة
          </h3>

          <p className="mt-1 text-sm text-[var(--muted)]">
            راجع إجاباتك وتعرّف على الإجابة الصحيحة
            والشرح.
          </p>
        </div>

        <div className="space-y-5">
          {result.review.map(
            (item, index) => (
              <ReviewCard
                key={item.questionId}
                item={item}
                number={index + 1}
              />
            )
          )}
        </div>
      </section>
    </section>
  );
}

function StatCard({
  icon,
  title,
  value,
}: {
  icon: string;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5 text-center">
      <div className="text-2xl">{icon}</div>

      <p className="mt-2 text-xs text-[var(--muted)]">
        {title}
      </p>

      <p className="mt-1 text-xl font-black text-[var(--foreground)]">
        {value}
      </p>
    </div>
  );
}

function ReviewCard({
  item,
  number,
}: {
  item: ReviewItem;
  number: number;
}) {
  return (
    <article
      className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-7 ${
        item.isCorrect
          ? "border-emerald-200"
          : "border-red-200"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[var(--primary)]">
            السؤال {number}
          </p>

          <p className="mt-1 text-xs text-[var(--muted)]">
            الباب: {item.chapterTitle}
          </p>
        </div>

        <div
          className={`inline-flex w-fit rounded-xl px-3 py-2 text-xs font-bold ${
            item.isCorrect
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {item.isCorrect
            ? "✓ إجابة صحيحة"
            : "✕ إجابة خاطئة"}
        </div>
      </div>

      <h4 className="mt-5 text-base font-bold leading-8 text-[var(--foreground)] sm:text-lg">
        {item.questionText}
      </h4>

      <div className="mt-5 grid gap-3">
        <div
          className={`rounded-2xl border p-4 ${
            item.isCorrect
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p className="text-xs font-bold text-[var(--muted)]">
            إجابتك
          </p>

          <p className="mt-2 text-sm font-bold leading-7 text-[var(--foreground)]">
            {item.selectedOptionText ??
              "لم تتم الإجابة"}
          </p>
        </div>

        {!item.isCorrect && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-700">
              الإجابة الصحيحة
            </p>

            <p className="mt-2 text-sm font-bold leading-7 text-[var(--foreground)]">
              {item.correctOptionText}
            </p>
          </div>
        )}
      </div>

      {item.explanation && (
        <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-bold text-[var(--primary)]">
            💡 الشرح
          </p>

          <p className="mt-2 text-sm leading-7 text-[var(--foreground)]">
            {item.explanation}
          </p>
        </div>
      )}
    </article>
  );
}