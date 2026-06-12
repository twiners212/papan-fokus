"use client";

import Link from "next/link";
import { useRouter, usePathname, useParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { 
  LayoutGrid, 
  Users, 
  BarChart3, 
  Settings, 
  CheckCircle2, 
  LogOut,
  Kanban,
  Globe
} from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";

export function DynamicSidebar({ dailyActivityCount = 0 }: { dailyActivityCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  
  // Mendeteksi apakah kita sedang berada di dalam konteks sebuah workspace
  // dengan mengecek keberadaan `slug` di parameter URL
  const workspaceSlug = params.slug as string | undefined;
  const inWorkspace = !!workspaceSlug;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
      },
    });
  };

  const activePath = pathname.split("/").pop() || "";

  return (
    <aside className="flex h-full w-full flex-col bg-surface text-on-surface transition-colors duration-200">
      {/* AREA ATAS: Selalu Tampil */}
      <div className="p-4 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded bg-canvas flex items-center justify-center shrink-0 overflow-hidden border border-border-subtle transition-colors duration-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Organization Logo"
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuABAiIOtGr4lZMlKhwdxiMEIEljBZXH_ZZ5IRHxJpXy9tyoN4UYFOfBgNiJipjafg6kpBnifACt2o0e5jvghsXJX8H6-Ja3nAu8gKKhTmV5zmbdV9BVhYWlna3iqCeICpBrXYbXuwaUPyAbvGXpssfcBBxDIfuPNYK6kAUEsXDG_-2Rl3rIncCN3lqqOMO1mHjKBPaW4x_1-YNL0c-CtJZGZ6BZ9olKQiIfaOckxrTzQ7754phnh_Ua6IeZHk0btu3RwkQylyW_r8Q0"
            />
          </div>
          <div>
            <h2 className="text-base font-semibold text-on-surface transition-colors duration-200">Acme Corp</h2>
            <p className="text-xs font-mono text-text-muted transition-colors duration-200">Engineering</p>
          </div>
        </div>

        <div className="space-y-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
              pathname === "/dashboard"
                ? "text-on-surface font-semibold bg-surface-container-high shadow-sm"
                : "text-text-muted hover:text-on-surface hover:bg-surface-container-low"
            }`}
          >
            <LayoutGrid className={`w-5 h-5 ${pathname === "/dashboard" ? "fill-current" : ""}`} />
            <span className="text-sm">Dashboard</span>
          </Link>
        </div>
      </div>

      {/* AREA TENGAH: Dinamis khusus Workspace */}
      {inWorkspace && (
        <div className="flex-1 px-4">
          <div className="pt-4 border-t border-border-subtle transition-colors duration-200">
            <p className="px-3 text-xs font-mono text-text-muted mb-2 uppercase tracking-wider transition-colors duration-200">
              {workspaceSlug}
            </p>
            <div className="space-y-1">
              {[
                { name: "Board", icon: Kanban, path: "board" },
                { name: "Team", icon: Users, path: "team" },
                { name: "Analytics", icon: BarChart3, path: "analytics" },
                { name: "Settings", icon: Settings, path: "settings" },
              ].map((item) => {
                const isActive = activePath === item.path || (activePath === workspaceSlug && item.path === "board");
                return (
                  <Link
                    key={item.name}
                    href={`/${workspaceSlug}/${item.path}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                      isActive
                        ? "text-on-surface font-semibold bg-surface-container-high shadow-sm"
                        : "text-text-muted hover:text-on-surface hover:bg-surface-container-low"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? "fill-current text-primary" : ""}`} />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* AREA BAWAH: Didorong ke ujung bawah layar dengan mt-auto */}
      <div className="mt-auto p-4 space-y-4">
        {inWorkspace && (
          <div className="px-3 py-3 bg-surface-container/50 rounded-lg border border-border-subtle transition-colors duration-200">
            <p className="text-xs font-mono text-text-muted mb-1 transition-colors duration-200">Today&apos;s Activity</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-on-surface transition-colors duration-200">{dailyActivityCount} tugas selesai hari ini</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border-subtle space-y-1 transition-colors duration-200">
          <Link
            href="/landing-page"
            className="flex items-center gap-3 px-3 py-2 text-text-muted hover:text-on-surface hover:bg-surface-container-low transition-colors duration-150 rounded-lg"
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm">Landing Page</span>
          </Link>
          <ThemeToggle />
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 text-text-muted hover:text-red-400 hover:bg-surface-container-low transition-colors duration-150 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
