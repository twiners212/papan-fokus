"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { DynamicSidebar } from "./dynamic-sidebar";

export function AppLayoutWrapper({
  children,
  dailyActivityCount,
}: {
  children: React.ReactNode;
  dailyActivityCount?: number;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setTimeout(() => setIsMounted(true), 0);
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollapsed(saved === "true");
    }

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close mobile sidebar drawer automatically on route/pathname change
  useEffect(() => {
    setTimeout(() => setIsMobileOpen(false), 0);
  }, [pathname]);

  const toggleSidebar = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", String(nextState));
  };

  // Pre-hydration rendering matching SSR to prevent layout shifting
  if (!isMounted) {
    return (
      <div className="h-screen flex overflow-hidden bg-background text-foreground">
        <div className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col bg-surface border-r border-border-subtle z-40">
          <DynamicSidebar dailyActivityCount={dailyActivityCount} />
        </div>
        <main className="flex-1 ml-0 md:ml-64 h-full flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-background text-foreground transition-colors duration-200">
      {/* Mobile Top Bar */}
      {isMobile && (
        <header className="flex md:hidden items-center justify-between px-4 py-3 bg-surface border-b border-border-subtle z-30 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 rounded-lg hover:bg-surface-container text-text-muted hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-headline font-bold text-base text-on-surface">PapanFokus</span>
          </div>
        </header>
      )}

      {/* Slide-over Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop overlay */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMobileOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              className="relative flex w-full max-w-[280px] flex-col bg-surface border-r border-border-subtle h-full z-10"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
            >
              <DynamicSidebar dailyActivityCount={dailyActivityCount} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Animated Sidebar Container (Desktop only) */}
      {!isMobile && (
        <motion.div
          className="hidden md:block fixed left-0 top-0 h-screen z-40 bg-surface border-r border-border-subtle overflow-hidden"
          animate={{ width: isCollapsed ? 0 : 256 }}
          transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
        >
          <div style={{ width: 256 }} className="h-full">
            <DynamicSidebar dailyActivityCount={dailyActivityCount} />
          </div>
        </motion.div>
      )}

      {/* Main Content Layout with animated margin */}
      <motion.main
        className="flex-1 h-full flex flex-col overflow-hidden relative"
        data-sidebar-collapsed={isCollapsed}
        animate={{ paddingLeft: isMobile ? 0 : (isCollapsed ? 0 : 256) }}
        transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
      >
        {/* Toggle Button (Desktop only) */}
        {!isMobile && (
          <button
            onClick={toggleSidebar}
            className="hidden md:flex fixed top-4 left-4 z-50 p-1.5 rounded-lg bg-surface border border-border-subtle hover:bg-surface-container text-text-muted hover:text-on-surface shadow-sm cursor-pointer transition-all duration-200"
            style={{
              transform: isCollapsed ? "translateX(0)" : "translateX(196px)",
              transition: "transform 0.2s ease-in-out",
            }}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Buka navigasi samping" : "Tutup navigasi samping"}
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        )}

        {children}
      </motion.main>
    </div>
  );
}
