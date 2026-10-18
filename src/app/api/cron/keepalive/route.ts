import { NextResponse } from "next/server";
import { pingSupabaseAction } from "@/actions/supabase-actions";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  // Verify cron secret if configured
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pingSupabaseAction();

  if (!result.success) {
    return NextResponse.json(result, { status: 503 });
  }

  return NextResponse.json(result, { status: 200 });
}

export async function POST(request: Request) {
  return GET(request);
}
