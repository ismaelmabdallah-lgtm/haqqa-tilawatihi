import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const STORAGE_BUCKET = "educational-files";
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

function redirectWithMessage(
  type: "success" | "error",
  message: string
): never {
  redirect(
    `/admin/announcements?${type}=${encodeURIComponent(message)}`
  );
}

async function checkAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  const { data: adminUser, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !adminUser) {
    redirect("/admin");
  }

  return user;
}

function getFileExtension(file: File) {
  const name = file.name || "";
  const extension = name.split(".").pop()?.toLowerCase();

  if (extension) {
    return extension;
  }

  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";

  return "bin";
}

async function uploadAnnouncementImage(
  file: File,
  userId: string
) {
  if (file.size <= 0) {
    throw new Error("ملف الصورة فارغ.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      "حجم الصورة أكبر من الحد المسموح وهو 10MB."
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(
      "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP أو GIF."
    );
  }

  const extension = getFileExtension(file);

  const fileName =
    `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  const storagePath =
    `announcements/${userId}/${fileName}`;

  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } =
    await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

  if (uploadError) {
    console.error(
      "Announcement image upload error:",
      uploadError
    );

    throw new Error(
      "حدث خطأ أثناء رفع صورة الإعلان."
    );
  }

  return storagePath;
}

async function deleteStorageFile(
  storagePath: string | null | undefined
) {
  if (!storagePath) {
    return;
  }

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath]);

  if (error) {
    console.error(
      "Delete announcement storage file error:",
      error
    );
  }
}

function validateType(
  type: string
): "text" | "image" | "link" | null {
  if (
    type === "text" ||
    type === "image" ||
    type === "link"
  ) {
    return type;
  }

  return null;
}

function validateUrl(url: string) {
  if (!url) {
    return true;
  }

  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const user = await checkAdmin();

  const formData = await request.formData();

  const action = String(
    formData.get("action") || ""
  );

  // =========================
  // CREATE
  // =========================
  if (action === "create") {
    const title = String(
      formData.get("title") || ""
    ).trim();

    const body = String(
      formData.get("body") || ""
    ).trim();

    const date = String(
      formData.get("date") || ""
    ).trim();

    const rawType = String(
      formData.get("type") || "text"
    );

    const type = validateType(rawType);

    const linkUrl = String(
      formData.get("link_url") || ""
    ).trim();

    const imageEntry = formData.get("image");

    const imageFile =
      imageEntry instanceof File
        ? imageEntry
        : null;

    const isActive =
      formData.get("is_active") === "true";

    if (!title) {
      redirectWithMessage(
        "error",
        "يرجى إدخال عنوان الإعلان."
      );
    }

    if (title.length > 200) {
      redirectWithMessage(
        "error",
        "عنوان الإعلان طويل جدًا."
      );
    }

    if (!type) {
      redirectWithMessage(
        "error",
        "نوع الإعلان غير صحيح."
      );
    }

    if (!date) {
      redirectWithMessage(
        "error",
        "يرجى تحديد تاريخ الإعلان."
      );
    }

    if (body.length > 5000) {
      redirectWithMessage(
        "error",
        "نص الإعلان طويل جدًا."
      );
    }

    if (linkUrl.length > 2000) {
      redirectWithMessage(
        "error",
        "الرابط طويل جدًا."
      );
    }

    if (!validateUrl(linkUrl)) {
      redirectWithMessage(
        "error",
        "الرابط غير صحيح. استخدم رابطًا يبدأ بـ https:// أو http://."
      );
    }

    if (
      type === "image" &&
      (!imageFile || imageFile.size === 0)
    ) {
      redirectWithMessage(
        "error",
        "يرجى اختيار صورة للإعلان."
      );
    }

    let storagePath: string | null = null;

    try {
      if (
        type === "image" &&
        imageFile &&
        imageFile.size > 0
      ) {
        storagePath =
          await uploadAnnouncementImage(
            imageFile,
            user.id
          );
      }

      const { error } = await supabaseAdmin
        .from("announcements")
        .insert({
          title,
          body: body || null,
          date,
          type,
          image_url: null,
          storage_path: storagePath,
          link_url: linkUrl || null,
          is_active: isActive,
        });

      if (error) {
        console.error(
          "Create announcement error:",
          error
        );

        await deleteStorageFile(storagePath);

        redirectWithMessage(
          "error",
          "حدث خطأ أثناء إضافة الإعلان."
        );
      }
    } catch (error) {
      console.error(
        "Create announcement exception:",
        error
      );

      await deleteStorageFile(storagePath);

      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إضافة الإعلان.";

      redirectWithMessage(
        "error",
        message
      );
    }

    redirectWithMessage(
      "success",
      "تمت إضافة الإعلان بنجاح."
    );
  }

  // =========================
  // TOGGLE
  // =========================
  if (action === "toggle") {
    const id = Number(
      formData.get("id")
    );

    if (!Number.isFinite(id)) {
      redirectWithMessage(
        "error",
        "معرّف الإعلان غير صحيح."
      );
    }

    const {
      data: announcement,
      error: fetchError,
    } = await supabaseAdmin
      .from("announcements")
      .select("id, is_active")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "Fetch announcement error:",
        fetchError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء العثور على الإعلان."
      );
    }

    if (!announcement) {
      redirectWithMessage(
        "error",
        "الإعلان غير موجود."
      );
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("announcements")
        .update({
          is_active:
            !announcement.is_active,
        })
        .eq("id", id);

    if (updateError) {
      console.error(
        "Toggle announcement error:",
        updateError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء تغيير حالة الإعلان."
      );
    }

    redirectWithMessage(
      "success",
      announcement.is_active
        ? "تم إخفاء الإعلان."
        : "تم إظهار الإعلان."
    );
  }

  // =========================
  // DELETE
  // =========================
  if (action === "delete") {
    const id = Number(
      formData.get("id")
    );

    if (!Number.isFinite(id)) {
      redirectWithMessage(
        "error",
        "معرّف الإعلان غير صحيح."
      );
    }

    const {
      data: announcement,
      error: fetchError,
    } = await supabaseAdmin
      .from("announcements")
      .select("id, storage_path")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "Fetch announcement error:",
        fetchError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء العثور على الإعلان."
      );
    }

    if (!announcement) {
      redirectWithMessage(
        "error",
        "الإعلان غير موجود."
      );
    }

    const { error: deleteError } =
      await supabaseAdmin
        .from("announcements")
        .delete()
        .eq("id", id);

    if (deleteError) {
      console.error(
        "Delete announcement error:",
        deleteError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء حذف الإعلان."
      );
    }

    if (announcement.storage_path) {
      await deleteStorageFile(
        announcement.storage_path
      );
    }

    redirectWithMessage(
      "success",
      "تم حذف الإعلان بنجاح."
    );
  }

  // =========================
  // UPDATE
  // =========================
  if (action === "update") {
    const id = Number(
      formData.get("id")
    );

    const title = String(
      formData.get("title") || ""
    ).trim();

    const body = String(
      formData.get("body") || ""
    ).trim();

    const date = String(
      formData.get("date") || ""
    ).trim();

    const rawType = String(
      formData.get("type") || "text"
    );

    const type = validateType(rawType);

    const linkUrl = String(
      formData.get("link_url") || ""
    ).trim();

    const imageEntry = formData.get("image");

    const imageFile =
      imageEntry instanceof File
        ? imageEntry
        : null;

    const isActive =
      formData.get("is_active") === "true";

    if (!Number.isFinite(id)) {
      redirectWithMessage(
        "error",
        "معرّف الإعلان غير صحيح."
      );
    }

    if (!title) {
      redirectWithMessage(
        "error",
        "يرجى إدخال عنوان الإعلان."
      );
    }

    if (title.length > 200) {
      redirectWithMessage(
        "error",
        "عنوان الإعلان طويل جدًا."
      );
    }

    if (!type) {
      redirectWithMessage(
        "error",
        "نوع الإعلان غير صحيح."
      );
    }

    if (!date) {
      redirectWithMessage(
        "error",
        "يرجى تحديد تاريخ الإعلان."
      );
    }

    if (body.length > 5000) {
      redirectWithMessage(
        "error",
        "نص الإعلان طويل جدًا."
      );
    }

    if (linkUrl.length > 2000) {
      redirectWithMessage(
        "error",
        "الرابط طويل جدًا."
      );
    }

    if (!validateUrl(linkUrl)) {
      redirectWithMessage(
        "error",
        "الرابط غير صحيح. استخدم رابطًا يبدأ بـ https:// أو http://."
      );
    }

    const {
      data: existingAnnouncement,
      error: fetchError,
    } = await supabaseAdmin
      .from("announcements")
      .select(
        "id, storage_path, type"
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error(
        "Fetch announcement for update error:",
        fetchError
      );

      redirectWithMessage(
        "error",
        "حدث خطأ أثناء العثور على الإعلان."
      );
    }

    if (!existingAnnouncement) {
      redirectWithMessage(
        "error",
        "الإعلان غير موجود."
      );
    }

    let newStoragePath:
      | string
      | null = existingAnnouncement.storage_path;

    let uploadedNewImage = false;

    try {
      /*
       * إذا اختار المشرف صورة جديدة،
       * نرفعها أولًا ثم نحدث قاعدة البيانات.
       */
      if (
        type === "image" &&
        imageFile &&
        imageFile.size > 0
      ) {
        newStoragePath =
          await uploadAnnouncementImage(
            imageFile,
            user.id
          );

        uploadedNewImage = true;
      }

      /*
       * إذا تغير النوع إلى نص أو رابط،
       * لا نحتاج الصورة القديمة.
       */
      if (type !== "image") {
        newStoragePath = null;
      }

      /*
       * إذا كان الإعلان من نوع صورة
       * ولم توجد صورة جديدة، نحافظ على الصورة القديمة.
       */
      if (
        type === "image" &&
        !uploadedNewImage &&
        !existingAnnouncement.storage_path
      ) {
        redirectWithMessage(
          "error",
          "الإعلان من نوع صورة، يرجى اختيار صورة."
        );
      }

      const { error: updateError } =
        await supabaseAdmin
          .from("announcements")
          .update({
            title,
            body: body || null,
            date,
            type,
            image_url: null,
            storage_path: newStoragePath,
            link_url: linkUrl || null,
            is_active: isActive,
          })
          .eq("id", id);

      if (updateError) {
        console.error(
          "Update announcement error:",
          updateError
        );

        if (uploadedNewImage) {
          await deleteStorageFile(
            newStoragePath
          );
        }

        redirectWithMessage(
          "error",
          "حدث خطأ أثناء تعديل الإعلان."
        );
      }

      /*
       * بعد نجاح التحديث نحذف الصورة القديمة
       * إذا تم استبدالها أو لم يعد الإعلان يحتاجها.
       */
      if (
        existingAnnouncement.storage_path &&
        existingAnnouncement.storage_path !==
          newStoragePath
      ) {
        await deleteStorageFile(
          existingAnnouncement.storage_path
        );
      }
    } catch (error) {
      console.error(
        "Update announcement exception:",
        error
      );

      if (uploadedNewImage) {
        await deleteStorageFile(
          newStoragePath
        );
      }

      const message =
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء تعديل الإعلان.";

      redirectWithMessage(
        "error",
        message
      );
    }

    redirectWithMessage(
      "success",
      "تم تعديل الإعلان بنجاح."
    );
  }

  redirectWithMessage(
    "error",
    "الإجراء المطلوب غير معروف."
  );
}