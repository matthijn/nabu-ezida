import { diffLines } from "diff"
import { findSingletonBlock, replaceSingletonBlock } from "~/domain/blocks/parse"

export type JsonBlockPatchResult =
  | { ok: true; patch: string }
  | { ok: false; error: string }

export const formatJson = (obj: object): string => JSON.stringify(obj, null, "\t")

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

export const generateBlockContentDiff = (
  oldDoc: string,
  newDoc: string,
  blockLanguage: string
): JsonBlockPatchResult => {
  const oldBlock = findSingletonBlock(oldDoc, blockLanguage)
  const newBlock = findSingletonBlock(newDoc, blockLanguage)

  if (!oldBlock && !newBlock) return { ok: true, patch: "" }

  if (!oldBlock && newBlock) {
    const blockText = newDoc.slice(newBlock.start, newBlock.end)
    const lines = blockText.split("\n")
    return { ok: true, patch: "@@\n" + prefixLines(["", ...lines], "+").join("\n") }
  }

  if (oldBlock && !newBlock) {
    return { ok: false, error: "Block removed unexpectedly" }
  }

  if (oldBlock!.content.trim() === newBlock!.content.trim()) {
    return { ok: true, patch: "" }
  }

  const diffedLines = generateLineDiff(oldBlock!.content, newBlock!.content)

  const patchLines = ["@@"]
  patchLines.push("```" + blockLanguage)
  patchLines.push(...diffedLines)
  patchLines.push("```")

  return { ok: true, patch: patchLines.join("\n") }
}

export const generateJsonBlockPatch = (
  docContent: string,
  blockLanguage: string,
  newJson: object
): JsonBlockPatchResult => {
  const newDoc = replaceSingletonBlock(docContent, blockLanguage, formatJson(newJson))
  return generateBlockContentDiff(docContent, newDoc, blockLanguage)
}
