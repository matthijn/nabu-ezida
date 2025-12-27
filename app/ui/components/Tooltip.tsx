"use client";

import type { ReactNode } from "react";
import { cn } from "~/ui/utils";

type TooltipProps = {
  children?: ReactNode;
  className?: string;
};

export const Tooltip = ({ children, className }: TooltipProps) => (
  <div
    className={cn(
      "flex flex-col items-start gap-2 rounded-md border border-solid border-neutral-900 bg-neutral-800 px-2 py-1 shadow-lg",
      className
    )}
  >
    {children ? (
      <span className="text-caption font-caption text-white">
        {children}
      </span>
    ) : null}
  </div>
);
