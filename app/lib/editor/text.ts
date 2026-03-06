import type { Node } from "prosemirror-model"

export type TextRange = { from: number; to: number }

const isCodeBlock = (node: Node): boolean => node.type.name === "code_block"

export const proseTextContent = (doc: Node): string => {
  let text = ""
  doc.descendants((node) => {
    if (isCodeBlock(node)) return false
    if (node.isLeaf && node.textContent.length > 0) text += node.textContent
    return !node.isLeaf
  })
  return text
}

export const textOffsetToPos = (doc: Node, offset: number): number => {
  let result = 0
  let textSeen = 0
  let found = false
  let lastNodeEnd = 0

  doc.descendants((node, nodePos) => {
    if (found || textSeen > offset) return false
    if (isCodeBlock(node)) return false

    const nodeText = node.textContent
    const len = nodeText.length

    if (len > 0 && node.isLeaf) {
      lastNodeEnd = nodePos + node.nodeSize
      if (textSeen + len > offset) {
        result = nodePos + (offset - textSeen)
        found = true
        return false
      }
      textSeen += len
    }

    return !node.isLeaf
  })

  if (!found && offset === textSeen) {
    return lastNodeEnd
  }

  return result
}

export const findAllTextRanges = (doc: Node, searchText: string): TextRange[] => {
  const docText = proseTextContent(doc)
  const ranges: TextRange[] = []
  let start = 0
  while (true) {
    const offset = docText.indexOf(searchText, start)
    if (offset === -1) return ranges
    ranges.push({
      from: textOffsetToPos(doc, offset),
      to: textOffsetToPos(doc, offset + searchText.length),
    })
    start = offset + 1
  }
}
