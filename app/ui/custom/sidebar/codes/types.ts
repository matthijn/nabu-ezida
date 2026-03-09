export type Code = {
  id: string
  name: string
  color: string
  detail: string
}

export type CodeCategory = {
  fileId: string
  name: string
  codes: Code[]
}

export type Codebook = {
  categories: CodeCategory[]
}
