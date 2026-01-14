"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import type { Annotation } from "~/domain/document/annotations"
import { HighlightTooltip, type HighlightEntry } from "~/ui/components/HighlightTooltip"
import { elementBorder } from "~/lib/colors/radix"

type HoverState = {
  ids: string[]
  rect: DOMRect
}

type AnnotationHoverProps = {
  annotations: Annotation[]
  children: React.ReactNode
}

const TOOLTIP_GAP = 4

const findAnnotationsByIds = (annotations: Annotation[], ids: string[]): Annotation[] =>
  ids.map(id => annotations.find(a => a.id === id)).filter((a): a is Annotation => a !== undefined)

const annotationToEntry = (annotation: Annotation): HighlightEntry | null => {
  if (!annotation.id) return null
  return {
    id: annotation.id,
    color: elementBorder(annotation.color),
    title: undefined,
    description: annotation.reason ?? `Highlighted by ${annotation.actor}`,
    onDelete: () => {},
  }
}

const toEntries = (annotations: Annotation[]): HighlightEntry[] =>
  annotations.map(annotationToEntry).filter((e): e is HighlightEntry => e !== null)

export const AnnotationHover = ({ annotations, children }: AnnotationHoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    const idsAttr = target.getAttribute("data-annotation-ids")
    if (!idsAttr) return

    const ids = idsAttr.split(",")
    const rect = target.getBoundingClientRect()
    setHover({ ids, rect })
  }, [])

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement | null

    if (target.hasAttribute("data-annotation-ids")) {
      if (relatedTarget && tooltipRef.current?.contains(relatedTarget)) {
        return
      }
      setHover(null)
    }
  }, [])

  const handleTooltipMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget?.hasAttribute("data-annotation-ids")) {
      return
    }
    setHover(null)
  }, [])

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

  const hoveredAnnotations = hover ? findAnnotationsByIds(annotations, hover.ids) : []
  const entries = toEntries(hoveredAnnotations)

  return (
    <div ref={containerRef} className="relative">
      {children}
      {hover && entries.length > 0 && createPortal(
        <div
          ref={tooltipRef}
          onMouseLeave={handleTooltipMouseLeave}
          style={{
            position: "fixed",
            left: hover.rect.left,
            top: hover.rect.bottom,
            paddingTop: TOOLTIP_GAP,
            zIndex: 50,
          }}
        >
          <HighlightTooltip entries={entries} />
        </div>,
        document.body
      )}
    </div>
  )
}
