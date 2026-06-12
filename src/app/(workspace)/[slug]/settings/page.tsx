import { Menu } from "lucide-react";
import { SettingsClient } from "@/components/workspace/settings-client";
import { getWorkspaceBySlug } from "@/dal/workspace";
import { getWorkspaceMembersAction } from "@/actions/board-actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyWorkspaceMembership } from "@/dal/membership";

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  
  const workspace = await getWorkspaceBySlug(slug, session.user.id);
  if (!workspace) {
    notFound();
  }

  const member = await verifyWorkspaceMembership(workspace.id, session.user.id);
  const members = await getWorkspaceMembersAction(workspace.id);

  return (
    <>
      {/* Header */}
      <header className="layout-header h-[56px] flex items-center justify-between px-4 border-b border-border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-30 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Workspace Settings</h1>
        </div>
        {/* Mobile Menu Toggle */}
        <button className="md:hidden p-2 text-text-muted hover:text-on-surface transition-colors" aria-label="Buka menu navigasi">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Settings Layout & Interactive Client Component */}
      <div className="flex-1 overflow-y-auto">
        <SettingsClient 
          workspace={workspace} 
          currentUserRole={member.role} 
          members={members} 
          user={{ id: session.user.id, name: session.user.name, image: session.user.image }}
        />
      </div>
    </>
  );
}
