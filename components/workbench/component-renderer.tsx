"use client";

import { type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/ui/cn";
import { useIsTransitioning } from "@/lib/workbench/store";
import {
  VIEW_TRANSITION_NAME,
  VIEW_TRANSITION_PARENT_NAME,
} from "@/lib/workbench/transition-config";

export function MorphContainer({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const isTransitioning = useIsTransitioning();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={cn(
        className,
        !prefersReducedMotion && "transition-all duration-300 ease-out",
      )}
      style={
        {
          ...style,
          viewTransitionName: isTransitioning
            ? VIEW_TRANSITION_NAME
            : undefined,
          viewTransitionGroup: isTransitioning
            ? VIEW_TRANSITION_PARENT_NAME
            : undefined,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
