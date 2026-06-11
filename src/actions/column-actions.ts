"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createColumn, updateColumn, deleteColumn } from "@/dal/column";
import { revalidatePath } from "next/cache";
import { broadcastBoardUpdate } from "@/lib/broadcast";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function createColumnAction(
  workspaceId: string,
  payload: { name: string; position: number }
) {
  const session = await getSession();
  const column = await createColumn(workspaceId, session.user.id, payload);
  revalidatePath(`/${workspaceId}/board`);
  await broadcastBoardUpdate(workspaceId);
  return column;
}

export async function updateColumnAction(
  columnId: string,
  workspaceId: string,
  payload: { name?: string; position?: number }
) {
  const session = await getSession();
  const column = await updateColumn(columnId, workspaceId, session.user.id, payload);
  revalidatePath(`/${workspaceId}/board`);
  await broadcastBoardUpdate(workspaceId);
  return column;
}

export async function deleteColumnAction(columnId: string, workspaceId: string) {
  const session = await getSession();
  const column = await deleteColumn(columnId, workspaceId, session.user.id);
  revalidatePath(`/${workspaceId}/board`);
  await broadcastBoardUpdate(workspaceId);
  return column;
}
