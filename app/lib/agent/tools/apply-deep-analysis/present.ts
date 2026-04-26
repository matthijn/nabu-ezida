export interface CodedItem {
  start: number
  end: number
  analysis_source_id: string
  reason?: string
}

export interface ItemMapping {
  index: number
  start: number
  end: number
  analysis_source_id: string
}

export interface PresentedSection {
  text: string
  mapping: ItemMapping[]
}

const formatItemLine = (index: number, code: string, sentence: string, reason?: string): string => {
  const base = `${index}: [${code}] ${sentence}`
  return reason !== undefined ? `${base}\n   Reason: ${reason}` : base
}

export const formatCodedSection = (sentences: string[], items: CodedItem[]): PresentedSection => {
  const itemBySentence = new Map<number, { item: CodedItem; itemIndex: number }[]>()
  const mapping: ItemMapping[] = []

  let nextIndex = 1
  for (const item of items) {
    const idx = nextIndex++
    mapping.push({
      index: idx,
      start: item.start,
      end: item.end,
      analysis_source_id: item.analysis_source_id,
    })
    for (let s = item.start; s <= item.end; s++) {
      if (!itemBySentence.has(s)) itemBySentence.set(s, [])
      const entries = itemBySentence.get(s) as { item: typeof item; itemIndex: number }[]
      entries.push({ item, itemIndex: idx })
    }
  }

  const lines: string[] = []
  const emittedItems = new Set<number>()

  for (let s = 1; s <= sentences.length; s++) {
    const entries = itemBySentence.get(s)
    if (!entries || entries.length === 0) {
      lines.push(sentences[s - 1])
      continue
    }

    for (const { item, itemIndex } of entries) {
      if (emittedItems.has(itemIndex)) continue
      emittedItems.add(itemIndex)

      const spanText = sentences.slice(item.start - 1, item.end).join(" ")
      lines.push(formatItemLine(itemIndex, item.analysis_source_id, spanText, item.reason))
    }
  }

  return { text: lines.join("\n"), mapping }
}
