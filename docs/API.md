# API Documentation: Server Actions & DAL Contracts - Real-Time Collaborative Project Management (Mini-Jira/Trello)

## 1. Global Standards

**Response Contract (Result Pattern):**

```typescript
type ServerActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

```

**Mutation Execution Flow:** Client UI -> Zod Validation -> Server Action -> DAL (Auth & Logic) -> Database (Drizzle Transaction)

---

## 2. DAL Queries (Read-Only)

| Query | Parameter | Authorization | Business Rules & Response Structure |
| --- | --- | --- | --- |
| `listWorkspaces()` | `session.user.id` (Auto) | Authenticated User | Returns flat list of authorized workspaces. |
| `getBoardData(workspaceId)` | `workspaceId` (UUID/Slug) | Owner, Admin, Member, Viewer | Eager load 1 round-trip: Workspace -> Members -> Columns (ASC) -> Tasks (ASC). **MUST filter `deleted_at IS NULL**`. |

---

## 3. Server Actions (Mutations)

### Domain: Workspace

| Action | Client Payload (Zod) | DAL Authorization | Side Effects & Notes |
| --- | --- | --- | --- |
| `createWorkspace` | `name`, `slug`, `desc` | Auth User | Max 5 per account. Auto-creates Backlog, In Progress, Done columns in one transaction. |
| `updateWorkspace` | `workspaceId`, `name`, `desc` | Admin, Owner | None. |
| `deleteWorkspace` | `workspaceId` | Admin, Owner | Hard Delete (CASCADE). |
| `transferOwnership` | `workspaceId`, `newOwnerId` | Owner | Current Owner becomes Admin. `newOwnerId` becomes Owner. **Rejects if `newOwnerId` is not an active member**. |

### Domain: Membership & Invite Links

| Action | Client Payload (Zod) | DAL Authorization | Side Effects & Notes |
| --- | --- | --- | --- |
| `createInviteLink` | `workspaceId`, `role`, `maxUses` | Admin, Owner | Auto-expires in 24 hours. |
| `joinWorkspaceViaLink` | `token` | Auth User | Max 20 members. **Rejects if already a member**. |
| `removeMember` | `workspaceId`, `targetUserId` | Admin, Owner | Revokes target user session access. |
| `leaveWorkspace` | `workspaceId` | Member, Viewer | Rejects if only 1 member left or if user is Owner. |

### Domain: Columns

| Action | Client Payload (Zod) | DAL Authorization | Side Effects & Notes |
| --- | --- | --- | --- |
| `createColumn` | `workspaceId`, `name` | Admin, Member | Max 10 per board. Appended to the end. |
| `updateColumn` | `workspaceId`, `columnId`, `name` | Admin, Member | None. |
| `moveColumn` | `workspaceId`, `columnId`, `beforeColId`, `afterColId` | Admin, Member | Calculates Fractional Positioning. |
| `deleteColumn` | `workspaceId`, `columnId` | Admin, Member | Rejects if only 1 column left in workspace. Soft-deleted tasks in the column are permanently deleted (CASCADE via application logic). |

### Domain: Tasks (Core Engine)

**Constraint:** All mutations in this domain must execute inside `db.transaction()`.

| Action | Client Payload (Zod) | DAL Authorization | Side Effects & Notes |
| --- | --- | --- | --- |
| `createTask` | `workspaceId`, `columnId`, `title`, `desc` | Admin, Member | Limit: 1000 Tasks per Workspace, 100 Tasks per Column. |
| `updateTask` | `workspaceId`, `taskId`, `title`, `desc` | Admin, Member | None. |
| `moveTask` | `workspaceId`, `taskId`, `targetColumnId`, `beforeTaskId`, `afterTaskId` | Admin, Member | Syncs `workspace_id`. Calculates fractional position. Triggers async rebalance if precision runs low. |
| `assignTask` | `workspaceId`, `taskId`, `assigneeId` | Admin, Member | Max 1 assignee. **Triggers In-App Notification**. |
| `unassignTask` | `workspaceId`, `taskId` | Admin, Member | Sets `assignee_id = NULL`. No notifications triggered. |
| `deleteTask` | `workspaceId`, `taskId` | Admin, Member | Soft Delete (`deleted_at = NOW()`). |
| `restoreTask` | `workspaceId`, `taskId` | Admin, Member | Sets `deleted_at = NULL`. Auto-moves to the first column if original column is deleted. |

---

## 4. Supabase Real-Time Broadcast Events

**Channel Pattern:** `workspace:{workspaceId}`
**Constraint:** Purely for TanStack Query cache invalidation and UI Sync. NO UI toasts allowed.

* **Task Events:** `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_ASSIGNED`, `TASK_UNASSIGNED`, `TASK_DELETED`, `TASK_RESTORED`
* **Column Events:** `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_MOVED`, `COLUMN_DELETED`
* **Membership Events:** `MEMBER_JOINED`, `MEMBER_REMOVED`
* **Workspace Events:** `WORKSPACE_DELETED`

---

## 5. Activity Log Mapping (Strict Enum)

**Constraint:** The internal DAL logger (`insertActivityLog`) must use these exact enums. Excludes `createWorkspace` and `deleteWorkspace` to prevent CASCADE foreign key errors.

* **Tasks:** `TASK_CREATED`, `TASK_UPDATED` (saves fields), `TASK_MOVED` (saves origin/target), `TASK_ASSIGNED`, `TASK_UNASSIGNED`, `TASK_DELETED`, `TASK_RESTORED`
* **Columns:** `COLUMN_CREATED`, `COLUMN_UPDATED`, `COLUMN_MOVED`, `COLUMN_DELETED`
* **Membership:** `WORKSPACE_UPDATED`, `OWNERSHIP_TRANSFERRED`, `MEMBER_JOINED`, `MEMBER_REMOVED`, `MEMBER_LEFT`

---

## 6. Internal Notification Boundary (Anti Scope-Creep)

**Constraint:** Strictly limits in-app notification triggers for the MVP to prevent notification fatigue.

* **ALLOWED TRIGGERS:** `TASK_ASSIGNED` (Sent only to the target `assigneeId`), `INVITED_TO_WORKSPACE` (Sent to the user who just joined via invite link).
* **BLOCKED TRIGGERS:** Task moved, Task updated, Member joined, Column changes, Unassigned task.
