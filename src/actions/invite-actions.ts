"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createInviteLink, joinWorkspaceViaLink } from "@/dal/invite";
import { createInviteLinkSchema, joinWorkspaceViaLinkSchema } from "@/lib/schemas/invite";
import { createClient } from "@supabase/supabase-js";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

// Server side client for bypassing RLS to broadcast
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createInviteLinkAction(payload: unknown) {
  const session = await getSession();
  
  const parsed = createInviteLinkSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false, error: "Input tidak valid" };
  }

  const result = await createInviteLink(session.user.id, parsed.data);
  return result;
}

export async function joinWorkspaceViaLinkAction(token: unknown) {
  const session = await getSession();

  const parsed = joinWorkspaceViaLinkSchema.safeParse({ token });
  if (!parsed.success) {
    return { success: false, error: "Token tidak valid" };
  }

  const result = await joinWorkspaceViaLink(parsed.data.token, session.user.id);
  
  if (result.success && 'data' in result && result.data && !result.data.existing) {
    // Broadcast event to realtime channel
    supabaseAdmin.channel(`workspace:${result.data.workspaceId}`).send({
      type: "broadcast",
      event: "MEMBER_JOINED",
      payload: {
        version: 1,
        eventId: crypto.randomUUID(),
        workspaceId: result.data.workspaceId,
        actorId: session.user.id,
        type: "MEMBER_JOINED",
        payload: { userId: session.user.id },
        timestamp: new Date().toISOString(),
      }
    });
  }

  return result;
}
