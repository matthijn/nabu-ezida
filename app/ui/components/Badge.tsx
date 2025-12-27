"use client";

import type { ReactNode } from "react";
import * as SubframeCore from "@subframe/core";
import { cn } from "~/ui/utils";

type BadgeProps = {
  variant?: "brand" | "neutral" | "error" | "warning" | "success";
  icon?: ReactNode;
  children?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
};

export const Badge = ({
  variant = "brand",
  icon = null,
  children,
  iconRight = null,
  className,
}: BadgeProps) => (
  <div
    className={cn(
      "group/97bdb082 flex h-6 items-center gap-1 rounded-md border border-solid border-brand-100 bg-brand-100 px-2",
      {
        "border border-solid border-success-100 bg-success-100":
          variant === "success",
        "border border-solid border-warning-100 bg-warning-100":
          variant === "warning",
        "border border-solid border-error-100 bg-error-100":
          variant === "error",
        "border border-solid border-neutral-100 bg-neutral-100":
          variant === "neutral",
      },
      className
    )}
  >
    {icon ? (
      <SubframeCore.IconWrapper
        className={cn(
          "text-caption font-caption text-brand-700",
          {
            "text-success-800": variant === "success",
            "text-warning-800": variant === "warning",
            "text-error-700": variant === "error",
            "text-neutral-700": variant === "neutral",
          }
        )}
      >
        {icon}
      </SubframeCore.IconWrapper>
    ) : null}
    {children ? (
      <span
        className={cn(
          "whitespace-nowrap text-caption font-caption text-brand-800",
          {
            "text-success-800": variant === "success",
            "text-warning-800": variant === "warning",
            "text-error-800": variant === "error",
            "text-neutral-700": variant === "neutral",
          }
        )}
      >
        {children}
      </span>
    ) : null}
    {iconRight ? (
      <SubframeCore.IconWrapper
        className={cn(
          "text-caption font-caption text-brand-700",
          {
            "text-success-800": variant === "success",
            "text-warning-800": variant === "warning",
            "text-error-700": variant === "error",
            "text-neutral-700": variant === "neutral",
          }
        )}
      >
        {iconRight}
      </SubframeCore.IconWrapper>
    ) : null}
  </div>
);
