const prefixLines = (text: string, prefix: string): string =>
  text
    .split("\n")
    .map((line) => prefix + line)
    .join("\n")

export const generateDiff = (oldContent: string, newContent: string): string => {
  const oldTrimmed = oldContent.trim()
  const newTrimmed = newContent.trim()

  if (oldTrimmed === "") {
    return `@@\n${prefixLines(newTrimmed, "+")}`
  }

  if (oldTrimmed === newTrimmed) {
    return ""
  }

  return `@@\n${prefixLines(oldTrimmed, "-")}\n${prefixLines(newTrimmed, "+")}`
}
