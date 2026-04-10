export const doc = (json: object, language = "json-attributes"): string =>
  `# Title\n\nSome text.\n\n\`\`\`${language}\n${JSON.stringify(json, null, "\t")}\n\`\`\`\n\nMore text.\n`

export const multiBlockDoc = (blocks: { id: string; title: string; content: string }[]): string =>
  `# Codebook\n\n${blocks
    .map((b) => `\`\`\`json-callout\n${JSON.stringify(b, null, "\t")}\n\`\`\``)
    .join("\n\nSome prose.\n\n")}\n`
