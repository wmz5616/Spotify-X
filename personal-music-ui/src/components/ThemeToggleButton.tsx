"use client";

import React from "react";
import { Sun, Moon } from "lucide-react";
import { useThemeStore } from "@/store/useThemeStore";
import clsx from "clsx";

interface ThemeToggleButtonProps {
  variant?: "icon" | "pill" | "card";
  className?: string;
}

export default function ThemeToggleButton({
  variant = "pill",
  className,
}: ThemeToggleButtonProps) {
  const { mode, toggleTheme, setMode } = useThemeStore();
  const isLight = mode === "light";

  if (variant === "icon") {
    return (
      <button
        onClick={toggleTheme}
        className={clsx(
          "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 border",
          isLight
            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/20"
            : "bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-white/5",
          className
        )}
        title={isLight ? "切换为夜间模式" : "切换为日间模式"}
      >
        {isLight ? (
          <Sun size={18} className="animate-[spin_8s_linear_infinite]" />
        ) : (
          <Moon size={18} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        "flex items-center gap-2.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 active:scale-95 shadow-sm border",
        isLight
          ? "bg-white hover:bg-neutral-50 text-neutral-800 border-neutral-200"
          : "bg-[#242426] hover:bg-[#2c2c2f] text-neutral-100 border-white/10",
        className
      )}
    >
      <div
        className={clsx(
          "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
          isLight ? "bg-amber-100 text-amber-600" : "bg-neutral-700 text-blue-300"
        )}
      >
        {isLight ? (
          <Sun size={14} className="animate-[spin_10s_linear_infinite]" />
        ) : (
          <Moon size={14} />
        )}
      </div>
      <span>{isLight ? "日间模式 · 点击切换至夜间" : "夜间模式 · 点击切换至日间"}</span>
    </button>
  );
}
