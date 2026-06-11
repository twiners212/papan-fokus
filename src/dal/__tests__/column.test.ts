import { describe, it, expect, vi, beforeEach } from "vitest";
import { createColumn, updateColumn, deleteColumn } from "../column";
import * as membership from "../membership";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      transaction: vi.fn(async (cb) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ id: "col-1", name: "New Col", position: 1000 }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          query: {
            tasks: {
              findFirst: vi.fn().mockResolvedValue(null),
            },
            columns: {
              findMany: vi.fn().mockResolvedValue([{ id: "col-1" }, { id: "col-2" }]),
            },
          },
        };
        return await cb(mockTx);
      }),
    },
  };
});

vi.mock("../membership", () => {
  return {
    verifyWorkspaceMembership: vi.fn(),
    verifyWorkspaceEditor: vi.fn(),
  };
});

describe("Column DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createColumn", () => {
    it("should allow admin to create column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
      } as any);

      const result = await createColumn("ws-1", "user-1", { name: "New Col", position: 1000 });
      expect(result).toBeDefined();
    });

    it("should allow member to create column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "member",
      } as any);

      const result = await createColumn("ws-1", "user-1", { name: "New Col", position: 1000 });
      expect(result).toBeDefined();
    });

    it("should reject viewer from creating column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockRejectedValueOnce(
        new Error("Unauthorized: Viewers cannot perform this action")
      );

      await expect(createColumn("ws-1", "user-1", { name: "New Col", position: 1000 })).rejects.toThrow("Unauthorized");
    });
  });

  describe("updateColumn", () => {
    it("should allow admin to update column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
      } as any);

      const result = await updateColumn("col-1", "ws-1", "user-1", { name: "Updated" });
      expect(result).toBeDefined();
    });

    it("should reject viewer from updating column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockRejectedValueOnce(
        new Error("Unauthorized: Viewers cannot perform this action")
      );

      await expect(updateColumn("col-1", "ws-1", "user-1", { name: "Updated" })).rejects.toThrow("Unauthorized");
    });
  });

  describe("deleteColumn", () => {
    it("should allow member to delete column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "member",
      } as any);

      const result = await deleteColumn("col-1", "ws-1", "user-1");
      expect(result).toBeDefined();
    });

    it("should reject if column has active tasks", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
      } as any);

      // Override the mockTx for this specific test
      vi.mocked(db.transaction).mockImplementationOnce(async (cb) => {
        const mockTx = {
          query: {
            tasks: { findFirst: vi.fn().mockResolvedValue({ id: "task-1" }) },
          },
        };
        return await cb(mockTx as any);
      });

      await expect(deleteColumn("col-1", "ws-1", "user-1")).rejects.toThrow("Cannot delete column with active tasks");
    });

    it("should reject if it's the last column", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
      } as any);

      // Override the mockTx for this specific test
      vi.mocked(db.transaction).mockImplementationOnce(async (cb) => {
        const mockTx = {
          query: {
            tasks: { findFirst: vi.fn().mockResolvedValue(null) },
            columns: { findMany: vi.fn().mockResolvedValue([{ id: "col-1" }]) }, // Only 1 column
          },
        };
        return await cb(mockTx as any);
      });

      await expect(deleteColumn("col-1", "ws-1", "user-1")).rejects.toThrow("Cannot delete the last column in a workspace");
    });
  });
});
