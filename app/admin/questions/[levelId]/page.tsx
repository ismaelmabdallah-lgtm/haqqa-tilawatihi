import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";
import QuestionBuilder from "@/components/admin/QuestionBuilder";
import type { ReactNode } from "react";

type PageProps = {
  params: Promise<{ levelId: string }>;
  searchParams: Promise<{
    edit?: string;
    editChapter?: string;
    error?: string;
    search?: string;
    chapter?: string;
    status?: string;
    difficulty?: string;
    type?: string;
  }>;
};

type Difficulty = "easy" | "medium" | "advanced";
type QuestionType =
  | "mcq"
  | "table"
  | "cut_join"
  | "conditional"
  | "ordering"
  | "fill_blanks";

type Question = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_option: "a" | "b" | "c" | "d" | null;
  explanation: string | null;
  difficulty: Difficulty;
  is_active: boolean;
  question_type: QuestionType;
  points: number;
  question_data: unknown;
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

type Level = { id: number; title: string; description: string | null };

type QuizSettings = {
  id: number;
  level_id: number;
  number_of_questions: number;
  distribution_mode: string;
  question_order_mode: string;
  is_active: boolean;
};

const TYPE_LABELS: Record<QuestionType, string> = {
  mcq: "ضع دائرة",
  table: "جدول",
  cut_join: "المقطوع والموصول والتاءات",
  conditional: "متسلسل / شرطي",
  ordering: "ترتيب",
  fill_blanks: "ملء الفراغات",
};

const TYPE_CLASSES: Record<QuestionType, string> = {
  mcq: "bg-blue-50 text-blue-700",
  table: "bg-emerald-50 text-emerald-700",
  cut_join: "bg-amber-50 text-amber-700",
  conditional: "bg-purple-50 text-purple-700",
  ordering: "bg-cyan-50 text-cyan-700",
  fill_blanks: "bg-pink-50 text-pink-700",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "سهل",
  medium: "متوسط",
  advanced: "متقدم",
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
    return <ErrorBox text="رقم المستوى غير صحيح." />;
  }

  const [{ data: level }, { data: chapters }, { data: questions }, { data: quizSettings }] =
    await Promise.all([
      supabaseAdmin
        .from("levels")
        .select("id, title, description")
        .eq("id", numericLevelId)
        .maybeSingle(),
      supabaseAdmin
        .from("chapters")
        .select("id, level_id, title, description, order, is_active")
        .eq("level_id", numericLevelId)
        .order("order", { ascending: true }),
      supabaseAdmin
        .from("questions")
        .select(`
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
          question_type,
          points,
          question_data,
          created_at,
          updated_at
        `)
        .eq("level_id", numericLevelId)
        .order("id", { ascending: false }),
      supabaseAdmin
        .from("quiz_settings")
        .select("id, level_id, number_of_questions, distribution_mode, question_order_mode, is_active")
        .eq("level_id", numericLevelId)
        .maybeSingle(),
    ]);

  if (!level) return <ErrorBox text="المستوى غير موجود." />;

  const allChapters = (chapters ?? []) as Chapter[];
  const allQuestions = (questions ?? []) as Question[];
  const settings = (quizSettings ?? null) as QuizSettings | null;

  const search = (filters.search ?? "").trim();
  const selectedChapterId = /^\d+$/.test((filters.chapter ?? "").trim())
    ? Number(filters.chapter)
    : null;
  const status = filters.status === "active" || filters.status === "inactive" ? filters.status : "all";
  const difficulty = filters.difficulty === "easy" || filters.difficulty === "medium" || filters.difficulty === "advanced" ? filters.difficulty : "all";
  const typeFilter = Object.prototype.hasOwnProperty.call(TYPE_LABELS, filters.type ?? "")
    ? (filters.type as QuestionType)
    : "all";

  const normalizedSearch = search.toLocaleLowerCase("ar");
  const filteredQuestions = allQuestions.filter((q) => {
    if (selectedChapterId !== null && q.chapter_id !== selectedChapterId) return false;
    if (status === "active" && !q.is_active) return false;
    if (status === "inactive" && q.is_active) return false;
    if (difficulty !== "all" && q.difficulty !== difficulty) return false;
    if (typeFilter !== "all" && q.question_type !== typeFilter) return false;
    if (normalizedSearch) {
      const haystack = [
        q.question_text,
        q.option_a ?? "",
        q.option_b ?? "",
        q.option_c ?? "",
        q.option_d ?? "",
        q.explanation ?? "",
        TYPE_LABELS[q.question_type],
      ].join(" ").toLocaleLowerCase("ar");
      if (!haystack.includes(normalizedSearch)) return false;
    }
    return true;
  });

  const activeQuestions = allQuestions.filter((q) => q.is_active);
  const inactiveQuestions = allQuestions.filter((q) => !q.is_active);
  const activeChapters = allChapters.filter((c) => c.is_active);
  const requiredQuestionsPerChapter = activeChapters.length > 0 && settings
    ? Math.ceil(settings.number_of_questions / activeChapters.length)
    : 0;

  const activeQuestionCountByChapter = new Map<number, number>();
  for (const q of activeQuestions) {
    activeQuestionCountByChapter.set(q.chapter_id, (activeQuestionCountByChapter.get(q.chapter_id) ?? 0) + 1);
  }

  const editQuestionId = filters.edit ? Number(filters.edit) : null;
  const editChapterId = filters.editChapter ? Number(filters.editChapter) : null;
  const selectedQuestion = Number.isInteger(editQuestionId)
    ? allQuestions.find((q) => q.id === editQuestionId) ?? null
    : null;

  const filterParams = new URLSearchParams();
  if (search) filterParams.set("search", search);
  if (selectedChapterId !== null) filterParams.set("chapter", String(selectedChapterId));
  if (status !== "all") filterParams.set("status", status);
  if (difficulty !== "all") filterParams.set("difficulty", difficulty);
  if (typeFilter !== "all") filterParams.set("type", typeFilter);

  const buildUrl = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams(filterParams);
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    const query = params.toString();
    return `/admin/questions/${numericLevelId}${query ? `?${query}` : ""}`;
  };

  const cancelEditUrl = buildUrl({ edit: undefined });
  const errorMessage = filters.error ? decodeURIComponent(filters.error) : "";

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--muted)]">
            <Link href="/admin" className="hover:text-[var(--primary)]">لوحة المشرف</Link>
            <span>←</span>
            <Link href="/admin/questions" className="hover:text-[var(--primary)]">بنك الأسئلة</Link>
            <span>←</span>
            <span>{level.title}</span>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-bold text-[var(--primary-dark)]">📚 بنك الأسئلة</div>
                <h1 className="text-3xl font-black text-[var(--foreground)]">{level.title}</h1>
                {level.description && <p className="mt-2 max-w-3xl leading-7 text-[var(--muted)]">{level.description}</p>}
              </div>
              <Link href="/admin/questions" className="rounded-2xl border border-[var(--border)] bg-white px-5 py-3 font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]">← اختيار مستوى آخر</Link>
            </div>
          </div>
        </div>

        {errorMessage && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-7 text-red-700">{errorMessage}</div>}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="إجمالي الأبواب" value={allChapters.length} icon="📚" />
          <StatCard label="الأبواب الفعالة" value={activeChapters.length} icon="✅" />
          <StatCard label="إجمالي الأسئلة" value={allQuestions.length} icon="❓" />
          <StatCard label="الأسئلة الفعالة" value={activeQuestions.length} icon="🟢" />
          <StatCard label="نتائج الفلتر" value={filteredQuestions.length} icon="🔎" />
        </section>

        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black">جاهزية الاختبار الشامل</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">يتم الحساب اعتمادًا على جميع الأسئلة النشطة، وليس الفلاتر الحالية.</p>
            </div>
            <Link href={`/admin/quiz-settings/${numericLevelId}`} className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--primary-dark)]">⚙️ إعدادات الاختبار</Link>
          </div>

          {settings ? (
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <InfoBox label="عدد أسئلة الاختبار" value={String(settings.number_of_questions)} />
              <InfoBox label="طريقة التوزيع" value="توزيع متساوٍ على الأبواب" />
              <InfoBox label="المطلوب لكل باب" value={String(requiredQuestionsPerChapter)} />
            </div>
          ) : (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">لم يتم إنشاء إعدادات اختبار لهذا المستوى بعد.</div>
          )}

          {activeChapters.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-bold text-amber-800">لا توجد أبواب فعالة حاليًا.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {activeChapters.map((chapter) => {
                const count = activeQuestionCountByChapter.get(chapter.id) ?? 0;
                const ready = Boolean(settings && count >= requiredQuestionsPerChapter);
                const missing = Math.max(0, requiredQuestionsPerChapter - count);
                return (
                  <div key={chapter.id} className={`rounded-2xl border p-4 ${ready ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="font-black">{chapter.title}</div><div className="mt-1 text-sm text-[var(--muted)]">{count} سؤال نشط</div></div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${ready ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{ready ? "جاهز" : "غير جاهز"}</span>
                    </div>
                    {!ready && settings && <div className="mt-3 text-xs font-bold text-red-700">تحتاج إلى {missing} سؤال إضافي.</div>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div><h2 className="text-xl font-black">🔎 البحث والتصفية</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">ابحث داخل نص السؤال والتعليل، أو صفِّ حسب الباب والنوع والصعوبة والحالة.</p></div>
            {filterParams.size > 0 && <Link href={`/admin/questions/${numericLevelId}`} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700">✕ إعادة ضبط الفلاتر</Link>}
          </div>
          <form method="GET" className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2"><label htmlFor="search" className="mb-2 block text-sm font-bold">البحث</label><input id="search" name="search" type="search" defaultValue={search} placeholder="ابحث في السؤال أو التعليل..." className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]" /></div>
            <SelectField id="chapter" name="chapter" label="الباب" defaultValue={selectedChapterId !== null ? String(selectedChapterId) : ""}>
              <option value="">جميع الأبواب</option>{allChapters.map((c) => <option key={c.id} value={c.id}>{c.title}{!c.is_active ? " — غير فعال" : ""}</option>)}
            </SelectField>
            <SelectField id="type" name="type" label="نوع السؤال" defaultValue={typeFilter === "all" ? "" : typeFilter}>
              <option value="">جميع الأنواع</option>{Object.entries(TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </SelectField>
            <SelectField id="difficulty" name="difficulty" label="الصعوبة" defaultValue={difficulty === "all" ? "" : difficulty}>
              <option value="">جميع المستويات</option><option value="easy">سهل</option><option value="medium">متوسط</option><option value="advanced">متقدم</option>
            </SelectField>
            <SelectField id="status" name="status" label="الحالة" defaultValue={status === "all" ? "" : status}>
              <option value="">جميع الحالات</option><option value="active">الفعالة فقط</option><option value="inactive">غير الفعالة فقط</option>
            </SelectField>
            <div className="flex items-end lg:col-span-4"><button type="submit" className="w-full rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-white hover:bg-[var(--primary-dark)]">🔎 تطبيق البحث والفلاتر</button></div>
          </form>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm"><span className="text-[var(--muted)]">النتائج الحالية:</span><span className="mr-2 font-black text-[var(--primary-dark)]">{filteredQuestions.length}</span><span className="text-[var(--muted)]">من أصل {allQuestions.length} سؤال</span></div>
        </section>

        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black">أبواب بنك الأسئلة</h2><p className="mt-1 text-sm text-[var(--muted)]">الأبواب هي طريقة تنظيم بنك الأسئلة.</p></div><span className="rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary-dark)]">{allChapters.length} باب</span></div>
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-slate-50 p-5">
            <h3 className="mb-4 font-black">➕ إضافة باب جديد</h3>
            <form action="/api/admin/question-bank" method="POST" className="grid gap-4 md:grid-cols-3">
              <input type="hidden" name="action" value="create_chapter" /><input type="hidden" name="levelId" value={numericLevelId} />
              <Field name="title" label="اسم الباب" placeholder="مثال: أحكام النون الساكنة والتنوين" />
              <Field name="description" label="الوصف" placeholder="وصف مختصر للباب" />
              <div className="flex items-end"><button type="submit" className="w-full rounded-2xl bg-[var(--primary)] px-5 py-3 font-black text-white">إضافة الباب</button></div>
            </form>
          </div>
          <div className="space-y-4">
            {allChapters.map((chapter) => {
              const count = activeQuestionCountByChapter.get(chapter.id) ?? 0;
              const editChapter = editChapterId === chapter.id;
              return <div key={chapter.id} className={`rounded-2xl border p-5 ${chapter.is_active ? "bg-white" : "bg-slate-50 opacity-80"}`}>
                {editChapter ? <form action="/api/admin/question-bank" method="POST" className="grid gap-4 md:grid-cols-3">
                  <input type="hidden" name="action" value="update_chapter" /><input type="hidden" name="levelId" value={numericLevelId} /><input type="hidden" name="chapterId" value={chapter.id} />
                  <Field name="title" label="اسم الباب" defaultValue={chapter.title} required /><Field name="description" label="الوصف" defaultValue={chapter.description ?? ""} />
                  <div className="flex items-end gap-2"><button className="flex-1 rounded-2xl bg-[var(--primary)] px-4 py-3 font-black text-white">حفظ</button><Link href={cancelEditUrl} className="rounded-2xl border border-[var(--border)] px-4 py-3 font-bold">إلغاء</Link></div>
                </form> : <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">#{chapter.order}</span><h3 className="font-black">{chapter.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-black ${chapter.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{chapter.is_active ? "فعال" : "غير فعال"}</span></div>{chapter.description && <p className="mt-2 text-sm text-[var(--muted)]">{chapter.description}</p>}<div className="mt-2 text-sm font-bold text-[var(--primary-dark)]">{count} سؤال نشط</div></div>
                  <div className="flex flex-wrap gap-2"><Link href={buildUrl({ editChapter: String(chapter.id) })} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold">تعديل</Link><form action="/api/admin/question-bank" method="POST"><input type="hidden" name="action" value="delete_chapter" /><input type="hidden" name="levelId" value={numericLevelId} /><input type="hidden" name="chapterId" value={chapter.id} /><button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">حذف</button></form></div>
                </div>}
              </div>;
            })}
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-5"><h2 className="text-2xl font-black">{selectedQuestion ? "✏️ تعديل السؤال" : "➕ إضافة سؤال جديد"}</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">اختر نوع السؤال من أداة بناء السؤال، وستظهر الحقول المناسبة له تلقائيًا.</p></div>
          {allChapters.length === 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 font-bold text-amber-800">يجب إضافة باب أولًا قبل إضافة الأسئلة.</div> : <QuestionBuilder
            levelId={numericLevelId}
            chapters={allChapters.map((c) => ({ id: c.id, title: c.title, sort_order: c.order }))}
            question={selectedQuestion}
          />}
          {selectedQuestion && (
            <div className="mt-3 flex justify-end">
              <Link href={cancelEditUrl} className="rounded-xl border border-[var(--border)] bg-white px-5 py-3 font-bold">إلغاء التعديل</Link>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black">الأسئلة</h2><p className="mt-1 text-sm text-[var(--muted)]">عرض {filteredQuestions.length} من {allQuestions.length} سؤال.</p></div><div className="rounded-full bg-[var(--primary-light)] px-4 py-2 text-sm font-black text-[var(--primary-dark)]">الفعالة: {activeQuestions.length} • غير الفعالة: {inactiveQuestions.length}</div></div>
          {filteredQuestions.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] p-10 text-center text-[var(--muted)]">لا توجد أسئلة مطابقة للفلاتر الحالية.</div> : <div className="space-y-5">{filteredQuestions.map((q, index) => {
            const chapter = allChapters.find((c) => c.id === q.chapter_id);
            return <article key={q.id} className={`rounded-3xl border p-5 ${q.is_active ? "bg-white" : "bg-slate-50 opacity-80"}`}>
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">سؤال #{index + 1}</span><span className="rounded-full bg-[var(--primary-light)] px-3 py-1 text-xs font-black text-[var(--primary-dark)]">{chapter?.title ?? "باب غير معروف"}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${TYPE_CLASSES[q.question_type]}`}>{TYPE_LABELS[q.question_type]}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{q.points} نقطة</span><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{DIFFICULTY_LABELS[q.difficulty]}</span></div>
                <div className="flex flex-wrap gap-2"><Link href={buildUrl({ edit: String(q.id) })} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold hover:border-[var(--primary)] hover:text-[var(--primary)]">✏️ تعديل</Link><form action="/api/admin/question-bank" method="POST"><input type="hidden" name="action" value="toggle_question" /><input type="hidden" name="levelId" value={numericLevelId} /><input type="hidden" name="questionId" value={q.id} /><input type="hidden" name="isActive" value={q.is_active ? "true" : "false"} /><button className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">{q.is_active ? "تعطيل" : "تفعيل"}</button></form><form action="/api/admin/question-bank" method="POST"><input type="hidden" name="action" value="delete_question" /><input type="hidden" name="levelId" value={numericLevelId} /><input type="hidden" name="questionId" value={q.id} /><button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700">حذف</button></form></div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4"><div className="text-lg font-black leading-8">{q.question_text}</div></div>
              {q.question_type === "mcq" && <div className="mt-4 grid gap-3 md:grid-cols-2">{([['a',q.option_a],['b',q.option_b],['c',q.option_c],['d',q.option_d]] as const).map(([key,text]) => <div key={key} className={`rounded-2xl border p-4 ${q.correct_option === key ? "border-emerald-200 bg-emerald-50" : "border-[var(--border)]"}`}><span className="font-black">{key.toUpperCase()}.</span> <span className="text-sm leading-7">{text ?? ""}</span>{q.correct_option === key && <span className="mr-2 text-xs font-black text-emerald-700">✓ صحيحة</span>}</div>)}</div>}
              {q.question_type !== "mcq" && <div className="mt-4 rounded-2xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--muted)]">هذا سؤال تفاعلي من نوع <strong className="text-[var(--foreground)]">{TYPE_LABELS[q.question_type]}</strong> — تفاصيل البناء محفوظة داخل بيانات السؤال.</div>}
              {q.explanation && <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><div className="mb-1 text-sm font-black text-blue-800">💡 التعليل</div><div className="text-sm leading-7 text-blue-900">{q.explanation}</div></div>}
            </article>;
          })}</div>}
        </section>
      </div>
    </main>
  );
}

function ErrorBox({ text }: { text: string }) { return <main className="min-h-screen bg-[var(--background)] p-6"><div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">{text}</div></main>; }
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) { return <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div className="text-sm font-bold text-[var(--muted)]">{label}</div><div className="text-2xl">{icon}</div></div><div className="mt-3 text-3xl font-black">{value}</div></div>; }
function InfoBox({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-slate-50 p-4"><div className="text-sm text-[var(--muted)]">{label}</div><div className="mt-1 text-2xl font-black">{value}</div></div>; }
function Field({ name, label, placeholder, defaultValue = "", required = false }: { name: string; label: string; placeholder?: string; defaultValue?: string; required?: boolean }) { return <div><label className="mb-2 block text-sm font-bold">{label}</label><input name={name} required={required} defaultValue={defaultValue} placeholder={placeholder} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]" /></div>; }
function SelectField({ id, name, label, defaultValue, children }: { id: string; name: string; label: string; defaultValue: string; children: ReactNode }) { return <div><label htmlFor={id} className="mb-2 block text-sm font-bold">{label}</label><select id={id} name={name} defaultValue={defaultValue} className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 outline-none focus:border-[var(--primary)]">{children}</select></div>; }
