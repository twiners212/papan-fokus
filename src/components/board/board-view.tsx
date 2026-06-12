"use client";

import React, { useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  MouseSensor, 
  TouchSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { BoardColumn } from "./board-column";
import { BoardTask } from "./board-task";
import { TaskDetailDrawer } from "./task-detail-drawer";
import { getBoardDataAction } from "@/actions/board-actions";
import { moveTaskAction, createNewTaskAction } from "@/actions/task-actions";
import { getMidPosition } from "@/lib/fractional-positioning";
import { useRealtimeBoard } from "@/hooks/use-realtime-board";
import { InviteMemberDialog } from "@/components/workspace/invite-member-dialog";

import { BoardEmptyState } from "./board-empty-state";
import { Progress } from "@/components/ui/progress";

type InitialData = Awaited<ReturnType<typeof getBoardDataAction>>;

export function BoardView({ initialData, currentUserId }: { initialData: InitialData, currentUserId: string }) {
  const queryClient = useQueryClient();
  const workspaceId = initialData.workspace.id;

  const { activeUsers } = useRealtimeBoard(workspaceId, currentUserId);

  const { data } = useQuery({
    queryKey: ["board", workspaceId],
    queryFn: () => getBoardDataAction(initialData.workspace.slug),
    initialData,
  });

  const columns = data.columns;
  const [tasks, setTasks] = useState(data.tasks); // Local state for optimistic UI during drag
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft } = scrollContainerRef.current;
    // Each column is 320px, gap is 16px (stride is 336px)
    const index = Math.round(scrollLeft / 336);
    setActiveColumnIndex(Math.max(0, Math.min(columns.length - 1, index)));
  };

  // Sync local state when query data changes (e.g. from realtime or mutations)
  React.useEffect(() => {
    setTasks(data.tasks);
  }, [data.tasks]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const moveTaskMutation = useMutation({
    mutationFn: (args: { taskId: string; columnId: string; position: number }) => 
      moveTaskAction(args.taskId, workspaceId, { columnId: args.columnId, position: args.position }),
    onError: (error: any) => {
      toast.error("Gagal Memindahkan Task", {
        description: error.message || "Terjadi kesalahan yang tidak diketahui.",
      });
      setTasks(data.tasks); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (args: { columnId: string; title: string }) => {
      const columnTasks = tasks.filter(t => t.columnId === args.columnId);
      const lastTask = columnTasks[columnTasks.length - 1];
      const nextPosition = lastTask ? lastTask.position + 1024 : 1024;
      return createNewTaskAction(workspaceId, {
        title: args.title,
        columnId: args.columnId,
        position: nextPosition
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["board", workspaceId] })
  });

  const handleCreateTask = (columnId: string, title: string) => {
    createTaskMutation.mutate({ columnId, title });
  };

  const columnsId = useMemo(() => columns.map(c => c.id), [columns]);

  function onDragStart(event: DragStartEvent) {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      const isAuthorized = initialData.role === "admin" || task.createdBy === currentUserId || task.assigneeId === currentUserId;
      if (!isAuthorized) {
        toast.error("Akses Ditolak", {
          description: "Hanya pembuat task, assignee, atau Admin yang dapat memindahkan task ini.",
        });
      }
      setActiveTask(task);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === "Task";
    const isOverTask = over.data.current?.type === "Task";
    const isOverColumn = over.data.current?.type === "Column";

    if (!isActiveTask) return;

    // Check Authorization to prevent optimistic visual sorting
    const task = tasks.find(t => t.id === activeId);
    const isAuthorized = initialData.role === "admin" || task?.createdBy === currentUserId || task?.assigneeId === currentUserId;
    if (!isAuthorized) return;

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const overIndex = tasks.findIndex(t => t.id === overId);

        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
          const newTasks = [...tasks];
          newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: tasks[overIndex].columnId };
          return arrayMove(newTasks, activeIndex, overIndex);
        }

        return arrayMove(tasks, activeIndex, overIndex);
      });
    }

    // Dropping a Task over a empty column
    if (isActiveTask && isOverColumn) {
      setTasks(tasks => {
        const activeIndex = tasks.findIndex(t => t.id === activeId);
        const newTasks = [...tasks];
        newTasks[activeIndex] = { ...newTasks[activeIndex], columnId: overId as string };
        return arrayMove(newTasks, activeIndex, activeIndex);
      });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isActiveTask = active.data.current?.type === "Task";
    if (!isActiveTask) return;

    // Find final position based on local state
    const activeIndex = tasks.findIndex(t => t.id === activeId);
    const activeTask = tasks[activeIndex];

    if (!activeTask) return;

    const isAuthorized = initialData.role === "admin" || activeTask.createdBy === currentUserId || activeTask.assigneeId === currentUserId;
    if (!isAuthorized) {
      setTasks(data.tasks); // Snap back to original state
      return;
    }

    const columnTasks = tasks.filter(t => t.columnId === activeTask.columnId);
    const taskInColumnIndex = columnTasks.findIndex(t => t.id === activeId);

    const prevTask = columnTasks[taskInColumnIndex - 1];
    const nextTask = columnTasks[taskInColumnIndex + 1];

    const newPosition = getMidPosition(prevTask?.position, nextTask?.position);

    // Call mutation if moved
    const originalTask = data.tasks.find(t => t.id === activeId);
    if (!originalTask || originalTask.columnId !== activeTask.columnId || originalTask.position !== newPosition) {
      moveTaskMutation.mutate({
        taskId: activeId,
        columnId: activeTask.columnId,
        position: newPosition
      });

      // Update local state completely
      setTasks(prev => {
        const nt = [...prev];
        const idx = nt.findIndex(t => t.id === activeId);
        nt[idx] = { ...nt[idx], position: newPosition };
        return nt;
      });
    }
  }

  const dropAnimation = {
    duration: 250,
    easing: "cubic-bezier(0.18, 0.89, 0.32, 1.28)", // Premium bouncy tactile curve
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } })
  };

  const dndId = React.useId();

  if (columns.length === 0) {
    return <BoardEmptyState workspaceId={workspaceId} />;
  }

  const doneColumn = columns.find(c => c.name.toLowerCase() === "done" || c.name.toLowerCase() === "selesai");
  const totalTasks = tasks.length;
  const doneTasks = doneColumn ? tasks.filter(t => t.columnId === doneColumn.id).length : 0;
  const progressValue = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  return (
    <div className="flex-grow flex flex-col h-full overflow-hidden relative">
      {/* Presence Header & Actions */}
      <div className="absolute top-2 md:top-4 right-4 z-20 flex items-center gap-2 md:gap-4">
        {/* Progress Bar Widget */}
        <div className="hidden sm:flex flex-col gap-1.5 w-32 md:w-48 bg-surface-container/80 backdrop-blur-sm p-2 rounded-lg border border-border-subtle shadow-sm">
          <div className="flex justify-between items-center text-xs text-text-muted font-medium">
            <span>Progress</span>
            <span>{Math.round(progressValue)}%</span>
          </div>
          <Progress value={progressValue} className="h-1.5" />
        </div>

        <div className="flex -space-x-2">
          {activeUsers.map((user) => (
            <Avatar key={user.userId} className="w-8 h-8 border-2 border-canvas shadow-sm ring-2 ring-accent/20 transition-all hover:z-10 hover:scale-110">
              <AvatarImage src={`https://i.pravatar.cc/150?u=${user.userId}`} alt="Online User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
          ))}
        </div>
        
        {initialData.role === "admin" && (
          <InviteMemberDialog workspaceId={workspaceId}>
            <Button variant="outline" size="sm" className="gap-2 bg-surface border-border-subtle text-on-surface hover:bg-surface-container-low hover:text-white transition-colors h-11 sm:h-8 px-4 sm:px-3 shadow-md" aria-label="Undang Tim">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Undang Tim</span>
            </Button>
          </InviteMemberDialog>
        )}
      </div>

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <main 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-grow overflow-x-auto overflow-y-hidden no-scrollbar bg-canvas p-4 pt-12 md:pt-16 h-full relative snap-x snap-mandatory scroll-smooth"
        >
          <div className="flex items-start gap-4 h-full min-w-max pb-4">
            <SortableContext items={columnsId}>
              {columns.map(column => {
                const isPending = createTaskMutation.isPending && createTaskMutation.variables?.columnId === column.id;
                return (
                  <BoardColumn 
                    key={column.id} 
                    column={column} 
                    tasks={tasks.filter(t => t.columnId === column.id)}
                    onTaskClick={setSelectedTask}
                    onCreateTask={handleCreateTask}
                    isPending={isPending}
                    pendingTaskTitle={createTaskMutation.variables?.title}
                  />
                );
              })}
            </SortableContext>
          </div>
        </main>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? <BoardTask task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Mobile Page Indicator Dots */}
      {columns.length > 0 && (
        <div className="flex md:hidden justify-center items-center py-1 bg-canvas border-t border-border-subtle shrink-0">
          {columns.map((col, idx) => (
            <button
              key={col.id}
              onClick={() => {
                if (scrollContainerRef.current) {
                  const cols = scrollContainerRef.current.querySelectorAll(".snap-center");
                  const targetCol = cols[idx];
                  if (targetCol) {
                    targetCol.scrollIntoView({
                      behavior: "smooth",
                      block: "nearest",
                      inline: "center",
                    });
                  }
                }
              }}
              className="w-11 h-11 flex items-center justify-center cursor-pointer focus-visible:outline-none"
              aria-label={`Pindah ke kolom ${col.name}`}
            >
              <span
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === activeColumnIndex 
                    ? "w-6 bg-primary" 
                    : "w-1.5 bg-text-muted/30"
                }`}
              />
            </button>
          ))}
        </div>
      )}

      <TaskDetailDrawer 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
        workspaceId={workspaceId} 
        currentUserId={currentUserId}
        userRole={initialData.role}
        columns={columns}
      />
    </div>
  );
}
