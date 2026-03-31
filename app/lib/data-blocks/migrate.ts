import type { z } from "zod"
import { findBlocksByLanguage, parseBlockJson } from "./parse"
import type { CodeBlock } from "./parse"

export interface Migration {
  blockType: string
  from: z.ZodType
  upgrade: (markdown: string) => string
}

export interface MigrateResult {
  markdown: string
  changed: boolean
}

const blockMatchesOldSchema = (block: CodeBlock, from: z.ZodType): boolean => {
  const parsed = parseBlockJson(block)
  if (!parsed.ok) return false
  return from.safeParse(parsed.data).success
}

export const shouldMigrate = (markdown: string, migration: Migration): boolean =>
  findBlocksByLanguage(markdown, migration.blockType).some((block) =>
    blockMatchesOldSchema(block, migration.from)
  )

export const migrateFile = (markdown: string, migrations: readonly Migration[]): MigrateResult =>
  migrations.reduce<MigrateResult>(
    (acc, migration) => {
      if (!shouldMigrate(acc.markdown, migration)) return acc
      return { markdown: migration.upgrade(acc.markdown), changed: true }
    },
    { markdown, changed: false }
  )
