import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = body.token;

    if (token) {
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (!userError && user) {
        const { data: adminUser } = await supabaseAdmin
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (adminUser) {
          return NextResponse.json({ authorized: true });
        }
      }
    }

    // فحص احتياطي عبر الكوكيز
    const admin = await getCurrentAdmin();
    if (admin) {
      return NextResponse.json({ authorized: true });
    }

    return NextResponse.json({ authorized: false }, { status: 403 });
  } catch (err) {
    console.error("Check admin error:", err);
    return NextResponse.json({ authorized: false }, { status: 500 });
  }
}