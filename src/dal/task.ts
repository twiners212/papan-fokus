import { db } from "@/db";
import { tasks, activityLogs, users } from "@/db/schema";
import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { verifyWorkspaceMembership, verifyWorkspaceEditor } from "./membership";

export async function getTasks(workspaceId: string, userId: string) {
  await verifyWorkspaceMembership(workspaceId, userId);

  return await db.query.tasks.findMany({
    where: and(
      eq(tasks.workspaceId, workspaceId),
      isNull(tasks.deletedAt)
    ),
  });
}

export async function createTask(
  workspaceId: string,
  userId: string,
  payload: { title: string; description?: string; columnId: string; position: number }
) {
  await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const [task] = await tx
      .insert(tasks)
      .values({
        workspaceId,
        columnId: payload.columnId,
        title: payload.title,
        description: payload.description,
        position: payload.position,
        createdBy: userId,
      })
      .returning();

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "TASK_CREATED",
      entityId: task.id,
      details: { columnId: payload.columnId, title: payload.title },
    });

    return task;
  });
}

export async function moveTask(
  taskId: string,
  workspaceId: string,
  userId: string,
  payload: { columnId: string; position: number }
) {
  const member = await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    // 1. Get current task
    const existingTask = await tx.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt)
      )
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    if (member.role !== "admin" && userId !== existingTask.createdBy && userId !== existingTask.assigneeId) {
      throw new Error("Unauthorized: Only the task creator, assignee, or admin can move this task");
    }

    // 2. Update column_id & position, sinkronisasi workspace_id (Aturan Integritas Mutlak)
    const [task] = await tx
      .update(tasks)
      .set({
        columnId: payload.columnId,
        position: payload.position,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .returning();

    // 3. Log activity
    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "TASK_MOVED",
      entityId: task.id,
      details: { 
        fromColumnId: existingTask.columnId, 
        toColumnId: payload.columnId,
        position: payload.position
      },
    });

    return task;
  });
}

export async function updateTask(
  taskId: string,
  workspaceId: string,
  userId: string,
  payload: { 
    title?: string; 
    description?: string;
    priority?: string;
    dueDate?: Date | null;
    assigneeId?: string | null;
  }
) {
  const member = await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const existingTask = await tx.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt)
      )
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    const isAdmin = member.role === "admin";
    const isCreator = userId === existingTask.createdBy;
    const isAssignee = userId === existingTask.assigneeId;

    if (payload.description !== undefined && payload.description !== existingTask.description) {
      if (!isAdmin && !isCreator && !isAssignee) {
        throw new Error("Unauthorized: Only admin, task creator, or assignee can edit description");
      }
    }

    if (payload.priority !== undefined && payload.priority !== existingTask.priority) {
      if (!isAdmin && !isCreator) {
        throw new Error("Unauthorized: Only admin or task creator can edit priority");
      }
    }

    if (payload.dueDate !== undefined) {
      const existingDate = existingTask.dueDate ? new Date(existingTask.dueDate).getTime() : null;
      const newDate = payload.dueDate ? new Date(payload.dueDate).getTime() : null;
      if (existingDate !== newDate) {
        if (!isAdmin && !isCreator) {
          throw new Error("Unauthorized: Only admin or task creator can edit due date");
        }
      }
    }

    if (payload.assigneeId !== undefined && payload.assigneeId !== existingTask.assigneeId) {
      if (!isAdmin && !isCreator) {
        throw new Error("Unauthorized: Only admin or task creator can edit assignee");
      }
    }

    if (payload.title !== undefined && payload.title !== existingTask.title) {
      if (!isAdmin && !isCreator && !isAssignee) {
        throw new Error("Unauthorized: Only admin, task creator, or assignee can modify title");
      }
    }

    const [task] = await tx
      .update(tasks)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .returning();

    if (!task) throw new Error("Task not found or unauthorized");

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "TASK_UPDATED",
      entityId: task.id,
      details: payload,
    });

    return task;
  });
}

export async function assignTask(
  taskId: string,
  workspaceId: string,
  userId: string,
  assigneeId: string | null
) {
  const member = await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const existingTask = await tx.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt)
      )
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    if (member.role !== "admin" && userId !== existingTask.createdBy) {
      throw new Error("Unauthorized: Only the task creator or admin can assign this task");
    }

    const [task] = await tx
      .update(tasks)
      .set({
        assigneeId,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .returning();

    if (!task) throw new Error("Task not found or unauthorized");

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: assigneeId ? "TASK_ASSIGNED" : "TASK_UNASSIGNED",
      entityId: task.id,
      details: { assigneeId },
    });

    return task;
  });
}

export async function deleteTask(taskId: string, workspaceId: string, userId: string) {
  const member = await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const existingTask = await tx.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt)
      )
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    if (member.role !== "admin" && userId !== existingTask.createdBy) {
      throw new Error("Unauthorized: Only the task creator or admin can delete this task");
    }

    const [task] = await tx
      .update(tasks)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .returning();

    if (!task) throw new Error("Task not found or unauthorized");

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "TASK_DELETED",
      entityId: task.id,
      details: { title: task.title },
    });

    return task;
  });
}

export async function restoreTask(taskId: string, workspaceId: string, userId: string) {
  const member = await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const existingTask = await tx.query.tasks.findFirst({
      where: and(
        eq(tasks.id, taskId),
        eq(tasks.workspaceId, workspaceId)
      )
    });

    if (!existingTask) throw new Error("Task not found or unauthorized");

    if (member.role !== "admin" && userId !== existingTask.createdBy) {
      throw new Error("Unauthorized: Only the task creator or admin can restore this task");
    }

    const [task] = await tx
      .update(tasks)
      .set({
        deletedAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.workspaceId, workspaceId)))
      .returning();

    if (!task) throw new Error("Task not found or unauthorized");

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "TASK_RESTORED",
      entityId: task.id,
      details: { title: task.title },
    });

    return task;
  });
}

export async function getTaskActivityLogs(taskId: string, workspaceId: string, userId: string, page: number = 1, limit: number = 10) {
  await verifyWorkspaceMembership(workspaceId, userId);

  const offset = (page - 1) * limit;

  const logs = await db
    .select({
      id: activityLogs.id,
      actionType: activityLogs.actionType,
      details: activityLogs.details,
      createdAt: activityLogs.createdAt,
      actor: {
        id: users.id,
        name: users.name,
        image: users.image,
      }
    })
    .from(activityLogs)
    .innerJoin(users, eq(activityLogs.actorId, users.id))
    .where(
      and(
        eq(activityLogs.entityId, taskId),
        eq(activityLogs.workspaceId, workspaceId)
      )
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql`count(*)` })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.entityId, taskId),
        eq(activityLogs.workspaceId, workspaceId)
      )
    );

  return {
    data: logs,
    total: Number(count),
    page,
    limit,
    totalPages: Math.ceil(Number(count) / limit)
  };
}
