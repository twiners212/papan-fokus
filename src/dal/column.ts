import { db } from "@/db";
import { columns, activityLogs, tasks } from "@/db/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import { verifyWorkspaceMembership, verifyWorkspaceEditor } from "./membership";

export async function getColumns(workspaceId: string, userId: string) {
  await verifyWorkspaceMembership(workspaceId, userId);

  return await db.query.columns.findMany({
    where: eq(columns.workspaceId, workspaceId),
    orderBy: [asc(columns.position)],
  });
}

export async function createColumn(
  workspaceId: string,
  userId: string,
  payload: { name: string; position: number }
) {
  await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const [column] = await tx
      .insert(columns)
      .values({
        workspaceId,
        name: payload.name,
        position: payload.position,
      })
      .returning();

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "COLUMN_CREATED",
      entityId: column.id,
      details: { name: payload.name },
    });

    return column;
  });
}

export async function updateColumn(
  columnId: string,
  workspaceId: string,
  userId: string,
  payload: { name?: string; position?: number }
) {
  await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    const [column] = await tx
      .update(columns)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(and(eq(columns.id, columnId), eq(columns.workspaceId, workspaceId)))
      .returning();

    if (!column) throw new Error("Column not found or unauthorized");

    if (payload.name) {
      await tx.insert(activityLogs).values({
        workspaceId,
        actorId: userId,
        actionType: "COLUMN_UPDATED",
        entityId: column.id,
        details: { name: payload.name },
      });
    }

    if (payload.position !== undefined) {
      await tx.insert(activityLogs).values({
        workspaceId,
        actorId: userId,
        actionType: "COLUMN_MOVED",
        entityId: column.id,
        details: { position: payload.position },
      });
    }

    return column;
  });
}

export async function deleteColumn(columnId: string, workspaceId: string, userId: string) {
  await verifyWorkspaceEditor(workspaceId, userId);

  return await db.transaction(async (tx) => {
    // 1. Check if column has active tasks
    const activeTasks = await tx.query.tasks.findFirst({
      where: and(
        eq(tasks.columnId, columnId),
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt)
      )
    });

    if (activeTasks) {
      throw new Error("Cannot delete column with active tasks");
    }

    // 2. Check if it's the last column
    const allColumns = await tx.query.columns.findMany({
      where: eq(columns.workspaceId, workspaceId),
    });

    if (allColumns.length <= 1) {
      throw new Error("Cannot delete the last column in a workspace");
    }

    const [deleted] = await tx
      .delete(columns)
      .where(and(eq(columns.id, columnId), eq(columns.workspaceId, workspaceId)))
      .returning();

    if (!deleted) throw new Error("Column not found or unauthorized");

    await tx.insert(activityLogs).values({
      workspaceId,
      actorId: userId,
      actionType: "COLUMN_DELETED",
      entityId: columnId,
      details: { name: deleted.name },
    });

    return deleted;
  });
}
