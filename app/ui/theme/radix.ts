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

const rgbToHex = (rgb: string): string => {
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return rgb
  return (
    "#" +
    match
      .slice(0, 3)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  )
}

export const resolveCssColorHex = (cssColor: string): string => {
  const el = document.createElement("span")
  el.style.display = "none"
  el.style.color = cssColor
  document.body.appendChild(el)
  const computed = getComputedStyle(el).color
  document.body.removeChild(el)
  return rgbToHex(computed)
}

export const resolveRadixHex = (color: string, shade: number): string =>
  resolveCssColorHex(toVar(color, shade))
