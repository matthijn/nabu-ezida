import type { Annotation } from "./annotations"
import type { Block } from "./block"

export type DocumentData = {
  project_id: string
  name: string
  description: string
  title?: string
  time?: string
  updated_at: string
  original: string
  pinned: boolean
  tags: string[]
  content: Block[]
  annotations: Record<string, Annotation>
}

export type Document = {
  id: string
  healthy: boolean
  version: number
} & DocumentData
