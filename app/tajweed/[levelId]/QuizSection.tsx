"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

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

type QuizSectionProps = {
  levelId: number;
  levelTitle: string;
  chapters: Chapter[];
  settings: QuizSettings;
};

export default function QuizSection({
  levelId,
  levelTitle,
  chapters,
  settings,
}: QuizSectionProps) {
  const [selectedChapterId, setSelectedChapterId] =
    useState<string>("");

  /*
   * حساب التوزيع الحقيقي للاختبار الشامل.
   *
   * مثال:
   * 15 سؤالًا / 3 أبواب
   *
   * كل باب = 5 أسئلة
   *
   * مثال آخر:
   * 16 سؤالًا / 3 أبواب
   *
   * الباب الأول = 6
   * الباب الثاني = 5
   * الباب الثالث = 5
   */
  const requiredQuestionsByChapter =
    useMemo(() => {
      const result = new Map<number, number>();

      if (chapters.length === 0) {
        return result;
      }

      const base = Math.floor(
        settings.number_of_questions /
          chapters.length
      );

      const remainder =
        settings.number_of_questions %
        chapters.length;

      chapters.forEach((chapter, index) => {
        const required =
          base +
          (index < remainder ? 1 : 0);

        result.set(chapter.id, required);
      });

      return result;
    }, [
      chapters,
      settings.number_of_questions,
    ]);

  const distributionText = useMemo(() => {
    if (chapters.length === 0) {
      return "لا توجد أبواب فعالة حاليًا.";
    }

    const base = Math.floor(
      settings.number_of_questions /
        chapters.length
    );

    const remainder =
      settings.number_of_questions %
      chapters.length;

    if (remainder === 0) {
      return `${base} أسئلة من كل باب`;
    }

    return "توزيع متساوٍ قدر الإمكان بين الأبواب";
  }, [
    chapters.length,
    settings.number_of_questions,
  ]);

  /*
   * نتحقق من جاهزية كل باب للاختبار الشامل.
   */
  const readiness = useMemo(() => {
    if (chapters.length === 0) {
      return {
        ready: false,
        missingChapters: [],
      };
    }

    const missingChapters = chapters.filter(
      (chapter) => {
        const required =
          requiredQuestionsByChapter.get(
            chapter.id
          ) ?? 0;

        return (
          chapter.activeQuestionCount <
          required
        );
      }
    );

    return {
      ready: missingChapters.length === 0,
      missingChapters,
    };
  }, [
    chapters,
    requiredQuestionsByChapter,
  ]);

  const comprehensiveReady =
    settings.is_active &&
    readiness.ready;

  const selectedChapter =
    chapters.find(
      (chapter) =>
        String(chapter.id) ===
        selectedChapterId
    );

  const trainingReady =
    settings.is_active &&
    selectedChapter !== undefined &&
    selectedChapter.activeQuestionCount > 0;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
      {/* Section heading */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-light)] text-xl">
          🎯
        </div>

        <div>
          <h3 className="text-xl font-bold text-[var(--foreground)]">
            اختبارات المستوى
          </h3>

          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            اختبر فهمك وتدرّب على أحكام التجويد في هذا المستوى.
          </p>
        </div>
      </div>

      {!settings.is_active ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-800">
          الاختبارات الإلكترونية غير مفعلة حاليًا لهذا المستوى.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {/* Comprehensive */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl">
                  📚
                </div>

                <h4 className="mt-3 font-bold text-[var(--foreground)]">
                  الاختبار الشامل
                </h4>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  comprehensiveReady
                    ? "bg-[var(--primary-light)] text-[var(--primary)]"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {comprehensiveReady
                  ? "جاهز"
                  : "غير جاهز"}
              </span>
            </div>

            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              اختبار يغطي جميع أبواب {levelTitle}، مع توزيع الأسئلة
              بالتساوي قدر الإمكان بين الأبواب.
            </p>

            <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="text-[var(--muted)]">
                  عدد الأسئلة
                </span>

                <strong className="text-[var(--foreground)]">
                  {settings.number_of_questions}
                </strong>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-[var(--muted)]">
                  التوزيع
                </span>

                <strong className="text-right text-[var(--foreground)]">
                  {distributionText}
                </strong>
              </div>

              <div className="mt-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-[var(--muted)]">
                  ترتيب الأسئلة
                </span>

                <strong className="text-[var(--foreground)]">
                  {settings.question_order_mode ===
                  "mixed"
                    ? "مختلط"
                    : "حسب الأبواب"}
                </strong>
              </div>
            </div>

            {/* Readiness details */}
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-[var(--foreground)]">
                  جاهزية الأبواب
                </span>

                <span
                  className={`text-xs font-bold ${
                    comprehensiveReady
                      ? "text-[var(--primary)]"
                      : "text-red-600"
                  }`}
                >
                  {comprehensiveReady
                    ? "✓ جاهز للاختبار"
                    : "✕ يحتاج إلى أسئلة إضافية"}
                </span>
              </div>

              <div className="space-y-2">
                {chapters.map((chapter) => {
                  const required =
                    requiredQuestionsByChapter.get(
                      chapter.id
                    ) ?? 0;

                  const available =
                    chapter.activeQuestionCount;

                  const isReady =
                    available >= required;

                  const missing = Math.max(
                    required - available,
                    0
                  );

                  return (
                    <div
                      key={chapter.id}
                      className={`rounded-xl border p-3 ${
                        isReady
                          ? "border-emerald-100 bg-emerald-50"
                          : "border-red-100 bg-red-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-bold ${
                              isReady
                                ? "text-emerald-800"
                                : "text-red-800"
                            }`}
                          >
                            {chapter.title}
                          </p>

                          <p
                            className={`mt-1 text-xs ${
                              isReady
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            متوفر: {available} • مطلوب:{" "}
                            {required}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 text-xs font-bold ${
                            isReady
                              ? "text-emerald-700"
                              : "text-red-700"
                          }`}
                        >
                          {isReady
                            ? "✓ جاهز"
                            : `ناقص ${missing}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Link
              href={
                comprehensiveReady
                  ? `/tajweed/${levelId}/quiz?mode=comprehensive`
                  : "#"
              }
              aria-disabled={!comprehensiveReady}
              className={`mt-5 flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition ${
                comprehensiveReady
                  ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                  : "pointer-events-none bg-slate-200 text-slate-400"
              }`}
            >
              ابدأ الاختبار الشامل
            </Link>

            {!comprehensiveReady && (
              <p className="mt-3 text-center text-xs leading-6 text-red-600">
                لا يمكن بدء الاختبار الشامل حتى يتوفر العدد المطلوب من
                الأسئلة في جميع الأبواب.
              </p>
            )}
          </div>

          {/* Training */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl">
                  🎯
                </div>

                <h4 className="mt-3 font-bold text-[var(--foreground)]">
                  اختبار التدريب
                </h4>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                باب واحد
              </span>
            </div>

            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              اختر بابًا محددًا وتدرّب على أسئلته بشكل مستقل.
            </p>

            <div className="mt-4">
              <label
                htmlFor="training-chapter"
                className="mb-2 block text-sm font-bold text-[var(--foreground)]"
              >
                اختر الباب
              </label>

              <select
                id="training-chapter"
                value={selectedChapterId}
                onChange={(event) =>
                  setSelectedChapterId(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                <option value="">
                  اختر الباب الذي تريد التدريب عليه
                </option>

                {chapters.map((chapter) => (
                  <option
                    key={chapter.id}
                    value={chapter.id}
                    disabled={
                      chapter.activeQuestionCount ===
                      0
                    }
                  >
                    {chapter.title}{" "}
                    {chapter.activeQuestionCount > 0
                      ? `(${chapter.activeQuestionCount} سؤال)`
                      : "(لا توجد أسئلة)"}
                  </option>
                ))}
              </select>
            </div>

            {selectedChapter && (
              <div
                className={`mt-3 rounded-xl border p-3 text-sm ${
                  selectedChapter.activeQuestionCount >
                  0
                    ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                    : "border-red-100 bg-red-50 text-red-700"
                }`}
              >
                {selectedChapter.activeQuestionCount >
                0 ? (
                  <>
                    يوجد في هذا الباب{" "}
                    <strong>
                      {selectedChapter.activeQuestionCount}
                    </strong>{" "}
                    سؤالًا فعالًا، وسيختار النظام منها أسئلة
                    التدريب عشوائيًا.
                  </>
                ) : (
                  <>
                    لا توجد أسئلة فعالة في هذا الباب حاليًا.
                  </>
                )}
              </div>
            )}

            <Link
              href={
                trainingReady
                  ? `/tajweed/${levelId}/quiz?mode=chapter&chapterId=${selectedChapterId}`
                  : "#"
              }
              aria-disabled={!trainingReady}
              className={`mt-5 flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition ${
                trainingReady
                  ? "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                  : "pointer-events-none bg-slate-200 text-slate-400"
              }`}
            >
              ابدأ اختبار التدريب
            </Link>

            {!selectedChapterId && (
              <p className="mt-3 text-center text-xs text-[var(--muted)]">
                اختر بابًا أولًا لبدء اختبار التدريب.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}