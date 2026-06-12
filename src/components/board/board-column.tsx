"use client";

import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSortable, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BoardTask } from "./board-task";
import { motion, AnimatePresence } from "framer-motion";

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
  isPending?: boolean;
  pendingTaskTitle?: string;
}

export function BoardColumn({ column, tasks, onTaskClick, onCreateTask, isPending, pendingTaskTitle }: BoardColumnProps) {
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
      className="w-[320px] flex flex-col h-full bg-surface-container-low rounded-xl border border-border-subtle overflow-hidden shrink-0 snap-center md:snap-align-none"
    >
      {/* Column Header */}
      <div 
        {...attributes} 
        {...listeners} 
        className="sticky top-0 bg-surface-container-low/95 backdrop-blur px-4 py-2 md:py-3 border-b border-border-subtle flex items-center justify-between z-10 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-t-xl"
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <h2 className="font-headline text-body-lg text-on-surface">{column.name}</h2>
          <span className="font-mono-label text-mono-label text-text-muted bg-surface-container px-2 py-0.5 rounded">
            ({tasks.length})
          </span>
        </div>
        <button 
          className="w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center text-text-muted hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer rounded-lg"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking button
          onClick={() => setIsCreating(true)}
          aria-label={`Tambah tugas di kolom ${column.name}`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2.5 md:p-3 space-y-2.5 md:space-y-3 custom-scrollbar">
        <SortableContext items={tasksIds}>
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                layout
              >
                <BoardTask task={task} onClick={onTaskClick} />
              </motion.div>
            ))}
            {isPending && (
              <motion.div
                initial={{ opacity: 0, y: -12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface border border-border-subtle rounded-lg p-3 flex flex-col gap-2 shadow-sm animate-pulse"
              >
                <div className="text-sm font-semibold opacity-70 text-on-surface line-clamp-2">
                  {pendingTaskTitle || "Creating task..."}
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-subtle/30">
                  <div className="h-3 bg-[#3f3f46]/10 rounded w-12"></div>
                  <div className="w-5 h-5 rounded-full bg-[#3f3f46]/20"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
