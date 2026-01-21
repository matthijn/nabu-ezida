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

type ActiveNav = "documents" | "search" | "codes";

type DefaultPageLayoutProps = {
  children?: ReactNode;
  className?: string;
  activeNav?: ActiveNav;
  showCodes?: boolean;
  onNavChange?: (nav: ActiveNav) => void;
};

const buildNavItems = (activeNav: ActiveNav, showCodes: boolean): NavItem[][] => {
  const primary: NavItem[] = [
    { id: "documents", icon: <FeatherFiles />, label: "Documents", tooltip: "Browse all your documents", selected: activeNav === "documents" },
    { id: "search", icon: <FeatherSearch />, label: "Search", tooltip: "Search across documents", selected: activeNav === "search" },
  ];

  const secondary: NavItem[] = showCodes
    ? [{ id: "codes", icon: <FeatherBook />, label: "Codes", tooltip: "Your qualitative codebook", selected: activeNav === "codes" }]
    : [];

  return secondary.length > 0 ? [primary, secondary] : [primary];
};

export const DefaultPageLayout = ({
  children,
  className,
  activeNav = "documents",
  showCodes = false,
  onNavChange,
}: DefaultPageLayoutProps) => (
  <div
    className={cn(
      "flex h-screen w-full items-center",
      className
    )}
  >
    <MainSidebar
      navItemGroups={buildNavItems(activeNav, showCodes)}
      onNavItemClick={onNavChange ? (id) => onNavChange(id as ActiveNav) : undefined}
    />
    {children ? (
      <div className="relative flex grow shrink-0 basis-0 flex-col items-start gap-4 self-stretch overflow-y-auto bg-default-background" style={{ overflow: "visible" }}>
        {children}
        <TaskIndicator />
      </div>
    ) : null}
  </div>
);

export type { ActiveNav };
