"use client"

import { useCallback, useRef, useEffect, useLayoutEffect, useState } from "react"
import { createPortal } from "react-dom"
import type { Annotation } from "~/domain/data-blocks/attributes/annotations/selectors"
import { HighlightTooltip, type HighlightEntry } from "~/ui/components/HighlightTooltip"
import { elementBorder } from "~/ui/theme/radix"
import { getCodeTitle, getFiles } from "~/lib/files"
import { patchBlock } from "~/lib/data-blocks/patch"

interface HoverState {
  text: string
  element: HTMLElement
}

interface AnnotationHoverProps {
  annotations: Annotation[]
  filePath?: string
  children: React.ReactNode
}

const TOOLTIP_GAP = 4
const BRIDGE_UPWARD = 5
const ANNOTATIONS_LANGUAGE = "json-annotations"

const isDecoration = (el: HTMLElement): boolean =>
  el.style.background !== "" && el.style.background !== "none"

const isWithinRect = (x: number, y: number, rect: DOMRect): boolean =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

const findMatchingAnnotations = (annotations: Annotation[], text: string): Annotation[] =>
  annotations.filter((a) => a.text.includes(text))

const removeAnnotationOp = (id: string) => [
  { op: "remove" as const, path: `/annotations[id=${id}]` },
]

const clearReviewOp = (id: string) => [
  { op: "remove" as const, path: `/annotations[id=${id}]/review` },
]

const buildDeleteCallback = (filePath: string, id: string) => () => {
  patchBlock(filePath, ANNOTATIONS_LANGUAGE, removeAnnotationOp(id))
}

const buildResolveCallback = (filePath: string, id: string) => () => {
  patchBlock(filePath, ANNOTATIONS_LANGUAGE, clearReviewOp(id))
}

const annotationToEntry =
  (files: Record<string, string>, filePath?: string) =>
  (annotation: Annotation, index: number): HighlightEntry => {
    const id = annotation.id
    const canMutate = !!filePath && !!id
    return {
      id: id ?? String(index),
      color: elementBorder(annotation.color),
      title: annotation.code ? getCodeTitle(files, annotation.code) : undefined,
      description: annotation.reason,
      review: annotation.review,
      onDelete: canMutate ? buildDeleteCallback(filePath, id) : undefined,
      onResolve: canMutate && annotation.review ? buildResolveCallback(filePath, id) : undefined,
    }
  }

const getLastLineRect = (el: HTMLElement): DOMRect => {
  const rects = el.getClientRects()
  return rects.length > 0 ? rects[rects.length - 1] : el.getBoundingClientRect()
}

const getFirstLineRect = (el: HTMLElement): DOMRect => {
  const rects = el.getClientRects()
  return rects.length > 0 ? rects[0] : el.getBoundingClientRect()
}

export const AnnotationHover = ({ annotations, filePath, children }: AnnotationHoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const bridgeRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const dismiss = useCallback(() => setHover(null), [])

  const isOnBridge = useCallback((e: MouseEvent) => {
    const bridge = bridgeRef.current
    if (!bridge) return false
    return (
      bridge.contains(e.target as HTMLElement) ||
      isWithinRect(e.clientX, e.clientY, bridge.getBoundingClientRect())
    )
  }, [])

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!isDecoration(target)) return
    const text = target.textContent ?? ""
    if (!text) return
    setHover({ text, element: target })
  }, [])

  const handleMouseLeave = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!isDecoration(target)) return
      if (isOnBridge(e)) return
      dismiss()
    },
    [isOnBridge, dismiss]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener("mouseenter", handleMouseEnter, true)
    container.addEventListener("mouseleave", handleMouseLeave, true)
    return () => {
      container.removeEventListener("mouseenter", handleMouseEnter, true)
      container.removeEventListener("mouseleave", handleMouseLeave, true)
    }
  }, [handleMouseEnter, handleMouseLeave])

  useEffect(() => {
    if (!hover) return

    const handleMouseMove = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (isDecoration(target)) return
      if (isOnBridge(e)) return
      dismiss()
    }

    document.addEventListener("mousemove", handleMouseMove)
    return () => document.removeEventListener("mousemove", handleMouseMove)
  }, [hover, isOnBridge, dismiss])

  const matchingAnnotations = hover ? findMatchingAnnotations(annotations, hover.text) : []
  const files = getFiles()
  const entries = matchingAnnotations.map(annotationToEntry(files, filePath))

  useLayoutEffect(() => {
    const bridge = bridgeRef.current
    const container = containerRef.current
    if (!bridge || !hover || !container) return

    const lastRect = getLastLineRect(hover.element)
    const firstRect = getFirstLineRect(hover.element)

    const inner = bridge.firstElementChild as HTMLElement
    if (!inner) return
    const contentHeight = inner.offsetHeight
    const contentWidth = inner.offsetWidth

    const belowTop = lastRect.bottom + TOOLTIP_GAP
    const fitsBelow = belowTop + contentHeight <= window.innerHeight

    if (fitsBelow) {
      const bridgeTop = lastRect.bottom - BRIDGE_UPWARD
      bridge.style.left = `${lastRect.left}px`
      bridge.style.width = `${contentWidth}px`
      bridge.style.top = `${bridgeTop}px`
      bridge.style.paddingTop = `${lastRect.bottom - bridgeTop + TOOLTIP_GAP}px`
      bridge.style.paddingBottom = "0"
      inner.style.marginLeft = "0"
    } else {
      const tooltipTop = firstRect.top - TOOLTIP_GAP - contentHeight
      bridge.style.left = `${firstRect.left}px`
      bridge.style.width = `${contentWidth}px`
      bridge.style.top = `${tooltipTop}px`
      bridge.style.paddingTop = "0"
      bridge.style.paddingBottom = `${firstRect.top + BRIDGE_UPWARD - tooltipTop - contentHeight}px`
      inner.style.marginLeft = "0"
    }

    bridge.style.visibility = "visible"
  }, [hover])

  return (
    <div ref={containerRef} className="relative">
      {children}
      {hover &&
        entries.length > 0 &&
        createPortal(
          <div
            ref={bridgeRef}
            style={{
              position: "fixed",
              zIndex: 50,
              visibility: "hidden",
              pointerEvents: "none",
              background: "transparent",
            }}
          >
            <div style={{ pointerEvents: "auto" }}>
              <HighlightTooltip entries={entries} />
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
