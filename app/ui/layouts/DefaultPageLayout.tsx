"use client";

import type { ReactNode } from "react";
import {
  FeatherBook,
  FeatherFiles,
  FeatherSearch,
} from "@subframe/core";
import { MainSidebar } from "~/ui/custom/sidebar/main";
import type { NavItem } from "~/ui/custom/sidebar/main";
import { cn } from "~/ui/utils";
import { TaskIndicator } from "~/ui/components/TaskIndicator";

const primaryNavItems: NavItem[] = [
  { id: "documents", icon: <FeatherFiles />, label: "Documents", tooltip: "Browse all your documents", selected: true },
  { id: "search", icon: <FeatherSearch />, label: "Search", tooltip: "Search across documents" },
];

const secondaryNavItems: NavItem[] = [
  { id: "codes", icon: <FeatherBook />, label: "Codes", tooltip: "Your qualitative codebook" },
];

type DefaultPageLayoutProps = {
  children?: ReactNode;
  className?: string;
};

export const DefaultPageLayout = ({ children, className }: DefaultPageLayoutProps) => (
  <div
    className={cn(
      "flex h-screen w-full items-center",
      className
    )}
  >
    <MainSidebar navItemGroups={[primaryNavItems, secondaryNavItems]} />
    {children ? (
      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 self-stretch overflow-y-auto bg-default-background" style={{ overflow: "visible" }}>
        {children}
      </div>
    ) : null}
    <TaskIndicator />
  </div>
);
