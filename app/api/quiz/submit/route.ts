import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type {
  QuestionType,
  TableQuestionData,
  CutJoinQuestionData,
  ConditionalQuestionData,
  OrderingQuestionData,
  FillBlanksQuestionData,
} from "@/lib/quiz-types";

type QuizMode = "comprehensive" | "chapter";

type QuizSession = {
  levelId: number;
  mode: QuizMode;
  chapterId: number | null;
  questionIds: number[];
  createdAt: number;
};

type QuestionRow = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
  correct_option: string | null;
  explanation: string | null;
  question_type: QuestionType;
  points: number;
  question_data: unknown;
};

type ChapterRow = {
  id: number;
  title: string;
};

type SubmittedAnswer = {
  questionId: number;
  answer?: unknown;
  selectedOption?: string | null;
};

type GradeResult = {
  earnedPoints: number;
  maxPoints: number;
  isFullyCorrect: boolean;
  summary: string;
  details: unknown;
};

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

function roundPoints(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeArabic(value: string) {
  return value
    .trim()
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ");
}

const SURAH_NAMES = [
  "الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"
];

function optionText(options: unknown, id: string | null) {
  if (!id || !Array.isArray(options)) return null;
  const item = options.find((value) => {
    const option = toObject(value);
    return option.id === id;
  });
  const text = toObject(item).text;
  return typeof text === "string" ? text : null;
}

function toObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function getAnswerValue(answer: SubmittedAnswer) {
  if (answer.answer !== undefined) {
    return answer.answer;
  }

  return {
    selectedOption: answer.selectedOption ?? null,
  };
}

function gradeMcq(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  const value = toObject(answer).selectedOption;
  const selected = typeof value === "string" ? value : null;
  const maxPoints = Number(question.points) > 0 ? Number(question.points) : 1;
  const correct = Boolean(
    selected && question.correct_option && selected === question.correct_option
  );

  return {
    earnedPoints: correct ? maxPoints : 0,
    maxPoints,
    isFullyCorrect: correct,
    summary: correct ? "إجابة صحيحة" : "إجابة غير صحيحة",
    details: {
      selectedOption: selected,
      correctOption: question.correct_option,
    },
  };
}

function gradeTable(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  const data = question.question_data as TableQuestionData;
  const submitted = toObject(toObject(answer).cells);
  let earnedPoints = 0;
  let maxPoints = 0;
  let allCorrect = true;

  for (const row of data.rows ?? []) {
    for (const column of data.columns ?? []) {
      const cell = row.cells?.[column.id];
      if (!cell) continue;

      const points = Number(cell.points) > 0 ? Number(cell.points) : 0;
      maxPoints += points;

      const selected = submitted[cell.id];
      const selectedId = typeof selected === "string" ? selected : null;
      const correct = selectedId === cell.correctOptionId;

      if (correct) {
        earnedPoints += points;
      } else {
        allCorrect = false;
      }
    }
  }

  if (maxPoints === 0) allCorrect = false;

  const cellDetails = (data.rows ?? []).flatMap((row) =>
    (data.columns ?? []).flatMap((column) => {
      const cell = row.cells?.[column.id];
      if (!cell) return [];
      const selectedId = typeof submitted[cell.id] === "string" ? String(submitted[cell.id]) : null;
      const correctId = cell.correctOptionId ?? null;
      return [{
        cellId: cell.id,
        rowId: row.id,
        rowLabel: row.label,
        columnId: column.id,
        columnTitle: column.title,
        selectedOptionId: selectedId,
        selectedOptionText: optionText(cell.options, selectedId),
        correctOptionId: correctId,
        correctOptionText: optionText(cell.options, correctId),
        correct: selectedId === correctId,
        points: Number(cell.points) || 0,
      }];
    })
  );

  return {
    earnedPoints: roundPoints(earnedPoints),
    maxPoints: roundPoints(maxPoints),
    isFullyCorrect: allCorrect,
    summary: allCorrect ? "إجابة صحيحة بالكامل" : "إجابة جزئية أو غير صحيحة",
    details: { cells: submitted, cellDetails },
  };
}

function gradeCutJoin(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  const data = question.question_data as CutJoinQuestionData;
  const submittedSections = toObject(toObject(answer).sections);
  let earnedPoints = 0;
  let maxPoints = 0;
  let allCorrect = true;

  const details: Array<Record<string, unknown>> = [];

  for (const section of data.sections ?? []) {
    const textPoints = Number(section.textPoints) > 0 ? Number(section.textPoints) : 0;
    const surahPoints = Number(section.surahPoints) > 0 ? Number(section.surahPoints) : 0;
    maxPoints += textPoints + surahPoints;

    const raw = submittedSections[section.id];
    const submitted = toObject(raw);
    const text = typeof submitted.text === "string" ? submitted.text : "";
    const surahId =
      typeof submitted.surahId === "number"
        ? submitted.surahId
        : Number.isInteger(Number(submitted.surahId))
          ? Number(submitted.surahId)
          : null;

    const normalizedText = normalizeArabic(text);
    const keywords = (section.acceptedKeywords ?? [])
      .map((keyword) => normalizeArabic(String(keyword)))
      .filter(Boolean);

    const textCorrect =
      keywords.length > 0 &&
      keywords.some((keyword) => normalizedText.includes(keyword));

    const surahCorrect = surahId === section.correctSurahId;

    if (textCorrect) earnedPoints += textPoints;
    else if (textPoints > 0) allCorrect = false;

    if (surahCorrect) earnedPoints += surahPoints;
    else if (surahPoints > 0) allCorrect = false;

    details.push({
      sectionId: section.id,
      sectionType: section.type,
      sectionTitle: section.title,
      submittedText: text,
      acceptedKeywords: section.acceptedKeywords ?? [],
      textCorrect,
      selectedSurahId: surahId,
      correctSurahId: section.correctSurahId,
      selectedSurahName: surahId && SURAH_NAMES[surahId - 1] ? SURAH_NAMES[surahId - 1] : null,
      correctSurahName: SURAH_NAMES[section.correctSurahId - 1] ?? null,
      surahCorrect,
      textPoints,
      surahPoints,
    });
  }

  if (maxPoints === 0) allCorrect = false;

  return {
    earnedPoints: roundPoints(earnedPoints),
    maxPoints: roundPoints(maxPoints),
    isFullyCorrect: allCorrect,
    summary: allCorrect ? "إجابة صحيحة بالكامل" : "إجابة جزئية أو غير صحيحة",
    details,
  };
}

function gradeConditional(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  const data = question.question_data as ConditionalQuestionData;
  const selections = Array.isArray(toObject(answer).selections)
    ? (toObject(answer).selections as unknown[])
    : [];

  const selectionMap = new Map<string, string>();
  for (const item of selections) {
    const entry = toObject(item);
    const nodeId = typeof entry.nodeId === "string" ? entry.nodeId : "";
    const optionId = typeof entry.optionId === "string" ? entry.optionId : "";
    if (nodeId && optionId) selectionMap.set(nodeId, optionId);
  }

  let nodeId = data.startNodeId;
  let earnedPoints = 0;
  let maxPoints = 0;
  let allCorrect = true;
  const visited = new Set<string>();
  const details: Array<Record<string, unknown>> = [];

  while (nodeId && !visited.has(nodeId)) {
    visited.add(nodeId);
    const node = data.nodes?.find((item) => item.id === nodeId);
    if (!node) break;

    const points = Number(node.points) > 0 ? Number(node.points) : 0;
    maxPoints += points;

    const selectedOption = selectionMap.get(node.id) ?? null;
    const correct = selectedOption === node.correctOptionId;

    if (correct) earnedPoints += points;
    else allCorrect = false;

    details.push({
      nodeId: node.id,
      prompt: node.prompt,
      selectedOption,
      selectedOptionText: optionText(node.options, selectedOption),
      correctOptionId: node.correctOptionId,
      correctOptionText: optionText(node.options, node.correctOptionId),
      correct,
      points,
    });

    if (!selectedOption) break;
nodeId = node.nextByOption?.[selectedOption] ?? "";  }

  if (maxPoints === 0) allCorrect = false;

  return {
    earnedPoints: roundPoints(earnedPoints),
    maxPoints: roundPoints(maxPoints),
    isFullyCorrect: allCorrect,
    summary: allCorrect ? "إجابة صحيحة بالكامل" : "إجابة جزئية أو غير صحيحة",
    details,
  };
}

function gradeOrdering(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  const data = question.question_data as OrderingQuestionData;
  const submitted = Array.isArray(toObject(answer).order)
    ? (toObject(answer).order as unknown[]).map(String)
    : [];

  const correctOrder = (data.correctOrder ?? []).map(String);
  const maxPoints = Number(data.points) > 0 ? Number(data.points) : Number(question.points) || 1;
  const sameLength = submitted.length === correctOrder.length;

  if (!data.partialCredit) {
    const correct =
      sameLength && submitted.every((item, index) => item === correctOrder[index]);

    return {
      earnedPoints: correct ? maxPoints : 0,
      maxPoints,
      isFullyCorrect: correct,
      summary: correct ? "ترتيب صحيح" : "الترتيب غير صحيح",
      details: {
        submittedOrder: submitted,
        correctOrder,
        submittedOrderText: submitted.map((id) => data.items.find((item) => item.id === id)?.text ?? id),
        correctOrderText: correctOrder.map((id) => data.items.find((item) => item.id === id)?.text ?? id),
      },
    };
  }

  let matched = 0;
  const count = Math.min(submitted.length, correctOrder.length);
  for (let index = 0; index < count; index++) {
    if (submitted[index] === correctOrder[index]) matched++;
  }

  const earnedPoints =
    correctOrder.length > 0
      ? maxPoints * (matched / correctOrder.length)
      : 0;

  return {
    earnedPoints: roundPoints(earnedPoints),
    maxPoints: roundPoints(maxPoints),
    isFullyCorrect: sameLength && matched === correctOrder.length,
    summary:
      matched === correctOrder.length && sameLength
        ? "ترتيب صحيح"
        : "تم احتساب الدرجة الجزئية",
    details: {
      submittedOrder: submitted,
      correctOrder,
      submittedOrderText: submitted.map((id) => data.items.find((item) => item.id === id)?.text ?? id),
      correctOrderText: correctOrder.map((id) => data.items.find((item) => item.id === id)?.text ?? id),
      matched,
    },
  };
}

function gradeFillBlanks(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  const data = question.question_data as FillBlanksQuestionData;
  const submitted = toObject(toObject(answer).blanks);
  let earnedPoints = 0;
  let maxPoints = 0;
  let allCorrect = true;
  const used = new Set<string>();
  const details: Array<Record<string, unknown>> = [];

  for (const blank of data.blanks ?? []) {
    const points = Number(blank.points) > 0 ? Number(blank.points) : 0;
    maxPoints += points;

    const raw = submitted[blank.id];
    const selectedId = typeof raw === "string" ? raw : null;
    const isReuseViolation =
      Boolean(selectedId) && !data.allowReuse && used.has(selectedId as string);
    const correct =
      Boolean(selectedId) &&
      selectedId === blank.correctAnswerId &&
      !isReuseViolation;

    if (selectedId && !data.allowReuse) used.add(selectedId);

    if (correct) earnedPoints += points;
    else allCorrect = false;

    details.push({
      blankId: blank.id,
      selectedAnswerId: selectedId,
      selectedAnswerText: data.answerBank.find((item) => item.id === selectedId)?.text ?? null,
      correctAnswerId: blank.correctAnswerId,
      correctAnswerText: data.answerBank.find((item) => item.id === blank.correctAnswerId)?.text ?? null,
      correct,
      points,
    });
  }

  if (maxPoints === 0) allCorrect = false;

  return {
    earnedPoints: roundPoints(earnedPoints),
    maxPoints: roundPoints(maxPoints),
    isFullyCorrect: allCorrect,
    summary: allCorrect ? "إجابة صحيحة بالكامل" : "إجابة جزئية أو غير صحيحة",
    details,
  };
}

function gradeQuestion(
  question: QuestionRow,
  answer: unknown
): GradeResult {
  switch (question.question_type) {
    case "mcq":
      return gradeMcq(question, answer);
    case "table":
      return gradeTable(question, answer);
    case "cut_join":
      return gradeCutJoin(question, answer);
    case "conditional":
      return gradeConditional(question, answer);
    case "ordering":
      return gradeOrdering(question, answer);
    case "fill_blanks":
      return gradeFillBlanks(question, answer);
    default:
      return {
        earnedPoints: 0,
        maxPoints: Number(question.points) > 0 ? Number(question.points) : 1,
        isFullyCorrect: false,
        summary: "نوع سؤال غير مدعوم",
        details: null,
      };
  }
}

function verifyQuizSessionToken(token: string): QuizSession | null {
  try {
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) return null;

    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [payload, receivedSignature] = parts;
    const expectedSignature = createHmac("sha256", secret)
      .update(payload)
      .digest("base64url");

    const receivedBuffer = Buffer.from(receivedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (receivedBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(receivedBuffer, expectedBuffer)) return null;

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as QuizSession;

    if (
      !session ||
      !Number.isInteger(session.levelId) ||
      session.levelId <= 0 ||
      !Array.isArray(session.questionIds) ||
      session.questionIds.length === 0 ||
      !Number.isInteger(session.createdAt)
    ) {
      return null;
    }

    const oneHour = 60 * 60 * 1000;
    if (Date.now() - session.createdAt > oneHour) return null;

    return session;
  } catch (error) {
    console.error("Quiz session verification error:", error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const levelId = Number(body?.levelId);
    const answers = body?.answers;

    if (!Number.isInteger(levelId) || levelId <= 0) {
      return errorResponse("رقم المستوى غير صحيح.");
    }

    if (!Array.isArray(answers)) {
      return errorResponse("بيانات الإجابات غير صحيحة.");
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("tajweed_quiz_session")?.value;

    if (!token) {
      return errorResponse("انتهت جلسة الاختبار أو لم تبدأ جلسة صالحة.", 401);
    }

    const session = verifyQuizSessionToken(token);
    if (!session) {
      return errorResponse("انتهت جلسة الاختبار. يرجى بدء اختبار جديد.", 401);
    }

    if (session.levelId !== levelId) {
      return errorResponse("جلسة الاختبار لا تطابق المستوى المطلوب.", 403);
    }

    const sessionQuestionIds = session.questionIds;
    const sessionIdSet = new Set(sessionQuestionIds);
    const normalizedAnswers: SubmittedAnswer[] = [];
    const submittedIdSet = new Set<number>();

    for (const item of answers as unknown[]) {
      const answer = toObject(item);
      const questionId = Number(answer.questionId);

      if (!Number.isInteger(questionId) || questionId <= 0) {
        return errorResponse("يوجد سؤال برقم غير صحيح.");
      }

      if (!sessionIdSet.has(questionId)) {
        return errorResponse("تم إرسال سؤال غير موجود في جلسة الاختبار.", 403);
      }

      if (submittedIdSet.has(questionId)) {
        return errorResponse("تم إرسال إجابة مكررة لنفس السؤال.");
      }

      submittedIdSet.add(questionId);
      normalizedAnswers.push({
        questionId,
        answer: answer.answer,
        selectedOption:
          typeof answer.selectedOption === "string" || answer.selectedOption === null
            ? (answer.selectedOption as string | null | undefined)
            : undefined,
      });
    }

    const { data: questionRowsRaw, error: questionsError } = await supabaseAdmin
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
        question_type,
        points,
        question_data
        `
      )
      .eq("level_id", levelId)
      .eq("is_active", true)
      .in("id", sessionQuestionIds);

    if (questionsError) {
      console.error("Submit questions error:", questionsError);
      return errorResponse("حدث خطأ أثناء تحميل أسئلة الاختبار.", 500);
    }

    const questionRows = (questionRowsRaw ?? []) as QuestionRow[];

    if (questionRows.length !== sessionQuestionIds.length) {
      return errorResponse("تعذر التحقق من جميع أسئلة جلسة الاختبار.", 409);
    }

    const chapterIds = [...new Set(questionRows.map((question) => question.chapter_id))];

    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from("chapters")
      .select("id, title")
      .in("id", chapterIds);

    if (chaptersError) {
      console.error("Submit chapters error:", chaptersError);
      return errorResponse("حدث خطأ أثناء تحميل أبواب الاختبار.", 500);
    }

    const chapterMap = new Map<number, string>();
    for (const chapter of (chapters ?? []) as ChapterRow[]) {
      chapterMap.set(chapter.id, chapter.title);
    }

    const questionMap = new Map<number, QuestionRow>();
    for (const question of questionRows) {
      questionMap.set(question.id, question);
    }

    const answerMap = new Map<number, SubmittedAnswer>();
    for (const answer of normalizedAnswers) {
      answerMap.set(answer.questionId, answer);
    }

    const orderedQuestionRows = sessionQuestionIds
      .map((questionId) => questionMap.get(questionId))
      .filter((question): question is QuestionRow => Boolean(question));

    let totalEarnedPoints = 0;
    let totalMaxPoints = 0;
    let fullyCorrectCount = 0;

    const chapterStats = new Map<
      number,
      {
        chapterId: number;
        chapterTitle: string;
        earnedPoints: number;
        maxPoints: number;
        correct: number;
        wrong: number;
      }
    >();

    const review = orderedQuestionRows.map((question) => {
      const submitted = answerMap.get(question.id);
      const grade = gradeQuestion(
        question,
        submitted ? getAnswerValue(submitted) : { selectedOption: null }
      );

      totalEarnedPoints += grade.earnedPoints;
      totalMaxPoints += grade.maxPoints;

      if (grade.isFullyCorrect) fullyCorrectCount++;

      const title = chapterMap.get(question.chapter_id) ?? "باب غير معروف";

      const existing = chapterStats.get(question.chapter_id);
      if (existing) {
        existing.earnedPoints += grade.earnedPoints;
        existing.maxPoints += grade.maxPoints;
        if (grade.isFullyCorrect) existing.correct++;
        else existing.wrong++;
      } else {
        chapterStats.set(question.chapter_id, {
          chapterId: question.chapter_id,
          chapterTitle: title,
          earnedPoints: grade.earnedPoints,
          maxPoints: grade.maxPoints,
          correct: grade.isFullyCorrect ? 1 : 0,
          wrong: grade.isFullyCorrect ? 0 : 1,
        });
      }

      return {
        questionId: question.id,
        number: sessionQuestionIds.indexOf(question.id) + 1,
        chapterId: question.chapter_id,
        chapterTitle: title,
        questionText: question.question_text ?? "",
        questionType: question.question_type,
        points: roundPoints(grade.maxPoints),
        earnedPoints: roundPoints(grade.earnedPoints),
        isCorrect: grade.isFullyCorrect,
        summary: grade.summary,
        explanation: question.explanation ?? "",
        details: grade.details,
      };
    });

    totalEarnedPoints = roundPoints(totalEarnedPoints);
    totalMaxPoints = roundPoints(totalMaxPoints);

    const percentage =
      totalMaxPoints > 0
        ? roundPoints((totalEarnedPoints / totalMaxPoints) * 100)
        : 0;

    const chapterAnalysis = [...chapterStats.values()].map((item) => ({
      chapterId: item.chapterId,
      chapterTitle: item.chapterTitle,
      total: item.correct + item.wrong,
      correct: item.correct,
      wrong: item.wrong,
      earnedPoints: roundPoints(item.earnedPoints),
      maxPoints: roundPoints(item.maxPoints),
      percentage:
        item.maxPoints > 0
          ? roundPoints((item.earnedPoints / item.maxPoints) * 100)
          : 0,
    }));

    const response = NextResponse.json({
      success: true,
      result: {
        levelId,
        mode: session.mode,
        chapterId: session.chapterId,
        totalQuestions: orderedQuestionRows.length,
        correctCount: fullyCorrectCount,
        wrongCount: orderedQuestionRows.length - fullyCorrectCount,
        earnedPoints: totalEarnedPoints,
        maxPoints: totalMaxPoints,
        percentage,
        chapterAnalysis,
        review,
      },
    });

    response.cookies.set("tajweed_quiz_session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Quiz submit error:", error);
    return errorResponse("حدث خطأ غير متوقع أثناء تصحيح الاختبار.", 500);
  }
}