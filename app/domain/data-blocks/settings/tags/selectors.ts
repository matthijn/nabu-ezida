import { Settings, type TagDefinition } from "../schema"
import { getBlock } from "~/lib/data-blocks/query"
import { SETTINGS_FILE } from "~/lib/files/filename"
import type { FileStore } from "~/lib/files"

const getSettings = (raw: string): Settings | null => getBlock(raw, "json-settings", Settings)

export const getTagDefinitions = (files: FileStore): TagDefinition[] =>
  getSettings(files[SETTINGS_FILE] ?? "")?.tags ?? []

export const findTagDefinitionById = (files: FileStore, id: string): TagDefinition | undefined =>
  getTagDefinitions(files).find((t) => t.id === id)

export const findTagDefinitionByLabel = (
  files: FileStore,
  label: string
): TagDefinition | undefined => getTagDefinitions(files).find((t) => t.label === label)
