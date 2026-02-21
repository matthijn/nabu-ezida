export const DECISIONS_HEADING = "## Decisions"

const formatEntry = (question: string, answer: string): string =>
  `- **${question}** → ${answer}`

const parseEntries = (content: string): string[] => {
  const headingIdx = content.indexOf(DECISIONS_HEADING)
  if (headingIdx === -1) return []

  const afterHeading = content.slice(headingIdx + DECISIONS_HEADING.length)
  const nextHeadingMatch = afterHeading.match(/\n## /)
  const section = nextHeadingMatch
    ? afterHeading.slice(0, nextHeadingMatch.index)
    : afterHeading

  return section
    .split("\n")
    .filter((line) => line.startsWith("- "))
}

export const isAnswerSaved = (content: string | undefined, question: string, answer: string): boolean =>
  content !== undefined && parseEntries(content).includes(formatEntry(question, answer))

export const addAnswer = (content: string | undefined, question: string, answer: string): string => {
  const entry = formatEntry(question, answer)
  if (content === undefined || content.trim() === "") {
    return `${DECISIONS_HEADING}\n\n${entry}\n`
  }

  const entries = parseEntries(content)
  if (entries.includes(entry)) return content

  const headingIdx = content.indexOf(DECISIONS_HEADING)
  if (headingIdx === -1) {
    const separator = content.endsWith("\n") ? "\n" : "\n\n"
    return `${content}${separator}${DECISIONS_HEADING}\n\n${entry}\n`
  }

  const afterHeading = content.slice(headingIdx + DECISIONS_HEADING.length)
  const nextHeadingMatch = afterHeading.match(/\n## /)
  const insertPos = nextHeadingMatch
    ? headingIdx + DECISIONS_HEADING.length + nextHeadingMatch.index!
    : content.length

  const before = content.slice(0, insertPos)
  const after = content.slice(insertPos)
  const needsNewline = !before.endsWith("\n")
  return `${before}${needsNewline ? "\n" : ""}${entry}\n${after}`
}

export const removeAnswer = (content: string | undefined, question: string, answer: string): string => {
  if (content === undefined) return ""
  const entry = formatEntry(question, answer)
  const lines = content.split("\n")
  const filtered = lines.filter((line) => line !== entry)
  return filtered.join("\n")
}

export const toggleAnswer = (content: string | undefined, question: string, answer: string): string =>
  isAnswerSaved(content, question, answer)
    ? removeAnswer(content, question, answer)
    : addAnswer(content, question, answer)
