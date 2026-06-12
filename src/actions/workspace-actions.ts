"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserWorkspaces, createWorkspace, generateDummyData } from "@/dal/workspace";
import { revalidatePath } from "next/cache";
import { broadcastBoardUpdate } from "@/lib/broadcast";

export async function getUserWorkspacesAction() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    return await getUserWorkspaces(session.user.id);
  } catch (error) {
    console.error("Error in getUserWorkspacesAction:", error);
    // Return empty array to prevent dashboard crash loops
    return [];
  }
}

export async function createWorkspaceAction(payload: {
  name: string;
  slug: string;
  description?: string;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const workspace = await createWorkspace(payload, session.user.id);
  
  revalidatePath("/dashboard");
  
  return workspace;
}

export async function generateDummyDataAction(workspaceId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    throw new Error("Unauthorized");
  }

  const result = await generateDummyData(workspaceId, session.user.id);
  
  revalidatePath(`/${workspaceId}/board`);
  await broadcastBoardUpdate(workspaceId);
  
  return result;
}
