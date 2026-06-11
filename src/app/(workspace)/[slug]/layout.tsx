import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { getWorkspaceBySlug } from "@/dal/workspace";
import { getDailyActivitySummary } from "@/dal/analytics";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const workspace = await getWorkspaceBySlug(slug, session.user.id);
  let dailyActivityCount = 0;
  if (workspace) {
    dailyActivityCount = await getDailyActivitySummary(workspace.id);
  }
  
  return (
    <div className="h-screen flex overflow-hidden bg-background text-foreground transition-colors duration-200">
      <DynamicSidebar dailyActivityCount={dailyActivityCount} />
      <main className="flex-1 ml-0 md:ml-64 h-full flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
