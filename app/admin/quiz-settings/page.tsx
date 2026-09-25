import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

export default async function QuizSettingsPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: admin } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) {
    redirect("/admin/login");
  }

  const { data: levels, error: levelsError } = await supabaseAdmin
    .from("levels")
    .select("id, title, description, order")
    .order("order", { ascending: true });

  if (levelsError) {
    throw new Error(levelsError.message);
  }

  const levelIds = (levels ?? []).map((level) => level.id);

  const { data: settings } =
    levelIds.length > 0
      ? await supabaseAdmin
          .from("quiz_settings")
          .select(
            "id, level_id, number_of_questions, distribution_mode, question_order_mode, is_active"
          )
          .in("level_id", levelIds)
      : { data: [] };

  const { data: chapters } =
    levelIds.length > 0
      ? await supabaseAdmin
          .from("chapters")
          .select("id, level_id, title, order, is_active")
          .in("level_id", levelIds)
          .order("order", { ascending: true })
      : { data: [] };

  const { data: questions } =
    levelIds.length > 0
      ? await supabaseAdmin
          .from("questions")
          .select("id, level_id, chapter_id, is_active")
          .in("level_id", levelIds)
      : { data: [] };

  function getSettings(levelId: number) {
    return (
      settings?.find((item) => item.level_id === levelId) ?? {
        number_of_questions: 15,
        distribution_mode: "equal",
        question_order_mode: "by_chapter",
        is_active: true,
      }
    );
  }

  function getLevelChapters(levelId: number) {
    return (chapters ?? [])
      .filter(
        (chapter) =>
          chapter.level_id === levelId && chapter.is_active
      )
      .sort((a, b) => a.order - b.order);
  }

  function getActiveQuestionCount(
    levelId: number,
    chapterId: number
  ) {
    return (questions ?? []).filter(
      (question) =>
        question.level_id === levelId &&
        question.chapter_id === chapterId &&
        question.is_active
    ).length;
  }

  function calculateRequired(
    numberOfQuestions: number,
    chapterCount: number,
    chapterIndex: number
  ) {
    if (chapterCount === 0) {
      return 0;
    }

    const base = Math.floor(
      numberOfQuestions / chapterCount
    );

    const remainder =
      numberOfQuestions % chapterCount;

    return chapterIndex < remainder
      ? base + 1
      : base;
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--primary)]">
              لوحة الإدارة
            </p>

            <h1 className="text-3xl font-bold text-[var(--foreground)]">
              ⚙️ إعدادات الاختبارات
            </h1>

            <p className="mt-2 text-sm text-[var(--muted)]">
              التحكم في إعدادات الاختبار الشامل لكل مستوى.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-5 py-3 text-sm font-bold text-[var(--foreground)] shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            ← العودة للوحة الإدارة
          </Link>
        </div>

        {/* Messages */}
        {params.saved === "1" && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-bold text-green-700">
            ✅ تم حفظ إعدادات الاختبار بنجاح.
          </div>
        )}

        {params.error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
            ❌ {params.error}
          </div>
        )}

        {/* Explanation */}
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">
            كيف يعمل الاختبار الشامل؟
          </h2>

          <div className="mt-4 grid gap-3 text-sm text-[var(--muted)] md:grid-cols-3">
            <div className="rounded-xl bg-[var(--primary-light)] p-4">
              <div className="mb-1 font-bold text-[var(--primary-dark)]">
                🔢 عدد الأسئلة
              </div>
              تحدد هنا عدد الأسئلة التي سيحصل عليها الطالب.
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] p-4">
              <div className="mb-1 font-bold text-[var(--primary-dark)]">
                ⚖️ التوزيع
              </div>
              النظام يوزع الأسئلة بالتساوي قدر الإمكان على الأبواب.
            </div>

            <div className="rounded-xl bg-[var(--primary-light)] p-4">
              <div className="mb-1 font-bold text-[var(--primary-dark)]">
                🔀 الترتيب
              </div>
              يمكنك جعل الأسئلة حسب الأبواب أو مختلطة.
            </div>
          </div>
        </div>

        {/* Levels */}
        <div className="space-y-6">
          {(levels ?? []).map((level) => {
            const levelSettings = getSettings(level.id);
            const levelChapters = getLevelChapters(level.id);

            const numberOfQuestions =
              levelSettings.number_of_questions;

            const readiness = levelChapters.map(
              (chapter, index) => {
                const required = calculateRequired(
                  numberOfQuestions,
                  levelChapters.length,
                  index
                );

                const activeCount =
                  getActiveQuestionCount(
                    level.id,
                    chapter.id
                  );

                return {
                  ...chapter,
                  required,
                  activeCount,
                  ready: activeCount >= required,
                };
              }
            );

            const isReady =
              levelChapters.length > 0 &&
              readiness.every(
                (chapter) => chapter.ready
              );

            return (
              <section
                key={level.id}
                className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white shadow-sm"
              >
                {/* Level Header */}
                <div className="border-b border-[var(--border)] bg-gradient-to-l from-[var(--primary-light)] to-white px-6 py-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">
                        {level.title}
                      </h2>

                      {level.description && (
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {level.description}
                        </p>
                      )}
                    </div>

                    <div
                      className={`rounded-full px-4 py-2 text-sm font-bold ${
                        isReady
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {isReady
                        ? "✓ الاختبار جاهز"
                        : "⚠ يحتاج إلى أسئلة"}
                    </div>
                  </div>
                </div>

                {/* Settings Form */}
                <div className="p-6">
                  <form
                    action="/api/admin/quiz-settings"
                    method="POST"
                    className="space-y-6"
                  >
                    <input
                      type="hidden"
                      name="action"
                      value="save_settings"
                    />

                    <input
                      type="hidden"
                      name="level_id"
                      value={level.id}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Number */}
                      <div>
                        <label className="mb-2 block text-sm font-bold">
                          عدد أسئلة الاختبار الشامل
                        </label>

                        <input
                          type="number"
                          name="number_of_questions"
                          min={1}
                          max={100}
                          defaultValue={
                            numberOfQuestions
                          }
                          className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
                          required
                        />

                        <p className="mt-2 text-xs text-[var(--muted)]">
                          مثال: 15 سؤالًا.
                        </p>
                      </div>

                      {/* Distribution */}
                      <div>
                        <label className="mb-2 block text-sm font-bold">
                          طريقة توزيع الأسئلة
                        </label>

                        <div className="rounded-xl border border-[var(--border)] bg-gray-50 px-4 py-3">
                          <div className="font-bold">
                            ⚖️ توزيع متساوٍ على الأبواب
                          </div>

                          <p className="mt-1 text-xs text-[var(--muted)]">
                            النظام يوزع الأسئلة بالتساوي
                            قدر الإمكان.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Order */}
                    <div>
                      <label className="mb-3 block text-sm font-bold">
                        ترتيب الأسئلة
                      </label>

                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-4 transition hover:border-[var(--primary)]">
                          <input
                            type="radio"
                            name="question_order_mode"
                            value="by_chapter"
                            defaultChecked={
                              levelSettings.question_order_mode ===
                              "by_chapter"
                            }
                            className="mt-1"
                          />

                          <div>
                            <div className="font-bold">
                              📚 حسب الأبواب
                            </div>

                            <p className="mt-1 text-xs text-[var(--muted)]">
                              تظهر أسئلة كل باب معًا.
                            </p>
                          </div>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] p-4 transition hover:border-[var(--primary)]">
                          <input
                            type="radio"
                            name="question_order_mode"
                            value="mixed"
                            defaultChecked={
                              levelSettings.question_order_mode ===
                              "mixed"
                            }
                            className="mt-1"
                          />

                          <div>
                            <div className="font-bold">
                              🔀 مختلط
                            </div>

                            <p className="mt-1 text-xs text-[var(--muted)]">
                              يتم خلط جميع الأسئلة معًا.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white transition hover:bg-[var(--primary-dark)]"
                    >
                      💾 حفظ إعدادات {level.title}
                    </button>
                  </form>

                  {/* Readiness */}
                  <div className="mt-8">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-bold">
                          📊 جاهزية الاختبار
                        </h3>

                        <p className="text-xs text-[var(--muted)]">
                          العدد المطلوب يحسب تلقائيًا بناءً
                          على عدد الأسئلة وعدد الأبواب.
                        </p>
                      </div>

                      <div className="text-sm font-bold text-[var(--primary)]">
                        {numberOfQuestions} سؤال
                      </div>
                    </div>

                    {levelChapters.length === 0 ? (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                        ❌ لا توجد أبواب فعالة لهذا المستوى.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {readiness.map(
                          (chapter) => (
                            <div
                              key={chapter.id}
                              className={`rounded-xl border p-4 ${
                                chapter.ready
                                  ? "border-green-200 bg-green-50"
                                  : "border-red-200 bg-red-50"
                              }`}
                            >
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <div className="font-bold">
                                    {chapter.title}
                                  </div>

                                  <div className="mt-1 text-xs text-[var(--muted)]">
                                    لديك{" "}
                                    <strong>
                                      {chapter.activeCount}
                                    </strong>{" "}
                                    سؤالًا فعالًا
                                    {" • "}
                                    المطلوب{" "}
                                    <strong>
                                      {chapter.required}
                                    </strong>
                                  </div>
                                </div>

                                <div
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    chapter.ready
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {chapter.ready
                                    ? "✓ جاهز"
                                    : `❌ ناقص ${
                                        chapter.required -
                                        chapter.activeCount
                                      }`}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {(levels ?? []).length === 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-white p-10 text-center shadow-sm">
            <div className="text-4xl">📚</div>

            <h2 className="mt-4 text-xl font-bold">
              لا توجد مستويات
            </h2>

            <p className="mt-2 text-sm text-[var(--muted)]">
              أضف مستوى أولًا حتى تتمكن من إعداد الاختبارات.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}