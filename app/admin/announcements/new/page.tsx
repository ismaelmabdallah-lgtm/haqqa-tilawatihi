"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AnnouncementType = "text" | "image" | "link";

export default function NewAnnouncementPage() {
  const router = useRouter();

  const [type, setType] =
    useState<AnnouncementType>("text");

  const [today, setToday] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isText = type === "text";
  const isImage = type === "image";
  const isLink = type === "link";

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch(
          "/api/admin/check",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          router.replace("/admin/login");
          return;
        }

        const data = await response.json();

        if (!data.authorized) {
          router.replace("/admin/login");
          return;
        }

        const currentDate = new Date()
          .toISOString()
          .split("T")[0];

        setToday(currentDate);
        setCheckingAuth(false);
      } catch {
        router.replace("/admin/login");
      }
    };

    checkAdmin();
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <div className="rounded-3xl border border-[var(--border)] bg-white px-8 py-10 text-center shadow-sm">
          <div className="mb-4 text-3xl">⏳</div>

          <p className="text-sm font-bold text-[var(--foreground)]">
            جاري التحقق من صلاحيات الدخول...
          </p>

          <p className="mt-2 text-xs text-[var(--muted)]">
            يرجى الانتظار قليلًا
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/announcements"
            className="mb-5 inline-flex rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
          >
            → العودة إلى الإعلانات
          </Link>

          <p className="mb-2 text-sm font-bold text-[var(--primary)]">
            📢 إدارة المحتوى
          </p>

          <h1 className="text-3xl font-black text-[var(--foreground)]">
            إضافة إعلان جديد
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            يمكنك نشر إعلان نصي أو صورة أو رابط.
          </p>
        </div>

        {/* Form */}
        <form
          action="/api/admin/announcements"
          method="POST"
          encType="multipart/form-data"
          className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8"
        >
          <input
            type="hidden"
            name="action"
            value="create"
          />

          {/* =========================
              Type
          ========================== */}
          <div className="mb-6">
            <label
              htmlFor="type"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              نوع الإعلان
            </label>

            <select
              id="type"
              name="type"
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value as AnnouncementType
                )
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            >
              <option value="text">
                📝 إعلان نصي
              </option>

              <option value="image">
                🖼️ إعلان بصورة
              </option>

              <option value="link">
                🔗 إعلان برابط
              </option>
            </select>

            <p className="mt-2 text-xs text-[var(--muted)]">
              اختر الشكل الذي تريد أن يظهر به الإعلان
              للطلاب والزوار.
            </p>
          </div>

          {/* =========================
              Type Info
          ========================== */}
          <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
            <p className="text-sm font-black text-[var(--foreground)]">
              {isText && "📝 إعلان نصي"}
              {isImage && "🖼️ إعلان بصورة"}
              {isLink && "🔗 إعلان برابط"}
            </p>

            <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
              {isText &&
                "سيظهر عنوان الإعلان ونصه في الصفحة الرئيسية."}

              {isImage &&
                "ستظهر الصورة بشكل واضح، ويمكن إضافة نص ورابط اختياري."}

              {isLink &&
                "سيظهر نص الإعلان مع زر لفتح الرابط."}
            </p>
          </div>

          {/* =========================
              Title
          ========================== */}
          <div className="mb-6">
            <label
              htmlFor="title"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              عنوان الإعلان
            </label>

            <input
              id="title"
              name="title"
              type="text"
              required
              maxLength={200}
              placeholder="مثال: موعد اختبار المستوى الأول"
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />
          </div>

          {/* =========================
              Body
          ========================== */}
          <div className="mb-6">
            <label
              htmlFor="body"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              نص الإعلان

              <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                اختياري
              </span>
            </label>

            <textarea
              id="body"
              name="body"
              rows={7}
              maxLength={5000}
              placeholder={
                isImage
                  ? "يمكنك كتابة وصف أو تفاصيل أسفل الصورة..."
                  : isLink
                    ? "اكتب تفاصيل الإعلان هنا..."
                    : "اكتب تفاصيل الإعلان هنا..."
              }
              className="w-full resize-y rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              {isImage
                ? "يمكن تركه فارغًا إذا كانت الصورة توضح الإعلان بالكامل."
                : "يمكن تركه فارغًا عند الحاجة."}
            </p>
          </div>

          {/* =========================
              Image
              يظهر فقط مع Image
          ========================== */}
          {isImage && (
            <div className="mb-6 rounded-2xl border border-dashed border-[var(--primary)] bg-[var(--background)] p-5">
              <label
                htmlFor="image"
                className="mb-2 block text-sm font-black text-[var(--foreground)]"
              >
                🖼️ صورة الإعلان

                <span className="mr-2 text-xs font-normal text-red-600">
                  مطلوبة
                </span>
              </label>

              <input
                id="image"
                name="image"
                type="file"
                required
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="block w-full rounded-xl border border-[var(--border)] bg-white p-3 text-sm"
              />

              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                الصيغ المدعومة:
                JPG, PNG, WEBP, GIF.
                الحد الأقصى 10MB.
              </p>
            </div>
          )}

          {/* =========================
              Link
              يظهر مع Image أو Link
          ========================== */}
          {(isImage || isLink) && (
            <div className="mb-6">
              <label
                htmlFor="link_url"
                className="mb-2 block text-sm font-black text-[var(--foreground)]"
              >
                🔗 الرابط

                {isLink ? (
                  <span className="mr-2 text-xs font-normal text-red-600">
                    مطلوب
                  </span>
                ) : (
                  <span className="mr-2 text-xs font-normal text-[var(--muted)]">
                    اختياري
                  </span>
                )}
              </label>

              <input
                id="link_url"
                name="link_url"
                type="url"
                required={isLink}
                maxLength={2000}
                placeholder="https://example.com"
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />

              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                {isImage
                  ? "اختياري. عند وضعه، تصبح الصورة قابلة للضغط وتفتح الرابط."
                  : "سيظهر هذا الرابط للزائر من خلال زر فتح الرابط."}
              </p>
            </div>
          )}

          {/* =========================
              Date
          ========================== */}
          <div className="mb-6">
            <label
              htmlFor="date"
              className="mb-2 block text-sm font-black text-[var(--foreground)]"
            >
              تاريخ الإعلان
            </label>

            <input
              id="date"
              name="date"
              type="date"
              required
              value={today}
              onChange={(event) =>
                setToday(event.target.value)
              }
              className="rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
            />

            <p className="mt-2 text-xs text-[var(--muted)]">
              هذا هو التاريخ الذي سيظهر مع الإعلان.
            </p>
          </div>

          {/* =========================
              Active
          ========================== */}
          <div className="mb-8 rounded-2xl bg-[var(--background)] p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                name="is_active"
                value="true"
                defaultChecked
                className="h-5 w-5"
              />

              <div>
                <p className="text-sm font-black text-[var(--foreground)]">
                  تفعيل الإعلان مباشرة
                </p>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  إذا أزلت العلامة، سيتم حفظ الإعلان كمخفي.
                </p>
              </div>
            </label>
          </div>

          {/* =========================
              Actions
          ========================== */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              className="flex-1 rounded-2xl bg-[var(--primary)] px-5 py-4 text-sm font-black text-white transition hover:bg-[var(--primary-dark)]"
            >
              📢 حفظ الإعلان
            </button>

            <Link
              href="/admin/announcements"
              className="flex items-center justify-center rounded-2xl border border-[var(--border)] bg-white px-5 py-4 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-light)]"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}