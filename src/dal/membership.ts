import { db } from "@/db";
import { workspaceMembers, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function verifyWorkspaceMembership(workspaceId: string, userId: string) {
  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId)
    ),
  });

  if (!member) {
    throw new Error("Unauthorized: User is not a member of this workspace");
  }

  return member;
}

export async function verifyWorkspaceAdmin(workspaceId: string, userId: string) {
  const member = await verifyWorkspaceMembership(workspaceId, userId);

  if (member.role !== "admin") {
    throw new Error("Unauthorized: User is not an admin of this workspace");
  }

  return member;
}

export async function verifyWorkspaceEditor(workspaceId: string, userId: string) {
  const member = await verifyWorkspaceMembership(workspaceId, userId);

  if (member.role === "viewer") {
    throw new Error("Unauthorized: User does not have edit permissions");
  }

  return member;
}

export async function getWorkspaceMembers(workspaceId: string, userId: string) {
  // First verify the user requesting this is a member of the workspace
  await verifyWorkspaceMembership(workspaceId, userId);

  const result = await db
    .select({
      id: workspaceMembers.userId,
      role: workspaceMembers.role,
      user: {
        id: users.id,
        name: users.name,
        image: users.image,
        email: users.email,
      }
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  const members = result.map(r => ({
    userId: r.id,
    role: r.role,
    user: r.user
  }));

  return members.map(m => ({
    id: m.userId,
    role: m.role,
    name: m.user.name,
    image: m.user.image,
    email: m.user.email,
  }));
}
