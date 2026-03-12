export type Approaches = Record<string, string>

const raw = import.meta.glob('./**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const keyFromPath = (path: string): string =>
  path.replace(/^\.\//, '').replace(/\.md$/, '')

const extractDescription = (content: string): string | undefined => {
  const match = content.match(/^---\s*\ndescription:\s*(.+)\n---/)
  return match?.[1]?.trim()
}

export const approaches: Approaches = Object.fromEntries(
  Object.entries(raw).map(([path, content]) => [keyFromPath(path), content.trimEnd()])
)

const isIndexKey = (key: string): boolean =>
  key === "index" || key.endsWith("/index")

export const approachKeys: string[] = Object.keys(approaches).filter((k) => !isIndexKey(k)).sort()

export const approachDescriptions: Record<string, string> = Object.fromEntries(
  approachKeys
    .map((key) => [key, extractDescription(approaches[key])] as const)
    .filter((pair): pair is [string, string] => pair[1] !== undefined)
)

export type ApproachEntry = { key: string; content: string }

const parentIndexKeys = (key: string): string[] => {
  const parts = key.split("/")
  const keys: string[] = []
  for (let i = 1; i < parts.length; i++) {
    keys.push(parts.slice(0, i).join("/") + "/index")
  }
  return keys
}

const collectIndexKeys = (keys: readonly string[]): string[] => {
  const all = new Set<string>(["index"])
  for (const key of keys) {
    for (const idx of parentIndexKeys(key)) all.add(idx)
  }
  return [...all].sort()
}

export const resolveApproaches = (keys: readonly string[], dict: Record<string, string>): ApproachEntry[] => {
  const indexKeys = collectIndexKeys(keys)
  const selectedKeys = [...keys].sort()
  const ordered = [...indexKeys, ...selectedKeys]
  const seen = new Set<string>()
  return ordered.reduce<ApproachEntry[]>((acc, key) => {
    if (seen.has(key)) return acc
    seen.add(key)
    const content = dict[key]
    if (content) acc.push({ key, content })
    return acc
  }, [])
}
