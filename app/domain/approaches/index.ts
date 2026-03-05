export type Approaches = Record<string, string>

const raw = import.meta.glob('./**/*.md', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>

const keyFromPath = (path: string): string =>
  path.replace(/^\.\//, '').replace(/\.md$/, '')

export const approaches: Approaches = Object.fromEntries(
  Object.entries(raw).map(([path, content]) => [keyFromPath(path), content.trimEnd()])
)

const isIndexKey = (key: string): boolean =>
  key === "index" || key.endsWith("/index")

export const approachKeys: string[] = Object.keys(approaches).filter((k) => !isIndexKey(k)).sort()
