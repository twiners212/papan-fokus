"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpCircle, ArrowDownCircle, ArrowRightCircle, AlertCircle, Calendar, MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Task {
  id: string;
  title: string;
  columnId: string;
  position: number;
  assigneeId?: string | null;
  priority?: string | null;
  dueDate?: Date | string | null;
}

interface BoardTaskProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: (task: Task) => void;
}

const PRIORITIES = {
  low: { icon: ArrowDownCircle, color: "text-blue-500 bg-blue-500/5 border border-blue-500/10" },
  medium: { icon: ArrowRightCircle, color: "text-yellow-500 bg-yellow-500/5 border border-yellow-500/10" },
  high: { icon: ArrowUpCircle, color: "text-orange-500 bg-orange-500/5 border border-orange-500/10" },
  urgent: { icon: AlertCircle, color: "text-red-500 bg-red-500/5 border border-red-500/10" },
};

const isOverdue = (dueDate: Date | string) => {
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const formatDueDate = (dueDate: Date | string) => {
  const date = new Date(dueDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export function BoardTask({ task, isOverlay, onClick }: BoardTaskProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "Task", task },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const priorityInfo = task.priority ? PRIORITIES[task.priority as keyof typeof PRIORITIES] : null;
  const PriorityIcon = priorityInfo?.icon;

  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-surface rounded-lg p-2.5 md:p-3 border-2 border-primary border-dashed opacity-40 h-[90px] md:h-[100px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick && onClick(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onClick && onClick(task);
        }
      }}
      className={`bg-surface rounded-lg p-2.5 md:p-3 border border-border-subtle hover:border-outline-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing group transition-all duration-150 ${isOverlay ? 'shadow-[0_8px_30px_rgb(0,0,0,0.4)] scale-[1.02] z-50 ring-2 ring-primary' : ''}`}
    >
      {/* Top row metadata */}
      <div className="flex justify-between items-center gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-text-muted bg-surface-container/60 px-1 py-0.5 rounded border border-border-subtle shrink-0">
            TSK-{task.id.substring(0, 4)}
          </span>
          {priorityInfo && PriorityIcon && (
            <span className={`inline-flex items-center p-0.5 rounded ${priorityInfo.color}`} title={`Priority: ${task.priority}`}>
              <PriorityIcon className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
        <MoreHorizontal className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
      </div>

      {/* Task title */}
      <p className="font-headline text-sm text-on-surface mb-2 leading-snug line-clamp-2">
        {task.title}
      </p>

      {/* Bottom metadata row */}
      {(task.dueDate || task.assigneeId) && (
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/30">
          <div className="flex items-center gap-1.5">
            {task.dueDate && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${isOverdue(task.dueDate) ? 'text-red-500 bg-red-500/5 border border-red-500/10' : 'text-text-muted bg-surface-container'}`}>
                <Calendar className="w-3 h-3" />
                {formatDueDate(task.dueDate)}
              </span>
            )}
          </div>
          {task.assigneeId && (
            <Avatar className="w-5.5 h-5.5 border border-surface shrink-0">
              <AvatarImage src={`https://i.pravatar.cc/150?u=${task.assigneeId}`} alt="Assignee" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
}
