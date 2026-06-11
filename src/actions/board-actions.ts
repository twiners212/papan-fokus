"use server";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getColumns } from "@/dal/column";
import { getTasks } from "@/dal/task";
import { getWorkspaceBySlug } from "@/dal/workspace";
import { verifyWorkspaceMembership } from "@/dal/membership";

export async function getBoardDataAction(slug: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const workspace = await getWorkspaceBySlug(slug, session.user.id);
  if (!workspace) throw new Error("Workspace not found");

  const member = await verifyWorkspaceMembership(workspace.id, session.user.id);
  const columns = await getColumns(workspace.id, session.user.id);
  const tasks = await getTasks(workspace.id, session.user.id);

  return {
    workspace,
    role: member.role,
    columns,
    tasks,
  };
}

import { updateTask, getTaskActivityLogs } from "@/dal/task";
import { getWorkspaceMembers } from "@/dal/membership";
import { revalidatePath } from "next/cache";
import { broadcastBoardUpdate } from "@/lib/broadcast";

export async function getTaskActivityLogsAction(taskId: string, workspaceId: string, page: number = 1, limit: number = 10) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  return await getTaskActivityLogs(taskId, workspaceId, session.user.id, page, limit);
}

export async function updateTaskAction(
  taskId: string,
  workspaceId: string,
  payload: {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: Date | null;
    assigneeId?: string | null;
  }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  const task = await updateTask(taskId, workspaceId, session.user.id, payload);
  revalidatePath("/"); // revalidate board
  await broadcastBoardUpdate(workspaceId);
  return task;
}

export async function getWorkspaceMembersAction(workspaceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");

  return await getWorkspaceMembers(workspaceId, session.user.id);
}
