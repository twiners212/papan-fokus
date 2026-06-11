import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInviteLink, joinWorkspaceViaLink } from "../invite";
import * as membership from "../membership";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "link-1", token: "tok_123" }]),
      transaction: vi.fn(async (cb) => {
        const mockLimit = vi.fn()
          .mockResolvedValueOnce([{ 
            link: { id: "link-1", workspaceId: "ws-1", usesCount: 0, maxUses: 10, role: "member" }, 
            workspace: { id: "ws-1", slug: "ws-test" } 
          }])
          .mockResolvedValueOnce([]);

        const mockTx: any = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          onConflictDoNothing: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ userId: "user-new" }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
        };

        mockTx.where = vi.fn().mockImplementation(() => ({
          limit: mockLimit,
          then: function(resolve: any) { resolve([{ count: 5 }]); }
        }));

        return await cb(mockTx);
      }),
    },
  };
});

vi.mock("../membership", () => {
  return {
    verifyWorkspaceAdmin: vi.fn(),
  };
});

describe("Invite DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createInviteLink", () => {
    it("should allow admin to create invite link", async () => {
      vi.mocked(membership.verifyWorkspaceAdmin).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-admin",
        role: "admin",
      } as any);

      const result = await createInviteLink("user-admin", {
        workspaceId: "ws-1",
        role: "member",
        maxUses: 10,
        expiresInHours: 24,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should reject member from creating invite link", async () => {
      vi.mocked(membership.verifyWorkspaceAdmin).mockRejectedValueOnce(
        new Error("Unauthorized: User is not an admin of this workspace")
      );

      const result = await createInviteLink("user-member", {
        workspaceId: "ws-1",
        role: "member",
        maxUses: 10,
        expiresInHours: 24,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized: User is not an admin of this workspace");
    });
  });

  describe("joinWorkspaceViaLink", () => {
    it("should allow a user to join via a valid link", async () => {
      const result = await joinWorkspaceViaLink("tok_123", "user-new");
      if (!result.success) console.log((result as any).error);
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result as any).data.workspaceId).toBe("ws-1");
        expect((result as any).data.existing).toBe(false);
      }
    });

    it("should reject if max uses is reached", async () => {
      // Override the mockTx for this specific test
      vi.mocked(db.transaction).mockImplementationOnce(async (cb) => {
        const mockTx = {
          select: vi.fn().mockReturnThis(),
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue([{ 
            link: { id: "link-1", workspaceId: "ws-1", usesCount: 10, maxUses: 10, role: "member" }, 
            workspace: { id: "ws-1", slug: "ws-test" } 
          }]),
        };
        return await cb(mockTx as any);
      });

      const result = await joinWorkspaceViaLink("tok_123", "user-new");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect((result as any).error).toBe("Kapasitas tautan undangan sudah penuh");
      }
    });
  });
});
