export { type RadixColor } from "./colors"

const toVar = (color: string, shade: number): string => `var(--${color}-${shade})`

export const subtleBackground = (color: string): string => toVar(color, 2)
export const elementBackground = (color: string): string => toVar(color, 3)
export const hoveredElementBackground = (color: string): string => toVar(color, 4)
export const subtleBorder = (color: string): string => toVar(color, 6)
export const elementBorder = (color: string): string => toVar(color, 7)
export const hoveredElementBorder = (color: string): string => toVar(color, 8)
export const solidBackground = (color: string): string => toVar(color, 9)
export const lowContrastText = (color: string): string => toVar(color, 11)
export const highContrastText = (color: string): string => toVar(color, 12)
