export const formatNumberedPassage = (sentences: string[]): string =>
  sentences.map((s, i) => `${i + 1}: ${s}`).join("\n")
