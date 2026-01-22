import type { Block, SystemBlock } from "~/lib/agent"

export type EditorContext = {
  documentId: string
  documentTitle: string
  above: string[]
  below: string[]
  selection?: string
}

type GetContextFn = () => EditorContext | null

let getContextFn: GetContextFn | undefined

export const setEditorContext = (fn: GetContextFn | undefined): void => {
  getContextFn = fn
}

export const getEditorContext = (): EditorContext | null =>
  getContextFn?.() ?? null

const CONTEXT_PREFIX = "User is looking at:"

export const contextToMessage = (ctx: EditorContext): string => {
  const lines = [
    CONTEXT_PREFIX,
    `Document: ${ctx.documentTitle} (${ctx.documentId})`,
  ]
  if (ctx.above.length > 0) {
    lines.push("", "Above cursor:", ...ctx.above)
  }
  if (ctx.below.length > 0) {
    lines.push("", "Below cursor:", ...ctx.below)
  }
  if (ctx.selection) {
    lines.push("", "Selected:", ctx.selection)
  }
  return lines.join("\n")
}

const isContextBlock = (block: Block): block is SystemBlock =>
  block.type === "system" && block.content.startsWith(CONTEXT_PREFIX)

export const findLastContextMessage = (history: Block[]): string | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isContextBlock(block)) {
      return block.content
    }
  }
  return null
}
