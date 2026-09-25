import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

type PageProps = {
  params: Promise<{
    levelId: string;
  }>;
  searchParams: Promise<{
    edit?: string;
    editChapter?: string;
    error?: string;

    search?: string;
    chapter?: string;
    status?: string;
    difficulty?: string;
  }>;
};

type Question = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  explanation: string | null;
  difficulty: "easy" | "medium" | "advanced";
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Chapter = {
  id: number;
  level_id: number;
  title: string;
  description: string | null;
  order: number;
  is_active: boolean;
};

type Level = {
  id: number;
  title: string;
  description: string | null;
};

type QuizSettings = {
  id: number;
  level_id: number;
  number_of_questions: number;
  distribution_mode: string;
  question_order_mode: string;
  is_active: boolean;
};

export default async function QuestionsLevelPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdmin();

  const { levelId } = await params;
  const filters = await searchParams;

  const numericLevelId = Number(levelId);

  if (!Number.isInteger(numericLevelId)) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          رقم المستوى غير صحيح.
        </div>
      </main>
    );
  }

  const {
    data: level,
    error: levelError,
  } = await supabaseAdmin
    .from("levels")
    .select("id, title, description")
    .eq("id", numericLevelId)
    .maybeSingle();

  if (levelError || !level) {
    return (
      <main className="min-h-screen bg-[var(--background)] p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          المستوى غير موجود.
        </div>
      </main>
    );
  }

  const [
    { data: chapters },
    { data: questions },
    { data: quizSettings },
  ] = await Promise.all([
    supabaseAdmin
      .from("chapters")
      .select(
        "id, level_id, title, description, order, is_active"
      )
      .eq("level_id", numericLevelId)
      .order("order", {
        ascending: true,
      }),

    supabaseAdmin
      .from("questions")
      .select(
        `
        id,
        level_id,
        chapter_id,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        explanation,
        difficulty,
        is_active,
        created_at,
        updated_at
      `
      )
      .eq("level_id", numericLevelId)
      .order("id", {
        ascending: false,
      }),

    supabaseAdmin
      .from("quiz_settings")
      .select(
        `
        id,
        level_id,
        number_of_questions,
        distribution_mode,
        question_order_mode,
        is_active
      `
      )
      .eq("level_id", numericLevelId)
      .maybeSingle(),
  ]);

  const allChapters = (chapters ?? []) as Chapter[];
  const allQuestions = (questions ?? []) as Question[];
  const settings = (quizSettings ?? null) as QuizSettings | null;

  /*
   * ---------------------------------------------------------
   * الفلاتر
   * ---------------------------------------------------------
   */

  const search = (filters.search ?? "").trim();

  const chapterParam = (filters.chapter ?? "").trim();

  const selectedChapterId =
    chapterParam &&
    /^\d+$/.test(chapterParam)
      ? Number(chapterParam)
      : null;

  const status =
    filters.status === "active" ||
    filters.status === "inactive"
      ? filters.status
      : "all";

  const difficulty =
    filters.difficulty === "easy" ||
    filters.difficulty === "medium" ||
    filters.difficulty === "advanced"
      ? filters.difficulty
      : "all";

  /*
   * البحث في:
   * - نص السؤال
   * - الخيارات الأربعة
   * - التعليل إن وجد
   */

  const normalizedSearch = search.toLocaleLowerCase(
    "ar"
  );

  const filteredQuestions = allQuestions.filter(
    (question) => {
      if (
        selectedChapterId !== null &&
        question.chapter_id !== selectedChapterId
      ) {
        return false;
      }

      if (
        status === "active" &&
        !question.is_active
      ) {
        return false;
      }

      if (
        status === "inactive" &&
        question.is_active
      ) {
        return false;
      }

      if (
        difficulty !== "all" &&
        question.difficulty !== difficulty
      ) {
        return false;
      }

      if (normalizedSearch) {
        const searchableText = [
          question.question_text,
          question.option_a,
          question.option_b,
          question.option_c,
          question.option_d,
          question.explanation ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("ar");

        if (
          !searchableText.includes(
            normalizedSearch
          )
        ) {
          return false;
        }
      }

      return true;
    }
  );

  /*
   * ---------------------------------------------------------
   * إحصائيات عامة
   * ---------------------------------------------------------
   */

  const activeQuestions = allQuestions.filter(
    (question) => question.is_active
  );

  const inactiveQuestions = allQuestions.filter(
    (question) => !question.is_active
  );

  const activeChapters = allChapters.filter(
    (chapter) => chapter.is_active
  );

  const requiredQuestionsPerChapter =
    activeChapters.length > 0 && settings
      ? Math.ceil(
          settings.number_of_questions /
            activeChapters.length
        )
      : 0;

  /*
   * حساب عدد الأسئلة النشطة في كل باب
   *
   * مهم:
   * نستخدم allQuestions وليس filteredQuestions
   * حتى لا تتأثر جاهزية الاختبار بالفلاتر.
   */

  const activeQuestionCountByChapter =
    new Map<number, number>();

  for (const question of allQuestions) {
    if (!question.is_active) {
      continue;
    }

    const current =
      activeQuestionCountByChapter.get(
        question.chapter_id
      ) ?? 0;

    activeQuestionCountByChapter.set(
      question.chapter_id,
      current + 1
    );
  }

  /*
   * ---------------------------------------------------------
   * السؤال المحدد للتعديل
   * ---------------------------------------------------------
   */

  const editQuestionId = filters.edit
    ? Number(filters.edit)
    : null;

  const editChapterId = filters.editChapter
    ? Number(filters.editChapter)
    : null;

  const selectedQuestion =
    Number.isInteger(editQuestionId)
      ? allQuestions.find(
          (question) =>
            question.id === editQuestionId
        ) ?? null
      : null;

  /*
   * ---------------------------------------------------------
   * بناء روابط الفلاتر
   * ---------------------------------------------------------
   */

  const filterParams = new URLSearchParams();

  if (search) {
    filterParams.set("search", search);
  }

  if (selectedChapterId !== null) {
    filterParams.set(
      "chapter",
      String(selectedChapterId)
    );
  }

  if (status !== "all") {
    filterParams.set("status", status);
  }

  if (difficulty !== "all") {
    filterParams.set(
      "difficulty",
      difficulty
    );
  }

  const filterQuery = filterParams.toString();

  const buildUrl = (
    extra: Record<string, string | undefined>
  ) => {
    const params = new URLSearchParams(
      filterParams
    );

    for (const [key, value] of Object.entries(
      extra
    )) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    const query = params.toString();

    return `/admin/questions/${numericLevelId}${
      query ? `?${query}` : ""
    }`;
  };

  const cancelEditUrl = `/admin/questions/${numericLevelId}${
    filterQuery
      ? `?${filterQuery}`
      : ""
  }`;

  /*
   * ---------------------------------------------------------
   * رسالة الخطأ
   * ---------------------------------------------------------
   */

  const errorMessage = filters.error
    ? decodeURIComponent(filters.error)
    : "";

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <Link
              href="/admin"
              className="transition hover:text-[var(--primary)]"
            >
              لوحة المشرف
            </Link>

            <span>←</span>

            <Link
              href="/admin/questions"
              className="transition hover:text-[var(--primary)]"
            >
              بنك الأسئلة
            </Link>

            <span>←</span>

            <span>{level.title}</span>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">
                  📚 بنك الأسئلة
                </div>

                <h1 className="text-3xl font-black text-[var(--foreground)]">
                  {level.title}
                </h1>

                {level.description && (
                  <p className="mt-2 max-w-3xl leading-7 text-[var(--muted)]">
                    {level.description}
                  </p>
                )}
              </div>

              <Link
                href="/admin/questions"
                className="inline-flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-5 py-3 font-bold text-[var(--foreground)] transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                ← اختيار مستوى آخر
              </Link>
            </div>
          </div>
        </div>

        {/* Error */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-7 text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="إجمالي الأبواب"
            value={allChapters.length}
            icon="📚"
          />

          <StatCard
            label="الأبواب الفعالة"
            value={activeChapters.length}
            icon="✅"
          />

          <StatCard
            label="إجمالي الأسئلة"
            value={allQuestions.length}
            icon="❓"
          />

          <StatCard
            label="الأسئلة الفعالة"
            value={activeQuestions.length}
            icon="🟢"
          />

          <StatCard
            label="نتائج الفلتر"
            value={filteredQuestions.length}
            icon="🔎"
          />
        </section>

        {/* Quiz readiness */}
        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">
                جاهزية الاختبار الشامل
              </h2>

              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                يتم حساب الجاهزية اعتمادًا على جميع
                الأسئلة النشطة، وليس على نتائج البحث
                والفلاتر الحالية.
              </p>
            </div>

            <Link
              href={`/admin/quiz-settings/${numericLevelId}`}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)]"
            >
              ⚙️ إعدادات الاختبار
            </Link>
          </div>

          {settings ? (
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[var(--primary-light)] p-4">
                <div className="text-sm text-[var(--muted)]">
                  عدد أسئلة الاختبار
                </div>

                <div className="mt-1 text-2xl font-black text-[var(--primary-dark)]">
                  {settings.number_of_questions}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-[var(--muted)]">
                  طريقة التوزيع
                </div>

                <div className="mt-1 font-black">
                  توزيع متساوٍ على الأبواب
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-sm text-[var(--muted)]">
                  المطلوب لكل باب
                </div>

                <div className="mt-1 text-2xl font-black">
                  {requiredQuestionsPerChapter}
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-800">
              لم يتم إنشاء إعدادات اختبار لهذا
              المستوى بعد.
            </div>
          )}

          {activeChapters.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
              لا توجد أبواب فعالة حاليًا. أضف بابًا
              واحدًا على الأقل حتى يصبح الاختبار
              الشامل قابلًا للإعداد.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeChapters.map((chapter) => {
                const count =
                  activeQuestionCountByChapter.get(
                    chapter.id
                  ) ?? 0;

                const ready =
                  settings &&
                  count >=
                    requiredQuestionsPerChapter;

                const missing =
                  Math.max(
                    0,
                    requiredQuestionsPerChapter -
                      count
                  );

                return (
                  <div
                    key={chapter.id}
                    className={`rounded-2xl border p-4 ${
                      ready
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-black">
                          {chapter.title}
                        </div>

                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {count} سؤال نشط
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          ready
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {ready
                          ? "جاهز"
                          : "غير جاهز"}
                      </span>
                    </div>

                    {!ready && settings && (
                      <div className="mt-3 text-xs font-bold text-red-700">
                        تحتاج إلى {missing} سؤال إضافي.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Filters */}
        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">
                🔎 البحث والتصفية
              </h2>

              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                ابحث داخل نص السؤال والخيارات والتعليل،
                ثم استخدم الفلاتر لتضييق النتائج.
              </p>
            </div>

            {(search ||
              selectedChapterId !== null ||
              status !== "all" ||
              difficulty !== "all") && (
              <Link
                href={`/admin/questions/${numericLevelId}`}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100"
              >
                ✕ إعادة ضبط الفلاتر
              </Link>
            )}
          </div>

          <form
            method="GET"
            className="grid gap-4 lg:grid-cols-4"
          >
            <div className="lg:col-span-2">
              <label
                htmlFor="search"
                className="mb-2 block text-sm font-bold"
              >
                البحث
              </label>

              <input
                id="search"
                name="search"
                type="search"
                defaultValue={search}
                placeholder="ابحث في السؤال أو الخيارات..."
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            <div>
              <label
                htmlFor="chapter"
                className="mb-2 block text-sm font-bold"
              >
                الباب
              </label>

              <select
                id="chapter"
                name="chapter"
                defaultValue={
                  selectedChapterId !== null
                    ? String(selectedChapterId)
                    : ""
                }
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                <option value="">
                  جميع الأبواب
                </option>

                {allChapters.map((chapter) => (
                  <option
                    key={chapter.id}
                    value={chapter.id}
                  >
                    {chapter.title}
                    {!chapter.is_active
                      ? " — غير فعال"
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="status"
                className="mb-2 block text-sm font-bold"
              >
                الحالة
              </label>

              <select
                id="status"
                name="status"
                defaultValue={status}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                <option value="all">
                  جميع الحالات
                </option>

                <option value="active">
                  الفعالة فقط
                </option>

                <option value="inactive">
                  غير الفعالة فقط
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="difficulty"
                className="mb-2 block text-sm font-bold"
              >
                مستوى الصعوبة
              </label>

              <select
                id="difficulty"
                name="difficulty"
                defaultValue={difficulty}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              >
                <option value="all">
                  جميع المستويات
                </option>

                <option value="easy">
                  سهل
                </option>

                <option value="medium">
                  متوسط
                </option>

                <option value="advanced">
                  متقدم
                </option>
              </select>
            </div>

            <div className="flex items-end lg:col-span-3">
              <button
                type="submit"
                className="w-full rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-white transition hover:bg-[var(--primary-dark)]"
              >
                🔎 تطبيق البحث والفلاتر
              </button>
            </div>
          </form>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm">
            <span className="text-[var(--muted)]">
              النتائج الحالية:
            </span>

            <span className="mr-2 font-black text-[var(--primary-dark)]">
              {filteredQuestions.length}
            </span>

            <span className="text-[var(--muted)]">
              من أصل {allQuestions.length} سؤال
            </span>

            {search && (
              <span className="mr-3">
                • البحث:
                <strong className="mr-1">
                  "{search}"
                </strong>
              </span>
            )}
          </div>
        </section>

        {/* Chapters */}
        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                أبواب بنك الأسئلة
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                الأبواب هي طريقة تنظيم بنك الأسئلة.
              </p>
            </div>

            <span className="rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary-dark)]">
              {allChapters.length} باب
            </span>
          </div>

          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-slate-50 p-5">
            <h3 className="mb-4 font-black">
              ➕ إضافة باب جديد
            </h3>

            <form
              action="/api/admin/question-bank"
              method="POST"
              className="grid gap-4 md:grid-cols-3"
            >
              <input
                type="hidden"
                name="action"
                value="create_chapter"
              />

              <input
                type="hidden"
                name="levelId"
                value={numericLevelId}
              />

              <div>
                <label className="mb-2 block text-sm font-bold">
                  اسم الباب
                </label>

                <input
                  name="title"
                  required
                  placeholder="مثال: أحكام النون الساكنة والتنوين"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  الوصف
                </label>

                <input
                  name="description"
                  placeholder="وصف مختصر للباب"
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-white transition hover:bg-[var(--primary-dark)]"
                >
                  إضافة الباب
                </button>
              </div>
            </form>
          </div>

          {allChapters.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">
              لا توجد أبواب حتى الآن.
            </div>
          ) : (
            <div className="space-y-4">
              {allChapters.map((chapter) => {
                const count =
                  activeQuestionCountByChapter.get(
                    chapter.id
                  ) ?? 0;

                const editChapter =
                  editChapterId === chapter.id;

                return (
                  <div
                    key={chapter.id}
                    className={`rounded-2xl border p-5 ${
                      chapter.is_active
                        ? "border-[var(--border)] bg-white"
                        : "border-slate-200 bg-slate-50 opacity-80"
                    }`}
                  >
                    {editChapter ? (
                      <form
                        action="/api/admin/question-bank"
                        method="POST"
                        className="grid gap-4 md:grid-cols-3"
                      >
                        <input
                          type="hidden"
                          name="action"
                          value="update_chapter"
                        />

                        <input
                          type="hidden"
                          name="levelId"
                          value={numericLevelId}
                        />

                        <input
                          type="hidden"
                          name="chapterId"
                          value={chapter.id}
                        />

                        <div>
                          <label className="mb-2 block text-sm font-bold">
                            اسم الباب
                          </label>

                          <input
                            name="title"
                            required
                            defaultValue={
                              chapter.title
                            }
                            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-bold">
                            الوصف
                          </label>

                          <input
                            name="description"
                            defaultValue={
                              chapter.description ?? ""
                            }
                            className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--primary)]"
                          />
                        </div>

                        <div className="flex items-end gap-2">
                          <button
                            type="submit"
                            className="flex-1 rounded-2xl bg-[var(--primary)] px-4 py-3 font-black text-white"
                          >
                            حفظ
                          </button>

                          <Link
                            href={cancelEditUrl}
                            className="rounded-2xl border border-[var(--border)] px-4 py-3 font-bold"
                          >
                            إلغاء
                          </Link>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                              #{chapter.order}
                            </span>

                            <h3 className="font-black">
                              {chapter.title}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                chapter.is_active
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {chapter.is_active
                                ? "فعال"
                                : "غير فعال"}
                            </span>
                          </div>

                          {chapter.description && (
                            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                              {chapter.description}
                            </p>
                          )}

                          <div className="mt-2 text-sm font-bold text-[var(--primary-dark)]">
                            {count} سؤال نشط
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={buildUrl({
                              editChapter:
                                String(
                                  chapter.id
                                ),
                            })}
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            تعديل
                          </Link>

                          <form
                            action="/api/admin/question-bank"
                            method="POST"
                          >
                            <input
                              type="hidden"
                              name="action"
                              value="delete_chapter"
                            />

                            <input
                              type="hidden"
                              name="levelId"
                              value={
                                numericLevelId
                              }
                            />

                            <input
                              type="hidden"
                              name="chapterId"
                              value={
                                chapter.id
                              }
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                            >
                              حذف
                            </button>
                          </form>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Add / Edit Question */}
        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-black">
              {selectedQuestion
                ? "✏️ تعديل السؤال"
                : "➕ إضافة سؤال جديد"}
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              السؤال يحتوي على أربعة خيارات، وإجابة
              صحيحة واحدة، مع إمكانية إضافة تعليل
              وتصنيف الصعوبة.
            </p>
          </div>

          {allChapters.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-7 text-amber-800">
              يجب إضافة باب أولًا قبل إضافة الأسئلة.
            </div>
          ) : (
            <form
              action="/api/admin/question-bank"
              method="POST"
              className="space-y-6"
            >
              <input
                type="hidden"
                name="action"
                value={
                  selectedQuestion
                    ? "update_question"
                    : "create_question"
                }
              />

              <input
                type="hidden"
                name="levelId"
                value={numericLevelId}
              />

              {selectedQuestion && (
                <input
                  type="hidden"
                  name="questionId"
                  value={selectedQuestion.id}
                />
              )}

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold">
                    الباب
                  </label>

                  <select
                    name="chapterId"
                    required
                    defaultValue={
                      selectedQuestion
                        ? String(
                            selectedQuestion.chapter_id
                          )
                        : activeChapters[0]
                          ? String(
                              activeChapters[0].id
                            )
                          : String(
                              allChapters[0].id
                            )
                    }
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
                  >
                    {allChapters.map((chapter) => (
                      <option
                        key={chapter.id}
                        value={chapter.id}
                      >
                        {chapter.title}
                        {!chapter.is_active
                          ? " — غير فعال"
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    مستوى الصعوبة
                  </label>

                  <select
                    name="difficulty"
                    defaultValue={
                      selectedQuestion
                        ?.difficulty ?? "medium"
                    }
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
                  >
                    <option value="easy">
                      سهل
                    </option>

                    <option value="medium">
                      متوسط
                    </option>

                    <option value="advanced">
                      متقدم
                    </option>
                  </select>

                  <p className="mt-2 text-xs text-[var(--muted)]">
                    يستخدم للتصنيف فقط ولا يدخل في
                    توزيع الاختبار.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">
                    الإجابة الصحيحة
                  </label>

                  <select
                    name="correctOption"
                    required
                    defaultValue={
                      selectedQuestion
                        ?.correct_option ?? "a"
                    }
                    className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
                  >
                    <option value="a">
                      أ — الخيار الأول
                    </option>

                    <option value="b">
                      ب — الخيار الثاني
                    </option>

                    <option value="c">
                      ج — الخيار الثالث
                    </option>

                    <option value="d">
                      د — الخيار الرابع
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  نص السؤال
                </label>

                <textarea
                  name="questionText"
                  required
                  rows={4}
                  defaultValue={
                    selectedQuestion?.question_text ??
                    ""
                  }
                  placeholder="اكتب نص السؤال هنا..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 leading-7 outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <OptionInput
                  name="optionA"
                  label="الخيار أ"
                  defaultValue={
                    selectedQuestion?.option_a ?? ""
                  }
                />

                <OptionInput
                  name="optionB"
                  label="الخيار ب"
                  defaultValue={
                    selectedQuestion?.option_b ?? ""
                  }
                />

                <OptionInput
                  name="optionC"
                  label="الخيار ج"
                  defaultValue={
                    selectedQuestion?.option_c ?? ""
                  }
                />

                <OptionInput
                  name="optionD"
                  label="الخيار د"
                  defaultValue={
                    selectedQuestion?.option_d ?? ""
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">
                  التعليل / الشرح
                </label>

                <textarea
                  name="explanation"
                  rows={4}
                  defaultValue={
                    selectedQuestion?.explanation ??
                    ""
                  }
                  placeholder="يمكنك كتابة شرح مختصر يوضح سبب صحة الإجابة..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 leading-7 outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="rounded-2xl bg-[var(--primary)] px-6 py-3 font-black text-white transition hover:bg-[var(--primary-dark)]"
                >
                  {selectedQuestion
                    ? "حفظ تعديل السؤال"
                    : "إضافة السؤال"}
                </button>

                {selectedQuestion && (
                  <Link
                    href={cancelEditUrl}
                    className="rounded-2xl border border-[var(--border)] px-6 py-3 text-center font-bold"
                  >
                    إلغاء التعديل
                  </Link>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Question List */}
        <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                الأسئلة
              </h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                عرض {filteredQuestions.length} من{" "}
                {allQuestions.length} سؤال.
              </p>
            </div>

            <div className="rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary-dark)]">
              الفعالة: {activeQuestions.length} • غير
              الفعالة: {inactiveQuestions.length}
            </div>
          </div>

          {allQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <div className="text-4xl">❓</div>

              <h3 className="mt-3 font-black">
                لا توجد أسئلة حتى الآن
              </h3>

              <p className="mt-2 text-sm text-[var(--muted)]">
                استخدم النموذج أعلاه لإضافة أول سؤال.
              </p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center">
              <div className="text-4xl">🔎</div>

              <h3 className="mt-3 font-black">
                لا توجد نتائج مطابقة
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                جرّب تغيير كلمات البحث أو الفلاتر
                المستخدمة.
              </p>

              <Link
                href={`/admin/questions/${numericLevelId}`}
                className="mt-5 inline-flex rounded-xl bg-[var(--primary)] px-5 py-2.5 font-bold text-white"
              >
                إعادة ضبط الفلاتر
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredQuestions.map(
                (question, index) => {
                  const chapter =
                    allChapters.find(
                      (item) =>
                        item.id ===
                        question.chapter_id
                    );

                  const editHref = buildUrl({
                    edit: String(
                      question.id
                    ),
                  });

                  return (
                    <article
                      key={question.id}
                      className={`rounded-3xl border p-5 ${
                        question.is_active
                          ? "border-[var(--border)] bg-white"
                          : "border-slate-200 bg-slate-50 opacity-80"
                      }`}
                    >
                      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">
                            سؤال #{index + 1}
                          </span>

                          <span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-black text-[var(--primary-dark)]">
                            {chapter?.title ??
                              "باب غير معروف"}
                          </span>

                          <DifficultyBadge
                            difficulty={
                              question.difficulty
                            }
                          />

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              question.is_active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {question.is_active
                              ? "فعال"
                              : "غير فعال"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={editHref}
                            className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            ✏️ تعديل
                          </Link>

                          <form
                            action="/api/admin/question-bank"
                            method="POST"
                          >
                            <input
                              type="hidden"
                              name="action"
                              value="toggle_question"
                            />

                            <input
                              type="hidden"
                              name="levelId"
                              value={
                                numericLevelId
                              }
                            />

                            <input
                              type="hidden"
                              name="questionId"
                              value={
                                question.id
                              }
                            />

                            <input
                              type="hidden"
                              name="isActive"
                              value={
                                question.is_active
                                  ? "true"
                                  : "false"
                              }
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 transition hover:bg-amber-100"
                            >
                              {question.is_active
                                ? "تعطيل"
                                : "تفعيل"}
                            </button>
                          </form>

                          <form
                            action="/api/admin/question-bank"
                            method="POST"
                          >
                            <input
                              type="hidden"
                              name="action"
                              value="delete_question"
                            />

                            <input
                              type="hidden"
                              name="levelId"
                              value={
                                numericLevelId
                              }
                            />

                            <input
                              type="hidden"
                              name="questionId"
                              value={
                                question.id
                              }
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                            >
                              حذف
                            </button>
                          </form>
                        </div>
                      </div>

                      <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                        <div className="text-lg font-black leading-8">
                          {question.question_text}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <AnswerOption
                          label="أ"
                          text={question.option_a}
                          correct={
                            question.correct_option ===
                            "a"
                          }
                        />

                        <AnswerOption
                          label="ب"
                          text={question.option_b}
                          correct={
                            question.correct_option ===
                            "b"
                          }
                        />

                        <AnswerOption
                          label="ج"
                          text={question.option_c}
                          correct={
                            question.correct_option ===
                            "c"
                          }
                        />

                        <AnswerOption
                          label="د"
                          text={question.option_d}
                          correct={
                            question.correct_option ===
                            "d"
                          }
                        />
                      </div>

                      {question.explanation && (
                        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                          <div className="mb-1 text-sm font-black text-blue-800">
                            💡 التعليل
                          </div>

                          <div className="text-sm leading-7 text-blue-900">
                            {question.explanation}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/*
 * ---------------------------------------------------------
 * Components
 * ---------------------------------------------------------
 */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-[var(--muted)]">
          {label}
        </div>

        <div className="text-2xl">{icon}</div>
      </div>

      <div className="mt-3 text-3xl font-black text-[var(--foreground)]">
        {value}
      </div>
    </div>
  );
}

function OptionInput({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        required
        defaultValue={defaultValue}
        placeholder={`اكتب ${label}...`}
        className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]"
      />
    </div>
  );
}

function DifficultyBadge({
  difficulty,
}: {
  difficulty:
    | "easy"
    | "medium"
    | "advanced";
}) {
  const config = {
    easy: {
      label: "سهل",
      className:
        "bg-emerald-100 text-emerald-700",
    },

    medium: {
      label: "متوسط",
      className:
        "bg-amber-100 text-amber-700",
    },

    advanced: {
      label: "متقدم",
      className:
        "bg-purple-100 text-purple-700",
    },
  }[difficulty];

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function AnswerOption({
  label,
  text,
  correct,
}: {
  label: string;
  text: string;
  correct: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        correct
          ? "border-emerald-200 bg-emerald-50"
          : "border-[var(--border)] bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
            correct
              ? "bg-emerald-200 text-emerald-800"
              : "bg-slate-100 text-slate-700"
          }`}
        >
          {label}
        </div>

        <div className="flex-1 pt-1 text-sm leading-7">
          {text}
        </div>

        {correct && (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700">
            ✓ صحيحة
          </span>
        )}
      </div>
    </div>
  );
}