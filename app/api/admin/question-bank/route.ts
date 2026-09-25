import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AdminCheckResult =
  | {
      ok: true;
      response?: never;
    }
  | {
      ok: false;
      response: NextResponse;
    };

async function checkAdmin(): Promise<AdminCheckResult> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "غير مسجل الدخول." },
        { status: 401 }
      ),
    };
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminUser) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ليس لديك صلاحية المشرف." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
  };
}

export async function POST(
  request: Request
): Promise<Response> {
  try {
    const adminCheck = await checkAdmin();

    if (!adminCheck.ok) {
      return adminCheck.response;
    }

    const formData = await request.formData();

    const action = String(
      formData.get("action") || ""
    ).trim();

    const levelId = Number(
      formData.get("levelId")
    );

    if (!Number.isInteger(levelId)) {
      return redirectError(
        request,
        levelId,
        "رقم المستوى غير صحيح."
      );
    }

    /*
     * =====================================================
     * التأكد من وجود المستوى
     * =====================================================
     */

    const { data: level } = await supabaseAdmin
      .from("levels")
      .select("id")
      .eq("id", levelId)
      .maybeSingle();

    if (!level) {
      return redirectError(
        request,
        levelId,
        "المستوى غير موجود."
      );
    }

    /*
     * =====================================================
     * إضافة باب
     * =====================================================
     */

    if (action === "create_chapter") {
      const title = String(
        formData.get("title") || ""
      ).trim();

      const description = String(
        formData.get("description") || ""
      ).trim();

      if (!title) {
        return redirectError(
          request,
          levelId,
          "اسم الباب مطلوب."
        );
      }

      const { data: lastChapter } =
        await supabaseAdmin
          .from("chapters")
          .select("order")
          .eq("level_id", levelId)
          .order("order", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      const nextOrder =
        (lastChapter?.order ?? 0) + 1;

      const { error } =
        await supabaseAdmin
          .from("chapters")
          .insert({
            level_id: levelId,
            title,
            description:
              description || null,
            order: nextOrder,
            is_active: true,
          });

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل إضافة الباب: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * تعديل باب
     * =====================================================
     */

    if (action === "update_chapter") {
      const chapterId = Number(
        formData.get("chapterId")
      );

      const title = String(
        formData.get("title") || ""
      ).trim();

      const description = String(
        formData.get("description") || ""
      ).trim();

      if (!Number.isInteger(chapterId)) {
        return redirectError(
          request,
          levelId,
          "رقم الباب غير صحيح."
        );
      }

      if (!title) {
        return redirectError(
          request,
          levelId,
          "اسم الباب مطلوب."
        );
      }

      const { data: chapter } =
        await supabaseAdmin
          .from("chapters")
          .select("id")
          .eq("id", chapterId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!chapter) {
        return redirectError(
          request,
          levelId,
          "الباب غير موجود في هذا المستوى."
        );
      }

      const { error } =
        await supabaseAdmin
          .from("chapters")
          .update({
            title,
            description:
              description || null,
          })
          .eq("id", chapterId)
          .eq("level_id", levelId);

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل تعديل الباب: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * حذف باب
     * =====================================================
     */

    if (action === "delete_chapter") {
      const chapterId = Number(
        formData.get("chapterId")
      );

      if (!Number.isInteger(chapterId)) {
        return redirectError(
          request,
          levelId,
          "رقم الباب غير صحيح."
        );
      }

      const { data: chapter } =
        await supabaseAdmin
          .from("chapters")
          .select("id, title")
          .eq("id", chapterId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!chapter) {
        return redirectError(
          request,
          levelId,
          "الباب غير موجود في هذا المستوى."
        );
      }

      const {
        count: questionCount,
        error: countError,
      } = await supabaseAdmin
        .from("questions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("chapter_id", chapterId)
        .eq("level_id", levelId);

      if (countError) {
        return redirectError(
          request,
          levelId,
          `تعذر التحقق من أسئلة الباب: ${countError.message}`
        );
      }

      if ((questionCount ?? 0) > 0) {
        return redirectError(
          request,
          levelId,
          `لا يمكن حذف الباب "${chapter.title}" لأنه يحتوي على ${questionCount} سؤالًا. احذف الأسئلة أو انقلها إلى باب آخر أولًا.`
        );
      }

      const { error } =
        await supabaseAdmin
          .from("chapters")
          .delete()
          .eq("id", chapterId)
          .eq("level_id", levelId);

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل حذف الباب: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * إضافة سؤال
     * =====================================================
     */

    if (action === "create_question") {
      const chapterId = Number(
        formData.get("chapterId")
      );

      const questionText = String(
        formData.get("questionText") || ""
      ).trim();

      const optionA = String(
        formData.get("optionA") || ""
      ).trim();

      const optionB = String(
        formData.get("optionB") || ""
      ).trim();

      const optionC = String(
        formData.get("optionC") || ""
      ).trim();

      const optionD = String(
        formData.get("optionD") || ""
      ).trim();

      const correctOption = String(
        formData.get("correctOption") || ""
      ).trim();

      const explanation = String(
        formData.get("explanation") || ""
      ).trim();

      const difficulty = String(
        formData.get("difficulty") || "medium"
      ).trim();

      if (!Number.isInteger(chapterId)) {
        return redirectError(
          request,
          levelId,
          "يجب اختيار الباب."
        );
      }

      if (!questionText) {
        return redirectError(
          request,
          levelId,
          "نص السؤال مطلوب."
        );
      }

      if (
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD
      ) {
        return redirectError(
          request,
          levelId,
          "يجب إدخال الخيارات الأربعة."
        );
      }

      if (
        !["a", "b", "c", "d"].includes(
          correctOption
        )
      ) {
        return redirectError(
          request,
          levelId,
          "الإجابة الصحيحة غير صحيحة."
        );
      }

      if (
        !["easy", "medium", "advanced"].includes(
          difficulty
        )
      ) {
        return redirectError(
          request,
          levelId,
          "مستوى الصعوبة غير صحيح."
        );
      }

      const { data: chapter } =
        await supabaseAdmin
          .from("chapters")
          .select("id")
          .eq("id", chapterId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!chapter) {
        return redirectError(
          request,
          levelId,
          "الباب غير موجود في هذا المستوى."
        );
      }

      const { error } =
        await supabaseAdmin
          .from("questions")
          .insert({
            level_id: levelId,
            chapter_id: chapterId,
            question_text: questionText,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            correct_option: correctOption,
            explanation:
              explanation || null,
            difficulty,
            is_active: true,
          });

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل إضافة السؤال: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * تعديل سؤال
     * =====================================================
     */

    if (action === "update_question") {
      const questionId = Number(
        formData.get("questionId")
      );

      const chapterId = Number(
        formData.get("chapterId")
      );

      const questionText = String(
        formData.get("questionText") || ""
      ).trim();

      const optionA = String(
        formData.get("optionA") || ""
      ).trim();

      const optionB = String(
        formData.get("optionB") || ""
      ).trim();

      const optionC = String(
        formData.get("optionC") || ""
      ).trim();

      const optionD = String(
        formData.get("optionD") || ""
      ).trim();

      const correctOption = String(
        formData.get("correctOption") || ""
      ).trim();

      const explanation = String(
        formData.get("explanation") || ""
      ).trim();

      const difficulty = String(
        formData.get("difficulty") || "medium"
      ).trim();

      if (
        !Number.isInteger(questionId) ||
        !Number.isInteger(chapterId)
      ) {
        return redirectError(
          request,
          levelId,
          "بيانات السؤال غير صحيحة."
        );
      }

      if (!questionText) {
        return redirectError(
          request,
          levelId,
          "نص السؤال مطلوب."
        );
      }

      if (
        !optionA ||
        !optionB ||
        !optionC ||
        !optionD
      ) {
        return redirectError(
          request,
          levelId,
          "يجب إدخال الخيارات الأربعة."
        );
      }

      if (
        !["a", "b", "c", "d"].includes(
          correctOption
        )
      ) {
        return redirectError(
          request,
          levelId,
          "الإجابة الصحيحة غير صحيحة."
        );
      }

      if (
        !["easy", "medium", "advanced"].includes(
          difficulty
        )
      ) {
        return redirectError(
          request,
          levelId,
          "مستوى الصعوبة غير صحيح."
        );
      }

      const { data: existingQuestion } =
        await supabaseAdmin
          .from("questions")
          .select("id")
          .eq("id", questionId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!existingQuestion) {
        return redirectError(
          request,
          levelId,
          "السؤال غير موجود في هذا المستوى."
        );
      }

      const { data: chapter } =
        await supabaseAdmin
          .from("chapters")
          .select("id")
          .eq("id", chapterId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!chapter) {
        return redirectError(
          request,
          levelId,
          "الباب المحدد غير موجود في هذا المستوى."
        );
      }

      const { error } =
        await supabaseAdmin
          .from("questions")
          .update({
            chapter_id: chapterId,
            question_text: questionText,
            option_a: optionA,
            option_b: optionB,
            option_c: optionC,
            option_d: optionD,
            correct_option: correctOption,
            explanation:
              explanation || null,
            difficulty,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", questionId)
          .eq("level_id", levelId);

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل تعديل السؤال: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * حذف سؤال
     * =====================================================
     */

    if (action === "delete_question") {
      const questionId = Number(
        formData.get("questionId")
      );

      if (!Number.isInteger(questionId)) {
        return redirectError(
          request,
          levelId,
          "رقم السؤال غير صحيح."
        );
      }

      const { data: question } =
        await supabaseAdmin
          .from("questions")
          .select("id")
          .eq("id", questionId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!question) {
        return redirectError(
          request,
          levelId,
          "السؤال غير موجود في هذا المستوى."
        );
      }

      const { error } =
        await supabaseAdmin
          .from("questions")
          .delete()
          .eq("id", questionId)
          .eq("level_id", levelId);

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل حذف السؤال: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * تفعيل / تعطيل سؤال
     * =====================================================
     */

    if (action === "toggle_question") {
      const questionId = Number(
        formData.get("questionId")
      );

      const isActive =
        formData.get("isActive") === "true";

      if (!Number.isInteger(questionId)) {
        return redirectError(
          request,
          levelId,
          "رقم السؤال غير صحيح."
        );
      }

      const { data: question } =
        await supabaseAdmin
          .from("questions")
          .select("id")
          .eq("id", questionId)
          .eq("level_id", levelId)
          .maybeSingle();

      if (!question) {
        return redirectError(
          request,
          levelId,
          "السؤال غير موجود في هذا المستوى."
        );
      }

      const { error } =
        await supabaseAdmin
          .from("questions")
          .update({
            is_active: !isActive,
            updated_at:
              new Date().toISOString(),
          })
          .eq("id", questionId)
          .eq("level_id", levelId);

      if (error) {
        return redirectError(
          request,
          levelId,
          `فشل تغيير حالة السؤال: ${error.message}`
        );
      }

      return redirectLevel(
        request,
        levelId
      );
    }

    /*
     * =====================================================
     * عملية غير معروفة
     * =====================================================
     */

    return redirectError(
      request,
      levelId,
      "العملية المطلوبة غير معروفة."
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف.";

    return redirectError(
      request,
      Number(
        new URL(request.url).searchParams.get(
          "levelId"
        )
      ) || 0,
      message
    );
  }
}

function redirectLevel(
  request: Request,
  levelId: number
): Response {
  return NextResponse.redirect(
    new URL(
      `/admin/questions/${levelId}`,
      request.url
    )
  );
}

function redirectError(
  request: Request,
  levelId: number,
  message: string
): Response {
  const safeLevelId =
    Number.isInteger(levelId) && levelId > 0
      ? levelId
      : null;

  const url = new URL(
    safeLevelId
      ? `/admin/questions/${safeLevelId}`
      : "/admin/questions",
    request.url
  );

  url.searchParams.set(
    "error",
    message
  );

  return NextResponse.redirect(url);
}