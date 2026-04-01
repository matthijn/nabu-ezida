import { z } from "zod"
import type { Migration } from "~/lib/data-blocks/migrate"
import { findSingletonBlock, parseBlockJson, replaceBlock } from "~/lib/data-blocks/parse"

const oldAttributesShape = z
  .object({
    tags: z.array(z.string()).optional(),
    annotations: z.array(z.any()),
  })
  .strict()

const formatBlock = (language: string, content: string): string =>
  `\`\`\`${language}\n${content}\n\`\`\``

const upgradeMarkdown = (markdown: string): string => {
  const block = findSingletonBlock(markdown, "json-attributes")
  if (!block) return markdown

  const parsed = parseBlockJson<z.infer<typeof oldAttributesShape>>(block)
  if (!parsed.ok) return markdown

  const result = oldAttributesShape.safeParse(parsed.data)
  if (!result.success) return markdown

  const { annotations, ...rest } = result.data
  const withCleanedBlock = replaceBlock(markdown, block, JSON.stringify(rest, null, 2))

  const annotationsBlock = formatBlock("json-annotations", JSON.stringify({ annotations }, null, 2))

  return withCleanedBlock.trimEnd() + "\n\n" + annotationsBlock + "\n"
}

export const extractAnnotations: Migration = {
  blockType: "json-attributes",
  from: oldAttributesShape,
  upgrade: upgradeMarkdown,
}
