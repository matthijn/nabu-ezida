"use client"

import type { RenderableChart } from "~/lib/chart/types"
import { exhaustive } from "~/lib/utils/exhaustive"
import { AxisChart } from "./AxisChart"
import { PartChart } from "./PartChart"
import { HeatmapPlaceholder } from "./HeatmapPlaceholder"
import type { ChartTooltipContext } from "./ChartTooltip"

export interface ChartRendererProps {
  renderable: RenderableChart
  tooltipContext: ChartTooltipContext
  onDatumClick?: (url: string) => void
}

export const ChartRenderer = ({ renderable, tooltipContext, onDatumClick }: ChartRendererProps) => {
  switch (renderable.kind) {
    case "axis":
      return (
        <AxisChart
          renderable={renderable}
          tooltipContext={tooltipContext}
          onDatumClick={onDatumClick}
        />
      )
    case "part":
      return (
        <PartChart
          renderable={renderable}
          tooltipContext={tooltipContext}
          onDatumClick={onDatumClick}
        />
      )
    case "matrix":
      return <HeatmapPlaceholder />
    default:
      return exhaustive(renderable)
  }
}
