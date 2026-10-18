"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { updateWorkspace, deleteWorkspace } from "@/dal/workspace";
import { revalidatePath } from "next/cache";
import { broadcastWorkspaceDeleted } from "@/lib/broadcast";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function updateWorkspaceSettingsAction(
  workspaceId: string,
  payload: { name?: string; slug?: string; description?: string; logoUrl?: string }
) {
  const session = await getSession();
  const workspace = await updateWorkspace(workspaceId, session.user.id, payload);
  revalidatePath(`/${workspace.slug}/settings`);
  revalidatePath(`/${workspace.slug}/board`); // Also update board if logo is used there
  return workspace;
}

export async function deleteWorkspaceAction(workspaceId: string) {
  const session = await getSession();
  // Broadcast deletion to all connected workspace clients first
  await broadcastWorkspaceDeleted(workspaceId);
  await deleteWorkspace(workspaceId, session.user.id);
  // Revalidate entire layout since the workspace list changed
  revalidatePath("/", "layout");
  return { success: true };
}
