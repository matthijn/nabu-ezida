"use client";

import type { ReactNode } from "react";
import { cn } from "~/ui/utils";

type AvatarProps = {
  variant?: "brand" | "neutral" | "error" | "success" | "warning";
  size?: "x-large" | "large" | "medium" | "small" | "x-small";
  children?: ReactNode;
  image?: string;
  square?: boolean;
  className?: string;
};

export const Avatar = ({
  variant = "brand",
  size = "medium",
  children,
  image,
  square = false,
  className,
}: AvatarProps) => (
  <div
    className={cn(
      "group/bec25ae6 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-full bg-brand-100 relative h-8 w-8",
      {
        "rounded-md": square,
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
  >
    {children ? (
      <span
        className={cn(
          "line-clamp-1 w-full text-brand-800 text-center absolute font-['Manrope'] text-[14px] font-[600] leading-[14px]",
          {
            "font-['Manrope'] text-[10px] font-[600] leading-[10px] tracking-normal":
              size === "x-small" || size === "small",
            "font-['Manrope'] text-[18px] font-[600] leading-[18px] tracking-normal":
              size === "large",
            "font-['Manrope'] text-[24px] font-[600] leading-[24px] tracking-normal":
              size === "x-large",
            "text-warning-800": variant === "warning",
            "text-success-800": variant === "success",
            "text-error-800": variant === "error",
            "text-neutral-800": variant === "neutral",
          }
        )}
      >
        {children}
      </span>
    ) : null}
    {image ? (
      <img
        className={cn(
          "h-8 w-8 flex-none object-cover absolute",
          {
            "h-5 w-5 flex-none": size === "x-small",
            "h-6 w-6 flex-none": size === "small",
            "h-12 w-12 flex-none": size === "large",
            "h-16 w-16 flex-none": size === "x-large",
          }
        )}
        src={image}
      />
    ) : null}
  </div>
);
