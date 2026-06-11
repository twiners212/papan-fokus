import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateWorkspace, deleteWorkspace } from "../workspace";
import * as membership from "../membership";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "ws-1", name: "Updated" }]),
      delete: vi.fn().mockReturnThis(),
    },
  };
});

vi.mock("../membership", () => {
  return {
    verifyWorkspaceMembership: vi.fn(),
  };
});

describe("Workspace DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateWorkspace", () => {
    it("should allow admin to update workspace", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
      } as any);

      const result = await updateWorkspace("ws-1", "user-1", { name: "New Name" });
      expect(result).toEqual({ id: "ws-1", name: "Updated" });
    });

    it("should reject member from updating workspace", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "member",
      } as any);

      await expect(updateWorkspace("ws-1", "user-1", { name: "New Name" })).rejects.toThrow(
        "Only admins can update workspace settings"
      );
    });

    it("should reject viewer from updating workspace", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "viewer",
      } as any);

      await expect(updateWorkspace("ws-1", "user-1", { name: "New Name" })).rejects.toThrow(
        "Only admins can update workspace settings"
      );
    });
  });

  describe("deleteWorkspace", () => {
    it("should allow admin to delete workspace", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
      } as any);

      await deleteWorkspace("ws-1", "user-1");
      expect(db.delete).toHaveBeenCalled();
    });

    it("should reject member from deleting workspace", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "member",
      } as any);

      await expect(deleteWorkspace("ws-1", "user-1")).rejects.toThrow(
        "Only admins can delete the workspace"
      );
      expect(db.delete).not.toHaveBeenCalled();
    });

    it("should reject viewer from deleting workspace", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "viewer",
      } as any);

      await expect(deleteWorkspace("ws-1", "user-1")).rejects.toThrow(
        "Only admins can delete the workspace"
      );
      expect(db.delete).not.toHaveBeenCalled();
    });
  });
});
