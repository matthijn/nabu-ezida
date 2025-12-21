export type MediaBlockType = "image" | "video" | "audio" | "file"

export type MediaProps = {
  url?: string
  caption?: string
  preview_width?: number
  name?: string
}
