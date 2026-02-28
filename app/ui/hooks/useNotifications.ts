import { useEffect, useRef } from "react"
import { subscribeLoading, getLoading, subscribeBlocks, getAllBlocks } from "~/lib/agent/block-store"
import { isDebugPauseBlock, isErrorResult } from "~/lib/agent"
import type { Block } from "~/lib/agent"
import { truncateLabel } from "~/lib/mutation-history"

type NotificationEvent = { title: string; body: string }

const formatBody = (text: string): string =>
  truncateLabel(text.replace(/\n/g, " ").trim(), 100)

const findLastTextContent = (blocks: Block[]): string => {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "text") return block.content
  }
  return ""
}

const findToolCallArg = (blocks: Block[], callId: string, argName: string): string | null => {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type !== "tool_call") continue
    const call = block.calls.find((c) => c.id === callId)
    if (!call) continue
    const value = call.args[argName]
    return typeof value === "string" ? value : null
  }
  return null
}

const isSuccessfulToolResult = (block: Block, toolName: string): boolean =>
  block.type === "tool_result" && block.toolName === toolName && !isErrorResult(block.result)

const detectNewBlockEvents = (newBlocks: Block[], allBlocks: Block[]): NotificationEvent[] =>
  newBlocks.flatMap((block): NotificationEvent[] => {
    if (isDebugPauseBlock(block))
      return [{ title: "Nabu — Paused", body: "Tool error — waiting for continue" }]
    if (block.type !== "tool_result") return []
    if (isSuccessfulToolResult(block, "submit_plan"))
      return [{ title: "Nabu — Plan Created", body: formatBody(findToolCallArg(allBlocks, block.callId, "task") ?? "New plan submitted") }]
    if (isSuccessfulToolResult(block, "complete_step"))
      return [{ title: "Nabu — Step Complete", body: formatBody(findToolCallArg(allBlocks, block.callId, "summary") ?? "Step completed") }]
    return []
  })

const ensurePermission = (): void => {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission()
  }
}

const isPermitted = (): boolean =>
  typeof Notification !== "undefined" && Notification.permission === "granted"

const fireNotification = (title: string, body: string): void => {
  if (!document.hidden) return
  if (!isPermitted()) { ensurePermission(); return }
  const n = new Notification(title, { body })
  n.onclick = () => { window.focus(); n.close() }
}

export const useNotifications = (): void => {
  const prevLoading = useRef(getLoading())
  const prevBlockCount = useRef(getAllBlocks().length)

  useEffect(() => {
    const onLoadingChange = () => {
      const loading = getLoading()
      const wasLoading = prevLoading.current
      prevLoading.current = loading
      if (wasLoading && !loading) {
        const body = formatBody(findLastTextContent(getAllBlocks()))
        fireNotification("Nabu", body || "Agent finished")
      }
    }

    const onBlocksChange = () => {
      const allBlocks = getAllBlocks()
      const prev = prevBlockCount.current
      prevBlockCount.current = allBlocks.length
      if (allBlocks.length <= prev) return
      const newBlocks = allBlocks.slice(prev)
      detectNewBlockEvents(newBlocks, allBlocks).forEach((e) => fireNotification(e.title, e.body))
    }

    const unsubLoading = subscribeLoading(onLoadingChange)
    const unsubBlocks = subscribeBlocks(onBlocksChange)
    return () => { unsubLoading(); unsubBlocks() }
  }, [])
}
