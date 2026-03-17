export { BLOCK_COLORS, type RadixColor } from "~/domain/colors"

const toVar = (color: string, shade: number): string => `var(--${color}-${shade})`

export const appBackground = (color: string): string => toVar(color, 1)
export const subtleBackground = (color: string): string => toVar(color, 2)
export const elementBackground = (color: string): string => toVar(color, 3)
export const hoveredElementBackground = (color: string): string => toVar(color, 4)
export const activeElementBackground = (color: string): string => toVar(color, 5)
export const subtleBorder = (color: string): string => toVar(color, 6)
export const elementBorder = (color: string): string => toVar(color, 7)
export const hoveredElementBorder = (color: string): string => toVar(color, 8)
export const solidBackground = (color: string): string => toVar(color, 9)
export const hoveredSolidBackground = (color: string): string => toVar(color, 10)
export const lowContrastText = (color: string): string => toVar(color, 11)
export const highContrastText = (color: string): string => toVar(color, 12)

type ColorScale = {
  background: string
  contrast: string
  border: string
  hoverBackground: string
  borderStrong: string
}

export const colorScale = (color: string): ColorScale => ({
  background: elementBackground(color),
  contrast: highContrastText(color),
  border: subtleBorder(color),
  hoverBackground: hoveredElementBackground(color),
  borderStrong: hoveredElementBorder(color),
})

export const contrastForColors = (colors: string[]): string =>
  colors.length === 0 ? highContrastText('gray') : highContrastText(colors[0])

export const borderForColors = (colors: string[]): string =>
  colors.length === 0 ? subtleBorder('gray') : subtleBorder(colors[0])

export const backgroundForColors = (colors: string[]): string[] =>
  colors.length === 0 ? [elementBackground('gray')] : colors.map(elementBackground)
