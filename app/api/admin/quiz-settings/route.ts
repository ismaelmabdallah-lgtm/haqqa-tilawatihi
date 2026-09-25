import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !admin) {
    return null;
  }

  return user;
}

function redirectWithError(
  request: Request,
  message: string
) {
  return NextResponse.redirect(
    new URL(
      `/admin/quiz-settings?error=${encodeURIComponent(message)}`,
      request.url
    )
  );
}

export async function POST(request: Request) {
  try {
    // --------------------------------------------------
    // 1. التحقق من أن المستخدم مشرف
    // --------------------------------------------------
    const user = await checkAdmin();

    if (!user) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    // --------------------------------------------------
    // 2. قراءة بيانات النموذج
    // --------------------------------------------------
    const formData = await request.formData();

    const action = String(
      formData.get("action") || ""
    );

    const levelId = Number(
      formData.get("level_id")
    );

    // --------------------------------------------------
    // 3. التحقق من العملية
    // --------------------------------------------------
    if (action !== "save_settings") {
      return redirectWithError(
        request,
        "عملية غير معروفة"
      );
    }

    // --------------------------------------------------
    // 4. التحقق من رقم المستوى
    // --------------------------------------------------
    if (
      !Number.isInteger(levelId) ||
      levelId <= 0
    ) {
      return redirectWithError(
        request,
        "معرّف المستوى غير صالح"
      );
    }

    // --------------------------------------------------
    // 5. التأكد من وجود المستوى
    // --------------------------------------------------
    const { data: level, error: levelError } =
      await supabaseAdmin
        .from("levels")
        .select("id")
        .eq("id", levelId)
        .maybeSingle();

    if (levelError) {
      console.error(
        "Level lookup error:",
        levelError
      );

      return redirectWithError(
        request,
        "حدث خطأ أثناء التحقق من المستوى"
      );
    }

    if (!level) {
      return redirectWithError(
        request,
        "المستوى غير موجود"
      );
    }

    // --------------------------------------------------
    // 6. قراءة عدد الأسئلة
    // --------------------------------------------------
    const numberOfQuestions = Number(
      formData.get("number_of_questions")
    );

    if (
      !Number.isInteger(numberOfQuestions) ||
      numberOfQuestions < 1 ||
      numberOfQuestions > 100
    ) {
      return redirectWithError(
        request,
        "عدد الأسئلة يجب أن يكون بين 1 و100"
      );
    }

    // --------------------------------------------------
    // 7. قراءة طريقة ترتيب الأسئلة
    // --------------------------------------------------
    const questionOrderMode = String(
      formData.get("question_order_mode") ||
        "by_chapter"
    );

    if (
      questionOrderMode !== "by_chapter" &&
      questionOrderMode !== "mixed"
    ) {
      return redirectWithError(
        request,
        "ترتيب الأسئلة غير صالح"
      );
    }

    // --------------------------------------------------
    // 8. حفظ الإعدادات
    // --------------------------------------------------
    const { error: saveError } =
      await supabaseAdmin
        .from("quiz_settings")
        .upsert(
          {
            level_id: levelId,
            number_of_questions:
              numberOfQuestions,
            distribution_mode: "equal",
            question_order_mode:
              questionOrderMode,
            is_active: true,
          },
          {
            onConflict: "level_id",
          }
        );

    // --------------------------------------------------
    // 9. التعامل مع خطأ الحفظ
    // --------------------------------------------------
    if (saveError) {
      console.error(
        "Quiz settings save error:",
        saveError
      );

      return redirectWithError(
        request,
        "حدث خطأ أثناء حفظ الإعدادات"
      );
    }

    // --------------------------------------------------
    // 10. نجاح الحفظ
    // --------------------------------------------------
    return NextResponse.redirect(
      new URL(
        "/admin/quiz-settings?saved=1",
        request.url
      )
    );
  } catch (error) {
    console.error(
      "Quiz settings API error:",
      error
    );

    return redirectWithError(
      request,
      "حدث خطأ غير متوقع"
    );
  }
}