import type { Annotation } from "./annotations"

export type Tag = {
  id: string
}

export type DocumentData = {
  project_id: string
  name: string
  description: string
  title?: string
  time?: string
  updated_at: string
  pinned: boolean
  tags: Record<string, Tag>
  annotations: Record<string, Annotation>
}

export type Document = {
  id: string
  healthy: boolean
  version: number
} & DocumentData
