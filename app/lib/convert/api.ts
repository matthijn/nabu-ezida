import { runPrompt, createToolExecutor } from "~/lib/agent"
import type { Document } from "~/domain/document"
import { blocksToArrayWithChildren } from "~/domain/document"

const formatContext = (doc: Document): string => {
  const blocks = blocksToArrayWithChildren(doc)
  return `Document: ${doc.name} (${doc.id})\n\nBlocks:\n${JSON.stringify(blocks, null, 2)}`
}

export const convertDocument = async (
  doc: Document,
  kind: string,
  signal?: AbortSignal
): Promise<void> => {
  const endpoint = `/convert/${kind}?tool_choice=required`
  console.log(`[Convert] Calling ${endpoint} for doc ${doc.id}`)

  const context = formatContext(doc)
  const executor = createToolExecutor({})

  await runPrompt(endpoint, context, executor, signal)
  console.log(`[Convert] Completed ${endpoint} for doc ${doc.id}`)
}
