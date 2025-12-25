"use client";

import React from "react";
import * as SubframeUtils from "../utils";

interface IconWithBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "brand" | "neutral" | "error" | "success" | "warning";
  size?: "x-large" | "large" | "medium" | "small" | "x-small";
  icon?: React.ReactNode;
  className?: string;
}

const IconWithBackgroundRoot = React.forwardRef<HTMLDivElement, IconWithBackgroundProps>(
  function IconWithBackgroundRoot(
    {
      variant = "brand",
      size = "medium",
      icon,
      className,
      ...otherProps
    }: IconWithBackgroundProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
          "flex h-8 w-8 flex-none items-center justify-center rounded-full bg-brand-100",
          {
            "h-5 w-5": size === "x-small",
            "h-6 w-6": size === "small",
            "h-12 w-12": size === "large",
            "h-16 w-16": size === "x-large",
            "bg-warning-100": variant === "warning",
            "bg-success-100": variant === "success",
            "bg-error-100": variant === "error",
            "bg-neutral-100": variant === "neutral",
          },
          className
        )}
        ref={ref}
        {...otherProps}
      >
        {icon ? (
          <div
            className={SubframeUtils.twClassNames(
              "text-brand-600",
              {
                "text-[12px]": size === "x-small",
                "text-[14px]": size === "small",
                "text-[16px]": size === "medium",
                "text-[20px]": size === "large",
                "text-[24px]": size === "x-large",
                "text-warning-600": variant === "warning",
                "text-success-600": variant === "success",
                "text-error-600": variant === "error",
                "text-neutral-600": variant === "neutral",
              }
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    );
  }
);

export const IconWithBackground = IconWithBackgroundRoot;
