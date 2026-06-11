"use client";

import React, { useState } from "react";
import { Plus, LayoutGrid } from "lucide-react";
import { createColumnAction } from "@/actions/column-actions";

export function BoardEmptyState({ workspaceId }: { workspaceId: string }) {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateColumn = async () => {
    setIsCreating(true);
    try {
      await createColumnAction(workspaceId, { name: "To Do", position: 1000 });
      await createColumnAction(workspaceId, { name: "In Progress", position: 2000 });
      await createColumnAction(workspaceId, { name: "Done", position: 3000 });
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-16 h-16 bg-surface-container-high rounded-2xl flex items-center justify-center mb-6 border border-border-subtle shadow-sm">
        <LayoutGrid className="w-8 h-8 text-text-muted" />
      </div>
      <h2 className="text-2xl font-headline text-on-surface mb-2">Welcome to your new Board</h2>
      <p className="text-text-muted text-body-sm max-w-md mb-8">
        Your workspace is completely empty. Start organizing your project by creating some initial columns to track your work.
      </p>
      <button 
        onClick={handleCreateColumn}
        disabled={isCreating}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"
      >
        <Plus className="w-5 h-5" />
        {isCreating ? "Setting up..." : "Generate Default Columns"}
      </button>
    </div>
  );
}
