import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Validate database connection
    await db.execute(sql`SELECT 1`);
    
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      status: "degraded",
      database: "unreachable",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
