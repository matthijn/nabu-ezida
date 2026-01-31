import { diffLines } from "diff"
import { findSingletonBlock } from "~/domain/blocks/parse"

export type JsonBlockPatchResult =
  | { ok: true; patch: string }
  | { ok: false; error: string }

const formatJson = (obj: object): string => JSON.stringify(obj, null, 2)

const prefixLines = (lines: string[], prefix: string): string[] =>
  lines.map((line) => prefix + line)

const generateLineDiff = (oldStr: string, newStr: string): string[] => {
  const changes = diffLines(oldStr, newStr)
  const result: string[] = []

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n")
    if (change.added) {
      result.push(...prefixLines(lines, "+"))
    } else if (change.removed) {
      result.push(...prefixLines(lines, "-"))
    } else {
      result.push(...lines)
    }
  }

  return result
}

export const generateJsonBlockPatch = (
  docContent: string,
  blockLanguage: string,
  newJson: object
): JsonBlockPatchResult => {
  const block = findSingletonBlock(docContent, blockLanguage)
  const newJsonStr = formatJson(newJson)

  if (!block) {
    const newBlock = "```" + blockLanguage + "\n" + newJsonStr + "\n```"
    const lines = newBlock.split("\n")
    const patch = "@@\n" + prefixLines(["", ...lines], "+").join("\n")
    return { ok: true, patch }
  }

  const oldJsonStr = block.content

  if (oldJsonStr.trim() === newJsonStr.trim()) {
    return { ok: true, patch: "" }
  }

  const diffedLines = generateLineDiff(oldJsonStr, newJsonStr)

  const patchLines = ["@@"]
  patchLines.push("```" + blockLanguage)
  patchLines.push(...diffedLines)
  patchLines.push("```")

  return { ok: true, patch: patchLines.join("\n") }
}
