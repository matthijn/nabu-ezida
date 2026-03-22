import { SETTINGS_FILE } from "~/lib/files/filename"

const EXCLUDED_FILES = new Set(["preferences.md", SETTINGS_FILE])

const endsWithMd = (filename: string): boolean => filename.endsWith(".md")

const isHidden = (filename: string): boolean => filename.includes(".hidden.")

export const isEmbeddableFile = (filename: string): boolean =>
  endsWithMd(filename) && !isHidden(filename) && !EXCLUDED_FILES.has(filename)
