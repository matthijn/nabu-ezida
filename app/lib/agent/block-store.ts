import type { Block, BlockOrigin } from "./types"

export type TaggedBlock = Block & { origin: BlockOrigin }

let blocks: TaggedBlock[] = []
let listeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())

export const pushBlocks = (newBlocks: TaggedBlock[]): void => {
  blocks = [...blocks, ...newBlocks]
  recomputeInstances()
  notify()
}

export const tagBlocks = (origin: BlockOrigin, raw: Block[]): TaggedBlock[] =>
  raw.map((block) => ({ ...block, origin }))

export const getAllBlocks = (): TaggedBlock[] => blocks

export const getBlocksForInstance = (instance: string): TaggedBlock[] =>
  blocks.filter((b) => b.origin.instance === instance)

export const getBlocksForInstances = (instances: string[]): TaggedBlock[] =>
  blocks.filter((b) => instances.includes(b.origin.instance))

let cachedInstances: string[] = []
let cachedAgents: string[] = []

const recomputeInstances = (): void => {
  cachedInstances = [...new Set(blocks.map((b) => b.origin.instance))]
  cachedAgents = [...new Set(blocks.map((b) => b.origin.agent))]
}

export const getInstances = (): string[] => cachedInstances
export const getAgents = (): string[] => cachedAgents

export const clearBlocks = (): void => {
  blocks = []
  cachedInstances = []
  cachedAgents = []
  notify()
}

export const retagBlocks = (blocks: TaggedBlock[], newOrigin: BlockOrigin): TaggedBlock[] =>
  blocks.map((b) => ({ ...b, origin: newOrigin }))

const isToolCallWithName = (block: TaggedBlock, name: string): boolean =>
  block.type === "tool_call" && block.calls.some((c) => c.name === name)

const isSuccessfulResultFor = (block: TaggedBlock, callId: string): boolean =>
  block.type === "tool_result" &&
  block.callId === callId &&
  (block.result as { status?: string })?.status === "ok"

const findCallId = (block: TaggedBlock, toolName: string): string | null => {
  if (block.type !== "tool_call") return null
  const call = block.calls.find((c) => c.name === toolName)
  return call?.id ?? null
}

export const findLastSuccessfulCalls = (source: TaggedBlock[], toolNames: string[]): TaggedBlock[] => {
  const found = new Map<string, TaggedBlock[]>()

  for (let i = source.length - 1; i >= 0; i--) {
    const block = source[i]
    for (const name of toolNames) {
      if (found.has(name)) continue
      if (!isToolCallWithName(block, name)) continue
      const callId = findCallId(block, name)
      if (!callId) continue
      const resultBlock = source.slice(i + 1).find((b) => isSuccessfulResultFor(b, callId))
      if (resultBlock) found.set(name, [block, resultBlock])
    }
    if (found.size === toolNames.length) break
  }

  return toolNames.flatMap((name) => found.get(name) ?? [])
}

export const subscribeBlocks = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

let activeOrigin: BlockOrigin | null = null

export const setActiveOrigin = (origin: BlockOrigin | null): void => {
  activeOrigin = origin
}

export const getActiveOrigin = (): BlockOrigin | null => activeOrigin
