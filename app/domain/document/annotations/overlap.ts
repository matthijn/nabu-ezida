import type { ResolvedAnnotation, OverlapSegment } from "./types"

type Boundary = { pos: number; isStart: boolean; color: string }

const collectBoundaries = (annotations: ResolvedAnnotation[]): Boundary[] => {
  const boundaries: Boundary[] = []

  for (const a of annotations) {
    boundaries.push({ pos: a.from, isStart: true, color: a.color })
    boundaries.push({ pos: a.to, isStart: false, color: a.color })
  }

  return boundaries.sort((a, b) => a.pos - b.pos)
}

const uniqueColors = (colors: string[]): string[] => [...new Set(colors)]

export const segmentByOverlap = (annotations: ResolvedAnnotation[]): OverlapSegment[] => {
  if (annotations.length === 0) return []

  const boundaries = collectBoundaries(annotations)
  const segments: OverlapSegment[] = []
  let activeColors: string[] = []
  let lastPos = boundaries[0]?.pos ?? 0

  for (const boundary of boundaries) {
    if (boundary.pos > lastPos && activeColors.length > 0) {
      segments.push({
        from: lastPos,
        to: boundary.pos,
        colors: uniqueColors(activeColors),
      })
    }

    if (boundary.isStart) {
      activeColors = [...activeColors, boundary.color]
    } else {
      const idx = activeColors.indexOf(boundary.color)
      if (idx !== -1) {
        activeColors = [...activeColors.slice(0, idx), ...activeColors.slice(idx + 1)]
      }
    }

    lastPos = boundary.pos
  }

  return segments
}
