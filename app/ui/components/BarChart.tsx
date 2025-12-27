"use client";

import { forwardRef, type ComponentProps, type ElementRef } from "react";
import * as SubframeCore from "@subframe/core";
import { cn } from "~/ui/utils";

interface BarChartRootProps
  extends ComponentProps<typeof SubframeCore.BarChart> {
  stacked?: boolean;
  className?: string;
}

const BarChartRoot = forwardRef<
  ElementRef<typeof SubframeCore.BarChart>,
  BarChartRootProps
>(function BarChartRoot(
  { stacked = false, className, ...otherProps }: BarChartRootProps,
  ref
) {
  return (
    <SubframeCore.BarChart
      className={cn("h-80 w-full", className)}
      ref={ref}
      stacked={stacked}
      colors={[
        "#84cc16",
        "#d9f99d",
        "#65a30d",
        "#bef264",
        "#4d7c0f",
        "#a3e635",
      ]}
      {...otherProps}
    />
  );
});

export const BarChart = BarChartRoot;
