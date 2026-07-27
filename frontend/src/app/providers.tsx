"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/providers/ToastProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Catch & recovery handler for Next.js Turbopack ChunkLoadError & HMR script load failures
  useEffect(() => {
    const handleChunkError = (event: any) => {
      const error = event?.reason || event?.error;
      const message = error?.message || error?.toString() || event?.message || "";
      if (
        message.includes("Loading chunk") ||
        message.includes("ChunkLoadError") ||
        message.includes("Failed to load chunk") ||
        message.includes("hmr-client")
      ) {
        const storageKey = "last_chunk_error_reload";
        const lastReload = sessionStorage.getItem(storageKey);
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 5000) {
          sessionStorage.setItem(storageKey, now.toString());
          window.location.reload();
        }
      }
    };

    window.addEventListener("error", handleChunkError);
    window.addEventListener("unhandledrejection", handleChunkError);
    return () => {
      window.removeEventListener("error", handleChunkError);
      window.removeEventListener("unhandledrejection", handleChunkError);
    };
  }, []);

  // Ensure queryClient is initialized once per session
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

