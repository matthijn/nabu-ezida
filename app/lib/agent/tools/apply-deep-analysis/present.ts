export interface CodedItem {
  start: number
  end: number
  codings: string[]
  reason?: string
}

export interface ItemMapping {
  index: number
  start: number
  end: number
  codings: string[]
}

export interface PresentedSection {
  text: string
  mapping: ItemMapping[]
}

export type VisibleRange = [start: number, end: number]

export const buildVisibleRanges = (
  items: CodedItem[],
  sentenceCount: number,
  context: number
): VisibleRange[] => {
  if (items.length === 0) return [[1, sentenceCount]]

  const expanded: VisibleRange[] = items
    .map(
      (item): VisibleRange => [
        Math.max(1, item.start - context),
        Math.min(sentenceCount, item.end + context),
      ]
    )
    .sort((a, b) => a[0] - b[0])

  const merged: VisibleRange[] = [expanded[0]]
  for (let i = 1; i < expanded.length; i++) {
    const last = merged[merged.length - 1]
    if (expanded[i][0] <= last[1] + 1) {
      last[1] = Math.max(last[1], expanded[i][1])
    } else {
      merged.push(expanded[i])
    }
  }
  return merged
}

const ELLIPSIS = "..."

const formatCodings = (codings: string[]): string => codings.join(", ")

const formatItemLine = (
  index: number,
  codings: string[],
  sentence: string,
  reason?: string
): string => {
  const base = `${index}: [${formatCodings(codings)}] ${sentence}`
  return reason !== undefined ? `${base}\n   Reason: ${reason}` : base
}

const buildVisibleSet = (ranges: VisibleRange[]): Set<number> => {
  const visible = new Set<number>()
  for (const [start, end] of ranges) {
    for (let s = start; s <= end; s++) visible.add(s)
  }
  return visible
}

export const formatCodedSection = (
  sentences: string[],
  items: CodedItem[],
  context?: number
): PresentedSection => {
  const itemBySentence = new Map<number, { item: CodedItem; itemIndex: number }[]>()
  const mapping: ItemMapping[] = []

  let nextIndex = 1
  for (const item of items) {
    const idx = nextIndex++
    mapping.push({
      index: idx,
      start: item.start,
      end: item.end,
      codings: item.codings,
    })
    for (let s = item.start; s <= item.end; s++) {
      if (!itemBySentence.has(s)) itemBySentence.set(s, [])
      const entries = itemBySentence.get(s) as { item: typeof item; itemIndex: number }[]
      entries.push({ item, itemIndex: idx })
    }
  }

  const visible =
    context !== undefined
      ? buildVisibleSet(buildVisibleRanges(items, sentences.length, context))
      : undefined

  const lines: string[] = []
  const emittedItems = new Set<number>()
  let inGap = false

  for (let s = 1; s <= sentences.length; s++) {
    if (visible && !visible.has(s)) {
      if (!inGap) {
        lines.push(ELLIPSIS)
        inGap = true
      }
      continue
    }
    inGap = false

    const entries = itemBySentence.get(s)
    if (!entries || entries.length === 0) {
      lines.push(sentences[s - 1])
      continue
    }

    for (const { item, itemIndex } of entries) {
      if (emittedItems.has(itemIndex)) continue
      emittedItems.add(itemIndex)

      const spanText = sentences.slice(item.start - 1, item.end).join(" ")
      lines.push(formatItemLine(itemIndex, item.codings, spanText, item.reason))
    }
  }

  return { text: lines.join("\n"), mapping }
}
