import { NextResponse } from "next/server";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { lt } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  // Basic security for cron (Vercel cron uses Bearer CRON_SECRET)
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Clean up expired sessions (older than current date)
    const result = await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    
    return NextResponse.json({ 
      success: true, 
      message: "Cleanup complete" 
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
