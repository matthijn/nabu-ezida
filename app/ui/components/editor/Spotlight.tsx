"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import type { Spotlight } from "~/domain/spotlight"
import { serializeSpotlight } from "~/domain/spotlight"

type SpotlightOverlayProps = {
  spotlight: Spotlight | null
  containerRef: React.RefObject<HTMLElement | null>
}

type Rect = { top: number; left: number; height: number }

const blockIdSelector = (id: string): string =>
  `[data-block-id="${id}"]`

const findBlockElement = (container: HTMLElement, blockId: string): HTMLElement | null =>
  container.querySelector(blockIdSelector(blockId))

const findBlockElements = (container: HTMLElement, spotlight: Spotlight): HTMLElement[] => {
  if (spotlight.type === "single") {
    const el = findBlockElement(container, spotlight.blockId)
    return el ? [el] : []
  }

  const fromEl = findBlockElement(container, spotlight.from)
  const toEl = findBlockElement(container, spotlight.to)
  if (!fromEl || !toEl) return []

  const blocks: HTMLElement[] = []
  let current: Element | null = fromEl
  const toId = spotlight.to

  while (current) {
    if (current instanceof HTMLElement && current.hasAttribute("data-block-id")) {
      blocks.push(current)
      if (current.getAttribute("data-block-id") === toId) break
    }
    current = current.nextElementSibling
  }

  return blocks
}

const calculateOverlayRect = (
  blocks: HTMLElement[],
  container: HTMLElement
): Rect | null => {
  if (blocks.length === 0) return null

  const containerRect = container.getBoundingClientRect()
  const firstRect = blocks[0].getBoundingClientRect()
  const lastRect = blocks[blocks.length - 1].getBoundingClientRect()

  return {
    top: firstRect.top - containerRect.top,
    left: 0,
    height: lastRect.bottom - firstRect.top,
  }
}

const BORDER_WIDTH = 3
const BORDER_OFFSET = 8

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

    const blocks = findBlockElements(container, spotlight)
    if (blocks.length === 0) return false

    const key = toSpotlightKey(spotlight)
    if (scrolledForRef.current !== key) {
      blocks[0].scrollIntoView({ behavior: "smooth", block: "center" })
      scrolledForRef.current = key
    }

    const newRect = calculateOverlayRect(blocks, container)
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
