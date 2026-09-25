import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const supabase =
      await createSupabaseServerClient();

    // ==========================================
    // Check login
    // ==========================================

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    // ==========================================
    // Check admin
    // ==========================================

    const {
      data: adminUser,
      error: adminError,
    } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (adminError || !adminUser) {
      return NextResponse.redirect(
        new URL("/admin", request.url)
      );
    }

    // ==========================================
    // Read form
    // ==========================================

    const formData =
      await request.formData();

    const levelId = Number(
      formData.get("levelId")
    );

    const title = String(
      formData.get("title") || ""
    ).trim();

    const type = String(
      formData.get("type") || ""
    ).trim();

    const urlValue = String(
      formData.get("url") || ""
    ).trim();

    const isActive =
      formData.get("is_active") === "true";

    // ==========================================
    // Validate level
    // ==========================================

    if (!Number.isInteger(levelId)) {
      return redirectWithError(
        request,
        "رقم المستوى غير صحيح.",
        levelId
      );
    }

    // ==========================================
    // Validate title
    // ==========================================

    if (!title) {
      return redirectWithError(
        request,
        "عنوان المادة مطلوب.",
        levelId
      );
    }

    // ==========================================
    // Allowed resource types
    // ==========================================

    const allowedTypes = [
      "curriculum",
      "summary",
      "video",
      "link",
      "exam",
    ];

    if (!allowedTypes.includes(type)) {
      return redirectWithError(
        request,
        "نوع المادة غير صحيح.",
        levelId
      );
    }

    // ==========================================
    // Prepare resource
    // ==========================================

    let storagePath: string | null = null;

    let finalUrl: string | null =
      urlValue || null;

    /*
     * Important:
     *
     * We keep the exact type selected by
     * the admin.
     *
     * For example:
     * exam -> exam
     * curriculum -> curriculum
     * summary -> summary
     */

    const finalType = type;

    // ==========================================
    // File upload
    // ==========================================

    const file = formData.get("file");

    if (
      file instanceof File &&
      file.size > 0
    ) {
      // ----------------------------------------
      // Maximum file size
      // ----------------------------------------

      const maxFileSize =
        20 * 1024 * 1024;

      if (file.size > maxFileSize) {
        return redirectWithError(
          request,
          "حجم الملف كبير جدًا. الحد الأقصى هو 20MB.",
          levelId
        );
      }

      // ----------------------------------------
      // Allowed MIME types
      // ----------------------------------------

      const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
      ];

      if (
        !allowedMimeTypes.includes(
          file.type
        )
      ) {
        return redirectWithError(
          request,
          "نوع الملف غير مدعوم. استخدم PDF أو Word أو PowerPoint أو TXT.",
          levelId
        );
      }

      // ----------------------------------------
      // File extension
      // ----------------------------------------

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase()
          .replace(
            /[^a-z0-9]/g,
            ""
          ) || "file";

      // ----------------------------------------
      // Unique file name
      // ----------------------------------------

      const uniqueName =
        `${Date.now()}-${crypto.randomUUID()}.${extension}`;

      storagePath =
        `${levelId}/${uniqueName}`;

      // ----------------------------------------
      // Convert file
      // ----------------------------------------

      const fileBuffer =
        await file.arrayBuffer();

      // ----------------------------------------
      // Upload to Supabase Storage
      // ----------------------------------------

      const {
        error: uploadError,
      } = await supabaseAdmin.storage
        .from("educational-files")
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType:
              file.type,
            upsert: false,
          }
        );

      if (uploadError) {
        return redirectWithError(
          request,
          `فشل رفع الملف: ${uploadError.message}`,
          levelId
        );
      }

      // ----------------------------------------
      // Create signed URL
      // ----------------------------------------

      const {
        data: signedUrlData,
        error: signedUrlError,
      } =
        await supabaseAdmin.storage
          .from("educational-files")
          .createSignedUrl(
            storagePath,
            60 * 60 * 24 * 30
          );

      if (
        signedUrlError ||
        !signedUrlData?.signedUrl
      ) {
        // Remove uploaded file if URL creation fails
        await supabaseAdmin.storage
          .from("educational-files")
          .remove([
            storagePath,
          ]);

        return redirectWithError(
          request,
          `فشل إنشاء رابط الملف: ${
            signedUrlError?.message ||
            "تعذر إنشاء الرابط."
          }`,
          levelId
        );
      }

      finalUrl =
        signedUrlData.signedUrl;
    }

    // ==========================================
    // Insert resource
    // ==========================================

    const {
      error: insertError,
    } = await supabaseAdmin
      .from("resources")
      .insert({
        level_id: levelId,
        chapter_id: null,
        title,
        type: finalType,
        url: finalUrl,
        storage_path: storagePath,
        order: 0,
        is_active: isActive,
      });

    // ==========================================
    // Cleanup if database insert fails
    // ==========================================

    if (insertError) {
      if (storagePath) {
        await supabaseAdmin.storage
          .from("educational-files")
          .remove([
            storagePath,
          ]);
      }

      return redirectWithError(
        request,
        `فشل حفظ المادة: ${insertError.message}`,
        levelId
      );
    }

    // ==========================================
    // Success
    // ==========================================

    return NextResponse.redirect(
      new URL(
        `/admin/resources/${levelId}`,
        request.url
      )
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف.";

    return redirectWithError(
      request,
      `حدث خطأ أثناء حفظ المادة: ${message}`
    );
  }
}

// ==========================================
// Redirect with error
// ==========================================

function redirectWithError(
  request: Request,
  message: string,
  levelId?: number
) {
  const target =
    Number.isInteger(levelId)
      ? `/admin/resources/${levelId}/new`
      : "/admin/resources";

  const url = new URL(
    target,
    request.url
  );

  url.searchParams.set(
    "error",
    message
  );

  return NextResponse.redirect(
    url
  );
}