import { z } from "zod"
import type { Migration } from "~/lib/data-blocks/migrate"
import { findSingletonBlock, parseBlockJson, replaceBlock } from "~/lib/data-blocks/parse"

const oldAnnotationsShape = z.array(z.unknown())

const upgradeMarkdown = (markdown: string): string => {
  const block = findSingletonBlock(markdown, "json-annotations")
  if (!block) return markdown

  const parsed = parseBlockJson<unknown[]>(block)
  if (!parsed.ok) return markdown

  const result = oldAnnotationsShape.safeParse(parsed.data)
  if (!result.success) return markdown

  return replaceBlock(markdown, block, JSON.stringify({ annotations: result.data }, null, 2))
}

export const wrapAnnotations: Migration = {
  blockType: "json-annotations",
  from: oldAnnotationsShape,
  upgrade: upgradeMarkdown,
}
