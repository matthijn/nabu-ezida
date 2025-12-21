import type { Document } from "../document"

export type ProjectData = {
  name: string
  description: string
  pinned: boolean
  updated_at: string
}

export type Project = {
  id: string
  healthy: boolean
  version: number
  documents: Record<string, Document>
} & ProjectData
