import type { ComponentType } from "react"
import {
  BarChart3,
  ChartBarStacked,
  ChartLine,
  ChartPie,
  ChartScatter,
  ChartNetwork,
} from "lucide-react"
import type { RadixColor } from "~/ui/theme/radix"
import type { ExhibitKind, ChartSubtype } from "~/domain/exhibits/types"

interface ExhibitTypeConfig {
  display: string
  icon: ComponentType<{ className?: string }>
  color: RadixColor
}

export const EXHIBIT_KINDS: Record<ExhibitKind, ExhibitTypeConfig> = {
  chart: { display: "Charts", icon: BarChart3, color: "blue" },
}

export const CHART_SUBTYPES: Record<ChartSubtype, ExhibitTypeConfig> = {
  bar: { display: "Bar Chart", icon: ChartBarStacked, color: "blue" },
  line: { display: "Line Chart", icon: ChartLine, color: "teal" },
  pie: { display: "Pie Chart", icon: ChartPie, color: "amber" },
  scatter: { display: "Scatter Plot", icon: ChartScatter, color: "violet" },
  other: { display: "Chart", icon: ChartNetwork, color: "slate" },
}

export const resolveExhibitConfig = (
  kind: ExhibitKind,
  subtype: ChartSubtype
): ExhibitTypeConfig => {
  switch (kind) {
    case "chart":
      return CHART_SUBTYPES[subtype]
    default:
      throw new Error(`Unknown exhibit kind: ${kind}`)
  }
}
