import { db } from "@/db";
import { activityLogs, columns, tasks, users } from "@/db/schema";
import { and, eq, gte, ilike, or, isNull } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function getDailyActivitySummary(workspaceId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(activityLogs)
    .innerJoin(columns, eq(sql`(${activityLogs.details}->>'toColumnId')::uuid`, columns.id))
    .where(
      and(
        eq(activityLogs.workspaceId, workspaceId),
        eq(activityLogs.actionType, "TASK_MOVED"),
        or(ilike(columns.name, "done"), ilike(columns.name, "selesai")),
        gte(activityLogs.createdAt, today)
      )
    );
  
  return result[0]?.count || 0;
}

export async function calculateVelocity(workspaceId: string): Promise<{ week: string; tasksCompleted: number }[]> {
  const result = await db
    .select({
      week: sql<string>`date_trunc('week', ${activityLogs.createdAt})::date::text`,
      tasksCompleted: sql<number>`count(*)::int`,
    })
    .from(activityLogs)
    .innerJoin(columns, eq(sql`(${activityLogs.details}->>'toColumnId')::uuid`, columns.id))
    .where(
      and(
        eq(activityLogs.workspaceId, workspaceId),
        eq(activityLogs.actionType, "TASK_MOVED"),
        or(ilike(columns.name, "done"), ilike(columns.name, "selesai"))
      )
    )
    .groupBy(sql`date_trunc('week', ${activityLogs.createdAt})`)
    .orderBy(sql`date_trunc('week', ${activityLogs.createdAt})`);

  return result;
}

export async function calculateCycleTime(workspaceId: string): Promise<{ averageCycleTimeHours: number }> {
  const result = await db.execute(sql`
    WITH created AS (
      SELECT entity_id, created_at FROM activity_logs 
      WHERE workspace_id = ${workspaceId} AND action_type = 'TASK_CREATED'
    ),
    done AS (
      SELECT al.entity_id, MIN(al.created_at) as done_at 
      FROM activity_logs al
      JOIN columns c ON (al.details->>'toColumnId')::uuid = c.id
      WHERE al.workspace_id = ${workspaceId} 
        AND al.action_type = 'TASK_MOVED' 
        AND (c.name ILIKE 'done' OR c.name ILIKE 'selesai')
      GROUP BY al.entity_id
    )
    SELECT AVG(EXTRACT(EPOCH FROM (done.done_at - created.created_at)) / 3600)::numeric as avg_hours
    FROM created
    JOIN done ON created.entity_id = done.entity_id
  `);

  const avgHours = result[0]?.avg_hours ? Number(result[0].avg_hours) : 0;
  return { averageCycleTimeHours: Math.round(avgHours * 100) / 100 };
}

export async function getTeamWorkload(workspaceId: string): Promise<{ assigneeId: string | null; assigneeName: string | null; taskCount: number }[]> {
  const result = await db
    .select({
      assigneeId: sql<string | null>`COALESCE(${tasks.assigneeId}, ${tasks.createdBy})`,
      assigneeName: users.name,
      taskCount: sql<number>`count(*)::int`
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, sql`COALESCE(${tasks.assigneeId}, ${tasks.createdBy})`))
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt)
      )
    )
    .groupBy(sql`COALESCE(${tasks.assigneeId}, ${tasks.createdBy})`, users.name);

  return result;
}
