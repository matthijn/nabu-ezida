export type ImportStatus =
  | "pending"
  | "reading"
  | "processing"
  | "completed"
  | "unsupported"
  | "error"

export interface ImportFile {
  id: string
  name: string
  size: number
  status: ImportStatus
  error?: string
  finalPath?: string
}

export interface ImportProgress {
  total: number
  completed: number
  failed: number
  unsupported: number
}
