import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getWorkspaceBySlug } from "@/dal/workspace";
import { calculateVelocity, calculateCycleTime, getTeamWorkload } from "@/dal/analytics";
import { verifyWorkspaceMembership } from "@/dal/membership";
import { Menu, Activity, Timer, Users } from "lucide-react";

export default async function AnalyticsPage({
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

  // Parallel DAL fetching
  const [velocity, cycleTime, workload] = await Promise.all([
    calculateVelocity(workspace.id),
    calculateCycleTime(workspace.id),
    getTeamWorkload(workspace.id)
  ]);

  return (
    <>
      <header className="h-[56px] flex items-center justify-between px-4 border-b border-border-subtle bg-background/80 backdrop-blur-sm sticky top-0 z-30 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-on-surface">Analytics Overview</h1>
        </div>
        <button className="md:hidden p-2 text-text-muted hover:text-on-surface transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cycle Time Card */}
            <div className="bg-surface border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Timer className="w-5 h-5" />
                </div>
                <h2 className="text-base font-medium text-on-surface">Average Cycle Time</h2>
              </div>
              <div className="text-3xl font-semibold text-on-surface">
                {cycleTime.averageCycleTimeHours > 0 ? `${cycleTime.averageCycleTimeHours}h` : 'N/A'}
              </div>
              <p className="text-xs text-text-muted mt-2">Avg time from creation to completion</p>
            </div>

            {/* Velocity Card */}
            <div className="bg-surface border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Activity className="w-5 h-5" />
                </div>
                <h2 className="text-base font-medium text-on-surface">Recent Velocity</h2>
              </div>
              <div className="text-3xl font-semibold text-on-surface">
                {velocity.length > 0 ? velocity[velocity.length - 1].tasksCompleted : 0}
              </div>
              <p className="text-xs text-text-muted mt-2">Tasks completed this week</p>
            </div>

            {/* Workload Card */}
            <div className="bg-surface border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Users className="w-5 h-5" />
                </div>
                <h2 className="text-base font-medium text-on-surface">Team Members Active</h2>
              </div>
              <div className="text-3xl font-semibold text-on-surface">
                {workload.length}
              </div>
              <p className="text-xs text-text-muted mt-2">Members with assigned tasks</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Velocity Trend Skeleton */}
            <div className="bg-surface border border-border-subtle rounded-xl p-6 h-80 flex flex-col">
              <h3 className="text-sm font-medium text-on-surface mb-4">Velocity Trend (Skeleton)</h3>
              <div className="flex-1 border-b border-l border-border-subtle relative">
                {/* Placeholder bars */}
                <div className="absolute bottom-0 left-8 w-12 h-20 bg-surface-container rounded-t-sm"></div>
                <div className="absolute bottom-0 left-28 w-12 h-32 bg-surface-container rounded-t-sm"></div>
                <div className="absolute bottom-0 left-48 w-12 h-48 bg-[#3b82f6]/50 rounded-t-sm"></div>
              </div>
              <div className="flex justify-between px-8 mt-2 text-xs text-text-muted">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
              </div>
            </div>

            {/* Team Workload Breakdown */}
            <div className="bg-surface border border-border-subtle rounded-xl p-6 h-80 flex flex-col">
              <h3 className="text-sm font-medium text-on-surface mb-4">Workload Distribution</h3>
              <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                {workload.length > 0 ? workload.map((w, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-text-muted">
                      {w.assigneeName ? `User: ${w.assigneeName}` : 'Unassigned'}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-surface-container rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[#3b82f6]" 
                          style={{ width: `${Math.min((w.taskCount / 20) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-mono text-on-surface">{w.taskCount}</span>
                    </div>
                  </div>
                )) : (
                  <div className="flex items-center justify-center h-full text-sm text-text-muted">
                    No active workload data
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
