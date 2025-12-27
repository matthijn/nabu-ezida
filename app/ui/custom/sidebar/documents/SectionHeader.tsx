"use client";

import type { ReactNode } from "react";

interface SectionHeaderProps {
  children: ReactNode;
}

export function SectionHeader({ children }: SectionHeaderProps) {
  return (
    <div className="flex w-full items-center gap-2 px-2 py-1">
      <span className="text-caption-bold font-caption-bold text-subtext-color">
        {children}
      </span>
    </div>
  );
}
