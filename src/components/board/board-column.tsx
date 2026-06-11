"use client";

import React, { useMemo, useState } from "react";
import { Plus, MoreHorizontal } from "lucide-react";
import { useSortable, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BoardTask } from "./board-task";

interface Column {
  id: string;
  name: string;
  position: number;
}

interface Task {
  id: string;
  title: string;
  columnId: string;
  position: number;
  assigneeId?: string | null;
}

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onCreateTask?: (columnId: string, title: string) => void;
}

export function BoardColumn({ column, tasks, onTaskClick, onCreateTask }: BoardColumnProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "Column", column },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const tasksIds = useMemo(() => tasks.map((t) => t.id), [tasks]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && onCreateTask) {
      onCreateTask(column.id, newTaskTitle.trim());
      setNewTaskTitle("");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewTaskTitle("");
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCreateSubmit(e);
    }
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="w-[320px] flex flex-col h-full bg-surface-container-low rounded-xl border-2 border-primary opacity-40 overflow-hidden"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className="w-[320px] flex flex-col h-full bg-surface-container-low rounded-xl border border-border-subtle overflow-hidden shrink-0"
    >
      {/* Column Header */}
      <div 
        {...attributes} 
        {...listeners} 
        className="sticky top-0 bg-surface-container-low/95 backdrop-blur px-4 py-3 border-b border-border-subtle flex items-center justify-between z-10 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <h2 className="font-headline text-body-lg text-on-surface">{column.name}</h2>
          <span className="font-mono-label text-mono-label text-text-muted bg-surface-container px-2 py-0.5 rounded">
            ({tasks.length})
          </span>
        </div>
        <button 
          className="text-text-muted hover:text-on-surface transition-colors cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        <SortableContext items={tasksIds}>
          {tasks.map((task) => (
            <BoardTask key={task.id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {isCreating && (
          <div className="bg-surface border border-primary/50 rounded-lg p-3 shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <textarea
              autoFocus
              className="w-full bg-transparent text-sm text-on-surface outline-none resize-none placeholder:text-text-muted"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              onBlur={() => {
                if (!newTaskTitle.trim()) {
                  setIsCreating(false);
                }
              }}
            />
            <div className="flex items-center justify-end gap-2 mt-2">
              <button 
                onClick={() => { setIsCreating(false); setNewTaskTitle(""); }}
                className="text-xs text-text-muted hover:text-on-surface"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateSubmit}
                className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 font-medium"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
