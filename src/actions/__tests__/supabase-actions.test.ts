import { describe, it, expect, vi, beforeEach } from "vitest";
import { pingSupabaseAction } from "../supabase-actions";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

vi.mock("@/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://mock.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key",
  },
}));

describe("pingSupabaseAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should return success when database and REST API respond normally", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([] as never);
    vi.mocked(global.fetch).mockResolvedValueOnce({
      status: 200,
      ok: true,
    } as unknown as Response);

    const result = await pingSupabaseAction();

    expect(result.success).toBe(true);
    expect(result.database).toBe("connected");
    expect(result.restApi).toBe("ok");
    expect(result.dbLatencyMs).toBeGreaterThanOrEqual(0);
    expect(result.timestamp).toBeDefined();
  });

  it("should still succeed with database connected even if REST API fails", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce([] as never);
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("Network timeout"));

    const result = await pingSupabaseAction();

    expect(result.success).toBe(true);
    expect(result.database).toBe("connected");
    expect(result.restApi).toBe("error");
  });

  it("should return failure when database connection throws an error", async () => {
    vi.mocked(db.execute).mockRejectedValueOnce(new Error("Postgres connection refused"));

    const result = await pingSupabaseAction();

    expect(result.success).toBe(false);
    expect(result.database).toBe("error");
    expect(result.error).toBe("Postgres connection refused");
  });
});
