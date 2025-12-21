const CODE_COLORS: Record<string, string> = {
  "theme-identity": "oklch(0.75 0.15 60)",
  "theme-emotion": "oklch(0.75 0.15 330)",
  "method-interview": "oklch(0.75 0.15 200)",
  "method-observation": "oklch(0.75 0.15 140)",
  "finding-pattern": "oklch(0.75 0.15 280)",
}

const DEFAULT_COLOR = "oklch(0.75 0.12 85)"

export const colorForCode = (codeId: string): string =>
  CODE_COLORS[codeId] ?? DEFAULT_COLOR

export const colorsForCodes = (codeIds: string[]): string[] =>
  codeIds.map(colorForCode)
