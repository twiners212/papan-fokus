import { z } from "zod";
import { workspaceRoleEnum } from "@/db/schema";

export const createInviteLinkSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  role: z.enum(workspaceRoleEnum.enumValues, {
    message: "Invalid role",
  }),
  maxUses: z.number().int().positive("Max uses must be a positive integer").max(100, "Max uses cannot exceed 100"),
  expiresInHours: z.number().int().positive("Expires in hours must be a positive integer").max(24, "Cannot exceed 24 hours"),
});

export const joinWorkspaceViaLinkSchema = z.object({
  token: z.string().min(1, "Token is required").max(255, "Token is too long"),
});

export type CreateInviteLinkPayload = z.infer<typeof createInviteLinkSchema>;
export type JoinWorkspaceViaLinkPayload = z.infer<typeof joinWorkspaceViaLinkSchema>;
