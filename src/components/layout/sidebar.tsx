"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { 
  LayoutGrid, 
  FolderTree, 
  CheckCircle2, 
  Users, 
  BarChart3, 
  Settings, 
  Kanban,
  LogOut
} from "lucide-react";

export function Sidebar({ currentSlug, dailyActivityCount = 0 }: { currentSlug: string; dailyActivityCount?: number }) {
  const router = useRouter();
  const pathname = usePathname();

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

  // Compute active path dynamically based on current URL
  const activePath = pathname.split("/").pop() || "dashboard";

  const mainNav = [
    { name: "Dashboard", icon: LayoutGrid, path: "dashboard" },
    { name: "Projects", icon: FolderTree, path: "projects" },
    { name: "Tasks", icon: CheckCircle2, path: "tasks" },
    { name: "Board", icon: Kanban, path: "board" },
    { name: "Team", icon: Users, path: "team" },
    { name: "Analytics", icon: BarChart3, path: "analytics" },
    { name: "Settings", icon: Settings, path: "settings" },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-[240px] flex-col p-4 z-40 bg-[#201f20] dark:bg-[#201f20] border-r border-[#3f3f46] hidden md:flex">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 rounded bg-[#18181b] flex items-center justify-center shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Organization Logo"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuABAiIOtGr4lZMlKhwdxiMEIEljBZXH_ZZ5IRHxJpXy9tyoN4UYFOfBgNiJipjafg6kpBnifACt2o0e5jvghsXJX8H6-Ja3nAu8gKKhTmV5zmbdV9BVhYWlna3iqCeICpBrXYbXuwaUPyAbvGXpssfcBBxDIfuPNYK6kAUEsXDG_-2Rl3rIncCN3lqqOMO1mHjKBPaW4x_1-YNL0c-CtJZGZ6BZ9olKQiIfaOckxrTzQ7754phnh_Ua6IeZHk0btu3RwkQylyW_r8Q0"
          />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#e5e2e1]">Acme Corp</h2>
          <p className="text-xs font-mono text-[#a1a1aa]">Engineering</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 space-y-1">
        {mainNav.map((item) => {
          const isActive = activePath === item.path;
          const href = item.path === "dashboard" ? "/dashboard" : `/${currentSlug}/${item.path}`;
          return (
            <Link
              key={item.name}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                isActive
                  ? "text-[#e5e2e1] font-semibold bg-[#47464a] scale-95"
                  : "text-[#a1a1aa] hover:text-[#c8c5cb] hover:bg-[#2b2a2a]"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>



      {/* Footer Navigation */}
      <div className="space-y-4 pt-4 border-t border-[#3f3f46]">
        
        {/* Daily Activity Widget */}
        <div className="px-3 py-3 bg-[#353435]/50 rounded-lg border border-[#3f3f46]">
          <p className="text-xs font-mono text-[#a1a1aa] mb-1">Today&apos;s Activity</p>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#3b82f6]" />
            <span className="text-sm font-medium text-[#e5e2e1]">{dailyActivityCount} tugas selesai hari ini</span>
          </div>
        </div>

        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-[#a1a1aa] hover:text-[#c8c5cb] hover:bg-[#2b2a2a] transition-colors duration-150 rounded-lg"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </nav>
  );
}
