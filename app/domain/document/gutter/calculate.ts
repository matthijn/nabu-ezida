import type { GutterMark, AnnotationMeasurement } from "./types"

type Extent = {
  color: string
  top: number
  bottom: number
}

const measurementToExtents = (m: AnnotationMeasurement): Extent[] =>
  m.colors.map((color) => ({
    color,
    top: m.absoluteTop,
    bottom: m.absoluteTop + m.height,
  }))

type GutterSlot = {
  top: number
  bottom: number
  extents: Extent[]
}

const extentsOverlap = (a: Extent, b: Extent): boolean =>
  a.top < b.bottom && a.bottom > b.top

const groupIntoSlots = (extents: Extent[]): GutterSlot[] => {
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
  }))
}

export const calculateGutterMarks = (
  measurements: AnnotationMeasurement[],
  scrollHeight: number
): GutterMark[] => {
  if (scrollHeight === 0 || measurements.length === 0) return []

  const extents = measurements.flatMap(measurementToExtents)
  const slots = groupIntoSlots(extents)

  return slots.flatMap((slot) => slotToGutterMarks(slot, scrollHeight))
}
