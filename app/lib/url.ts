export const hasParams = (params?: Record<string, string>): boolean =>
  params !== undefined && Object.keys(params).length > 0

export const joinPath = (base: string, path: string): string =>
  `${base}/${path}`

export const buildUrl = (
  base: string,
  path: string,
  params?: Record<string, string>
): string => {
  const url = joinPath(base, path)
  if (!hasParams(params)) return url
  const query = new URLSearchParams(params).toString()
  return `${url}?${query}`
}
