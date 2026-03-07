"use client";

import { useState, type ReactNode, type MutableRefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  FeatherBook,
  FeatherFiles,
  FeatherSearch,
} from "@subframe/core";
import { MainSidebar } from "~/ui/custom/sidebar/main";
import type { NavItem } from "~/ui/custom/sidebar/main";
import { useResizable } from "~/hooks/useResizable";
import { cn } from "~/ui/utils";

type ActiveNav = "documents" | "search" | "codes";

type DefaultPageLayoutProps = {
  children?: ReactNode;
  rightPanel?: ReactNode;
  sidebarPanels?: Partial<Record<ActiveNav, ReactNode>>;
  className?: string;
  activeNav?: ActiveNav;
  showCodes?: boolean;
  onNavChange?: (nav: ActiveNav) => void;
  dismissSidebarRef?: MutableRefObject<(() => void) | null>;
};

const buildNavItems = (activeNav: ActiveNav, showCodes: boolean): NavItem[][] => {
  const primary: NavItem[] = [
    { id: "documents", icon: <FeatherFiles />, label: "Documents", tooltip: "Browse all your documents", selected: activeNav === "documents" },
    { id: "search", icon: <FeatherSearch />, label: "Search", tooltip: "Search across documents", disabled: true },
  ];

  const secondary: NavItem[] = showCodes
    ? [{ id: "codes", icon: <FeatherBook />, label: "Codes", tooltip: "Your qualitative codebook", selected: activeNav === "codes" }]
    : [];

  return secondary.length > 0 ? [primary, secondary] : [primary];
};

export const DefaultPageLayout = ({
  children,
  rightPanel,
  sidebarPanels,
  className,
  activeNav = "documents",
  showCodes = false,
  onNavChange,
  dismissSidebarRef,
}: DefaultPageLayoutProps) => {
  const [hoveredNav, setHoveredNav] = useState<ActiveNav | null>(null);
  if (dismissSidebarRef) dismissSidebarRef.current = () => setHoveredNav(null);
  const activePanel = hoveredNav && sidebarPanels?.[hoveredNav];
  const { size: chatSize, handleResizeMouseDown } = useResizable(
    { width: 380, height: 0 },
    { storageKey: "chat-panel-width", bounds: { minWidth: 280, maxWidth: 500 } }
  );

  return (
    <div className={cn("flex h-screen w-full items-center", className)}>
      <div
        className="relative flex h-full flex-none"
        onMouseLeave={() => setHoveredNav(null)}
      >
        <div className="relative z-30">
          <MainSidebar
            navItemGroups={buildNavItems(activeNav, showCodes)}
            onNavItemClick={onNavChange ? (id) => onNavChange(id as ActiveNav) : undefined}
            onNavItemHover={(id) => setHoveredNav(id as ActiveNav)}
          />
        </div>
        <AnimatePresence>
          {activePanel && (
            <motion.div
              key={hoveredNav}
              initial={{ x: -12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="absolute left-full top-0 h-full z-20 shadow-xl"
            >
              {activePanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex h-full grow gap-3 bg-neutral-100 p-3">
        {children && (
          <div className="relative flex grow flex-col items-start gap-4 rounded-xl bg-default-background overflow-hidden">
            {children}
          </div>
        )}
        {rightPanel && (
          <div className="flex flex-col flex-none h-full relative" style={{ width: chatSize.width }}>
            <div
              className="absolute inset-y-0 left-0 w-3 -ml-3 cursor-col-resize group z-10"
              onMouseDown={handleResizeMouseDown}
            >
              <div className="absolute inset-y-0 left-1/2 w-px group-hover:bg-neutral-300 transition-colors" />
            </div>
            {rightPanel}
          </div>
        )}
      </div>
    </div>
  );
};

export type { ActiveNav };
