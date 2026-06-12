"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Task {
  id: string;
  title: string;
  columnId: string;
  position: number;
  assigneeId?: string | null;
}

interface BoardTaskProps {
  task: Task;
  isOverlay?: boolean;
  onClick?: (task: Task) => void;
}

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

  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-surface rounded-lg p-3 border-2 border-primary border-dashed opacity-40 h-[100px]"
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
      className={`bg-surface rounded-lg p-3 border border-border-subtle hover:border-outline-variant focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 cursor-grab active:cursor-grabbing group transition-all duration-150 ${isOverlay ? 'shadow-[0_8px_30px_rgb(0,0,0,0.4)] scale-[1.02] z-50 ring-2 ring-primary' : ''}`}
    >
      <div className="flex justify-between items-start gap-2 mb-3">
        {/* We can use short ID later, but for now we just show a static prefix */}
        <span className="font-mono-label text-mono-label text-text-muted">TSK</span>
        <MoreHorizontal className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="font-body-sm text-sm text-on-surface mb-4 leading-snug">
        {task.title}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex gap-2">
          {/* Tags can be added here later */}
        </div>
        {task.assigneeId && (
          <Avatar className="w-6 h-6 border border-surface">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${task.assigneeId}`} alt="Assignee" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}
