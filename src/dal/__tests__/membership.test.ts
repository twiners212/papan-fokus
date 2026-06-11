import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyWorkspaceMembership, verifyWorkspaceAdmin } from "../membership";
import { db } from "@/db";

// Mock the db query
vi.mock("@/db", () => {
  return {
    db: {
      query: {
        workspaceMembers: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

describe("DAL Tenant Isolation Guard (verifyWorkspaceMembership)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return member if user is part of the workspace", async () => {
    const mockMember = { workspaceId: "ws-1", userId: "user-1", role: "member" };
    // @ts-ignore
    db.query.workspaceMembers.findFirst.mockResolvedValueOnce(mockMember);

    const result = await verifyWorkspaceMembership("ws-1", "user-1");
    expect(result).toEqual(mockMember);
    expect(db.query.workspaceMembers.findFirst).toHaveBeenCalledTimes(1);
  });

  it("should throw error if user is NOT part of the workspace (Cross-Tenant Access)", async () => {
    // @ts-ignore
    db.query.workspaceMembers.findFirst.mockResolvedValueOnce(null);

    await expect(verifyWorkspaceMembership("ws-1", "user-2")).rejects.toThrow(
      "Unauthorized: User is not a member of this workspace"
    );
  });
});

describe("DAL Role Guard (verifyWorkspaceAdmin)", () => {
  it("should return member if user is admin", async () => {
    const mockMember = { workspaceId: "ws-1", userId: "user-1", role: "admin" };
    // @ts-ignore
    db.query.workspaceMembers.findFirst.mockResolvedValueOnce(mockMember);

    const result = await verifyWorkspaceAdmin("ws-1", "user-1");
    expect(result).toEqual(mockMember);
  });

  it("should throw error if user is only a viewer/member", async () => {
    const mockMember = { workspaceId: "ws-1", userId: "user-1", role: "viewer" };
    // @ts-ignore
    db.query.workspaceMembers.findFirst.mockResolvedValueOnce(mockMember);

    await expect(verifyWorkspaceAdmin("ws-1", "user-1")).rejects.toThrow(
      "Unauthorized: User is not an admin of this workspace"
    );
  });
});
