"use client";

import React, { useState } from "react";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { createColumnAction } from "@/actions/column-actions";
import { generateDummyDataAction } from "@/actions/workspace-actions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

export function BoardEmptyState({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  if (isCreating || isSeeding) {
    return (
      <div className="flex-1 flex flex-col h-full bg-canvas text-on-surface p-4 pt-16 relative overflow-hidden animate-in fade-in duration-300">
        {/* Loading Header */}
        <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center bg-surface-container-low/85 backdrop-blur-md px-4 py-3 rounded-xl border border-border-subtle shadow-md">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
            <div>
              <h2 className="font-headline font-semibold text-sm sm:text-base text-on-surface">
                {isSeeding ? "Menghasilkan Data Demonstrasi..." : "Membuat Kolom Default..."}
              </h2>
              <p className="text-xs text-text-muted">Harap tunggu sebentar, sedang menyiapkan workspace Anda.</p>
            </div>
          </div>
          <div className="w-24 sm:w-48 h-1.5 bg-surface-container/60 rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute top-0 bottom-0 bg-primary rounded-full w-1/2"
              initial={{ left: "-50%" }}
              animate={{ left: "100%" }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            />
          </div>
        </div>

        {/* Columns Skeleton */}
        <div className="flex items-start gap-4 h-full min-w-max pb-4 mt-6">
          {[1, 2, 3].map((colIndex) => (
            <div
              key={colIndex}
              className="w-[320px] flex flex-col h-full bg-surface-container-low rounded-xl border border-border-subtle overflow-hidden shrink-0 animate-pulse"
            >
              {/* Column Header Skeleton */}
              <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#3f3f46]/30"></div>
                  <div className="h-4 bg-[#3f3f46]/30 rounded w-20"></div>
                  <div className="h-4 bg-[#3f3f46]/25 rounded w-8"></div>
                </div>
                <div className="w-5 h-5 rounded-full bg-[#3f3f46]/20"></div>
              </div>

              {/* Task Cards Skeletons */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {[1, 2, 3].map((cardIndex) => (
                  <div
                    key={cardIndex}
                    className="bg-surface rounded-lg p-3 border border-border-subtle flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-3 bg-[#3f3f46]/25 rounded w-10"></div>
                      <div className="h-3 bg-[#3f3f46]/20 rounded w-4"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-[#3f3f46]/20 rounded w-full"></div>
                      <div className="h-4 bg-[#3f3f46]/20 rounded w-2/3"></div>
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-subtle/30">
                      <div className="h-4 bg-[#3f3f46]/15 rounded w-12"></div>
                      <div className="w-6 h-6 rounded-full bg-[#3f3f46]/25"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleCreateDefaultColumns = async () => {
    setIsCreating(true);
    try {
      await createColumnAction(workspaceId, { name: "To Do", position: 1000 });
      await createColumnAction(workspaceId, { name: "In Progress", position: 2000 });
      await createColumnAction(workspaceId, { name: "Done", position: 3000 });
      toast.success("Default columns generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to create columns");
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateDummyData = async () => {
    setIsSeeding(true);
    try {
      await generateDummyDataAction(workspaceId);
      toast.success("Workspace populated with dummy data successfully!");
      queryClient.invalidateQueries({ queryKey: ["board", workspaceId] });
    } catch (error: unknown) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to seed dummy data");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-center p-8 bg-canvas text-on-surface">
      <div className="w-full max-w-lg flex flex-col items-center justify-center">
        {/* Interactive SVG Kanban Mockup Illustration with hover micro-interactions */}
        <div className="relative w-80 h-48 mb-8 group pointer-events-auto" aria-hidden="true">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-[#c8c5ca]/5 rounded-2xl blur-xl group-hover:bg-[#c8c5ca]/10 transition-all duration-500"></div>

          <svg
            className="w-full h-full text-[#3f3f46]/50 transition-all duration-300"
            viewBox="0 0 320 192"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background Board Frame */}
            <rect x="8" y="8" width="304" height="176" rx="12" fill="#141314" stroke="#2c2b2c" strokeWidth="2" />
            
            {/* Column Outline 1 */}
            <rect x="20" y="24" width="84" height="144" rx="8" fill="#1c1b1c" fillOpacity="0.4" stroke="#2c2b2c" strokeWidth="1" />
            <rect x="28" y="32" width="40" height="6" rx="3" fill="#3f3f46" />
            
            {/* Column Outline 2 */}
            <rect x="118" y="24" width="84" height="144" rx="8" fill="#1c1b1c" fillOpacity="0.4" stroke="#2c2b2c" strokeWidth="1" />
            <rect x="126" y="32" width="50" height="6" rx="3" fill="#3f3f46" />
            
            {/* Column Outline 3 */}
            <rect x="216" y="24" width="84" height="144" rx="8" fill="#1c1b1c" fillOpacity="0.4" stroke="#2c2b2c" strokeWidth="1" />
            <rect x="224" y="32" width="30" height="6" rx="3" fill="#3f3f46" />
            
            {/* Task Card 1 (Column 1) */}
            <g className="transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-0.5">
              <rect x="26" y="48" width="72" height="32" rx="6" fill="#201f20" stroke="#3f3f46" strokeWidth="1" className="group-hover:stroke-[#c8c5ca] transition-colors" />
              <rect x="34" y="56" width="56" height="4" rx="2" fill="#a1a1aa" />
              <rect x="34" y="66" width="30" height="3" rx="1.5" fill="#3f3f46" />
              <circle cx="88" cy="68" r="4" fill="#c8c5ca" />
            </g>

            {/* Task Card 2 (Column 1) */}
            <g className="transition-transform duration-300 group-hover:translate-y-1">
              <rect x="26" y="88" width="72" height="28" rx="6" fill="#201f20" stroke="#2c2b2c" strokeWidth="1" />
              <rect x="34" y="96" width="45" height="4" rx="2" fill="#a1a1aa" />
              <rect x="34" y="106" width="20" height="3" rx="1.5" fill="#3f3f46" />
            </g>

            {/* Task Card 3 (Column 2) - Simulates a drag-and-drop animation on hover */}
            <g className="transition-all duration-700 ease-in-out group-hover:translate-x-[98px] group-hover:-translate-y-8">
              <rect x="124" y="48" width="72" height="36" rx="6" fill="#201f20" stroke="#3f3f46" strokeWidth="1" className="group-hover:stroke-[#c8c5ca] group-hover:shadow-lg transition-all" />
              <rect x="132" y="56" width="48" height="4" rx="2" fill="#a1a1aa" />
              <rect x="132" y="66" width="35" height="3" rx="1.5" fill="#3f3f46" />
              <rect x="132" y="74" width="20" height="3" rx="1.5" fill="#3f3f46" />
              <circle cx="186" cy="74" r="4" fill="#c8c5ca" />
            </g>

            {/* Done Task Card 4 (Column 3) */}
            <g className="opacity-60">
              <rect x="222" y="48" width="72" height="28" rx="6" fill="#201f20" stroke="#2c2b2c" strokeWidth="1" />
              <rect x="230" y="56" width="52" height="4" rx="2" fill="#a1a1aa" fillOpacity="0.5" />
              <line x1="230" y1="58" x2="282" y2="58" stroke="#a1a1aa" strokeWidth="1" strokeOpacity="0.5" />
              <rect x="230" y="66" width="25" height="3" rx="1.5" fill="#3f3f46" />
            </g>
          </svg>

          {/* Sparkle badge */}
          <div className="absolute top-4 right-8 text-[#c8c5ca] opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-bounce">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <h2 className="text-2xl font-headline font-bold text-on-surface mb-2">Papan Kanban Masih Kosong</h2>
        <p className="text-text-muted text-body-sm max-w-md mb-8">
          Workspace Anda belum memiliki kolom kerja ataupun kartu tugas. Silakan buat data demonstrasi untuk mencoba semua fitur secara instan atau pasang kolom default untuk mendesain dari awal.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button
            onClick={handleGenerateDummyData}
            disabled={isCreating || isSeeding}
            className="bg-[#c8c5ca] hover:bg-[#e4e1e6] text-[#201f20] font-semibold py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSeeding ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5" />
            )}
            {isSeeding ? "Menghasilkan Data..." : "Generate Dummy Data"}
          </button>

          <button
            onClick={handleCreateDefaultColumns}
            disabled={isCreating || isSeeding}
            className="bg-transparent border border-[#3f3f46] hover:bg-[#201f20] hover:border-[#c8c5ca] text-[#e5e2e1] font-semibold py-2.5 px-5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {isCreating ? "Menyiapkan..." : "Generate Default Columns"}
          </button>
        </div>
      </div>
    </div>
  );
}
