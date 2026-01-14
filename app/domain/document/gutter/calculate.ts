import type { GutterMark, AnnotationMeasurement } from "./types"

type AnnotationExtent = {
  id: string
  color: string
  top: number
  bottom: number
}

const groupByAnnotationId = (measurements: AnnotationMeasurement[]): AnnotationExtent[] => {
  const byId = new Map<string, { color: string; tops: number[]; bottoms: number[] }>()

  for (const m of measurements) {
    for (const id of m.ids) {
      const existing = byId.get(id)
      if (existing) {
        existing.tops.push(m.absoluteTop)
        existing.bottoms.push(m.absoluteTop + m.height)
      } else {
        byId.set(id, {
          color: m.color,
          tops: [m.absoluteTop],
          bottoms: [m.absoluteTop + m.height],
        })
      }
    }
  }

  return [...byId.entries()].map(([id, data]) => ({
    id,
    color: data.color,
    top: Math.min(...data.tops),
    bottom: Math.max(...data.bottoms),
  }))
}

type GutterSlot = {
  top: number
  bottom: number
  extents: AnnotationExtent[]
}

const extentsOverlap = (a: AnnotationExtent, b: AnnotationExtent): boolean =>
  a.top < b.bottom && a.bottom > b.top

const groupIntoSlots = (extents: AnnotationExtent[]): GutterSlot[] => {
  const slots: GutterSlot[] = []

  for (const extent of extents) {
    const overlappingSlot = slots.find((slot) =>
      slot.extents.some((e) => extentsOverlap(e, extent))
    )

    if (overlappingSlot) {
      overlappingSlot.extents.push(extent)
      overlappingSlot.top = Math.min(overlappingSlot.top, extent.top)
      overlappingSlot.bottom = Math.max(overlappingSlot.bottom, extent.bottom)
    } else {
      slots.push({
        top: extent.top,
        bottom: extent.bottom,
        extents: [extent],
      })
    }
  }

  return slots
}

const slotToGutterMarks = (slot: GutterSlot, scrollHeight: number): GutterMark[] => {
  const slotTopPercent = (slot.top / scrollHeight) * 100
  const slotHeightPercent = ((slot.bottom - slot.top) / scrollHeight) * 100
  const sliceHeight = slotHeightPercent / slot.extents.length

  return slot.extents.map((extent, index) => ({
    topPercent: slotTopPercent + index * sliceHeight,
    heightPercent: sliceHeight,
    colors: [extent.color],
    ids: [extent.id],
  }))
}

export const calculateGutterMarks = (
  measurements: AnnotationMeasurement[],
  scrollHeight: number
): GutterMark[] => {
  if (scrollHeight === 0 || measurements.length === 0) return []

  const extents = groupByAnnotationId(measurements)
  const slots = groupIntoSlots(extents)

  return slots.flatMap((slot) => slotToGutterMarks(slot, scrollHeight))
}
