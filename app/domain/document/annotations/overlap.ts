import type { ResolvedAnnotation, OverlapSegment } from "./types"

type Boundary = { pos: number; isStart: boolean; index: number; color: string }

const collectBoundaries = (annotations: ResolvedAnnotation[]): Boundary[] => {
  const boundaries: Boundary[] = []

  for (const a of annotations) {
    boundaries.push({ pos: a.from, isStart: true, index: a.index, color: a.color })
    boundaries.push({ pos: a.to, isStart: false, index: a.index, color: a.color })
  }

  return boundaries.sort((a, b) => a.pos - b.pos)
}

const unique = <T>(items: T[]): T[] => [...new Set(items)]

type ActiveAnnotation = { index: number; color: string }

export const segmentByOverlap = (annotations: ResolvedAnnotation[]): OverlapSegment[] => {
  if (annotations.length === 0) return []

  const boundaries = collectBoundaries(annotations)
  const segments: OverlapSegment[] = []
  let active: ActiveAnnotation[] = []
  let lastPos = boundaries[0]?.pos ?? 0

  for (const boundary of boundaries) {
    if (boundary.pos > lastPos && active.length > 0) {
      segments.push({
        from: lastPos,
        to: boundary.pos,
        colors: unique(active.map(a => a.color)),
      })
    }

    if (boundary.isStart) {
      active = [...active, { index: boundary.index, color: boundary.color }]
    } else {
      const idx = active.findIndex(a => a.index === boundary.index)
      if (idx !== -1) {
        active = [...active.slice(0, idx), ...active.slice(idx + 1)]
      }
    }

    lastPos = boundary.pos
  }

  return segments
}
