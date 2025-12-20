import type { ResolvedAnnotation, OverlapSegment } from "./types"

type Boundary = { pos: number; isStart: boolean; code_id: string | null }

const collectBoundaries = (annotations: ResolvedAnnotation[]): Boundary[] => {
  const boundaries: Boundary[] = []

  for (const a of annotations) {
    boundaries.push({ pos: a.from, isStart: true, code_id: a.code_id })
    boundaries.push({ pos: a.to, isStart: false, code_id: a.code_id })
  }

  return boundaries.sort((a, b) => a.pos - b.pos)
}

const uniqueCodes = (codes: (string | null)[]): string[] =>
  [...new Set(codes.filter((c): c is string => c !== null))]

export const segmentByOverlap = (annotations: ResolvedAnnotation[]): OverlapSegment[] => {
  if (annotations.length === 0) return []

  const boundaries = collectBoundaries(annotations)
  const segments: OverlapSegment[] = []
  let activeCodes: (string | null)[] = []
  let lastPos = boundaries[0]?.pos ?? 0

  for (const boundary of boundaries) {
    if (boundary.pos > lastPos && activeCodes.length > 0) {
      segments.push({
        from: lastPos,
        to: boundary.pos,
        code_ids: uniqueCodes(activeCodes),
      })
    }

    if (boundary.isStart) {
      activeCodes = [...activeCodes, boundary.code_id]
    } else {
      const idx = activeCodes.indexOf(boundary.code_id)
      if (idx !== -1) {
        activeCodes = [...activeCodes.slice(0, idx), ...activeCodes.slice(idx + 1)]
      }
    }

    lastPos = boundary.pos
  }

  return segments
}
