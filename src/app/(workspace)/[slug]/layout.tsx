import { AppLayoutWrapper } from "@/components/layout/app-layout-wrapper";
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
    <AppLayoutWrapper dailyActivityCount={dailyActivityCount}>
      {children}
    </AppLayoutWrapper>
  );
}
