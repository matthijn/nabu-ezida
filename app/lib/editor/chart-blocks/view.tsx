"use client"

import {
  type ComponentType,
  createElement,
  useRef,
  useEffect,
  useSyncExternalStore,
  useState,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { useNavigate, useParams } from "react-router"
import { Trash2, BarChart3, FileText, MapPin } from "lucide-react"
import { echarts } from "~/lib/chart/register"
import { resolveSqlPlaceholders } from "~/lib/db/resolve"
import { buildChartOption, type ChartColorMap } from "~/lib/chart/options"
import {
  extractEntityIdsFromRows,
  injectEntityLabels,
  findEntityInRow,
  type ChartEntityMap,
} from "~/lib/chart/entities"
import { executeQuery } from "~/lib/db/query"
import { getDatabase, subscribeSyncRevision, getSyncRevision } from "~/domain/db/database"
import { getEntityPrefixes } from "~/lib/data-blocks/registry"
import { resolveRadixHex, resolveCssColorHex } from "~/ui/theme/radix"
import { resolveEntityLink, type EntityIcons } from "~/lib/markdown/resolve"
import { useFilePath } from "~/ui/components/editor/FilePathContext"
import { useIsReadOnly } from "~/ui/components/editor/ReadOnlyContext"
import { useFiles } from "~/ui/hooks/useFiles"
import { IconButton } from "~/ui/components/IconButton"
import type { ChartBlock } from "~/domain/data-blocks/chart/schema"

interface ChartBlockViewProps {
  data: ChartBlock
  onDelete: () => void
}

type ChartState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: Record<string, unknown>[] }

const CHART_HEIGHT = 300

const ENTITY_ICONS: EntityIcons = { file: FileText, spotlight: MapPin }

const buildColorMap = (rows: Record<string, unknown>[]): ChartColorMap => {
  const uniqueColors = [
    ...new Set(rows.map((r) => r.color).filter((c): c is string => typeof c === "string")),
  ]
  const map: ChartColorMap = {}
  for (const color of uniqueColors) {
    map[color] = resolveRadixHex(color, 9)
  }
  return map
}

const resolveChartEntityMap = (
  rows: Record<string, unknown>[],
  files: Record<string, string>,
  projectId: string | undefined
): ChartEntityMap => {
  if (!projectId) return {}
  const prefixes = getEntityPrefixes()
  const entityIds = extractEntityIdsFromRows(rows, prefixes)
  if (entityIds.length === 0) return {}

  const map: ChartEntityMap = {}
  for (const id of entityIds) {
    const resolved = resolveEntityLink(`file://${id}`, files, projectId, ENTITY_ICONS)
    if (!resolved) continue
    const LucideIcon = resolved.icon as ComponentType<{ size?: number }>
    const iconSvg = renderToStaticMarkup(createElement(LucideIcon, { size: 12 }))
    map[id] = {
      label: resolved.label,
      url: resolved.url,
      textColor: resolveCssColorHex(resolved.colors.text),
      backgroundColor: resolveCssColorHex(resolved.colors.background),
      iconSvg,
    }
  }
  return map
}

const isAxisLabel = (params: Record<string, unknown>): boolean =>
  params.componentType === "xAxis" || params.componentType === "yAxis"

const isSeriesItem = (params: Record<string, unknown>): boolean => params.componentType === "series"

export const ChartBlockView = ({ data, onDelete }: ChartBlockViewProps) => {
  const filePath = useFilePath()
  const isReadOnly = useIsReadOnly()
  const { files } = useFiles()
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const chartRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const [chartState, setChartState] = useState<ChartState>({ status: "loading" })

  const syncRevision = useSyncExternalStore(subscribeSyncRevision, getSyncRevision)

  useEffect(() => {
    let aborted = false

    const fetchData = async () => {
      const db = getDatabase()
      if (!db) return

      const sql = resolveSqlPlaceholders(data.query, { file: filePath })
      const result = await executeQuery<Record<string, unknown>>(db.instance, sql)
      if (aborted) return

      if (!result.ok) {
        setChartState({ status: "error", message: result.error.message })
        return
      }

      if (result.value.rows.length === 0) {
        setChartState({ status: "empty" })
        return
      }

      setChartState({ status: "ready", rows: result.value.rows })
    }

    fetchData()
    return () => {
      aborted = true
    }
  }, [data.query, filePath, syncRevision])

  useEffect(() => {
    const container = chartRef.current
    if (!container) return

    if (chartState.status !== "ready") {
      if (instanceRef.current) {
        instanceRef.current.dispose()
        instanceRef.current = null
      }
      return
    }

    if (!instanceRef.current) {
      instanceRef.current = echarts.init(container)
    }

    const instance = instanceRef.current
    const colorMap = buildColorMap(chartState.rows)
    const option = buildChartOption(data.options, chartState.rows, colorMap)
    const entityMap = resolveChartEntityMap(chartState.rows, files, projectId)
    const enrichedOption = injectEntityLabels(option, entityMap, data.tooltip)
    instance.setOption(enrichedOption, true)

    const hasEntities = Object.keys(entityMap).length > 0
    if (!hasEntities) return

    const resolveClickEntity = (params: Record<string, unknown>): string | null => {
      if (isAxisLabel(params)) {
        return entityMap[String(params.value ?? "")]?.url ?? null
      }
      if (isSeriesItem(params)) {
        const data = params.data as Record<string, unknown> | undefined
        return data ? (findEntityInRow(data, entityMap)?.url ?? null) : null
      }
      return null
    }

    const handleClick = (params: Record<string, unknown>) => {
      const url = resolveClickEntity(params)
      if (url) navigate(url)
    }

    const handleMouseOver = (params: Record<string, unknown>) => {
      if (resolveClickEntity(params)) container.style.cursor = "pointer"
    }

    const handleMouseOut = () => {
      container.style.cursor = ""
    }

    instance.on("click", handleClick)
    instance.on("mouseover", handleMouseOver)
    instance.on("mouseout", handleMouseOut)

    return () => {
      instance.off("click", handleClick)
      instance.off("mouseover", handleMouseOver)
      instance.off("mouseout", handleMouseOut)
    }
  }, [chartState, data.options, data.tooltip, files, projectId, navigate])

  useEffect(() => {
    const container = chartRef.current
    if (!container || !instanceRef.current) return

    const observer = new ResizeObserver(() => {
      instanceRef.current?.resize()
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [chartState])

  useEffect(() => {
    return () => {
      instanceRef.current?.dispose()
      instanceRef.current = null
    }
  }, [])

  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background my-2">
      <div className="flex w-full items-center justify-between px-4 py-2 border-b border-neutral-border">
        <div className="flex items-center gap-2 text-sm text-subtext-color">
          <BarChart3 className="w-4 h-4" />
          <span>{data.title}</span>
        </div>
        {!isReadOnly && (
          <IconButton
            variant="neutral-tertiary"
            size="small"
            icon={<Trash2 />}
            onClick={onDelete}
          />
        )}
      </div>
      <div className="px-4 py-3">
        {chartState.status === "loading" && (
          <div
            className="flex items-center justify-center text-sm text-subtext-color"
            style={{ height: CHART_HEIGHT }}
          >
            Loading...
          </div>
        )}
        {chartState.status === "error" && (
          <div
            className="flex items-center justify-center text-sm text-error-700"
            style={{ height: CHART_HEIGHT }}
          >
            {chartState.message}
          </div>
        )}
        {chartState.status === "empty" && (
          <div
            className="flex items-center justify-center text-sm text-subtext-color"
            style={{ height: CHART_HEIGHT }}
          >
            No data
          </div>
        )}
        <div
          ref={chartRef}
          style={{
            height: CHART_HEIGHT,
            display: chartState.status === "ready" ? "block" : "none",
          }}
        />
      </div>
    </div>
  )
}
