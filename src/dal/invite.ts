import { db } from "@/db";
import { inviteLinks, workspaceMembers, activityLogs, workspaces } from "@/db/schema";
import { and, eq, gt, sql } from "drizzle-orm";
import { verifyWorkspaceAdmin } from "./membership";
import { randomBytes } from "crypto";
import { CreateInviteLinkPayload } from "@/lib/schemas/invite";

export async function createInviteLink(
  userId: string,
  payload: CreateInviteLinkPayload
) {
  try {
    await verifyWorkspaceAdmin(payload.workspaceId, userId);

    const token = randomBytes(32).toString("hex");
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + payload.expiresInHours);

    const [inviteLink] = await db
      .insert(inviteLinks)
      .values({
        workspaceId: payload.workspaceId,
        token,
        role: payload.role as "admin" | "member" | "viewer",
        maxUses: payload.maxUses,
        expiresAt,
        createdBy: userId,
      })
      .returning();

    return { success: true, data: inviteLink };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create invite link" };
  }
}

export async function joinWorkspaceViaLink(token: string, userId: string) {
  try {
    return await db.transaction(async (tx) => {
      const linkData = await tx
        .select({
          link: inviteLinks,
          workspace: workspaces,
        })
        .from(inviteLinks)
        .innerJoin(workspaces, eq(inviteLinks.workspaceId, workspaces.id))
        .where(
          and(
            eq(inviteLinks.token, token),
            gt(inviteLinks.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!linkData || linkData.length === 0) {
        return { success: false, error: "Tautan undangan tidak valid atau sudah kedaluwarsa" };
      }

      const { link, workspace } = linkData[0];

      if (link.usesCount >= link.maxUses) {
        return { success: false, error: "Kapasitas tautan undangan sudah penuh" };
      }

      // Cek apakah user sudah menjadi member
      const existingMember = await tx
        .select()
        .from(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, link.workspaceId),
            eq(workspaceMembers.userId, userId)
          )
        )
        .limit(1);

      if (existingMember.length > 0) {
        return { success: true, data: { workspaceId: link.workspaceId, slug: workspace.slug, existing: true } };
      }

      // Cek limit 20 members
      const [{ count }] = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.workspaceId, link.workspaceId));

      if (count >= 20) {
        return { success: false, error: "Workspace telah mencapai batas maksimal 20 anggota" };
      }

      // Tambahkan ke workspace_members dengan onConflictDoNothing untuk race conditions
      const insertResult = await tx.insert(workspaceMembers).values({
        workspaceId: link.workspaceId,
        userId,
        role: link.role as "admin" | "member" | "viewer",
      })
      .onConflictDoNothing()
      .returning({ userId: workspaceMembers.userId });

      if (insertResult.length === 0) {
        // Race condition: user was inserted concurrently by another request
        return { success: true, data: { workspaceId: link.workspaceId, slug: workspace.slug, existing: true } };
      }

      // Update uses_count
      await tx
        .update(inviteLinks)
        .set({
          usesCount: link.usesCount + 1,
        })
        .where(eq(inviteLinks.id, link.id));

      // Activity Log
      await tx.insert(activityLogs).values({
        workspaceId: link.workspaceId,
        actorId: userId,
        actionType: "MEMBER_JOINED",
        entityId: userId,
        details: { role: link.role }
      });

      return { success: true, data: { workspaceId: link.workspaceId, slug: workspace.slug, existing: false } };
    });
  } catch (error: any) {
    return { success: false, error: error.message || "Gagal bergabung ke workspace" };
  }
}
