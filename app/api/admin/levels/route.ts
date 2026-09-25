import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function checkAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!adminUser;
}

function redirectWithMessage(
  type: "success" | "error",
  message: string
): never {
  redirect(
    `/admin/levels?${type}=${encodeURIComponent(message)}`
  );
}

export async function POST(request: Request) {
  const isAdmin = await checkAdmin();

  if (!isAdmin) {
    redirect("/admin/login");
  }

  const formData = await request.formData();

  const action = String(formData.get("action") || "");

  /* =========================
     CREATE
  ========================= */

  if (action === "create") {
    const title = String(formData.get("title") || "").trim();

    const description = String(
      formData.get("description") || ""
    ).trim();

    const orderValue = Number(
      formData.get("order") || 0
    );

    const isActive =
      formData.get("is_active") === "on";

    if (!title) {
      redirectWithMessage(
        "error",
        "يرجى إدخال اسم المستوى."
      );
    }

    if (
      !Number.isInteger(orderValue) ||
      orderValue < 0
    ) {
      redirectWithMessage(
        "error",
        "الترتيب يجب أن يكون رقمًا صحيحًا موجبًا أو صفرًا."
      );
    }

    const { error } = await supabaseAdmin
      .from("levels")
      .insert({
        title,
        description: description || null,
        order: orderValue,
        is_active: isActive,
      });

    if (error) {
      console.error("Create level error:", error);

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء إضافة المستوى."
      );
    }

    redirectWithMessage(
      "success",
      "تمت إضافة المستوى بنجاح."
    );
  }

  /* =========================
     UPDATE
  ========================= */

  if (action === "update") {
    const id = Number(formData.get("id"));

    const title = String(
      formData.get("title") || ""
    ).trim();

    const description = String(
      formData.get("description") || ""
    ).trim();

    const orderValue = Number(
      formData.get("order") || 0
    );

    const isActive =
      formData.get("is_active") === "on";

    if (!Number.isInteger(id) || id <= 0) {
      redirectWithMessage(
        "error",
        "رقم المستوى غير صحيح."
      );
    }

    if (!title) {
      redirectWithMessage(
        "error",
        "يرجى إدخال اسم المستوى."
      );
    }

    if (
      !Number.isInteger(orderValue) ||
      orderValue < 0
    ) {
      redirectWithMessage(
        "error",
        "الترتيب يجب أن يكون رقمًا صحيحًا موجبًا أو صفرًا."
      );
    }

    const { error } = await supabaseAdmin
      .from("levels")
      .update({
        title,
        description: description || null,
        order: orderValue,
        is_active: isActive,
      })
      .eq("id", id);

    if (error) {
      console.error("Update level error:", error);

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء تعديل المستوى."
      );
    }

    redirectWithMessage(
      "success",
      "تم تعديل المستوى بنجاح."
    );
  }

  /* =========================
     TOGGLE
  ========================= */

  if (action === "toggle") {
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      redirectWithMessage(
        "error",
        "رقم المستوى غير صحيح."
      );
    }

    const { data: level, error: fetchError } =
      await supabaseAdmin
        .from("levels")
        .select("id, is_active")
        .eq("id", id)
        .maybeSingle();

    if (fetchError) {
      console.error(
        "Fetch level for toggle error:",
        fetchError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء البحث عن المستوى."
      );
    }

    if (!level) {
      redirectWithMessage(
        "error",
        "لم يتم العثور على المستوى."
      );
    }

    // بعد التحقق أعلاه، نأخذ نسخة مؤكدة غير null
    const currentLevel = level;

    const { error } = await supabaseAdmin
      .from("levels")
      .update({
        is_active: !currentLevel.is_active,
      })
      .eq("id", id);

    if (error) {
      console.error(
        "Toggle level error:",
        error
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء تغيير حالة المستوى."
      );
    }

    redirectWithMessage(
      "success",
      currentLevel.is_active
        ? "تم إخفاء المستوى."
        : "تم إظهار المستوى."
    );
  }

  /* =========================
     DELETE
  ========================= */

  if (action === "delete") {
    const id = Number(formData.get("id"));

    if (!Number.isInteger(id) || id <= 0) {
      redirectWithMessage(
        "error",
        "رقم المستوى غير صحيح."
      );
    }

    const { data: level, error: fetchError } =
      await supabaseAdmin
        .from("levels")
        .select("id, title")
        .eq("id", id)
        .maybeSingle();

    if (fetchError) {
      console.error(
        "Fetch level for delete error:",
        fetchError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء البحث عن المستوى."
      );
    }

    if (!level) {
      redirectWithMessage(
        "error",
        "لم يتم العثور على المستوى."
      );
    }

    // بعد التحقق أعلاه، نأخذ نسخة مؤكدة غير null
    const currentLevel = level;

    const { error } = await supabaseAdmin
      .from("levels")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Delete level error:",
        error
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء حذف المستوى."
      );
    }

    redirectWithMessage(
      "success",
      `تم حذف المستوى "${currentLevel.title}" وجميع المحتوى المرتبط به.`
    );
  }

  redirectWithMessage(
    "error",
    "الإجراء المطلوب غير معروف."
  );
}