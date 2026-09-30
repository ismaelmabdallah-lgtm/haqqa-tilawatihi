"use client";

import { useEffect, useMemo, useState } from "react";

type QuizMode = "comprehensive" | "chapter";
type QuestionType = "mcq" | "table" | "cut_join" | "conditional" | "ordering" | "fill_blanks";

type Option = { key: string; text: string };
type CellOption = { id: string; text: string };
type TableCell = { id: string; options: CellOption[]; points: number };
type TableData = { columns: { id: string; title: string }[]; rows: { id: string; label: string; cells: Record<string, TableCell> }[] };
type CutJoinSection = { id: string; type: "cut" | "joined" | "disputed"; title: string; textPoints: number; surahPoints: number };
type CutJoinData = { sections: CutJoinSection[] };
type ConditionalNode = { id: string; prompt: string; options: { id: string; text: string }[]; points: number; nextByOption: Record<string, string | null> };
type ConditionalData = { startNodeId: string; nodes: ConditionalNode[] };
type OrderingData = { items: { id: string; text: string }[]; points: number; partialCredit: boolean };
type FillBlanksData = { parts: ({ type: "text"; value: string } | { type: "blank"; blankId: string })[]; answerBank: { id: string; text: string }[]; blanks: { id: string; points: number }[]; allowReuse: boolean };

type QuizQuestion = {
  id: number;
  number: number;
  chapterId: number;
  questionText: string;
  questionType: QuestionType;
  points: number;
  data: unknown;
  options?: Option[];
};

type QuizData = { mode: QuizMode; levelId: number; levelTitle: string; chapterId?: number; chapterTitle?: string; numberOfQuestions: number; questions: QuizQuestion[] };
type QuizRunnerProps = { levelId: number; mode: QuizMode; chapterId: number | null };

type ChapterAnalysis = { chapterId: number; chapterTitle: string; total: number; correct: number; wrong: number; earnedPoints: number; maxPoints: number; percentage: number };
type ReviewItem = { questionId: number; number: number; chapterId: number; chapterTitle: string; questionText: string; questionType: QuestionType; points: number; earnedPoints: number; isCorrect: boolean; summary: string; explanation: string | null; details: unknown };
type QuizResult = { levelId: number; mode: QuizMode; chapterId: number | null; totalQuestions: number; correctCount: number; wrongCount: number; earnedPoints: number; maxPoints: number; percentage: number; chapterAnalysis: ChapterAnalysis[]; review: ReviewItem[] };

type AnswerValue = Record<string, unknown>;

const SURAHES = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"
];

function asObject(value: unknown): Record<string, unknown> { return value && typeof value === "object" ? (value as Record<string, unknown>) : {}; }
function asTableData(value: unknown): TableData { const d = asObject(value); return { columns: Array.isArray(d.columns) ? d.columns as TableData["columns"] : [], rows: Array.isArray(d.rows) ? d.rows as TableData["rows"] : [] }; }
function asCutJoinData(value: unknown): CutJoinData { const d = asObject(value); return { sections: Array.isArray(d.sections) ? d.sections as CutJoinSection[] : [] }; }
function asConditionalData(value: unknown): ConditionalData { const d = asObject(value); return { startNodeId: String(d.startNodeId ?? ""), nodes: Array.isArray(d.nodes) ? d.nodes as ConditionalNode[] : [] }; }
function asOrderingData(value: unknown): OrderingData { const d = asObject(value); return { items: Array.isArray(d.items) ? d.items as OrderingData["items"] : [], points: Number(d.points) || 1, partialCredit: Boolean(d.partialCredit) }; }
function asFillBlanksData(value: unknown): FillBlanksData { const d = asObject(value); return { parts: Array.isArray(d.parts) ? d.parts as FillBlanksData["parts"] : [], answerBank: Array.isArray(d.answerBank) ? d.answerBank as FillBlanksData["answerBank"] : [], blanks: Array.isArray(d.blanks) ? d.blanks as FillBlanksData["blanks"] : [], allowReuse: Boolean(d.allowReuse) }; }

function isAnswered(question: QuizQuestion, answer: unknown) {
  if (answer == null) return false;
  const a = asObject(answer);
  switch (question.questionType) {
    case "mcq": return typeof a.selectedOption === "string";
    case "table": return Object.values(asObject(a.cells)).some((v) => typeof v === "string" && v.length > 0);
    case "cut_join": return Object.values(asObject(a.sections)).some((v) => { const s = asObject(v); return Boolean(String(s.text ?? "").trim()) || s.surahId != null; });
    case "conditional": return Array.isArray(a.selections) && a.selections.length > 0;
    case "ordering": return Array.isArray(a.order) && a.order.length > 0;
    case "fill_blanks": return Object.values(asObject(a.blanks)).some((v) => typeof v === "string" && v.length > 0);
  }
}

export default function QuizRunner({ levelId, mode, chapterId }: QuizRunnerProps) {
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    async function loadQuiz() {
      try {
        setLoading(true); setError(""); setResult(null); setAnswers({}); setBookmarks({}); setCurrentIndex(0);
        const response = await fetch("/api/quiz/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelId, mode, ...(mode === "chapter" ? { chapterId } : {}) }) });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "تعذر بدء الاختبار.");
        setQuiz(data.quiz);
      } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "حدث خطأ أثناء بدء الاختبار."); }
      finally { setLoading(false); }
    }
    loadQuiz();
  }, [levelId, mode, chapterId]);

  const answeredCount = useMemo(() => quiz ? quiz.questions.filter((q) => isAnswered(q, answers[q.id])).length : 0, [quiz, answers]);
  const currentQuestion = quiz?.questions[currentIndex] ?? null;

  function setQuestionAnswer(questionId: number, value: AnswerValue) { if (!result && !submitting) setAnswers((p) => ({ ...p, [questionId]: value })); }
  function toggleBookmark(id: number) { if (!result && !submitting) setBookmarks((p) => ({ ...p, [id]: !p[id] })); }

  async function handleSubmit() {
    if (!quiz || submitting) return;
    const unanswered = quiz.questions.length - answeredCount;
    if (unanswered > 0 && !window.confirm(`تبقى ${unanswered} أسئلة بدون إجابة. هل تريد إنهاء الاختبار؟`)) return;
    try {
      setSubmitting(true); setError("");
      const submittedAnswers = quiz.questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? null }));
      const response = await fetch("/api/quiz/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelId, answers: submittedAnswers }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "حدث خطأ أثناء تصحيح الاختبار.");
      setResult(data.result);
    } catch (err) { console.error(err); setError(err instanceof Error ? err.message : "حدث خطأ أثناء تصحيح الاختبار."); }
    finally { setSubmitting(false); }
  }

  if (loading) return <section className="mx-auto max-w-5xl px-4 py-10"><div className="rounded-3xl border border-[var(--border)] bg-white p-8 text-center shadow-sm"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--primary-light)] border-t-[var(--primary)]"/><p className="mt-5 font-bold">جارٍ تجهيز الاختبار...</p><p className="mt-2 text-xs text-[var(--muted)]">يتم اختيار الأسئلة وترتيبها حسب إعدادات الاختبار.</p></div></section>;
  if (error && !quiz) return <section className="mx-auto max-w-2xl px-4 py-10"><div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm"><div className="text-4xl">⚠️</div><h2 className="mt-4 text-xl font-bold">تعذر بدء الاختبار</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">{error}</p><a href={`/tajweed/${levelId}`} className="mt-6 inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">العودة إلى المستوى</a></div></section>;
  if (!quiz) return null;
  if (result) return <ResultView levelId={levelId} mode={mode} chapterId={chapterId} quiz={quiz} result={result}/>;
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;
  const currentAnswer = answers[currentQuestion.id] ?? {};

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {error && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-bold text-[var(--primary)]">{mode === "comprehensive" ? "🎯 الاختبار الشامل" : "🎯 اختبار الباب"}</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">{quiz.levelTitle}</h2>{quiz.chapterTitle && <p className="mt-1 text-sm text-[var(--muted)]">الباب: {quiz.chapterTitle}</p>}</div>
          <div className="rounded-xl bg-[var(--primary-light)] px-4 py-3 text-center"><div className="text-xs text-[var(--muted)]">التقدم</div><div className="mt-1 font-bold text-[var(--primary)]">{currentIndex + 1} / {quiz.questions.length}</div></div>
        </div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${progress}%` }}/></div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_280px]">
        <div className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-[var(--primary)]">السؤال {currentQuestion.number}</p><h3 className="mt-3 text-lg font-bold leading-8 sm:text-xl">{currentQuestion.questionText}</h3></div>
            <button type="button" onClick={() => toggleBookmark(currentQuestion.id)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg ${bookmarks[currentQuestion.id] ? "border-amber-300 bg-amber-50 text-amber-600" : "border-[var(--border)] text-[var(--muted)]"}`}>{bookmarks[currentQuestion.id] ? "★" : "☆"}</button>
          </div>

          <div className="mt-7">
            <QuestionRenderer question={currentQuestion} answer={currentAnswer} disabled={submitting} onChange={(value) => setQuestionAnswer(currentQuestion.id, value)}/>
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={currentIndex === 0 || submitting} className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-bold disabled:opacity-40">← السابق</button>
            {currentIndex === quiz.questions.length - 1 ? <button type="button" onClick={handleSubmit} disabled={submitting} className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? "جارٍ التصحيح..." : "إنهاء الاختبار ✓"}</button> : <button type="button" onClick={() => setCurrentIndex((p) => Math.min(quiz.questions.length - 1, p + 1))} disabled={submitting} className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">التالي →</button>}
          </div>
        </div>

        <aside className="rounded-3xl border border-[var(--border)] bg-white p-5 shadow-sm lg:sticky lg:top-5 lg:self-start">
          <div className="flex items-center justify-between"><h3 className="font-bold">أسئلة الاختبار</h3><span className="text-xs text-[var(--muted)]">{answeredCount}/{quiz.questions.length}</span></div>
          <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-8 lg:grid-cols-5">{quiz.questions.map((q, i) => <button key={q.id} type="button" onClick={() => setCurrentIndex(i)} disabled={submitting} className={`relative flex h-10 items-center justify-center rounded-xl border text-xs font-bold ${i === currentIndex ? "border-[var(--primary)] bg-[var(--primary)] text-white" : isAnswered(q, answers[q.id]) ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary-dark)]" : "border-[var(--border)] text-[var(--muted)]"}`}>{i + 1}{bookmarks[q.id] && <span className="absolute -right-1 -top-1 text-[10px] text-amber-500">★</span>}</button>)}</div>
          <div className="mt-6 space-y-2 border-t border-[var(--border)] pt-5 text-xs text-[var(--muted)]"><div>● السؤال الحالي</div><div>● تمت الإجابة</div><div>☆ سؤال للمراجعة</div></div>
        </aside>
      </div>
    </section>
  );
}

function QuestionRenderer({ question, answer, disabled, onChange }: { question: QuizQuestion; answer: AnswerValue; disabled: boolean; onChange: (value: AnswerValue) => void }) {
  switch (question.questionType) {
    case "mcq": return <McqRenderer question={question} answer={answer} disabled={disabled} onChange={onChange}/>;
    case "table": return <TableRenderer data={asTableData(question.data)} answer={answer} disabled={disabled} onChange={onChange}/>;
    case "cut_join": return <CutJoinRenderer data={asCutJoinData(question.data)} answer={answer} disabled={disabled} onChange={onChange}/>;
    case "conditional": return <ConditionalRenderer data={asConditionalData(question.data)} answer={answer} disabled={disabled} onChange={onChange}/>;
    case "ordering": return <OrderingRenderer data={asOrderingData(question.data)} answer={answer} disabled={disabled} onChange={onChange}/>;
    case "fill_blanks": return <FillBlanksRenderer data={asFillBlanksData(question.data)} answer={answer} disabled={disabled} onChange={onChange}/>;
  }
}

function McqRenderer({ question, answer, disabled, onChange }: { question: QuizQuestion; answer: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void }) {
  const selected = typeof answer.selectedOption === "string" ? answer.selectedOption : "";
  const letters = ["أ", "ب", "ج", "د"];
  return <div className="grid gap-3">{(question.options ?? []).map((option, i) => <button key={option.key} type="button" disabled={disabled} onClick={() => onChange({ selectedOption: option.key })} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-right transition ${selected === option.key ? "border-[var(--primary)] bg-[var(--primary-light)]" : "border-[var(--border)] hover:border-[var(--primary)]"}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${selected === option.key ? "bg-[var(--primary)] text-white" : "bg-slate-100 text-slate-600"}`}>{letters[i] ?? i + 1}</span><span className="text-sm leading-7">{option.text}</span></button>)}</div>;
}

function TableRenderer({ data, answer, disabled, onChange }: { data: TableData; answer: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void }) {
  const cells = asObject(answer.cells);
  function choose(cellId: string, optionId: string) { onChange({ cells: { ...cells, [cellId]: optionId } }); }
  return <div className="overflow-x-auto rounded-2xl border border-[var(--border)]"><table className="w-full min-w-[720px] border-collapse text-sm"><thead><tr className="bg-[var(--primary-light)]"><th className="border border-[var(--border)] p-3 text-right">البيان</th>{data.columns.map((c) => <th key={c.id} className="border border-[var(--border)] p-3 text-center">{c.title}</th>)}</tr></thead><tbody>{data.rows.map((row) => <tr key={row.id}><th className="border border-[var(--border)] bg-slate-50 p-3 text-right align-top">{row.label}</th>{data.columns.map((column) => { const cell = row.cells[column.id]; if (!cell) return <td key={column.id} className="border border-[var(--border)] p-3">—</td>; const selected = cells[cell.id]; return <td key={column.id} className="border border-[var(--border)] p-3 align-top"><div className="grid gap-2">{cell.options.map((option) => <button key={option.id} type="button" disabled={disabled} onClick={() => choose(cell.id, option.id)} className={`rounded-xl border px-3 py-2 text-right text-xs ${selected === option.id ? "border-[var(--primary)] bg-[var(--primary-light)] font-bold" : "border-[var(--border)] bg-white"}`}>{option.text}</button>)}</div></td>; })}</tr>)}</tbody></table></div>;
}

function CutJoinRenderer({ data, answer, disabled, onChange }: { data: CutJoinData; answer: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void }) {
  const sections = asObject(answer.sections);
  function update(id: string, patch: Record<string, unknown>) { onChange({ sections: { ...sections, [id]: { ...asObject(sections[id]), ...patch } } }); }
  return <div className="space-y-5">{data.sections.map((section, index) => { const value = asObject(sections[section.id]); return <div key={section.id} className="rounded-2xl border border-[var(--border)] p-5"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-[var(--primary-light)] px-3 py-1 text-xs font-bold text-[var(--primary)]">{section.type === "cut" ? "مقطوع" : section.type === "joined" ? "موصول" : "فيه خلاف"}</span><span className="font-bold">{index + 1}. {section.title}</span></div><label className="mt-4 block text-sm font-bold">اكتب الجزء المطلوب</label><input disabled={disabled} value={String(value.text ?? "")} onChange={(e) => update(section.id, { text: e.target.value })} className="mt-2 w-full rounded-xl border border-[var(--border)] px-4 py-3 outline-none focus:border-[var(--primary)]" placeholder="اكتب الإجابة هنا"/><label className="mt-4 block text-sm font-bold">اختر السورة</label><select disabled={disabled} value={value.surahId == null ? "" : String(value.surahId)} onChange={(e) => update(section.id, { surahId: e.target.value ? Number(e.target.value) : null })} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3"><option value="">اختر السورة</option>{SURAHES.map((name, i) => <option key={i + 1} value={i + 1}>{i + 1}. {name}</option>)}</select></div>; })}</div>;
}

function ConditionalRenderer({ data, answer, disabled, onChange }: { data: ConditionalData; answer: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void }) {
  const selections = Array.isArray(answer.selections) ? answer.selections as { nodeId: string; optionId: string }[] : [];
  const map = new Map(selections.map((s) => [s.nodeId, s.optionId]));
  const visited: ConditionalNode[] = [];
  const seen = new Set<string>(); let nodeId = data.startNodeId;
  while (nodeId && !seen.has(nodeId)) { const node = data.nodes.find((n) => n.id === nodeId); if (!node) break; visited.push(node); seen.add(nodeId); const selected = map.get(node.id); if (!selected) break; nodeId = node.nextByOption?.[selected] ?? ""; }
  function choose(nodeId: string, optionId: string) { const kept = selections.filter((s) => !visited.slice(visited.findIndex((n) => n.id === nodeId) + 1).some((n) => n.id === s.nodeId)); const next = [...kept.filter((s) => s.nodeId !== nodeId), { nodeId, optionId }]; onChange({ selections: next }); }
  return <div className="space-y-4">{visited.map((node, index) => <div key={node.id} className="rounded-2xl border border-[var(--border)] p-5"><div className="text-xs font-bold text-[var(--primary)]">المرحلة {index + 1}</div><p className="mt-2 font-bold leading-7">{node.prompt}</p><div className="mt-4 grid gap-2">{node.options.map((option) => <button key={option.id} type="button" disabled={disabled} onClick={() => choose(node.id, option.id)} className={`rounded-xl border p-3 text-right text-sm ${map.get(node.id) === option.id ? "border-[var(--primary)] bg-[var(--primary-light)] font-bold" : "border-[var(--border)]"}`}>{option.text}</button>)}</div></div>)}{visited.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-[var(--muted)]">لا توجد مراحل متاحة لهذا السؤال.</p>}</div>;
}

function OrderingRenderer({ data, answer, disabled, onChange }: { data: OrderingData; answer: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void }) {
  const order = Array.isArray(answer.order) ? answer.order.map(String) : data.items.map((i) => i.id);
  const items = order.map((id) => data.items.find((i) => i.id === id)).filter(Boolean) as OrderingData["items"];
  const [dragId, setDragId] = useState<string | null>(null);
  function move(from: number, to: number) { if (from === to) return; const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); onChange({ order: next.map((i) => i.id) }); }
  return <div><p className="mb-4 rounded-xl bg-[var(--primary-light)] p-3 text-sm text-[var(--muted)]">رتّب العناصر بالترتيب الصحيح. يمكنك سحب العنصر أو استخدام الأسهم.</p><div className="space-y-2">{items.map((item, index) => <div key={item.id} draggable={!disabled} onDragStart={() => setDragId(item.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) move(items.findIndex((x) => x.id === dragId), index); setDragId(null); }} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-white p-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-sm font-bold text-[var(--primary)]">{index + 1}</span><span className="flex-1 text-sm font-medium">{item.text}</span><button type="button" disabled={disabled || index === 0} onClick={() => move(index, index - 1)} className="rounded-lg border px-2 py-1 disabled:opacity-30">↑</button><button type="button" disabled={disabled || index === items.length - 1} onClick={() => move(index, index + 1)} className="rounded-lg border px-2 py-1 disabled:opacity-30">↓</button></div>)}</div></div>;
}

function FillBlanksRenderer({ data, answer, disabled, onChange }: { data: FillBlanksData; answer: AnswerValue; disabled: boolean; onChange: (v: AnswerValue) => void }) {
  const blanks = asObject(answer.blanks);
  const [dragId, setDragId] = useState<string | null>(null);
  function assign(blankId: string, answerId: string) { onChange({ blanks: { ...blanks, [blankId]: answerId } }); }
  return <div><div className="rounded-2xl border border-[var(--border)] p-5 leading-10"><div className="flex flex-wrap items-center gap-2">{data.parts.map((part, i) => part.type === "text" ? <span key={i}>{part.value}</span> : <span key={i} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) assign(part.blankId, dragId); setDragId(null); }} className="inline-flex min-w-28 items-center justify-center rounded-lg border-2 border-dashed border-[var(--primary)] bg-[var(--primary-light)] px-3 py-1 text-sm font-bold">{typeof blanks[part.blankId] === "string" ? data.answerBank.find((a) => a.id === blanks[part.blankId])?.text ?? "اختر" : "اختر"}</span>)}</div></div><div className="mt-5"><p className="mb-3 text-sm font-bold">بنك الإجابات</p><div className="flex flex-wrap gap-2">{data.answerBank.map((item) => <button key={item.id} type="button" draggable={!disabled} onDragStart={() => setDragId(item.id)} onClick={() => { const target = data.blanks.find((b) => !blanks[b.id]); if (target) assign(target.id, item.id); }} disabled={disabled} className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium hover:border-[var(--primary)]">{item.text}</button>)}</div></div></div>;
}

function ResultView({ levelId, mode, chapterId, quiz, result }: { levelId: number; mode: QuizMode; chapterId: number | null; quiz: QuizData; result: QuizResult }) {
  return <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><div className="rounded-3xl border border-[var(--border)] bg-white p-6 text-center shadow-sm sm:p-10"><div className="text-5xl">{result.percentage >= 80 ? "🎉" : result.percentage >= 50 ? "👏" : "📚"}</div><p className="mt-4 text-sm font-bold text-[var(--primary)]">تم تصحيح الاختبار</p><h2 className="mt-2 text-2xl font-bold">{quiz.levelTitle}</h2>{quiz.chapterTitle && <p className="mt-2 text-sm text-[var(--muted)]">{quiz.chapterTitle}</p>}<div className="mt-6 text-6xl font-black text-[var(--primary)]">{result.percentage}%</div><p className="mt-3 text-sm text-[var(--muted)]">{result.earnedPoints} من {result.maxPoints} درجة</p><div className="mt-7 grid gap-4 sm:grid-cols-3"><StatCard title="الأسئلة" value={`${result.totalQuestions}`}/><StatCard title="صحيحة بالكامل" value={`${result.correctCount}`}/><StatCard title="تحتاج مراجعة" value={`${result.wrongCount}`}/></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><a href={`/tajweed/${levelId}/quiz?mode=${mode}${mode === "chapter" ? `&chapterId=${chapterId}` : ""}`} className="rounded-xl bg-[var(--primary)] px-5 py-3 font-bold text-white">🔄 إعادة الاختبار</a><a href={`/tajweed/${levelId}`} className="rounded-xl border border-[var(--border)] px-5 py-3 font-bold">📚 العودة إلى المستوى</a></div></div><section className="mt-8"><h3 className="mb-4 text-xl font-bold">📊 تحليل الاختبار حسب الأبواب</h3><div className="grid gap-4">{result.chapterAnalysis.map((c) => <div key={c.chapterId} className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h4 className="font-bold">{c.chapterTitle}</h4><p className="mt-1 text-xs text-[var(--muted)]">{c.correct} صحيحة من {c.total}</p></div><strong className="text-xl text-[var(--primary)]">{c.percentage}%</strong></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${c.percentage}%` }}/></div><p className="mt-2 text-xs text-[var(--muted)]">{c.earnedPoints} / {c.maxPoints} درجة</p></div>)}</div></section><section className="mt-8"><h3 className="mb-4 text-xl font-bold">📖 مراجعة الأسئلة</h3><div className="space-y-4">{result.review.map((item) => <ReviewCard key={item.questionId} item={item} quizQuestion={quiz.questions.find((q) => q.id === item.questionId)}/>)}</div></section></section>;
}

function StatCard({ title, value }: { title: string; value: string }) { return <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5"><p className="text-xs text-[var(--muted)]">{title}</p><p className="mt-1 text-xl font-black">{value}</p></div>; }

function ReviewCard({ item, quizQuestion }: { item: ReviewItem; quizQuestion?: QuizQuestion }) {
  const details = asObject(item.details);
  const selected = typeof details.selectedOption === "string" ? details.selectedOption : null;
  const correct = typeof details.correctOption === "string" ? details.correctOption : null;
  const selectedText = quizQuestion?.options?.find((o) => o.key === selected)?.text;
  const correctText = quizQuestion?.options?.find((o) => o.key === correct)?.text;

  return (
    <article className={`rounded-3xl border bg-white p-5 shadow-sm ${item.isCorrect ? "border-emerald-200" : "border-red-200"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--primary)]">السؤال {item.number}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{item.chapterTitle} · {item.questionType}</p>
        </div>
        <span className={`rounded-xl px-3 py-2 text-xs font-bold ${item.isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {item.isCorrect ? "✓ صحيحة" : "✕ تحتاج مراجعة"}
        </span>
      </div>

      <h4 className="mt-4 font-bold leading-8">{item.questionText}</h4>
      <p className="mt-3 text-sm text-[var(--muted)]">الدرجة: {item.earnedPoints} / {item.points}</p>

      {item.questionType === "mcq" && (
        <div className="mt-4 grid gap-2">
          {selectedText && <div className="rounded-xl bg-slate-50 p-3 text-sm">إجابتك: <strong>{selectedText}</strong></div>}
          {!item.isCorrect && correctText && <div className="rounded-xl bg-emerald-50 p-3 text-sm">الإجابة الصحيحة: <strong>{correctText}</strong></div>}
        </div>
      )}

      {item.questionType === "table" && <TableReview details={details} />}
      {item.questionType === "cut_join" && <CutJoinReview details={details} />}
      {item.questionType === "conditional" && <ConditionalReview details={details} />}
      {item.questionType === "ordering" && <OrderingReview details={details} />}
      {item.questionType === "fill_blanks" && <FillBlanksReview details={details} />}

      {item.summary && <p className="mt-4 rounded-xl bg-[var(--background)] p-3 text-sm leading-7">{item.summary}</p>}
      {item.explanation && (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
          <p className="text-xs font-bold text-[var(--primary)]">💡 الشرح</p>
          <p className="mt-2 text-sm leading-7">{item.explanation}</p>
        </div>
      )}
    </article>
  );
}

function TableReview({ details }: { details: Record<string, unknown> }) {
  const cells = Array.isArray(details.cellDetails) ? details.cellDetails as Array<Record<string, unknown>> : [];
  if (cells.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="bg-[var(--primary-light)] px-4 py-3 text-sm font-bold">تصحيح الجدول</div>
      <div className="divide-y divide-[var(--border)]">
        {cells.map((cell, index) => {
          const ok = Boolean(cell.correct);
          return (
            <div key={String(cell.cellId ?? index)} className="p-4">
              <div className="text-xs font-bold text-[var(--muted)]">
                {String(cell.rowLabel ?? `السؤال ${index + 1}`)} · {String(cell.columnTitle ?? "")}
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className={`rounded-xl p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                  <span className="font-bold">إجابتك:</span> {String(cell.selectedOptionText ?? "لم تُجب")}
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  <span className="font-bold">الإجابة الصحيحة:</span> {String(cell.correctOptionText ?? "—")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CutJoinReview({ details }: { details: Record<string, unknown> }) {
  const sections = Array.isArray(details) ? details as Array<Record<string, unknown>> : Array.isArray(details.details) ? details.details as Array<Record<string, unknown>> : [];
  if (sections.length === 0) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-2xl bg-[var(--primary-light)] px-4 py-3 text-sm font-bold">تصحيح المقطوع والموصول والتاءات</div>
      {sections.map((section, index) => {
        const textCorrect = Boolean(section.textCorrect);
        const surahCorrect = Boolean(section.surahCorrect);
        const keywords = Array.isArray(section.acceptedKeywords) ? section.acceptedKeywords.map(String).join("، ") : "—";
        return (
          <div key={String(section.sectionId ?? index)} className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-sm font-bold">{String(section.sectionTitle ?? `المقطع ${index + 1}`)}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className={`rounded-xl p-3 text-sm ${textCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                <span className="font-bold">النص الذي أدخلته:</span> {String(section.submittedText || "لم تُجب")}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="font-bold">الإجابة المقبولة:</span> {keywords || "—"}
              </div>
              <div className={`rounded-xl p-3 text-sm ${surahCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                <span className="font-bold">السورة التي اخترتها:</span> {String(section.selectedSurahName ?? "لم تختر سورة")}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="font-bold">السورة الصحيحة:</span> {String(section.correctSurahName ?? "—")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConditionalReview({ details }: { details: Record<string, unknown> }) {
  const stages = Array.isArray(details) ? details as Array<Record<string, unknown>> : Array.isArray(details.details) ? details.details as Array<Record<string, unknown>> : [];
  if (stages.length === 0) return null;

  return (
    <div className="mt-5 space-y-3">
      <div className="rounded-2xl bg-[var(--primary-light)] px-4 py-3 text-sm font-bold">تصحيح السؤال المتسلسل</div>
      {stages.map((stage, index) => {
        const ok = Boolean(stage.correct);
        return (
          <div key={String(stage.nodeId ?? index)} className="rounded-2xl border border-[var(--border)] p-4">
            <p className="text-sm font-bold">المرحلة {index + 1}</p>
{String(stage.prompt ?? "").trim() !== "" && (
  <p className="mt-1 text-sm text-[var(--muted)]">
    {String(stage.prompt ?? "")}
  </p>
)}            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className={`rounded-xl p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                <span className="font-bold">إجابتك:</span> {String(stage.selectedOptionText ?? "لم تُجب")}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="font-bold">الإجابة الصحيحة:</span> {String(stage.correctOptionText ?? "—")}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrderingReview({ details }: { details: Record<string, unknown> }) {
  const submitted = Array.isArray(details.submittedOrderText) ? details.submittedOrderText.map(String) : [];
  const correct = Array.isArray(details.correctOrderText) ? details.correctOrderText.map(String) : [];
  if (submitted.length === 0 && correct.length === 0) return null;

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-bold text-red-800">ترتيبك</p>
        <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm text-red-900">{submitted.map((text, i) => <li key={i}>{text}</li>)}</ol>
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-sm font-bold text-emerald-800">الترتيب الصحيح</p>
        <ol className="mt-3 list-decimal space-y-2 pr-5 text-sm text-emerald-900">{correct.map((text, i) => <li key={i}>{text}</li>)}</ol>
      </div>
    </div>
  );
}

function FillBlanksReview({ details }: { details: Record<string, unknown> }) {
  const blanks = Array.isArray(details) ? details as Array<Record<string, unknown>> : Array.isArray(details.details) ? details.details as Array<Record<string, unknown>> : [];
  if (blanks.length === 0) return null;

  return (
    <div className="mt-5 rounded-2xl border border-[var(--border)] overflow-hidden">
      <div className="bg-[var(--primary-light)] px-4 py-3 text-sm font-bold">تصحيح الفراغات</div>
      <div className="divide-y divide-[var(--border)]">
        {blanks.map((blank, index) => {
          const ok = Boolean(blank.correct);
          return (
            <div key={String(blank.blankId ?? index)} className="grid gap-2 p-4 sm:grid-cols-2">
              <div className={`rounded-xl p-3 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
                <span className="font-bold">الفراغ {index + 1} — إجابتك:</span> {String(blank.selectedAnswerText ?? "لم تُجب")}
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="font-bold">الإجابة الصحيحة:</span> {String(blank.correctAnswerText ?? "—")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

