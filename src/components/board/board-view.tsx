"use client";

import React, { useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
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

  // Sync local state when query data changes (e.g. from realtime or mutations)
  React.useEffect(() => {
    setTasks(data.tasks);
  }, [data.tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
    <>
      {/* Presence Header & Actions */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-4">
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
            <Button variant="outline" size="sm" className="gap-2 bg-surface border-border-subtle text-on-surface hover:bg-surface-container-low hover:text-white transition-colors h-8 shadow-md">
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
        <main className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar bg-canvas p-4 pt-16 h-full relative">
          <div className="flex items-start gap-4 h-full min-w-max pb-4">
            <SortableContext items={columnsId}>
              {columns.map(column => (
                <BoardColumn 
                  key={column.id} 
                  column={column} 
                  tasks={tasks.filter(t => t.columnId === column.id)}
                  onTaskClick={setSelectedTask}
                  onCreateTask={handleCreateTask}
                />
              ))}
            </SortableContext>
          </div>
        </main>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeTask ? <BoardTask task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailDrawer 
        task={selectedTask} 
        onClose={() => setSelectedTask(null)} 
        workspaceId={workspaceId} 
        currentUserId={currentUserId}
        userRole={initialData.role}
        columns={columns}
      />
    </>
  );
}
