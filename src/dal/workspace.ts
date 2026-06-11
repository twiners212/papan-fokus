import { db } from "@/db";
import { workspaces, workspaceMembers } from "@/db/schema";
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
