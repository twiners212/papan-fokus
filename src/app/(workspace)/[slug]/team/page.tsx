import { Menu, Shield, User } from "lucide-react";
import { getWorkspaceBySlug } from "@/dal/workspace";
import { getWorkspaceMembersAction } from "@/actions/board-actions";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifyWorkspaceMembership } from "@/dal/membership";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ slug: string }>;
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

  await verifyWorkspaceMembership(workspace.id, session.user.id);
  const members = await getWorkspaceMembersAction(workspace.id);

  return (
    <>
      <header className="h-[56px] flex items-center justify-between px-4 border-b border-border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-30 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Team Members</h1>
        </div>
        <button className="md:hidden p-2 text-text-muted hover:text-on-surface transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h2 className="text-2xl font-semibold text-on-surface mb-2">{workspace.name} Team</h2>
            <p className="text-sm text-text-muted">View all members who have access to this workspace and their roles.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <div key={member.id} className="bg-surface border border-border-subtle rounded-xl p-6 flex flex-col items-center text-center hover:border-outline transition-colors">
                <Avatar className="w-20 h-20 border-2 border-border-subtle mb-4">
                  <AvatarImage src={member.image || `https://i.pravatar.cc/150?u=${member.id}`} alt={member.name} />
                  <AvatarFallback className="text-lg bg-surface-container">{member.name.charAt(0)}</AvatarFallback>
                </Avatar>
                
                <h3 className="text-lg font-medium text-on-surface mb-1">{member.name}</h3>
                <p className="text-xs text-text-muted mb-4 truncate w-full px-2" title={member.email}>{member.email || "No email provided"}</p>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                  member.role === 'admin' 
                    ? 'bg-primary/10 text-primary border border-primary/20' 
                    : 'bg-surface-container text-text-muted border border-border-subtle'
                }`}>
                  {member.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                  <span className="capitalize">{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
