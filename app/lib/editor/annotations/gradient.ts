const STRIPE_WIDTH = 10

const createStripeStops = (colors: string[]): string =>
  colors
    .flatMap((color, i) => {
      const start = i * STRIPE_WIDTH
      const end = (i + 1) * STRIPE_WIDTH
      return [`${color} ${start}px`, `${color} ${end}px`]
    })
    .join(", ")

const createBarberPoleGradient = (colors: string[]): string =>
  `repeating-linear-gradient(45deg, ${createStripeStops(colors)})`

export const createBackground = (colors: string[]): string =>
  colors.length === 1 ? colors[0] : createBarberPoleGradient(colors)
