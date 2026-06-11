import { LayoutGrid, Plus } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex-1 bg-canvas min-h-screen p-8 text-on-surface">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Skeleton */}
        <header className="flex items-center justify-between border-b border-border-subtle pb-6">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-surface-container-high rounded-md animate-pulse"></div>
            <div className="h-4 w-72 bg-surface-container rounded-md animate-pulse"></div>
          </div>
          <div className="h-10 w-10 bg-surface-container-high rounded-full animate-pulse"></div>
        </header>

        {/* Content Skeleton */}
        <main>
          <div className="flex items-center gap-2 mb-6">
            <LayoutGrid className="w-5 h-5 text-text-muted" />
            <h2 className="text-xl font-headline font-semibold">Your Workspaces</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create Button Skeleton */}
            <div className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-outline-variant rounded-xl h-[160px]">
              <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-text-muted">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-semibold text-text-muted">Loading...</span>
            </div>

            {/* Cards Skeleton */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-container-low border border-border-subtle rounded-xl p-6 h-[160px] flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-5 w-24 bg-surface-container-high rounded animate-pulse"></div>
                      <div className="h-3 w-12 bg-surface-container rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="h-3 w-full bg-surface-container rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
