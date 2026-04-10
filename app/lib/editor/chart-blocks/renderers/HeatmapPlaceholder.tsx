"use client"

import { CHART_HEIGHT } from "./shared"

export const HeatmapPlaceholder = () => (
  <div
    className="flex items-center justify-center text-sm text-subtext-color"
    style={{ height: CHART_HEIGHT }}
  >
    Too cold for heatmap
  </div>
)
