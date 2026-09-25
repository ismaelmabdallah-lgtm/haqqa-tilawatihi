import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

type QuizMode = "comprehensive" | "chapter";

type QuestionRow = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
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

function errorResponse(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status }
  );
}

/**
 * إنشاء توقيع آمن لجلسة الاختبار.
 *
 * نستخدم SUPABASE_SERVICE_ROLE_KEY كسرّ موجود
 * على السيرفر فقط، ولا يتم إرساله للمتصفح.
 */
function createQuizSessionToken(
  session: QuizSession
) {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const payload = Buffer.from(
    JSON.stringify(session),
    "utf8"
  ).toString("base64url");

  const signature = createHmac(
    "sha256",
    secret
  )
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const levelId = Number(body.levelId);

    const mode = body.mode as QuizMode;

    const chapterId =
      body.chapterId !== undefined
        ? Number(body.chapterId)
        : null;

    // --------------------------------------------------
    // 1. التحقق من البيانات الأساسية
    // --------------------------------------------------

    if (
      !Number.isInteger(levelId) ||
      levelId <= 0
    ) {
      return errorResponse(
        "معرّف المستوى غير صالح."
      );
    }

    if (
      mode !== "comprehensive" &&
      mode !== "chapter"
    ) {
      return errorResponse(
        "نوع الاختبار غير صالح."
      );
    }

    if (
      mode === "chapter" &&
      (!chapterId ||
        !Number.isInteger(chapterId) ||
        chapterId <= 0)
    ) {
      return errorResponse(
        "يجب تحديد الباب في اختبار التدريب."
      );
    }

    // --------------------------------------------------
    // 2. تحميل المستوى
    // --------------------------------------------------

    const {
      data: level,
      error: levelError,
    } = await supabaseAdmin
      .from("levels")
      .select("id, title, is_active")
      .eq("id", levelId)
      .eq("is_active", true)
      .maybeSingle();

    if (levelError) {
      console.error(
        "Level error:",
        levelError
      );

      return errorResponse(
        "حدث خطأ أثناء تحميل المستوى.",
        500
      );
    }

    if (!level) {
      return errorResponse(
        "المستوى غير موجود أو غير فعال.",
        404
      );
    }

    // --------------------------------------------------
    // 3. تحميل إعدادات الاختبار
    // --------------------------------------------------

    const {
      data: settings,
      error: settingsError,
    } = await supabaseAdmin
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
      console.error(
        "Quiz settings error:",
        settingsError
      );

      return errorResponse(
        "حدث خطأ أثناء تحميل إعدادات الاختبار.",
        500
      );
    }

    // إذا كان هناك إعداد موجود وتم تعطيله
    if (settings && !settings.is_active) {
      return errorResponse(
        "الاختبار غير متاح حاليًا لهذا المستوى."
      );
    }

    const numberOfQuestions =
      settings?.number_of_questions ?? 15;

    const questionOrderMode =
      settings?.question_order_mode ??
      "by_chapter";

    // --------------------------------------------------
    // 4. تحميل الأبواب الفعالة
    // --------------------------------------------------

    const {
      data: chapters,
      error: chaptersError,
    } = await supabaseAdmin
      .from("chapters")
      .select(
        `
        id,
        level_id,
        title,
        order,
        is_active
        `
      )
      .eq("level_id", levelId)
      .eq("is_active", true)
      .order("order", {
        ascending: true,
      });

    if (chaptersError) {
      console.error(
        "Chapters error:",
        chaptersError
      );

      return errorResponse(
        "حدث خطأ أثناء تحميل أبواب المستوى.",
        500
      );
    }

    const activeChapters =
      (chapters ?? []) as ChapterRow[];

    if (activeChapters.length === 0) {
      return errorResponse(
        "لا توجد أبواب فعالة لهذا المستوى."
      );
    }

    // ==================================================
    // 5. اختبار التدريب على باب واحد
    // ==================================================

    if (mode === "chapter") {
      const selectedChapter =
        activeChapters.find(
          (chapter) =>
            chapter.id === chapterId
        );

      if (!selectedChapter) {
        return errorResponse(
          "الباب غير موجود أو غير فعال."
        );
      }

      const {
        data: chapterQuestions,
        error: questionsError,
      } = await supabaseAdmin
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
          option_d
          `
        )
        .eq("level_id", levelId)
        .eq("chapter_id", chapterId)
        .eq("is_active", true);

      if (questionsError) {
        console.error(
          "Chapter questions error:",
          questionsError
        );

        return errorResponse(
          "حدث خطأ أثناء تحميل أسئلة الباب.",
          500
        );
      }

      const availableQuestions =
        (chapterQuestions ?? []) as QuestionRow[];

      if (availableQuestions.length === 0) {
        return errorResponse(
          "لا توجد أسئلة فعالة في هذا الباب."
        );
      }

      const selectedQuestions =
        shuffle(availableQuestions).slice(
          0,
          Math.min(
            numberOfQuestions,
            availableQuestions.length
          )
        );

      const orderedQuestions =
        selectedQuestions;

      const publicQuestions =
        buildPublicQuestions(
          orderedQuestions
        );

      const session: QuizSession = {
        levelId,
        mode: "chapter",
        chapterId: selectedChapter.id,
        questionIds:
          selectedQuestions.map(
            (question) => question.id
          ),
        createdAt: Date.now(),
      };

      const token =
        createQuizSessionToken(session);

      const response =
        NextResponse.json({
          success: true,
          quiz: {
            mode: "chapter",
            levelId: level.id,
            levelTitle: level.title,
            chapterId:
              selectedChapter.id,
            chapterTitle:
              selectedChapter.title,
            numberOfQuestions:
              publicQuestions.length,
            questions: publicQuestions,
          },
        });

      response.cookies.set(
        "tajweed_quiz_session",
        token,
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60,
        }
      );

      return response;
    }

    // ==================================================
    // 6. الاختبار الشامل
    // ==================================================

    const chapterIds =
      activeChapters.map(
        (chapter) => chapter.id
      );

    const {
      data: allQuestions,
      error: questionsError,
    } = await supabaseAdmin
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
        option_d
        `
      )
      .eq("level_id", levelId)
      .eq("is_active", true)
      .in("chapter_id", chapterIds);

    if (questionsError) {
      console.error(
        "All questions error:",
        questionsError
      );

      return errorResponse(
        "حدث خطأ أثناء تحميل أسئلة الاختبار.",
        500
      );
    }

    const questionsByChapter =
      new Map<number, QuestionRow[]>();

    for (const chapter of activeChapters) {
      questionsByChapter.set(
        chapter.id,
        []
      );
    }

    for (const question of
      (allQuestions ?? []) as QuestionRow[]) {
      const list =
        questionsByChapter.get(
          question.chapter_id
        );

      if (list) {
        list.push(question);
      }
    }

    // --------------------------------------------------
    // 7. حساب التوزيع المتساوي
    // --------------------------------------------------

    const chapterCount =
      activeChapters.length;

    const base = Math.floor(
      numberOfQuestions /
        chapterCount
    );

    const remainder =
      numberOfQuestions %
      chapterCount;

    const selectedQuestions: QuestionRow[] =
      [];

    for (
      let index = 0;
      index < activeChapters.length;
      index++
    ) {
      const chapter =
        activeChapters[index];

      const required =
        base +
        (index < remainder ? 1 : 0);

      const available =
        questionsByChapter.get(
          chapter.id
        ) ?? [];

      if (available.length < required) {
        return errorResponse(
          `لا توجد أسئلة كافية في باب "${chapter.title}". المطلوب ${required} سؤال، والمتوفر ${available.length} فقط.`
        );
      }

      const randomQuestions =
        shuffle(available).slice(
          0,
          required
        );

      selectedQuestions.push(
        ...randomQuestions
      );
    }

    // --------------------------------------------------
    // 8. ترتيب الأسئلة
    // --------------------------------------------------

    let orderedQuestions: QuestionRow[];

    if (
      questionOrderMode ===
      "mixed"
    ) {
      orderedQuestions =
        shuffle(selectedQuestions);
    } else {
      orderedQuestions =
        selectedQuestions;
    }

    // --------------------------------------------------
    // 9. إنشاء النسخة الآمنة للطالب
    // --------------------------------------------------

    const publicQuestions =
      buildPublicQuestions(
        orderedQuestions
      );

    // --------------------------------------------------
    // 10. إنشاء جلسة اختبار موقعة
    // --------------------------------------------------

    const session: QuizSession = {
      levelId,
      mode: "comprehensive",
      chapterId: null,
      questionIds:
        orderedQuestions.map(
          (question) => question.id
        ),
      createdAt: Date.now(),
    };

    const token =
      createQuizSessionToken(session);

    // --------------------------------------------------
    // 11. إرسال الأسئلة الآمنة فقط
    // --------------------------------------------------

    const response =
      NextResponse.json({
        success: true,
        quiz: {
          mode: "comprehensive",
          levelId: level.id,
          levelTitle: level.title,
          numberOfQuestions:
            publicQuestions.length,
          questions: publicQuestions,
        },
      });

    response.cookies.set(
      "tajweed_quiz_session",
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Quiz start error:",
      error
    );

    return errorResponse(
      "حدث خطأ غير متوقع أثناء بدء الاختبار.",
      500
    );
  }
}

// ======================================================
// تحويل الأسئلة إلى نسخة آمنة للطالب
// ======================================================

function buildPublicQuestions(
  questions: QuestionRow[]
) {
  return questions.map(
    (question, index) => {
      /*
       * مهم:
       * المفتاح a/b/c/d مرتبط بالإجابة الأصلية،
       * لكن ترتيب ظهور الخيارات يتم خلطه.
       *
       * لذلك الطالب لا يعرف أي مفتاح هو الصحيح،
       * بينما السيرفر يستطيع التصحيح لاحقًا.
       */
      const options = shuffle([
        {
          key: "a",
          text: question.option_a,
        },
        {
          key: "b",
          text: question.option_b,
        },
        {
          key: "c",
          text: question.option_c,
        },
        {
          key: "d",
          text: question.option_d,
        },
      ]);

      return {
        id: question.id,
        number: index + 1,
        chapterId:
          question.chapter_id,
        questionText:
          question.question_text,
        options,
      };
    }
  );
}