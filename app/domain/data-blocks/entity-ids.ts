import type { FileStore } from "~/lib/files/store"
import { collectAllEntityIds } from "~/lib/data-blocks/ids"
import { getCallouts } from "~/domain/data-blocks/callout/selectors"
import { getStoredAnnotations } from "~/domain/data-blocks/attributes/annotations/selectors"
import { getCharts } from "~/domain/data-blocks/chart/selectors"
import { getSettings } from "~/domain/data-blocks/settings/selectors"

const extractCalloutIds = (raw: string): string[] => getCallouts(raw).map((c) => c.id)

const extractAnnotationIds = (raw: string): string[] =>
  getStoredAnnotations(raw).flatMap((a) => (a.id ? [a.id] : []))

const extractChartIds = (raw: string): string[] => getCharts(raw).map((c) => c.id)

const extractSettingsIds = (raw: string): string[] => {
  const s = getSettings(raw)
  return [...(s?.tags ?? []).map((t) => t.id), ...(s?.searches ?? []).map((e) => e.id)]
}

const entityIdExtractors = [
  extractCalloutIds,
  extractAnnotationIds,
  extractChartIds,
  extractSettingsIds,
]

export const getKnownEntityIds = (files: FileStore): Set<string> =>
  collectAllEntityIds(files, entityIdExtractors)
