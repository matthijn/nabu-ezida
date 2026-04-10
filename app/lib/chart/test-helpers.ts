import type { ColorContext } from "./color"
import type { ChartEntityMap } from "./types"

export const entity = (id: string, label: string, color: string): ChartEntityMap[string] => ({
  id,
  label,
  url: `/${id}`,
  color,
})

export const stubResolveRadix = (token: string, shade: number): string => `radix(${token},${shade})`

export const buildColorContext = (entityMap: ChartEntityMap = {}): ColorContext => ({
  entityMap,
  resolveRadix: stubResolveRadix,
  shade: 9,
  fallback: "#888888",
})
