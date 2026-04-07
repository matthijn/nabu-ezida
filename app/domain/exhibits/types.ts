export type ExhibitKind = "chart"

export type ChartSubtype = "bar" | "line" | "pie" | "scatter" | "other"

export interface ExhibitItem {
  id: string
  title: string
  kind: ExhibitKind
  subtype: ChartSubtype
  documentId: string
  documentTitle: string
}
