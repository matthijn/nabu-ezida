type RadixColor = string

const toVar = (color: RadixColor, shade: number): string => `var(--${color}-${shade})`

export const appBackground = (color: RadixColor): string => toVar(color, 1)
export const subtleBackground = (color: RadixColor): string => toVar(color, 2)
export const elementBackground = (color: RadixColor): string => toVar(color, 3)
export const hoveredElementBackground = (color: RadixColor): string => toVar(color, 4)
export const activeElementBackground = (color: RadixColor): string => toVar(color, 5)
export const subtleBorder = (color: RadixColor): string => toVar(color, 6)
export const elementBorder = (color: RadixColor): string => toVar(color, 7)
export const hoveredElementBorder = (color: RadixColor): string => toVar(color, 8)
export const solidBackground = (color: RadixColor): string => toVar(color, 9)
export const hoveredSolidBackground = (color: RadixColor): string => toVar(color, 10)
export const lowContrastText = (color: RadixColor): string => toVar(color, 11)
export const highContrastText = (color: RadixColor): string => toVar(color, 12)

type ColorScale = {
  background: string
  contrast: string
  border: string
  hoverBackground: string
  borderStrong: string
}

export const colorScale = (color: RadixColor): ColorScale => ({
  background: elementBackground(color),
  contrast: highContrastText(color),
  border: subtleBorder(color),
  hoverBackground: hoveredElementBackground(color),
  borderStrong: hoveredElementBorder(color),
})

export const contrastForColors = (colors: RadixColor[]): string =>
  colors.length === 0 ? highContrastText('gray') : highContrastText(colors[0])

export const borderForColors = (colors: RadixColor[]): string =>
  colors.length === 0 ? subtleBorder('gray') : subtleBorder(colors[0])

export const backgroundForColors = (colors: RadixColor[]): string[] =>
  colors.length === 0 ? [elementBackground('gray')] : colors.map(elementBackground)
