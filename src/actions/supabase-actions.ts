"use server";

import { db } from "@/db";
import { sql } from "drizzle-orm";
import { env } from "@/env";

export interface SupabasePingResult {
  success: boolean;
  database: "connected" | "error";
  restApi: "ok" | "error" | "skipped";
  dbLatencyMs: number;
  restLatencyMs?: number;
  timestamp: string;
  error?: string;
}

/**
 * Server Action to ping Supabase PostgreSQL database & REST API gateway.
 * Keeps the Supabase free-tier project active and prevents inactivity pausing.
 */
export async function pingSupabaseAction(): Promise<SupabasePingResult> {
  const startTime = Date.now();
  let dbLatencyMs = 0;
  let restLatencyMs: number | undefined;
  let dbStatus: "connected" | "error" = "error";
  let restStatus: "ok" | "error" | "skipped" = "skipped";

  try {
    // 1. Direct PostgreSQL connection keep-alive via Drizzle
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "connected";

    // 2. Supabase PostgREST API Gateway keep-alive
    if (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const restStart = Date.now();
      try {
        const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          method: "GET",
          headers: {
            apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          cache: "no-store",
        });
        restLatencyMs = Date.now() - restStart;
        restStatus = res.status < 500 ? "ok" : "error";
      } catch (restErr: unknown) {
        console.warn("Supabase REST API ping warning:", restErr);
        restStatus = "error";
      }
    }

    return {
      success: true,
      database: dbStatus,
      restApi: restStatus,
      dbLatencyMs,
      restLatencyMs,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Failed to ping Supabase";
    console.error("Supabase keep-alive ping error:", errorMsg);
    return {
      success: false,
      database: dbStatus,
      restApi: restStatus,
      dbLatencyMs: dbLatencyMs || (Date.now() - startTime),
      timestamp: new Date().toISOString(),
      error: errorMsg,
    };
  }
}
