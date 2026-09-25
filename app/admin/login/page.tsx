"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setErrorMessage("");

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (error) {
      console.error("Login error:", error);

      setErrorMessage(
        "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      );

      setLoading(false);
      return;
    }

    if (!data.user) {
      setErrorMessage(
        "تعذر إنشاء جلسة تسجيل الدخول."
      );

      setLoading(false);
      return;
    }

    /*
     * ننتظر قليلًا حتى يتم تثبيت جلسة Supabase
     * في المتصفح قبل الانتقال إلى Server Component.
     */
    await new Promise((resolve) =>
      setTimeout(resolve, 300)
    );

    /*
     * التحقق من أن الحساب لديه صلاحية الأدمن.
     */
    const response = await fetch(
      "/api/admin/check",
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      await supabase.auth.signOut();

      setErrorMessage(
        "تم تسجيل الدخول، لكن هذا الحساب لا يملك صلاحية المشرف."
      );

      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)] text-2xl text-white shadow-sm">
            ت
          </div>

          <h1 className="mt-5 text-2xl font-bold text-[var(--foreground)]">
            لوحة المشرف
          </h1>

          <p className="mt-2 text-sm text-[var(--muted)]">
            مسجد النبي شعيب عليه السلام
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-[var(--border)] bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              تسجيل الدخول
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              سجّل الدخول للوصول إلى أدوات إدارة المنصة.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                البريد الإلكتروني
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="example@email.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[var(--foreground)]"
              >
                كلمة المرور
              </label>

              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-light)]"
              />
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[var(--primary)] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "جاري تسجيل الدخول..."
                : "تسجيل الدخول"}
            </button>
          </form>
        </div>

        {/* Back */}
        <div className="mt-5 text-center">
          <a
            href="/"
            className="text-sm text-[var(--muted)] transition hover:text-[var(--primary)]"
          >
            العودة إلى الصفحة الرئيسية
          </a>
        </div>
      </div>
    </main>
  );
}