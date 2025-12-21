import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { Annotation, ResolvedAnnotation } from "~/domain/document"
import { findTextPosition } from "~/domain/document"

type TextNodeInfo = {
  textStart: number
  textEnd: number
  docStart: number
}

const collectTextNodes = (doc: ProseMirrorNode): TextNodeInfo[] => {
  const nodes: TextNodeInfo[] = []
  let textOffset = 0

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      const len = node.text.length
      nodes.push({
        textStart: textOffset,
        textEnd: textOffset + len,
        docStart: pos,
      })
      textOffset += len
    }
    return true
  })

  return nodes
}

const textPosToDocPos = (nodes: TextNodeInfo[], textPos: number): number => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const isLast = i === nodes.length - 1
    const inRange = isLast
      ? textPos >= node.textStart && textPos <= node.textEnd
      : textPos >= node.textStart && textPos < node.textEnd

    if (inRange) {
      return node.docStart + (textPos - node.textStart)
    }
  }
  return 0
}

const resolveAnnotation = (
  nodes: TextNodeInfo[],
  fullText: string,
  annotation: Annotation
): ResolvedAnnotation | null => {
  const pos = findTextPosition(fullText, annotation.text)
  if (!pos) return null

  return {
    id: annotation.id,
    from: textPosToDocPos(nodes, pos.from),
    to: textPosToDocPos(nodes, pos.to),
    color: annotation.color,
  }
}

export const resolveAnnotations = (
  doc: ProseMirrorNode,
  annotations: Annotation[]
): ResolvedAnnotation[] => {
  const fullText = doc.textContent
  const nodes = collectTextNodes(doc)

  return annotations
    .map(a => resolveAnnotation(nodes, fullText, a))
    .filter((a): a is ResolvedAnnotation => a !== null)
}

export { collectTextNodes, textPosToDocPos }
