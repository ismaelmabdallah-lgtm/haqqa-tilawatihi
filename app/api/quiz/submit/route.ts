import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SubmittedAnswer = {
  questionId: number;
  selectedOption: string | null;
};

type QuestionRow = {
  id: number;
  level_id: number;
  chapter_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
};

type ChapterRow = {
  id: number;
  title: string;
};

type QuizMode =
  | "comprehensive"
  | "chapter";

type QuizSession = {
  levelId: number;
  mode: QuizMode;
  chapterId: number | null;
  questionIds: number[];
  createdAt: number;
};

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

// ======================================================
// التحقق من جلسة الاختبار الموقعة
// ======================================================

function verifyQuizSessionToken(
  token: string
): QuizSession | null {
  try {
    const secret =
      process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret) {
      throw new Error(
        "Missing SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [
      payload,
      receivedSignature,
    ] = parts;

    const expectedSignature =
      createHmac(
        "sha256",
        secret
      )
        .update(payload)
        .digest("base64url");

    const receivedBuffer =
      Buffer.from(
        receivedSignature
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const session =
      JSON.parse(
        Buffer.from(
          payload,
          "base64url"
        ).toString("utf8")
      ) as QuizSession;

    if (
      !session ||
      !Number.isInteger(
        session.levelId
      ) ||
      session.levelId <= 0 ||
      !Array.isArray(
        session.questionIds
      ) ||
      session.questionIds.length === 0
    ) {
      return null;
    }

    // انتهاء جلسة الاختبار بعد ساعة
    const oneHour =
      60 * 60 * 1000;

    if (
      !Number.isInteger(
        session.createdAt
      ) ||
      Date.now() -
        session.createdAt >
        oneHour
    ) {
      return null;
    }

    return session;
  } catch (error) {
    console.error(
      "Quiz session verification error:",
      error
    );

    return null;
  }
}

export async function POST(
  request: Request
) {
  try {
    // ==================================================
    // 1. قراءة بيانات الإرسال
    // ==================================================

    const body =
      await request.json();

    const levelId =
      Number(body.levelId);

    const answers =
      body.answers as SubmittedAnswer[];

    if (
      !Number.isInteger(levelId) ||
      levelId <= 0
    ) {
      return errorResponse(
        "معرّف المستوى غير صالح."
      );
    }

    if (
      !Array.isArray(answers) ||
      answers.length === 0
    ) {
      return errorResponse(
        "لم يتم إرسال إجابات الاختبار."
      );
    }

    // ==================================================
    // 2. قراءة جلسة الاختبار الآمنة
    // ==================================================

    const cookieStore =
      await cookies();

    const sessionToken =
      cookieStore.get(
        "tajweed_quiz_session"
      )?.value;

    if (!sessionToken) {
      return errorResponse(
        "انتهت جلسة الاختبار أو لم يتم العثور عليها. يرجى بدء الاختبار من جديد."
      );
    }

    const session =
      verifyQuizSessionToken(
        sessionToken
      );

    if (!session) {
      return errorResponse(
        "جلسة الاختبار غير صالحة أو انتهت. يرجى بدء الاختبار من جديد."
      );
    }

    // ==================================================
    // 3. التأكد من أن المستوى مطابق للجلسة
    // ==================================================

    if (
      session.levelId !== levelId
    ) {
      return errorResponse(
        "بيانات الاختبار غير متطابقة."
      );
    }

    // ==================================================
    // 4. التأكد من أن الأسئلة المرسلة
    //    هي نفسها أسئلة الاختبار
    // ==================================================

    const sessionQuestionIds =
      session.questionIds;

    const sessionQuestionIdSet =
      new Set(
        sessionQuestionIds
      );

    const normalizedAnswers =
      answers
        .map((answer) => ({
          questionId:
            Number(
              answer.questionId
            ),

          selectedOption:
            typeof answer.selectedOption ===
            "string"
              ? answer.selectedOption
                  .toLowerCase()
              : null,
        }))
        .filter(
          (answer) =>
            Number.isInteger(
              answer.questionId
            ) &&
            answer.questionId > 0
        );

    if (
      normalizedAnswers.length === 0
    ) {
      return errorResponse(
        "الإجابات المرسلة غير صالحة."
      );
    }

    // لا نسمح بإضافة سؤال غير موجود
    // في جلسة الاختبار.
    for (const answer of
      normalizedAnswers) {
      if (
        !sessionQuestionIdSet.has(
          answer.questionId
        )
      ) {
        return errorResponse(
          "تم إرسال سؤال غير موجود ضمن هذا الاختبار."
        );
      }
    }

    // ==================================================
    // 5. منع تكرار نفس السؤال
    // ==================================================

    const receivedQuestionIds =
      normalizedAnswers.map(
        (answer) =>
          answer.questionId
      );

    const uniqueReceivedIds =
      new Set(
        receivedQuestionIds
      );

    if (
      uniqueReceivedIds.size !==
      receivedQuestionIds.length
    ) {
      return errorResponse(
        "تم إرسال سؤال أكثر من مرة."
      );
    }

    // ==================================================
    // 6. تحميل الأسئلة الأصلية من قاعدة البيانات
    // ==================================================

    const { data: questions, error } =
      await supabaseAdmin
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
          explanation
          `
        )
        .eq("level_id", levelId)
        .eq("is_active", true)
        .in(
          "id",
          sessionQuestionIds
        );

    if (error) {
      console.error(
        "Submit questions error:",
        error
      );

      return errorResponse(
        "حدث خطأ أثناء تحميل إجابات الأسئلة.",
        500
      );
    }

    const questionRows =
      (questions ??
        []) as QuestionRow[];

    // يجب أن تكون كل أسئلة الجلسة
    // موجودة وفعالة.
    if (
      questionRows.length !==
      sessionQuestionIds.length
    ) {
      return errorResponse(
        "بعض أسئلة الاختبار لم تعد متاحة. يرجى بدء اختبار جديد."
      );
    }

    // ==================================================
    // 7. إنشاء خريطة الإجابات
    // ==================================================

    const answerMap =
      new Map<
        number,
        string | null
      >();

    for (const answer of
      normalizedAnswers) {
      answerMap.set(
        answer.questionId,
        answer.selectedOption
      );
    }

    // ==================================================
    // 8. تحميل أسماء الأبواب
    // ==================================================

    const chapterIds = [
      ...new Set(
        questionRows.map(
          (question) =>
            question.chapter_id
        )
      ),
    ];

    const {
      data: chapters,
      error: chaptersError,
    } = await supabaseAdmin
      .from("chapters")
      .select(
        "id, title"
      )
      .in(
        "id",
        chapterIds
      );

    if (chaptersError) {
      console.error(
        "Submit chapters error:",
        chaptersError
      );

      return errorResponse(
        "حدث خطأ أثناء تحميل أبواب الاختبار.",
        500
      );
    }

    const chapterRows =
      (chapters ??
        []) as ChapterRow[];

    const chapterMap =
      new Map<
        number,
        string
      >();

    for (const chapter of
      chapterRows) {
      chapterMap.set(
        chapter.id,
        chapter.title
      );
    }

    // ==================================================
    // 9. ترتيب الأسئلة حسب ترتيب الاختبار
    // ==================================================

    const questionMap =
      new Map<
        number,
        QuestionRow
      >();

    for (const question of
      questionRows) {
      questionMap.set(
        question.id,
        question
      );
    }

    const orderedQuestionRows =
      sessionQuestionIds
        .map(
          (questionId) =>
            questionMap.get(
              questionId
            )
        )
        .filter(
          (
            question
          ): question is QuestionRow =>
            Boolean(question)
        );

    // ==================================================
    // 10. التصحيح والتحليل
    // ==================================================

    let correctCount = 0;

    const chapterStats =
      new Map<
        number,
        {
          chapterId: number;
          chapterTitle: string;
          total: number;
          correct: number;
          wrong: number;
        }
      >();

    const review =
      orderedQuestionRows.map(
        (question) => {
          const selectedOption =
            answerMap.get(
              question.id
            ) ?? null;

          const isValidOption =
            selectedOption ===
              "a" ||
            selectedOption ===
              "b" ||
            selectedOption ===
              "c" ||
            selectedOption ===
              "d";

          const isCorrect =
            isValidOption &&
            selectedOption ===
              question.correct_option;

          if (isCorrect) {
            correctCount++;
          }

          const existingChapter =
            chapterStats.get(
              question.chapter_id
            );

          if (existingChapter) {
            existingChapter.total++;

            if (isCorrect) {
              existingChapter.correct++;
            } else {
              existingChapter.wrong++;
            }
          } else {
            chapterStats.set(
              question.chapter_id,
              {
                chapterId:
                  question.chapter_id,

                chapterTitle:
                  chapterMap.get(
                    question.chapter_id
                  ) ??
                  "باب غير معروف",

                total: 1,

                correct:
                  isCorrect ? 1 : 0,

                wrong:
                  isCorrect ? 0 : 1,
              }
            );
          }

          const options = {
            a: question.option_a,
            b: question.option_b,
            c: question.option_c,
            d: question.option_d,
          };

          const selectedOptionText =
            isValidOption
              ? options[
                  selectedOption as keyof typeof options
                ] ?? null
              : null;

          const correctOptionText =
            options[
              question.correct_option as keyof typeof options
            ];

          return {
            questionId:
              question.id,

            chapterId:
              question.chapter_id,

            chapterTitle:
              chapterMap.get(
                question.chapter_id
              ) ??
              "باب غير معروف",

            questionText:
              question.question_text,

            selectedOption,

            selectedOptionText,

            correctOption:
              question.correct_option,

            correctOptionText,

            explanation:
              question.explanation,

            isCorrect,
          };
        }
      );

    // ==================================================
    // 11. النتيجة النهائية
    // ==================================================

    const totalQuestions =
      orderedQuestionRows.length;

    const wrongCount =
      totalQuestions -
      correctCount;

    const percentage =
      totalQuestions > 0
        ? Math.round(
            (correctCount /
              totalQuestions) *
              100
          )
        : 0;

    const chapterAnalysis =
      Array.from(
        chapterStats.values()
      ).map((chapter) => ({
        ...chapter,

        percentage:
          chapter.total > 0
            ? Math.round(
                (chapter.correct /
                  chapter.total) *
                  100
              )
            : 0,
      }));

    // ==================================================
    // 12. حذف جلسة الاختبار بعد التسليم
    // ==================================================

    const response =
      NextResponse.json({
        success: true,

        result: {
          levelId,

          totalQuestions,

          correctCount,

          wrongCount,

          percentage,

          chapterAnalysis,

          review,
        },
      });

    response.cookies.set(
      "tajweed_quiz_session",
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "Quiz submit error:",
      error
    );

    return errorResponse(
      "حدث خطأ غير متوقع أثناء تصحيح الاختبار.",
      500
    );
  }
}