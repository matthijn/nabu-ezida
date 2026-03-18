import { Settings, type TagDefinition } from "../schema"
import { getBlock } from "~/lib/data-blocks/query"
import { SETTINGS_FILE } from "~/lib/files/filename"

const getSettings = (raw: string): Settings | null => getBlock(raw, "json-settings", Settings)

export const getTagDefinitions = (files: Record<string, string>): TagDefinition[] =>
  getSettings(files[SETTINGS_FILE] ?? "")?.tags ?? []

export const findTagDefinitionById = (
  files: Record<string, string>,
  id: string
): TagDefinition | undefined => getTagDefinitions(files).find((t) => t.id === id)

export const findTagDefinitionByLabel = (
  files: Record<string, string>,
  label: string
): TagDefinition | undefined => getTagDefinitions(files).find((t) => t.label === label)
