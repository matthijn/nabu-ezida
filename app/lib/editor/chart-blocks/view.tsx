"use client"

import { useRef, useEffect, useSyncExternalStore, useState } from "react"
import { Trash2, BarChart3 } from "lucide-react"
import { echarts } from "~/lib/chart/register"
import { resolveSqlPlaceholders } from "~/lib/db/resolve"
import { buildChartOption, type ChartColorMap } from "~/lib/chart/options"
import { executeQuery } from "~/lib/db/query"
import { getDatabase, subscribeSyncRevision, getSyncRevision } from "~/domain/db/database"
import { resolveRadixHex } from "~/ui/theme/radix"
import { useFilePath } from "~/ui/components/editor/FilePathContext"
import { useIsReadOnly } from "~/ui/components/editor/ReadOnlyContext"
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

export const ChartBlockView = ({ data, onDelete }: ChartBlockViewProps) => {
  const filePath = useFilePath()
  const isReadOnly = useIsReadOnly()
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

    const colorMap = buildColorMap(chartState.rows)
    const option = buildChartOption(data.options, chartState.rows, colorMap)
    instanceRef.current.setOption(option, true)
  }, [chartState, data.options])

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
