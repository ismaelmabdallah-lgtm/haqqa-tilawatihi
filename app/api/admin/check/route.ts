import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        authorized: false,
      },
      {
        status: 403,
      }
    );
  }

  return NextResponse.json({
    authorized: true,
  });
}