import type { ResolvedAnnotation, OverlapSegment } from "./types"

type Boundary = { pos: number; isStart: boolean; codeIds: string[] }

const collectBoundaries = (annotations: ResolvedAnnotation[]): Boundary[] => {
  const boundaries: Boundary[] = []

  for (const a of annotations) {
    boundaries.push({ pos: a.from, isStart: true, codeIds: a.codeIds })
    boundaries.push({ pos: a.to, isStart: false, codeIds: a.codeIds })
  }

  return boundaries.sort((a, b) => a.pos - b.pos)
}

const uniqueCodes = (codes: string[]): string[] => [...new Set(codes)]

export const segmentByOverlap = (annotations: ResolvedAnnotation[]): OverlapSegment[] => {
  if (annotations.length === 0) return []

  const boundaries = collectBoundaries(annotations)
  const segments: OverlapSegment[] = []
  let activeCodes: string[] = []
  let lastPos = boundaries[0]?.pos ?? 0

  for (const boundary of boundaries) {
    if (boundary.pos > lastPos && activeCodes.length > 0) {
      segments.push({
        from: lastPos,
        to: boundary.pos,
        codeIds: uniqueCodes(activeCodes),
      })
    }

    if (boundary.isStart) {
      activeCodes = [...activeCodes, ...boundary.codeIds]
    } else {
      activeCodes = activeCodes.filter(c => !boundary.codeIds.includes(c))
    }

    lastPos = boundary.pos
  }

  return segments
}
