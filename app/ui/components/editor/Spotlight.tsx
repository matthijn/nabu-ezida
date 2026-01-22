"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import type { Spotlight } from "~/domain/spotlight"
import { serializeSpotlight } from "~/domain/spotlight"
import { findText, findTextRange } from "~/lib/text"

type SpotlightOverlayProps = {
  spotlight: Spotlight | null
  containerRef: React.RefObject<HTMLElement | null>
}

type Rect = { top: number; left: number; height: number }

type TextRange = { start: number; end: number }

const findSpotlightRange = (spotlight: Spotlight, text: string): TextRange | null => {
  if (spotlight.type === "single") {
    const match = findText(spotlight.text, text)
    return match ? { start: match.start, end: match.end } : null
  }
  return findTextRange(spotlight.from, spotlight.to, text)
}

type NodeOffset = { node: Node; start: number; end: number }

const collectTextNodes = (container: HTMLElement): NodeOffset[] => {
  const nodes: NodeOffset[] = []
  let offset = 0

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0
      if (length > 0) {
        nodes.push({ node, start: offset, end: offset + length })
        offset += length
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of node.childNodes) {
        walk(child)
      }
    }
  }

  walk(container)
  return nodes
}

const findNodesInRange = (nodes: NodeOffset[], range: TextRange): Node[] =>
  nodes
    .filter(n => n.start < range.end && n.end > range.start)
    .map(n => n.node)

const getParentElement = (node: Node): HTMLElement | null =>
  node.parentElement

const calculateOverlayRect = (
  nodes: Node[],
  container: HTMLElement
): Rect | null => {
  if (nodes.length === 0) return null

  const elements = nodes
    .map(getParentElement)
    .filter((el): el is HTMLElement => el !== null)

  if (elements.length === 0) return null

  const containerRect = container.getBoundingClientRect()
  const firstRect = elements[0].getBoundingClientRect()
  const lastRect = elements[elements.length - 1].getBoundingClientRect()

  return {
    top: firstRect.top - containerRect.top,
    left: 0,
    height: lastRect.bottom - firstRect.top,
  }
}

const BORDER_WIDTH = 3
const BORDER_OFFSET = 24

const toSpotlightKey = (spotlight: Spotlight | null): string | null =>
  spotlight ? serializeSpotlight(spotlight) : null

export const SpotlightOverlay = ({ spotlight, containerRef }: SpotlightOverlayProps) => {
  const [rect, setRect] = useState<Rect | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const scrolledForRef = useRef<string | null>(null)

  const spotlightKey = toSpotlightKey(spotlight)

  const updateSpotlight = useCallback(() => {
    const container = containerRef.current
    if (!container || !spotlight) {
      setRect(null)
      return false
    }

    const text = container.textContent ?? ""
    const range = findSpotlightRange(spotlight, text)
    if (!range) return false

    const textNodes = collectTextNodes(container)
    const nodes = findNodesInRange(textNodes, range)
    if (nodes.length === 0) return false

    const key = toSpotlightKey(spotlight)
    if (scrolledForRef.current !== key) {
      const firstElement = getParentElement(nodes[0])
      firstElement?.scrollIntoView({ behavior: "smooth", block: "center" })
      scrolledForRef.current = key
    }

    const newRect = calculateOverlayRect(nodes, container)
    setRect(newRect)
    return true
  }, [spotlight, containerRef])

  useEffect(() => {
    setRect(null)

    const container = containerRef.current
    if (!spotlight || !container) return

    if (updateSpotlight()) return

    observerRef.current = new MutationObserver(() => {
      if (updateSpotlight()) {
        observerRef.current?.disconnect()
      }
    })

    observerRef.current.observe(container, { childList: true, subtree: true })

    return () => {
      observerRef.current?.disconnect()
    }
  }, [spotlightKey, containerRef, updateSpotlight])

  useEffect(() => {
    const handleResize = () => updateSpotlight()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [updateSpotlight])

  if (!rect || !containerRef.current) return null

  return createPortal(
    <div
      style={{
        position: "absolute",
        top: rect.top,
        left: -BORDER_OFFSET,
        width: BORDER_WIDTH,
        height: rect.height,
        backgroundColor: "var(--color-brand-200)",
        borderRadius: 2,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />,
    containerRef.current
  )
}
