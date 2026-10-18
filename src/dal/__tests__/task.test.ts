import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTasks, createTask, moveTask, updateTask, assignTask, deleteTask } from "../task";
import * as membership from "../membership";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      transaction: vi.fn(async (cb) => {
        const mockTx = {
          insert: vi.fn().mockReturnThis(),
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([{ id: "task-1", title: "Task 1", position: 1000 }]),
          update: vi.fn().mockReturnThis(),
          set: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          query: {
            tasks: {
              findFirst: vi.fn().mockResolvedValue({
                id: "task-1",
                workspaceId: "ws-1",
                columnId: "col-1",
                title: "Task 1",
                description: "Desc",
                position: 1000,
                createdBy: "user-creator",
                assigneeId: "user-assignee",
              }),
            },
          },
        };
        return await cb(mockTx);
      }),
      query: {
        tasks: {
          findMany: vi.fn().mockResolvedValue([
            { id: "task-1", position: 1000 },
            { id: "task-2", position: 2000 },
          ]),
        },
      },
    },
  };
});

vi.mock("../membership", () => {
  return {
    verifyWorkspaceMembership: vi.fn(),
    verifyWorkspaceEditor: vi.fn(),
  };
});

describe("Task DAL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTasks", () => {
    it("should verify membership and return tasks ordered by position", async () => {
      vi.mocked(membership.verifyWorkspaceMembership).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "member",
        joinedAt: new Date(),
      });

      const result = await getTasks("ws-1", "user-1");
      expect(membership.verifyWorkspaceMembership).toHaveBeenCalledWith("ws-1", "user-1");
      expect(db.query.tasks.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      expect(result[0].position).toBe(1000);
      expect(result[1].position).toBe(2000);
    });
  });

  describe("createTask", () => {
    it("should allow admin to create task", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-1",
        role: "admin",
        joinedAt: new Date(),
      });

      const result = await createTask("ws-1", "user-1", { title: "New", columnId: "col-1", position: 1000 });
      expect(result).toBeDefined();
    });

    it("should reject viewer from creating task", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockRejectedValueOnce(
        new Error("Unauthorized: Viewers cannot perform this action")
      );

      await expect(createTask("ws-1", "user-viewer", { title: "New", columnId: "col-1", position: 1000 })).rejects.toThrow("Unauthorized");
    });
  });

  describe("moveTask", () => {
    it("should allow admin to move task", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-admin",
        role: "admin",
        joinedAt: new Date(),
      });

      const result = await moveTask("task-1", "ws-1", "user-admin", { columnId: "col-2", position: 2000 });
      expect(result).toBeDefined();
    });

    it("should allow creator to move task", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-creator",
        role: "member",
        joinedAt: new Date(),
      });

      const result = await moveTask("task-1", "ws-1", "user-creator", { columnId: "col-2", position: 2000 });
      expect(result).toBeDefined();
    });

    it("should reject non-creator member from moving task", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-other",
        role: "member",
        joinedAt: new Date(),
      });

      await expect(moveTask("task-1", "ws-1", "user-other", { columnId: "col-2", position: 2000 })).rejects.toThrow(
        "Unauthorized: Only the task creator, assignee, or admin can move this task"
      );
    });
  });

  describe("updateTask", () => {
    it("should reject non-creator from editing priority", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-assignee",
        role: "member",
        joinedAt: new Date(),
      });

      await expect(updateTask("task-1", "ws-1", "user-assignee", { priority: "high" })).rejects.toThrow(
        "Unauthorized: Only admin or task creator can edit priority"
      );
    });

    it("should allow assignee to edit description", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-assignee",
        role: "member",
        joinedAt: new Date(),
      });

      const result = await updateTask("task-1", "ws-1", "user-assignee", { description: "New desc" });
      expect(result).toBeDefined();
    });
  });

  describe("assignTask", () => {
    it("should allow admin to assign task", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-admin",
        role: "admin",
        joinedAt: new Date(),
      });

      const result = await assignTask("task-1", "ws-1", "user-admin", "user-new");
      expect(result).toBeDefined();
    });

    it("should reject member from assigning task if not creator", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-assignee",
        role: "member",
        joinedAt: new Date(),
      });

      await expect(assignTask("task-1", "ws-1", "user-assignee", "user-new")).rejects.toThrow(
        "Unauthorized: Only the task creator or admin can assign this task"
      );
    });
  });

  describe("deleteTask", () => {
    it("should reject member from deleting task if not creator", async () => {
      vi.mocked(membership.verifyWorkspaceEditor).mockResolvedValueOnce({
        workspaceId: "ws-1",
        userId: "user-assignee",
        role: "member",
        joinedAt: new Date(),
      });

      await expect(deleteTask("task-1", "ws-1", "user-assignee")).rejects.toThrow(
        "Unauthorized: Only the task creator or admin can delete this task"
      );
    });
  });
});
