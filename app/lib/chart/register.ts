import * as echarts from "echarts/core"
import { BarChart, LineChart, PieChart } from "echarts/charts"
import { CanvasRenderer } from "echarts/renderers"
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
} from "echarts/components"
import { UniversalTransition } from "echarts/features"

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  UniversalTransition,
])

export { echarts }
