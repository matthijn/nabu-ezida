"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import type { Annotation } from "~/domain/document/annotations"
import { HighlightTooltip, type HighlightEntry } from "~/ui/components/HighlightTooltip"
import { elementBorder } from "~/lib/colors/radix"
import { getCodeTitle, getFiles } from "~/lib/files"

type HoverState = {
  text: string
  rect: DOMRect
}

type AnnotationHoverProps = {
  annotations: Annotation[]
  children: React.ReactNode
}

const TOOLTIP_GAP = 4

const isDecoration = (el: HTMLElement): boolean =>
  el.style.background !== "" && el.style.background !== "none"

const findMatchingAnnotations = (annotations: Annotation[], text: string): Annotation[] =>
  annotations.filter((a) => a.text.includes(text))

const annotationToEntry = (files: Record<string, string>) => (annotation: Annotation, index: number): HighlightEntry => ({
  id: String(index),
  color: elementBorder(annotation.color),
  title: annotation.code ? getCodeTitle(files, annotation.code) : undefined,
  description: annotation.reason,
  pending: annotation.pending,
})

export const AnnotationHover = ({ annotations, children }: AnnotationHoverProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<HoverState | null>(null)

  const handleMouseEnter = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!isDecoration(target)) return

    const text = target.textContent ?? ""
    if (!text) return

    const rect = target.getBoundingClientRect()
    setHover({ text, rect })
  }, [])

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement | null

    if (isDecoration(target)) {
      if (relatedTarget && tooltipRef.current?.contains(relatedTarget)) return
      setHover(null)
    }
  }, [])

  const handleTooltipMouseLeave = useCallback((e: React.MouseEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && isDecoration(relatedTarget)) return
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

  const matchingAnnotations = hover ? findMatchingAnnotations(annotations, hover.text) : []
  const files = getFiles()
  const entries = matchingAnnotations.map(annotationToEntry(files))

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
            top: hover.rect.bottom + TOOLTIP_GAP,
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
