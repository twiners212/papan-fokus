import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

// Helper to notify all clients in a workspace that the board changed
export async function broadcastBoardUpdate(workspaceId: string) {
  try {
    // Only use server-side
    if (typeof window !== "undefined") return;

    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.channel(`workspace:${workspaceId}`).send({
      type: "broadcast",
      event: "BOARD_UPDATED",
      payload: { timestamp: Date.now() },
    });
  } catch (error) {
    console.error("Failed to broadcast board update:", error);
  }
}
