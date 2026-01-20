export type Code = {
  id: string
  name: string
  color: string
  detail: string
}

export type CodeCategory = {
  name: string
  codes: Code[]
}

export type Codebook = {
  categories: CodeCategory[]
}
