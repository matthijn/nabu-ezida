"use client"

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useNavigate, useParams } from "react-router"
import { Copy, FileText, MapPin, Trash2 } from "lucide-react"
import { executeQuery } from "~/lib/db/query"
import { extractEntityIdsFromRows } from "~/lib/chart/entities"
import { resolveChartData } from "~/lib/chart/resolve"
import type { ColorContext } from "~/lib/chart/color"
import type { ChartEntityMap } from "~/lib/chart/types"
import { getDatabase, getSyncRevision, subscribeSyncRevision } from "~/domain/db/database"
import { getEntityPrefixes } from "~/lib/data-blocks/registry"
import { resolveRadixHex } from "~/ui/theme/radix"
import { resolveEntityLink, type EntityIcons } from "~/lib/markdown/resolve"
import { useIsReadOnly } from "~/ui/components/editor/ReadOnlyContext"
import { useDebugOptions } from "~/ui/components/editor/DebugOptionsContext"
import { useFiles } from "~/ui/hooks/useFiles"
import { IconButton } from "~/ui/components/IconButton"
import type { ChartBlock } from "~/domain/data-blocks/chart/schema"
import { ChartRenderer } from "./renderers/dispatch"
import type { ChartTooltipContext } from "./renderers/ChartTooltip"
import { CHART_HEIGHT, FALLBACK_COLOR } from "./renderers/shared"

interface ChartBlockViewProps {
  data: ChartBlock
  onDelete: () => void
  captionType?: string
  captionIndex: number
}

type ChartState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: Record<string, unknown>[] }

const CHART_COLOR_SHADE = 9

const ENTITY_ICONS: EntityIcons = { file: FileText, spotlight: MapPin }

const EMPTY_ENTITY_MAP: ChartEntityMap = {}

const buildChartEntityMap = (
  rows: Record<string, unknown>[],
  files: Record<string, string>,
  projectId: string | undefined
): ChartEntityMap => {
  if (!projectId) return EMPTY_ENTITY_MAP
  const ids = extractEntityIdsFromRows(rows, getEntityPrefixes())
  if (ids.length === 0) return EMPTY_ENTITY_MAP

  const map: ChartEntityMap = {}
  for (const id of ids) {
    const resolved = resolveEntityLink(`file://${id}`, files, projectId, ENTITY_ICONS)
    if (!resolved) continue
    map[id] = {
      id,
      label: resolved.label,
      url: resolved.url,
      color: resolved.color ?? "",
      icon: resolved.icon,
    }
  }
  return map
}

const formatCaption = (
  captionType: string | undefined,
  captionIndex: number,
  label: string
): string => {
  if (!captionType || captionIndex === 0) return label
  return `${captionType} ${captionIndex}: ${label}`
}

const extractColumns = (rows: Record<string, unknown>[]): string[] =>
  rows.length === 0 ? [] : Object.keys(rows[0])

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ""
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

const copyToClipboard = (text: string) => navigator.clipboard.writeText(text)

const QueryResultsTable = ({ rows, query }: { rows: Record<string, unknown>[]; query: string }) => {
  const columns = extractColumns(rows)

  return (
    <details className="border-t border-solid border-neutral-border overflow-hidden">
      <summary className="px-4 py-2 text-xs text-subtext-color cursor-pointer select-none hover:bg-neutral-50">
        Query results ({rows.length} rows)
      </summary>
      <div className="flex items-start gap-1 px-4 py-2 bg-neutral-50 border-b border-solid border-neutral-border">
        <pre className="flex-1 min-w-0 text-xs text-subtext-color whitespace-pre-wrap break-words font-mono">
          {query}
        </pre>
        <button
          type="button"
          className="shrink-0 p-1 rounded hover:bg-neutral-200 text-subtext-color transition-colors"
          onClick={() => copyToClipboard(query)}
        >
          <Copy size={12} />
        </button>
      </div>
      <div className="overflow-auto max-h-64">
        <table className="w-max text-xs border-collapse">
          <thead>
            <tr className="bg-neutral-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-1.5 text-left font-medium text-subtext-color border-b border-solid border-neutral-border whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-solid border-neutral-border last:border-b-0">
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-1 text-default-font whitespace-nowrap max-w-48 truncate"
                  >
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export const ChartBlockView = ({
  data,
  onDelete,
  captionType,
  captionIndex,
}: ChartBlockViewProps) => {
  const isReadOnly = useIsReadOnly()
  const { files } = useFiles()
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string }>()
  const debugOptions = useDebugOptions()
  const showQueryResults = !!debugOptions.showQueryResults
  const [chartState, setChartState] = useState<ChartState>({ status: "loading" })

  const syncRevision = useSyncExternalStore(subscribeSyncRevision, getSyncRevision)

  useEffect(() => {
    let aborted = false

    const fetchData = async () => {
      const db = getDatabase()
      if (!db) return

      const result = await executeQuery<Record<string, unknown>>(db.instance, data.query)
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
  }, [data.query, syncRevision])

  const handleDatumClick = useCallback((url: string) => navigate(url), [navigate])

  const renderableData = useMemo(() => {
    if (chartState.status !== "ready") return null
    const entityMap = buildChartEntityMap(chartState.rows, files, projectId)
    const colorContext: ColorContext = {
      entityMap,
      resolveRadix: resolveRadixHex,
      shade: CHART_COLOR_SHADE,
      fallback: FALLBACK_COLOR,
    }
    const renderable = resolveChartData({
      spec: data.spec,
      rows: chartState.rows,
      entityMap,
      colorContext,
    })
    const tooltipContext: ChartTooltipContext = {
      files,
      projectId: projectId ?? null,
      entityMap,
      navigate,
    }
    return { renderable, tooltipContext }
  }, [chartState, data.spec, files, projectId, navigate])

  return (
    <div className="group/chart flex w-full flex-col overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background my-2 relative">
      {!isReadOnly && (
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover/chart:opacity-100 transition-opacity">
          <IconButton
            variant="neutral-tertiary"
            size="small"
            icon={<Trash2 />}
            onClick={onDelete}
          />
        </div>
      )}
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
        {renderableData && (
          <ChartRenderer
            renderable={renderableData.renderable}
            tooltipContext={renderableData.tooltipContext}
            onDatumClick={handleDatumClick}
          />
        )}
      </div>
      {showQueryResults && chartState.status === "ready" && (
        <QueryResultsTable rows={chartState.rows} query={data.query} />
      )}
      {data.caption.label && (
        <div className="px-4 pb-3">
          <span className="text-caption font-caption text-subtext-color italic">
            {formatCaption(captionType, captionIndex, data.caption.label)}
          </span>
        </div>
      )}
    </div>
  )
}
