export type ImportStatus =
  | "pending"
  | "reading"
  | "processing"
  | "completed"
  | "unsupported"
  | "error"

export type ImportFile = {
  id: string
  name: string
  size: number
  status: ImportStatus
  error?: string
  finalPath?: string
}

export type ImportProgress = {
  total: number
  completed: number
  failed: number
  unsupported: number
}
