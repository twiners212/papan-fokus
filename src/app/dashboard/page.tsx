import { getUserWorkspacesAction } from "@/actions/workspace-actions";
import { CreateWorkspaceDialog } from "@/components/dashboard/create-workspace-dialog";
import { LayoutGrid, Users } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Helper to get initials from name
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user) {
    redirect("/login");
  }

  const workspaces = await getUserWorkspacesAction();

  return (
    <div className="flex-1 bg-canvas h-full overflow-y-auto p-4 md:p-8 text-on-surface">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="layout-header flex items-center justify-between border-b border-border-subtle pb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-on-surface">Welcome back, {session.user.name.split(" ")[0]}</h1>
            <p className="text-text-muted mt-1 text-sm md:text-base">Manage your workspaces and projects.</p>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="w-10 h-10 border border-border-subtle shadow-sm">
              <AvatarImage src={session.user.image || `https://i.pravatar.cc/150?u=${session.user.id}`} alt={session.user.name} />
              <AvatarFallback>{getInitials(session.user.name)}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main>
          <div className="flex items-center gap-2 mb-6">
            <LayoutGrid className="w-5 h-5 text-text-muted" />
            <h2 className="text-xl font-headline font-semibold">Your Workspaces</h2>
          </div>

          {workspaces.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 border border-border-subtle rounded-2xl bg-surface-container-low text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center mb-4 border border-border-subtle shadow-sm">
                <LayoutGrid className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-xl font-headline text-on-surface mb-2">No workspaces yet</h3>
              <p className="text-text-muted mb-8 max-w-md text-sm md:text-base">
                You haven't joined any workspaces. Create your first workspace to start collaborating with your team.
              </p>
              <CreateWorkspaceDialog />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <CreateWorkspaceDialog />

              {workspaces.map((ws) => (
                <Link 
                  href={`/${ws.slug}/board`} 
                  key={ws.id}
                  className="group bg-surface-container-low border border-border-subtle hover:border-primary/50 hover:bg-surface-container-high transition-all rounded-xl p-6 h-[160px] flex flex-col justify-between shadow-sm cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {/* Initials Avatar for Workspace */}
                      <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                        {getInitials(ws.name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-on-surface group-hover:text-primary transition-colors line-clamp-1">{ws.name}</h3>
                        <p className="text-xs text-text-muted flex items-center gap-1 mt-1 uppercase tracking-wider">
                          <Users className="w-3 h-3" />
                          {ws.role}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2 mt-4">
                    {ws.description || "No description provided."}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
