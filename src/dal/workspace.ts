import { db } from "@/db";
import { workspaces, workspaceMembers, columns, tasks, activityLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyWorkspaceMembership } from "./membership";

export async function getWorkspaceBySlug(slug: string, userId: string) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.slug, slug),
  });

  if (!workspace) return null;

  // Tenant Isolation Guard
  await verifyWorkspaceMembership(workspace.id, userId);

  return workspace;
}

export async function getUserWorkspaces(userId: string) {
  const result = await db
    .select({
      workspace: workspaces,
      role: workspaceMembers.role,
    })
    .from(workspaces)
    .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.createdAt);

  return result.map((r) => ({
    ...r.workspace,
    role: r.role,
  }));
}

export async function createWorkspace(
  payload: { name: string; slug: string; description?: string },
  userId: string
) {
  return await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        ownerId: userId,
      })
      .returning();

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "admin",
    });

    return workspace;
  });
}

export async function updateWorkspace(
  workspaceId: string,
  userId: string,
  payload: { name?: string; slug?: string; description?: string; logoUrl?: string }
) {
  // Ensure the user is an admin
  const member = await verifyWorkspaceMembership(workspaceId, userId);
  if (member.role !== "admin") {
    throw new Error("Only admins can update workspace settings");
  }

  const [workspace] = await db
    .update(workspaces)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(workspaces.id, workspaceId))
    .returning();

  return workspace;
}

export async function deleteWorkspace(workspaceId: string, userId: string) {
  // Ensure the user is an admin (owner in MVP)
  const member = await verifyWorkspaceMembership(workspaceId, userId);
  if (member.role !== "admin") {
    throw new Error("Only admins can delete the workspace");
  }

  // Hard delete workspace. All related data will be CASCADE deleted by Postgres.
  await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
}

export async function generateDummyData(workspaceId: string, userId: string) {
  // Ensure user is a member of the workspace
  await verifyWorkspaceMembership(workspaceId, userId);

  return await db.transaction(async (tx) => {
    // 1. Create Columns
    const colsToInsert = [
      { name: "Backlog", position: 1000 },
      { name: "To Do", position: 2000 },
      { name: "In Progress", position: 3000 },
      { name: "Done", position: 4000 },
    ];

    const insertedCols = [];
    for (const colData of colsToInsert) {
      const [col] = await tx
        .insert(columns)
        .values({
          workspaceId,
          name: colData.name,
          position: colData.position,
        })
        .returning();
      insertedCols.push(col);

      // Create activity log for column creation
      await tx.insert(activityLogs).values({
        workspaceId,
        actorId: userId,
        actionType: "COLUMN_CREATED",
        entityId: col.id,
        details: { name: col.name },
      });
    }

    const colMap = new Map(insertedCols.map((c) => [c.name, c.id]));

    // 2. Define Tasks
    const tasksToInsert = [
      {
        title: "Riset Integrasi API Calendar",
        description: "Mencari dokumentasi API Google Calendar / Outlook Calendar untuk sinkronisasi tenggat waktu.",
        columnId: colMap.get("Backlog")!,
        position: 1000,
        priority: "low",
      },
      {
        title: "Optimalisasi Loading State Image",
        description: "Gunakan Blurhash atau placeholder pudar untuk avatar pengguna di board.",
        columnId: colMap.get("Backlog")!,
        position: 2000,
        priority: "low",
      },
      {
        title: "Implementasi Shortcut Keyboard",
        description: "Menambahkan navigasi keyboard dasar (tombol Tab, Enter, Escape) pada board Kanban.",
        columnId: colMap.get("To Do")!,
        position: 1000,
        priority: "medium",
      },
      {
        title: "Audit Kontras Warna untuk Aksesibilitas",
        description: "Memastikan semua teks di Light & Dark Mode memiliki rasio kontras minimal 4.5:1.",
        columnId: colMap.get("To Do")!,
        position: 2000,
        priority: "high",
      },
      {
        title: "Penyempurnaan Animasi Drag & Drop",
        description: "Menambahkan animasi transisi halus dengan Framer Motion saat kartu dilepas.",
        columnId: colMap.get("In Progress")!,
        position: 1000,
        priority: "high",
        assigneeId: userId, // assign to current user
      },
      {
        title: "Setup Autentikasi dengan Better Auth",
        description: "Integrasi Better Auth menggunakan database Drizzle dan session cookie.",
        columnId: colMap.get("Done")!,
        position: 1000,
        priority: "high",
        assigneeId: userId, // assign to current user
      },
      {
        title: "Konfigurasi Connection Pooler Supabase",
        description: "Menyambungkan Supavisor transaction mode untuk Serverless Next.js.",
        columnId: colMap.get("Done")!,
        position: 2000,
        priority: "medium",
      },
    ];

    for (const taskData of tasksToInsert) {
      const [task] = await tx
        .insert(tasks)
        .values({
          workspaceId,
          columnId: taskData.columnId,
          title: taskData.title,
          description: taskData.description,
          position: taskData.position,
          priority: taskData.priority,
          assigneeId: taskData.assigneeId || null,
          createdBy: userId,
        })
        .returning();

      // Create activity log for task creation
      await tx.insert(activityLogs).values({
        workspaceId,
        actorId: userId,
        actionType: "TASK_CREATED",
        entityId: task.id,
        details: { title: task.title },
      });

      // If assigned, create activity log for assignment
      if (taskData.assigneeId) {
        await tx.insert(activityLogs).values({
          workspaceId,
          actorId: userId,
          actionType: "TASK_ASSIGNED",
          entityId: task.id,
          details: { assigneeId: taskData.assigneeId },
        });
      }
    }

    return insertedCols;
  });
}
