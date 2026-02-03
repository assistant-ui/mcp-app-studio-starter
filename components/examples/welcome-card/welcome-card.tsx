"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface WelcomeCardProps {
  title: string;
  message: string;
  theme?: "light" | "dark";
  actions?: ReactNode;
}

export function WelcomeCard({
  title,
  message,
  theme = "light",
  actions,
}: WelcomeCardProps) {
  const isDark = theme === "dark";

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center p-8",
        isDark ? "bg-zinc-900 text-white" : "bg-white text-zinc-900",
      )}
    >
      <div className="max-w-md text-center">
        <div className="mb-4 text-4xl">👋</div>

        <h1
          className={cn(
            "mb-3 font-semibold text-2xl",
            isDark ? "text-white" : "text-zinc-900",
          )}
        >
          {title}
        </h1>

        <p
          className={cn(
            "mb-6 text-base leading-relaxed",
            isDark ? "text-zinc-400" : "text-zinc-600",
          )}
        >
          {message}
        </p>

        {actions ? <div className="flex justify-center">{actions}</div> : null}
      </div>
    </div>
  );
}
