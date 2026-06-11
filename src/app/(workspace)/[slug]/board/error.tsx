"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function BoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Board error:", error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-canvas">
      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-6 border border-error/20">
        <AlertTriangle className="w-8 h-8 text-error" />
      </div>
      <h2 className="text-2xl font-headline text-on-surface mb-2">Something went wrong!</h2>
      <p className="text-text-muted text-body-sm max-w-md mb-8 text-center">
        We encountered an error while loading or updating the board. This could be due to a network issue or insufficient permissions.
      </p>
      <button
        onClick={() => reset()}
        className="bg-surface-container border border-border-subtle hover:bg-surface-container-high hover:border-outline-variant text-on-surface font-semibold py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
      >
        <RefreshCcw className="w-5 h-5" />
        Try again
      </button>
    </div>
  );
}
