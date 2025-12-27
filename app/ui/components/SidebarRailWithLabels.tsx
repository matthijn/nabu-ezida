"use client";

import React, { type ReactNode } from "react";
import { FeatherCircleDashed } from "@subframe/core";
import * as SubframeCore from "@subframe/core";
import { cn } from "~/ui/utils";
import { Tooltip } from "./Tooltip";

interface NavItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  children?: ReactNode;
  tooltip?: string;
  selected?: boolean;
  className?: string;
}

const NavItem = React.forwardRef<HTMLDivElement, NavItemProps>(function NavItem(
  {
    icon = <FeatherCircleDashed />,
    children,
    tooltip,
    selected = false,
    className,
    ...otherProps
  }: NavItemProps,
  ref
) {
  return (
    <SubframeCore.Tooltip.Provider>
      <SubframeCore.Tooltip.Root>
        <SubframeCore.Tooltip.Trigger asChild={true}>
          <div
            className={cn(
              "group/8815d632 flex min-h-[48px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-md px-2 pt-3 pb-2 active:bg-neutral-50",
              {
                "bg-neutral-100 hover:bg-neutral-100 active:bg-neutral-50":
                  selected,
              },
              className
            )}
            ref={ref}
            {...otherProps}
          >
            {icon ? (
              <SubframeCore.IconWrapper
                className={cn(
                  "text-heading-2 font-heading-2 text-subtext-color group-hover/8815d632:text-default-font group-active/8815d632:text-default-font",
                  { "text-default-font": selected }
                )}
              >
                {icon}
              </SubframeCore.IconWrapper>
            ) : null}
            {children ? (
              <span
                className={cn(
                  "line-clamp-1 w-full text-caption-bold font-caption-bold text-subtext-color text-center group-hover/8815d632:text-default-font group-active/8815d632:text-default-font",
                  { "text-default-font": selected }
                )}
              >
                {children}
              </span>
            ) : null}
          </div>
        </SubframeCore.Tooltip.Trigger>
        <SubframeCore.Tooltip.Portal>
          <SubframeCore.Tooltip.Content
            side="right"
            align="center"
            sideOffset={4}
          >
            <Tooltip>{tooltip ?? children}</Tooltip>
          </SubframeCore.Tooltip.Content>
        </SubframeCore.Tooltip.Portal>
      </SubframeCore.Tooltip.Root>
    </SubframeCore.Tooltip.Provider>
  );
});

type SidebarRailWithLabelsProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
};

const SidebarRailWithLabelsRoot = ({
  header,
  footer,
  children,
  className,
}: SidebarRailWithLabelsProps) => (
  <nav
    className={cn(
      "flex h-full w-24 flex-col items-start bg-default-background",
      className
    )}
  >
    {header ? (
      <div className="flex w-full flex-col items-center justify-center gap-2 px-6 py-6">
        {header}
      </div>
    ) : null}
    {children ? (
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-1 px-2 py-2 overflow-auto">
        {children}
      </div>
    ) : null}
    {footer ? (
      <div className="flex w-full flex-col items-center justify-end gap-1 px-2 py-2">
        {footer}
      </div>
    ) : null}
  </nav>
);

export const SidebarRailWithLabels = Object.assign(SidebarRailWithLabelsRoot, {
  NavItem,
});
