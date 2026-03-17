export interface Code {
  id: string
  name: string
  color: string
  detail: string
}

export interface CodeCategory {
  fileId: string
  name: string
  codes: Code[]
}

export interface Codebook {
  categories: CodeCategory[]
}
