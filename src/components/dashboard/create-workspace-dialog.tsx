"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWorkspaceAction } from "@/actions/workspace-actions";
import { Plus } from "lucide-react";

export function CreateWorkspaceDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Simple slug generator from name
  const generateSlug = (str: string) => {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }

    setIsLoading(true);
    const slug = generateSlug(name);
    
    try {
      await createWorkspaceAction({ name, description, slug });
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/${slug}/board`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create workspace. The slug might already be taken.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="group flex flex-col items-center justify-center gap-3 border-2 border-primary/30 hover:border-primary bg-primary/5 hover:bg-primary/10 transition-all duration-300 rounded-xl h-[160px] cursor-pointer shadow-sm hover:shadow-md w-full">
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-110 group-active:scale-95 transition-transform duration-300">
          <Plus className="w-6 h-6" />
        </div>
        <span className="font-semibold text-primary text-base">Create Workspace</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] p-0 gap-0 overflow-hidden bg-surface border-border-subtle text-on-surface">
        <DialogHeader className="pt-6 px-6">
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription className="text-text-muted">
            Set up a new workspace for your team to collaborate in.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col pt-4">
          <div className="space-y-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                placeholder="e.g. Engineering Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-container-low border-border-subtle"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g. For our primary product development"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-surface-container-low border-border-subtle"
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-text-muted text-xs">Generated URL Slug</Label>
              <div className="text-sm font-mono text-text-muted bg-surface-container px-3 py-2 rounded-md">
                /{name ? generateSlug(name) : "workspace-slug"}/board
              </div>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
          </div>
          
          <DialogFooter className="mx-0 mb-0 bg-surface-container/50 px-6 py-4 border-t border-border-subtle mt-6 flex sm:justify-end gap-2 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="border-border-subtle text-on-surface hover:bg-surface-container-low"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isLoading ? "Creating..." : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
