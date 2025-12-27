"use client";

import { forwardRef, type ComponentProps, type ReactNode } from "react";
import { FeatherStar } from "@subframe/core";
import * as SubframeCore from "@subframe/core";
import { cn } from "~/ui/utils";

interface ItemProps
  extends ComponentProps<typeof SubframeCore.ToggleGroup.Item> {
  disabled?: boolean;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const Item = forwardRef<HTMLDivElement, ItemProps>(function Item(
  {
    disabled = false,
    children,
    icon = <FeatherStar />,
    className,
    ...otherProps
  }: ItemProps,
  ref
) {
  return (
    <SubframeCore.ToggleGroup.Item asChild={true} {...otherProps}>
      <div
        className={cn(
          "group/56dea6ed flex h-7 w-full cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1 active:bg-neutral-100 aria-[checked=true]:bg-default-background aria-[checked=true]:shadow-sm active:aria-[checked=true]:bg-default-background",
          { "active:bg-transparent": disabled },
          className
        )}
        ref={ref}
      >
        {icon ? (
          <SubframeCore.IconWrapper
            className={cn(
              "text-body font-body text-subtext-color group-hover/56dea6ed:text-default-font group-aria-[checked=true]/56dea6ed:text-default-font",
              {
                "text-neutral-400 group-hover/56dea6ed:text-neutral-400":
                  disabled,
              }
            )}
          >
            {icon}
          </SubframeCore.IconWrapper>
        ) : null}
        {children ? (
          <span
            className={cn(
              "whitespace-nowrap text-caption-bold font-caption-bold text-subtext-color group-hover/56dea6ed:text-default-font group-aria-[checked=true]/56dea6ed:text-default-font",
              {
                "text-neutral-400 group-hover/56dea6ed:text-neutral-400":
                  disabled,
              }
            )}
          >
            {children}
          </span>
        ) : null}
      </div>
    </SubframeCore.ToggleGroup.Item>
  );
});

interface ToggleGroupRootProps
  extends ComponentProps<typeof SubframeCore.ToggleGroup.Root> {
  children?: ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

const ToggleGroupRoot = forwardRef<HTMLDivElement, ToggleGroupRootProps>(
  function ToggleGroupRoot(
    { children, className, ...otherProps }: ToggleGroupRootProps,
    ref
  ) {
    return children ? (
      <SubframeCore.ToggleGroup.Root asChild={true} {...otherProps}>
        <div
          className={cn(
            "flex items-center gap-0.5 overflow-hidden rounded-md bg-neutral-100 px-0.5 py-0.5",
            className
          )}
          ref={ref}
        >
          {children}
        </div>
      </SubframeCore.ToggleGroup.Root>
    ) : null;
  }
);

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
  Item,
});
