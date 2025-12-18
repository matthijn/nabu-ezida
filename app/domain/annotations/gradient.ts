const STRIPE_WIDTH = 10

const createStripeStops = (colors: string[]): string =>
  colors
    .flatMap((color, i) => {
      const start = i * STRIPE_WIDTH
      const end = (i + 1) * STRIPE_WIDTH
      return [`${color} ${start}px`, `${color} ${end}px`]
    })
    .join(", ")

export const createBarberPoleGradient = (colors: string[]): string =>
  `repeating-linear-gradient(45deg, ${createStripeStops(colors)})`

export const createBackground = (colors: string[]): string =>
  colors.length === 1 ? colors[0] : createBarberPoleGradient(colors)

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
