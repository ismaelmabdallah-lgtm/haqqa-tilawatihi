import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

type QuizMode = "comprehensive" | "chapter";

type QuestionType =
  | "mcq"
  | "table"
  | "cut_join"
  | "conditional"
  | "ordering"
  | "fill_blanks";

type QuestionRow = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  question_type: QuestionType;
  points: number;
  question_data: unknown;
  option_a: string | null;
  option_b: string | null;
  option_c: string | null;
  option_d: string | null;
};

type ChapterRow = {
  id: number;
  level_id: number;
  title: string;
  order: number;
  is_active: boolean;
};

type QuizSession = {
  levelId: number;
  mode: QuizMode;
  chapterId: number | null;
  questionIds: number[];
  createdAt: number;
};

function shuffle<T>(items: T[]): T[] {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

function createQuizSessionToken(session: QuizSession) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  const payload = Buffer.from(
    JSON.stringify(session),
    "utf8"
  ).toString("base64url");

  const signature = createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function publicQuestionData(
  questionType: QuestionType,
  rawData: unknown
): unknown {
  const data = asRecord(rawData);

  switch (questionType) {
    case "table": {
      const columns = asArray(data.columns)
        .map((column) => {
          const item = asRecord(column);
          return {
            id: String(item.id ?? ""),
            title: String(item.title ?? ""),
          };
        })
        .filter((column) => column.id.length > 0);

      const rows = asArray(data.rows)
        .map((row) => {
          const rowRecord = asRecord(row);
          const cellsRecord = asRecord(rowRecord.cells);
          const cells: Record<string, unknown> = {};

          for (const column of columns) {
            const rawCell = asRecord(cellsRecord[column.id]);
            const options = asArray(rawCell.options)
              .map((option) => {
                const optionRecord = asRecord(option);
                return {
                  id: String(optionRecord.id ?? ""),
                  text: String(optionRecord.text ?? ""),
                };
              })
              .filter((option) => option.id.length > 0);

            cells[column.id] = {
              id: String(rawCell.id ?? ""),
              options,
              points: Number(rawCell.points ?? 0),
            };
          }

          return {
            id: String(rowRecord.id ?? ""),
            label: String(rowRecord.label ?? ""),
            cells,
          };
        })
        .filter((row) => row.id.length > 0);

      return { columns, rows };
    }

    case "cut_join": {
      const sections = asArray(data.sections)
        .map((section) => {
          const item = asRecord(section);
          const type =
            item.type === "joined" || item.type === "disputed"
              ? item.type
              : "cut";

          return {
            id: String(item.id ?? ""),
            type,
            title: String(item.title ?? ""),
            textPoints: Number(item.textPoints ?? 0),
            surahPoints: Number(item.surahPoints ?? 0),
          };
        })
        .filter((section) => section.id.length > 0);

      return { sections };
    }

    case "conditional": {
      const nodes = asArray(data.nodes)
        .map((node) => {
          const item = asRecord(node);
          const options = asArray(item.options).map((option) => {
            const optionRecord = asRecord(option);
            const optionId = String(optionRecord.id ?? "");

            return {
              id: optionId,
              text: String(optionRecord.text ?? ""),
              nextNodeId:
                asRecord(item.nextByOption)[optionId] == null
                  ? null
                  : String(asRecord(item.nextByOption)[optionId]),
            };
          });

          return {
            id: String(item.id ?? ""),
            prompt: String(item.prompt ?? ""),
            options,
            points: Number(item.points ?? 0),
          };
        })
        .filter((node) => node.id.length > 0);

      return {
        startNodeId: String(data.startNodeId ?? ""),
        nodes,
      };
    }

    case "ordering": {
      const items = asArray(data.items)
        .map((item) => {
          const itemRecord = asRecord(item);
          return {
            id: String(itemRecord.id ?? ""),
            text: String(itemRecord.text ?? ""),
          };
        })
        .filter((item) => item.id.length > 0);

      return {
        items: shuffle(items),
        points: Number(data.points ?? 0),
        partialCredit: Boolean(data.partialCredit),
      };
    }

    case "fill_blanks": {
      const parts = asArray(data.parts)
        .map((part) => {
          const item = asRecord(part);

          if (item.type === "blank") {
            return {
              type: "blank",
              blankId: String(item.blankId ?? ""),
            };
          }

          return {
            type: "text",
            value: String(item.value ?? ""),
          };
        })
        .filter(
          (part) =>
            part.type === "text" ||
            String(part.blankId ?? "").length > 0
        );

      const answerBank = shuffle(
        asArray(data.answerBank)
          .map((answer) => {
            const item = asRecord(answer);
            return {
              id: String(item.id ?? ""),
              text: String(item.text ?? ""),
            };
          })
          .filter((answer) => answer.id.length > 0)
      );

      const blanks = asArray(data.blanks)
        .map((blank) => {
          const item = asRecord(blank);
          return {
            id: String(item.id ?? ""),
            points: Number(item.points ?? 0),
          };
        })
        .filter((blank) => blank.id.length > 0);

      return {
        parts,
        answerBank,
        blanks,
        allowReuse: Boolean(data.allowReuse),
      };
    }

    case "mcq":
    default:
      return {};
  }
}

function buildPublicQuestions(questions: QuestionRow[]) {
  return questions.map((question, index) => {
    const options = shuffle(
      [
        { key: "a", text: question.option_a },
        { key: "b", text: question.option_b },
        { key: "c", text: question.option_c },
        { key: "d", text: question.option_d },
      ].filter(
        (option): option is { key: string; text: string } =>
          typeof option.text === "string" && option.text.trim().length > 0
      )
    );

    return {
      id: question.id,
      number: index + 1,
      chapterId: question.chapter_id,
      questionText: question.question_text,
      questionType: question.question_type,
      points: Number(question.points),
      data:
        question.question_type === "mcq"
          ? {}
          : publicQuestionData(
              question.question_type,
              question.question_data
            ),
      options:
        question.question_type === "mcq" ? options : undefined,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const levelId = Number(body.levelId);
    const mode = body.mode as QuizMode;
    const chapterId =
      body.chapterId !== undefined ? Number(body.chapterId) : null;

    if (!Number.isInteger(levelId) || levelId <= 0) {
      return errorResponse("معرّف المستوى غير صالح.");
    }

    if (mode !== "comprehensive" && mode !== "chapter") {
      return errorResponse("نوع الاختبار غير صالح.");
    }

    if (
      mode === "chapter" &&
      (!chapterId || !Number.isInteger(chapterId) || chapterId <= 0)
    ) {
      return errorResponse("يجب تحديد الباب في اختبار التدريب.");
    }

    const { data: level, error: levelError } = await supabaseAdmin
      .from("levels")
      .select("id, title, is_active")
      .eq("id", levelId)
      .eq("is_active", true)
      .maybeSingle();

    if (levelError) {
      console.error("Level error:", levelError);
      return errorResponse("حدث خطأ أثناء تحميل المستوى.", 500);
    }

    if (!level) {
      return errorResponse("المستوى غير موجود أو غير فعال.", 404);
    }

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("quiz_settings")
      .select(
        `
        number_of_questions,
        distribution_mode,
        question_order_mode,
        is_active
        `
      )
      .eq("level_id", levelId)
      .maybeSingle();

    if (settingsError) {
      console.error("Quiz settings error:", settingsError);
      return errorResponse("حدث خطأ أثناء تحميل إعدادات الاختبار.", 500);
    }

    if (settings && !settings.is_active) {
      return errorResponse("الاختبار غير متاح حاليًا لهذا المستوى.");
    }

    const numberOfQuestions = settings?.number_of_questions ?? 15;
    const questionOrderMode = settings?.question_order_mode ?? "by_chapter";

    const { data: chapters, error: chaptersError } = await supabaseAdmin
      .from("chapters")
      .select(`id, level_id, title, order, is_active`)
      .eq("level_id", levelId)
      .eq("is_active", true)
      .order("order", { ascending: true });

    if (chaptersError) {
      console.error("Chapters error:", chaptersError);
      return errorResponse("حدث خطأ أثناء تحميل أبواب المستوى.", 500);
    }

    const activeChapters = (chapters ?? []) as ChapterRow[];

    if (activeChapters.length === 0) {
      return errorResponse("لا توجد أبواب فعالة لهذا المستوى.");
    }

    const selectFields = `
      id,
      level_id,
      chapter_id,
      question_text,
      question_type,
      points,
      question_data,
      option_a,
      option_b,
      option_c,
      option_d
    `;

    if (mode === "chapter") {
      const selectedChapter = activeChapters.find(
        (chapter) => chapter.id === chapterId
      );

      if (!selectedChapter) {
        return errorResponse("الباب غير موجود أو غير فعال.");
      }

      const { data: chapterQuestions, error: questionsError } =
        await supabaseAdmin
          .from("questions")
          .select(selectFields)
          .eq("level_id", levelId)
          .eq("chapter_id", chapterId)
          .eq("is_active", true);

      if (questionsError) {
        console.error("Chapter questions error:", questionsError);
        return errorResponse("حدث خطأ أثناء تحميل أسئلة الباب.", 500);
      }

      const availableQuestions = (chapterQuestions ?? []) as QuestionRow[];

      if (availableQuestions.length === 0) {
        return errorResponse("لا توجد أسئلة فعالة في هذا الباب.");
      }

      const selectedQuestions = shuffle(availableQuestions).slice(
        0,
        Math.min(numberOfQuestions, availableQuestions.length)
      );

      const publicQuestions = buildPublicQuestions(selectedQuestions);

      const session: QuizSession = {
        levelId,
        mode: "chapter",
        chapterId: selectedChapter.id,
        questionIds: selectedQuestions.map((question) => question.id),
        createdAt: Date.now(),
      };

      const token = createQuizSessionToken(session);

      const response = NextResponse.json({
        success: true,
        quiz: {
          mode: "chapter",
          levelId: level.id,
          levelTitle: level.title,
          chapterId: selectedChapter.id,
          chapterTitle: selectedChapter.title,
          numberOfQuestions: publicQuestions.length,
          questions: publicQuestions,
        },
      });

      response.cookies.set("tajweed_quiz_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      });

      return response;
    }

    const chapterIds = activeChapters.map((chapter) => chapter.id);

    const { data: allQuestions, error: questionsError } = await supabaseAdmin
      .from("questions")
      .select(selectFields)
      .eq("level_id", levelId)
      .eq("is_active", true)
      .in("chapter_id", chapterIds);

    if (questionsError) {
      console.error("All questions error:", questionsError);
      return errorResponse("حدث خطأ أثناء تحميل أسئلة الاختبار.", 500);
    }

    const questionsByChapter = new Map<number, QuestionRow[]>();

    for (const chapter of activeChapters) {
      questionsByChapter.set(chapter.id, []);
    }

    for (const question of (allQuestions ?? []) as QuestionRow[]) {
      const list = questionsByChapter.get(question.chapter_id);
      if (list) list.push(question);
    }

    const chapterCount = activeChapters.length;
    const base = Math.floor(numberOfQuestions / chapterCount);
    const remainder = numberOfQuestions % chapterCount;
    const selectedQuestions: QuestionRow[] = [];

    for (let index = 0; index < activeChapters.length; index++) {
      const chapter = activeChapters[index];
      const required = base + (index < remainder ? 1 : 0);
      const available = questionsByChapter.get(chapter.id) ?? [];

      if (available.length < required) {
        return errorResponse(
          `لا توجد أسئلة كافية في باب "${chapter.title}". المطلوب ${required} سؤال، والمتوفر ${available.length} فقط.`
        );
      }

      selectedQuestions.push(...shuffle(available).slice(0, required));
    }

    const orderedQuestions =
      questionOrderMode === "mixed"
        ? shuffle(selectedQuestions)
        : selectedQuestions;

    const publicQuestions = buildPublicQuestions(orderedQuestions);

    const session: QuizSession = {
      levelId,
      mode: "comprehensive",
      chapterId: null,
      questionIds: orderedQuestions.map((question) => question.id),
      createdAt: Date.now(),
    };

    const token = createQuizSessionToken(session);

    const response = NextResponse.json({
      success: true,
      quiz: {
        mode: "comprehensive",
        levelId: level.id,
        levelTitle: level.title,
        numberOfQuestions: publicQuestions.length,
        questions: publicQuestions,
      },
    });

    response.cookies.set("tajweed_quiz_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Quiz start error:", error);
    return errorResponse(
      "حدث خطأ غير متوقع أثناء بدء الاختبار.",
      500
    );
  }
}
