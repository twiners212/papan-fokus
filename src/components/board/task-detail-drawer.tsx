"use client";

import React, { useState, useEffect } from "react";
import { MoreHorizontal, Activity, CircleUserRound, Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWorkspaceMembersAction, updateTaskAction, getTaskActivityLogsAction } from "@/actions/board-actions";
import { deleteTaskAction } from "@/actions/task-actions";
import { format } from "date-fns";

// Shadcn Components
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface Task {
  id: string;
  title: string;
  columnId: string;
  position: number;
  assigneeId?: string | null;
  description?: string | null;
  priority?: string;
  dueDate?: Date | string | null;
  createdBy: string;
}

interface TaskDetailDrawerProps {
  task: Task | null;
  onClose: () => void;
  workspaceId: string;
  currentUserId: string;
  userRole: string;
  columns: { id: string; name: string }[];
}

const PRIORITIES = [
  { value: "low", label: "Low", icon: ArrowDownCircle, color: "text-blue-500" },
  { value: "medium", label: "Medium", icon: ArrowRightCircle, color: "text-yellow-500" },
  { value: "high", label: "High", icon: ArrowUpCircle, color: "text-orange-500" },
  { value: "urgent", label: "Urgent", icon: AlertCircle, color: "text-red-500" },
];

export function TaskDetailDrawer({ task, onClose, workspaceId, currentUserId, userRole, columns }: TaskDetailDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Local state for optimistic UI edits
  const [localTitle, setLocalTitle] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localPriority, setLocalPriority] = useState("medium");
  const [localDueDate, setLocalDueDate] = useState<string>("");
  const [localAssignee, setLocalAssignee] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    if (task) {
      setIsOpen(true);
      setLocalTitle(task.title || "");
      setLocalDesc(task.description || "");
      setLocalPriority(task.priority || "medium");
      setLocalAssignee(task.assigneeId || "");
      if (task.dueDate) {
        const d = new Date(task.dueDate);
        setLocalDueDate(d.toISOString().split("T")[0]);
      } else {
        setLocalDueDate("");
      }
      setPage(1);
      setShowMenu(false);
    } else {
      setIsOpen(false);
    }
  }, [task]);

  const { data: members = [] } = useQuery({
    queryKey: ["workspaceMembers", workspaceId],
    queryFn: () => getWorkspaceMembersAction(workspaceId),
    enabled: !!task,
  });

  const { data: logsData } = useQuery({
    queryKey: ["taskLogs", task?.id, page],
    queryFn: () => getTaskActivityLogsAction(task!.id, workspaceId, page, limit),
    enabled: !!task,
  });

  const logs = logsData?.data || [];
  const totalPages = logsData?.totalPages || 1;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  const updateMutation = useMutation({
    mutationFn: (payload: any) => {
      if (!task) throw new Error("No task");
      return updateTaskAction(task.id, workspaceId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (!task) throw new Error("No task");
      return deleteTaskAction(task.id, workspaceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
      handleClose();
    }
  });

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for transition if needed, though Sheet handles it mostly
  };

  const handleChange = (field: string, value: any) => {
    if (!task) return;
    
    const payload: any = {};
    if (field === "title") {
      setLocalTitle(value);
      payload.title = value;
    } else if (field === "description") {
      setLocalDesc(value);
      payload.description = value;
    } else if (field === "priority") {
      setLocalPriority(value);
      payload.priority = value;
    } else if (field === "assigneeId") {
      setLocalAssignee(value);
      payload.assigneeId = value || null;
    } else if (field === "dueDate") {
      setLocalDueDate(value);
      payload.dueDate = value ? new Date(value) : null;
    }

    updateMutation.mutate(payload);
  };

  // Don't unmount early so animations work
  if (!task && !isOpen) return null;

  const currentPriority = PRIORITIES.find(p => p.value === localPriority) || PRIORITIES[1];
  const currentAssigneeObj = members.find((m: any) => m.id === localAssignee);

  const isAdmin = userRole === "admin";
  const isCreator = task?.createdBy === currentUserId;
  const isAssignee = task?.assigneeId === currentUserId;

  const canEditDescription = isAdmin || isCreator || isAssignee;
  const canEditPriority = isAdmin || isCreator;
  const canEditDueDate = isAdmin || isCreator;
  const canEditAssignee = isAdmin || isCreator;

  const currentColumn = columns.find(c => c.id === task?.columnId);
  const statusName = currentColumn ? currentColumn.name : "In Progress";

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <SheetContent 
        className="w-full sm:w-[480px] lg:w-[600px] sm:max-w-none bg-surface-container border-l border-border-subtle p-0 flex flex-col focus-visible:outline-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Task Details</SheetTitle>
          <SheetDescription>View and edit task details</SheetDescription>
        </SheetHeader>

        {/* Drawer Header */}
        <header className="flex-shrink-0 px-6 py-5 border-b border-border-subtle flex items-start justify-between bg-surface-container sticky top-0 z-10">
          <div className="flex-1 pr-8">
            <div className="flex items-center gap-2 mb-2 text-text-muted font-mono-label text-mono-label text-xs">
              <span className="bg-surface-container-high px-1.5 py-0.5 rounded border border-border-subtle">
                TSK-{task?.id.substring(0, 4)}
              </span>
            </div>
            <input 
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={(e) => handleChange("title", e.target.value)}
              className="w-full bg-transparent font-headline text-[24px] text-on-surface leading-tight focus:outline-none focus:ring-2 focus:ring-accent/50 rounded-sm"
              placeholder="Task title"
            />
          </div>
          <div className="flex items-center gap-1 mt-1">
            {(isAdmin || isCreator) && (
              <Popover open={showMenu} onOpenChange={setShowMenu}>
                <PopoverTrigger asChild>
                  <button 
                    className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded hover:bg-surface-container-high text-text-muted hover:text-on-surface transition-colors"
                    aria-label="More options"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1 bg-surface border border-border-subtle shadow-lg rounded-md" align="end">
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      if (confirm("Are you sure you want to delete this task?")) {
                        deleteMutation.mutate();
                      }
                    }}
                    className="w-full text-left px-4 py-3 sm:py-2 text-sm text-red-500 hover:bg-surface-container-low transition-colors font-medium rounded-sm"
                  >
                    Delete Task
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </header>

        {/* Drawer Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6 pb-24 custom-scrollbar">
          {/* Metadata Grid (Bento Style) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            
            {/* Status */}
            <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3 hover:border-outline-variant transition-colors group">
              <span className="text-[11px] font-label-caps uppercase tracking-wider text-text-muted block mb-1">Status</span>
              <div className="flex items-center gap-2 h-6">
                <Activity className="w-4 h-4 text-accent" />
                <span className="font-body-sm text-sm font-medium text-on-surface group-hover:text-accent transition-colors">
                  {statusName}
                </span>
              </div>
            </div>

            {/* Assignee */}
            <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3 hover:border-outline-variant transition-colors group">
              <span className="text-[11px] font-label-caps uppercase tracking-wider text-text-muted block mb-1">Assignee</span>
              <Select 
                value={localAssignee || "unassigned"} 
                onValueChange={(v) => handleChange("assigneeId", v === "unassigned" ? "" : v)}
                disabled={!canEditAssignee}
              >
                <SelectTrigger className="border-0 bg-transparent p-0 h-6 w-full flex items-center gap-2 focus:ring-0 focus:ring-offset-0 shadow-none hover:bg-transparent">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {currentAssigneeObj ? (
                      <Avatar className="w-5 h-5 shrink-0">
                        <AvatarImage src={currentAssigneeObj.image || `https://i.pravatar.cc/150?u=${currentAssigneeObj.id}`} alt="Assignee" />
                        <AvatarFallback>{currentAssigneeObj.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <CircleUserRound className="w-4 h-4 text-text-muted shrink-0" />
                    )}
                    <span className="font-body-sm text-sm font-medium text-on-surface truncate">
                      {currentAssigneeObj ? currentAssigneeObj.name : "Unassigned"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {members.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3 hover:border-outline-variant transition-colors group">
              <span className="text-[11px] font-label-caps uppercase tracking-wider text-text-muted block mb-1">Priority</span>
              <Select 
                value={localPriority} 
                onValueChange={(v) => handleChange("priority", v)}
                disabled={!canEditPriority}
              >
                <SelectTrigger className="border-0 bg-transparent p-0 h-6 w-full flex items-center gap-2 focus:ring-0 focus:ring-offset-0 shadow-none hover:bg-transparent">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <currentPriority.icon className={`w-4 h-4 shrink-0 ${currentPriority.color}`} />
                    <span className="font-body-sm text-sm font-medium text-on-surface truncate">{currentPriority.label}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <div className="flex items-center gap-2">
                        <p.icon className={`w-4 h-4 ${p.color}`} />
                        <span>{p.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3 hover:border-outline-variant transition-colors group">
              <span className="text-[11px] font-label-caps uppercase tracking-wider text-text-muted block mb-1">Due Date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <button 
                    disabled={!canEditDueDate} 
                    className="w-full flex items-center gap-2 text-left disabled:opacity-50 disabled:cursor-not-allowed h-6"
                  >
                    <CalendarIcon className="w-4 h-4 text-text-muted shrink-0" />
                    <span className={`font-body-sm text-sm font-medium truncate ${localDueDate ? 'text-on-surface' : 'text-text-muted'}`}>
                      {localDueDate ? format(new Date(localDueDate), "PP") : "No date"}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-surface border-border-subtle text-on-surface" align="start">
                  <Calendar
                    mode="single"
                    selected={localDueDate ? new Date(localDueDate) : undefined}
                    onSelect={(d) => {
                      if (d) {
                        const dateStr = d.toLocaleDateString('en-CA');
                        handleChange("dueDate", dateStr);
                      } else {
                        handleChange("dueDate", "");
                      }
                    }}
                    disabled={(date) => {
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      return date < today;
                    }}
                    initialFocus
                    className="bg-surface-container"
                  />
                </PopoverContent>
              </Popover>
            </div>

          </div>

          {/* Description */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline text-[16px] text-on-surface">Description</h3>
            </div>
            <textarea 
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
              onBlur={(e) => handleChange("description", e.target.value)}
              disabled={!canEditDescription}
              className={`w-full bg-surface-container-low border border-border-subtle rounded-lg p-3 text-text-muted font-body-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent/50 resize-y min-h-[120px] ${!canEditDescription ? 'opacity-70 cursor-not-allowed' : ''}`}
              placeholder={canEditDescription ? "Add a more detailed description..." : "No description provided."}
            />
          </div>

          <hr className="border-border-subtle my-8" />

          {/* Activity Tabs */}
          <div className="mb-6">
            <div className="flex gap-6 border-b border-border-subtle mb-4">
              <button className="pb-2 text-primary border-b-2 border-primary font-headline text-[14px]">Activity Log</button>
            </div>

            <div className="space-y-6">
              {logs.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center border border-dashed border-border-subtle rounded-lg bg-surface-container-low/50">
                  <Activity className="w-8 h-8 text-text-muted/30 mb-3" />
                  <p className="text-sm font-medium text-on-surface mb-1">No activity yet</p>
                  <p className="text-xs text-text-muted">Updates to this task will appear here.</p>
                </div>
              ) : (
                logs.map((log: any) => {
                  let actionText = "";
                  if (log.actionType === "TASK_CREATED") actionText = "created this task";
                  else if (log.actionType === "TASK_MOVED") actionText = "moved this task";
                  else if (log.actionType === "TASK_UPDATED") {
                    const keys = Object.keys(log.details || {});
                    if (keys.includes("title")) actionText = "updated the title";
                    else if (keys.includes("description")) actionText = "updated the description";
                    else if (keys.includes("priority")) actionText = `changed priority to ${log.details.priority}`;
                    else if (keys.includes("dueDate")) actionText = "updated the due date";
                    else actionText = "updated this task";
                  }
                  else if (log.actionType === "TASK_ASSIGNED") actionText = "assigned this task";
                  else if (log.actionType === "TASK_UNASSIGNED") actionText = "unassigned this task";
                  else if (log.actionType === "TASK_DELETED") actionText = "deleted this task";
                  else if (log.actionType === "TASK_RESTORED") actionText = "restored this task";
                  else actionText = "performed an action";

                  return (
                    <div key={log.id} className="flex items-start gap-3 py-1">
                      <div className="w-8 flex justify-center shrink-0">
                        {log.actor?.image ? (
                          <Avatar className="w-6 h-6 border border-border-subtle">
                            <AvatarImage src={log.actor.image} alt={log.actor.name} />
                            <AvatarFallback>{log.actor.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center border border-border-subtle">
                            <Activity className="w-3 h-3 text-text-muted" />
                          </div>
                        )}
                      </div>
                      <div className="font-body-sm text-[13px] text-text-muted flex-1 pt-0.5">
                        <span className="font-medium text-on-surface mr-1">{log.actor?.name || "System"}</span> 
                        {actionText}
                        {log.actionType === "TASK_UPDATED" && log.details?.description !== undefined && (
                          <div className="mt-2 mb-1 p-2 bg-surface-container-high border-l-2 border-primary/50 text-text-muted italic text-xs rounded-r">
                            "{log.details.description}"
                          </div>
                        )}
                        <span className="block mt-1 text-[11px] text-text-muted/70">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 border-t border-border-subtle pt-4">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={!hasPrevPage}
                  className="px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded border border-border-subtle disabled:opacity-50 hover:bg-surface-container-low text-text-muted transition-colors"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">Page {page} of {totalPages}</span>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={!hasNextPage}
                  className="px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-medium rounded border border-border-subtle disabled:opacity-50 hover:bg-surface-container-low text-text-muted transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
