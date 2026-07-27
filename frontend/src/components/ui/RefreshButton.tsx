"use client";

import React, { useState } from "react";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

interface RefreshButtonProps {
  className?: string;
  onRefresh?: () => void;
  onClick?: () => void;
  showText?: boolean;
  isLoading?: boolean;
  label?: string;
}

export default function RefreshButton({
  className = "",
  onRefresh,
  onClick,
  showText = true,
  isLoading = false,
  label = "Refresh"
}: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleRefresh = async () => {
    setIsSpinning(true);
    try {
      if (onClick) {
        await onClick();
      } else if (onRefresh) {
        onRefresh();
      } else {
        await queryClient.refetchQueries();
        router.refresh();
      }
    } catch (e) {
      console.error("Refresh failed:", e);
    } finally {
      setTimeout(() => setIsSpinning(false), 600);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      type="button"
      title="Refresh Data"
      className={`bg-white/90 hover:bg-white border border-slate-200/80 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold shadow-xs hover:shadow-sm transition-all duration-200 flex items-center gap-2 cursor-pointer select-none active:scale-95 ${className}`}
    >
      <RotateCw className={`h-3.5 w-3.5 text-slate-600 transition-transform ${isSpinning || isLoading ? "animate-spin text-[#0F2573]" : ""}`} />
      {showText && <span>{label}</span>}
    </button>
  );
}
