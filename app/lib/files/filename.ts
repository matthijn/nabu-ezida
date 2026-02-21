export const PREFERENCES_FILE = "preferences.md"

export const normalizeFilename = (name: string): string =>
  name.toLowerCase().replace(/ /g, "_")

export const toDisplayName = (filename: string): string =>
  filename
    .replace(/\.md$/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
