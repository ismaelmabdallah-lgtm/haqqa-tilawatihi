import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type QuestionType =
  | "mcq"
  | "table"
  | "cut_join"
  | "conditional"
  | "ordering"
  | "fill_blanks";

type Difficulty = "easy" | "medium" | "advanced";

type JsonRecord = Record<string, unknown>;

type QuestionPayload = {
  id?: number;
  levelId: number;
  chapterId: number;
  questionText: string;
  questionType: QuestionType;
  points: number;
  difficulty: Difficulty;
  explanation: string | null;
  isActive: boolean;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  correctOption: string | null;
  questionData: unknown;
};

type AdminCheckResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

const QUESTION_TYPES: QuestionType[] = [
  "mcq",
  "table",
  "cut_join",
  "conditional",
  "ordering",
  "fill_blanks",
];

const DIFFICULTIES: Difficulty[] = [
  "easy",
  "medium",
  "advanced",
];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function checkAdmin(): Promise<AdminCheckResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: jsonError("غير مسجل الدخول.", 401),
    };
  }

  const { data: adminUser, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Admin check error:", error);
    return {
      ok: false,
      response: jsonError("تعذر التحقق من صلاحيات المشرف.", 500),
    };
  }

  if (!adminUser) {
    return {
      ok: false,
      response: jsonError("ليس لديك صلاحية المشرف.", 403),
    };
  }

  return { ok: true };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown):
  | { ok: true; payload: QuestionPayload }
  | { ok: false; message: string } {
  if (!isRecord(value)) {
    return { ok: false, message: "بيانات الطلب غير صحيحة." };
  }

  const levelId = Number(value.levelId);
  const chapterId = Number(value.chapterId);
  const points = Number(value.points);
  const questionType = value.questionType;
  const difficulty = value.difficulty;

  if (!Number.isInteger(levelId) || levelId <= 0) {
    return { ok: false, message: "رقم المستوى غير صحيح." };
  }

  if (!Number.isInteger(chapterId) || chapterId <= 0) {
    return { ok: false, message: "رقم الباب غير صحيح." };
  }

  if (typeof value.questionText !== "string" || !value.questionText.trim()) {
    return { ok: false, message: "نص السؤال مطلوب." };
  }

  if (
    typeof questionType !== "string" ||
    !QUESTION_TYPES.includes(questionType as QuestionType)
  ) {
    return { ok: false, message: "نوع السؤال غير صحيح." };
  }

  if (!Number.isFinite(points) || points <= 0) {
    return { ok: false, message: "عدد النقاط يجب أن يكون أكبر من صفر." };
  }

  if (
    typeof difficulty !== "string" ||
    !DIFFICULTIES.includes(difficulty as Difficulty)
  ) {
    return { ok: false, message: "مستوى الصعوبة غير صحيح." };
  }

  if (typeof value.isActive !== "boolean") {
    return { ok: false, message: "حالة السؤال غير صحيحة." };
  }

  const optionA = value.optionA == null ? null : String(value.optionA).trim();
  const optionB = value.optionB == null ? null : String(value.optionB).trim();
  const optionC = value.optionC == null ? null : String(value.optionC).trim();
  const optionD = value.optionD == null ? null : String(value.optionD).trim();
  const correctOption =
    value.correctOption == null ? null : String(value.correctOption).trim();

  if (questionType === "mcq") {
    if (!optionA || !optionB || !optionC || !optionD) {
      return { ok: false, message: "يجب إدخال الخيارات الأربعة." };
    }

    if (!correctOption || !["a", "b", "c", "d"].includes(correctOption)) {
      return { ok: false, message: "الإجابة الصحيحة غير صحيحة." };
    }
  }

  const id = value.id == null ? undefined : Number(value.id);
  if (id !== undefined && (!Number.isInteger(id) || id <= 0)) {
    return { ok: false, message: "رقم السؤال غير صحيح." };
  }

  return {
    ok: true,
    payload: {
      id,
      levelId,
      chapterId,
      questionText: value.questionText.trim(),
      questionType: questionType as QuestionType,
      points,
      difficulty: difficulty as Difficulty,
      explanation:
        value.explanation == null || String(value.explanation).trim() === ""
          ? null
          : String(value.explanation).trim(),
      isActive: value.isActive,
      optionA: questionType === "mcq" ? optionA : null,
      optionB: questionType === "mcq" ? optionB : null,
      optionC: questionType === "mcq" ? optionC : null,
      optionD: questionType === "mcq" ? optionD : null,
      correctOption: questionType === "mcq" ? correctOption : null,
      questionData: value.questionData ?? {},
    },
  };
}

async function validateLevelAndChapter(levelId: number, chapterId: number) {
  const { data: level, error: levelError } = await supabaseAdmin
    .from("levels")
    .select("id")
    .eq("id", levelId)
    .maybeSingle();

  if (levelError) {
    return { ok: false as const, message: `فشل التحقق من المستوى: ${levelError.message}` };
  }

  if (!level) {
    return { ok: false as const, message: "المستوى غير موجود." };
  }

  const { data: chapter, error: chapterError } = await supabaseAdmin
    .from("chapters")
    .select("id")
    .eq("id", chapterId)
    .eq("level_id", levelId)
    .maybeSingle();

  if (chapterError) {
    return { ok: false as const, message: `فشل التحقق من الباب: ${chapterError.message}` };
  }

  if (!chapter) {
    return { ok: false as const, message: "الباب المحدد غير موجود في هذا المستوى." };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const body: unknown = await request.json();
    const parsed = parsePayload(body);

    if (!parsed.ok) return jsonError(parsed.message);

    const { payload } = parsed;
    const locationCheck = await validateLevelAndChapter(
      payload.levelId,
      payload.chapterId
    );

    if (!locationCheck.ok) return jsonError(locationCheck.message);

    const insertData = {
      level_id: payload.levelId,
      chapter_id: payload.chapterId,
      question_text: payload.questionText,
      option_a: payload.optionA,
      option_b: payload.optionB,
      option_c: payload.optionC,
      option_d: payload.optionD,
      correct_option: payload.correctOption,
      explanation: payload.explanation,
      difficulty: payload.difficulty,
      is_active: payload.isActive,
      question_type: payload.questionType,
      points: payload.points,
      question_data: payload.questionData,
    };

    const { data: createdQuestion, error } = await supabaseAdmin
      .from("questions")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      console.error("Create question error:", error);
      return jsonError(`فشل إضافة السؤال: ${error.message}`, 500);
    }

    return NextResponse.json({
      success: true,
      question: createdQuestion,
    });
  } catch (error) {
    console.error("POST /api/admin/questions error:", error);
    return jsonError("حدث خطأ غير متوقع أثناء إضافة السؤال.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const adminCheck = await checkAdmin();
    if (!adminCheck.ok) return adminCheck.response;

    const body: unknown = await request.json();
    const parsed = parsePayload(body);

    if (!parsed.ok) return jsonError(parsed.message);

    const { payload } = parsed;

    if (!payload.id) {
      return jsonError("رقم السؤال مطلوب عند التعديل.");
    }

    const locationCheck = await validateLevelAndChapter(
      payload.levelId,
      payload.chapterId
    );

    if (!locationCheck.ok) return jsonError(locationCheck.message);

    const { data: existingQuestion, error: existingError } = await supabaseAdmin
      .from("questions")
      .select("id, level_id")
      .eq("id", payload.id)
      .maybeSingle();

    if (existingError) {
      console.error("Find question error:", existingError);
      return jsonError(`فشل التحقق من السؤال: ${existingError.message}`, 500);
    }

    if (!existingQuestion) {
      return jsonError("السؤال غير موجود.", 404);
    }

    if (existingQuestion.level_id !== payload.levelId) {
      return jsonError("لا يمكن تعديل سؤال تابع لمستوى آخر.", 403);
    }

    const updateData = {
      chapter_id: payload.chapterId,
      question_text: payload.questionText,
      option_a: payload.optionA,
      option_b: payload.optionB,
      option_c: payload.optionC,
      option_d: payload.optionD,
      correct_option: payload.correctOption,
      explanation: payload.explanation,
      difficulty: payload.difficulty,
      is_active: payload.isActive,
      question_type: payload.questionType,
      points: payload.points,
      question_data: payload.questionData,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedQuestion, error } = await supabaseAdmin
      .from("questions")
      .update(updateData)
      .eq("id", payload.id)
      .select("*")
      .single();

    if (error) {
      console.error("Update question error:", error);
      return jsonError(`فشل تعديل السؤال: ${error.message}`, 500);
    }

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("PUT /api/admin/questions error:", error);
    return jsonError("حدث خطأ غير متوقع أثناء تعديل السؤال.", 500);
  }
}
