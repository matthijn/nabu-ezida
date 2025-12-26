"use client";

import React from "react";
import {
  FeatherBook,
  FeatherFiles,
  FeatherInbox,
  FeatherSend,
} from "@subframe/core";
import { MainSidebar } from "~/ui/custom/sidebar/main";
import type { NavItem } from "~/ui/custom/sidebar/main";
import * as SubframeUtils from "../utils";

const primaryNavItems: NavItem[] = [
  { id: "documents", icon: <FeatherFiles />, label: "Documents", tooltip: "Browse all your documents", selected: true },
  { id: "inbox", icon: <FeatherInbox />, label: "Inbox", tooltip: "Tasks from collaborators and Nabu" },
  { id: "outbox", icon: <FeatherSend />, label: "Outbox", tooltip: "Your requests to people and Nabu" },
];

const secondaryNavItems: NavItem[] = [
  { id: "codes", icon: <FeatherBook />, label: "Codes", tooltip: "Your qualitative codebook" },
];

interface DefaultPageLayoutRootProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

const DefaultPageLayoutRoot = React.forwardRef<
  HTMLDivElement,
  DefaultPageLayoutRootProps
>(function DefaultPageLayoutRoot(
  { children, className, ...otherProps }: DefaultPageLayoutRootProps,
  ref
) {
  return (
    <div
      className={SubframeUtils.twClassNames(
        "flex h-screen w-full items-center",
        className
      )}
      ref={ref}
      {...otherProps}
    >
      <MainSidebar navItemGroups={[primaryNavItems, secondaryNavItems]} />
      {children ? (
        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 self-stretch overflow-y-auto bg-default-background" style={{ overflow: "visible" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
});

export const DefaultPageLayout = DefaultPageLayoutRoot;
