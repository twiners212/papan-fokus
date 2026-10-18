"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createTask, moveTask, assignTask, deleteTask, restoreTask } from "@/dal/task";
import { revalidatePath } from "next/cache";
import { broadcastBoardUpdate } from "@/lib/broadcast";

async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  return session;
}

export async function createNewTaskAction(
  workspaceId: string,
  payload: { title: string; description?: string; columnId: string; position: number }
) {
  const session = await getSession();
  const task = await createTask(workspaceId, session.user.id, payload);
  revalidatePath("/[slug]/board", "page");
  await broadcastBoardUpdate(workspaceId);
  return task;
}

export async function moveTaskAction(
  taskId: string,
  workspaceId: string,
  payload: { columnId: string; position: number }
) {
  const session = await getSession();
  const task = await moveTask(taskId, workspaceId, session.user.id, payload);
  // Optional: revalidate path if relying on server component, 
  // though for Kanban we usually rely on client-side optimistic UI & realtime sync.
  await broadcastBoardUpdate(workspaceId);
  return task;
}

export async function assignTaskAction(
  taskId: string,
  workspaceId: string,
  assigneeId: string | null
) {
  const session = await getSession();
  const task = await assignTask(taskId, workspaceId, session.user.id, assigneeId);
  revalidatePath("/[slug]/board", "page");
  await broadcastBoardUpdate(workspaceId);
  return task;
}

export async function deleteTaskAction(taskId: string, workspaceId: string) {
  const session = await getSession();
  const task = await deleteTask(taskId, workspaceId, session.user.id);
  revalidatePath("/[slug]/board", "page");
  await broadcastBoardUpdate(workspaceId);
  return task;
}

export async function restoreTaskAction(taskId: string, workspaceId: string) {
  const session = await getSession();
  const task = await restoreTask(taskId, workspaceId, session.user.id);
  revalidatePath("/[slug]/board", "page");
  await broadcastBoardUpdate(workspaceId);
  return task;
}
