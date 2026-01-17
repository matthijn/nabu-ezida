import type { Annotation } from "./annotations"
import type { Block } from "./block"

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
  blocks: Record<string, Block>
  head_id: string
  tail_id: string
  annotations: Record<string, Annotation>
}

export type Document = {
  id: string
  healthy: boolean
  version: number
} & DocumentData
