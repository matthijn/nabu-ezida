export interface UnionFindState {
  parent: number[]
  rank: number[]
}

export const createUnionFind = (n: number): UnionFindState => ({
  parent: Array.from({ length: n }, (_, i) => i),
  rank: new Array(n).fill(0),
})

export const find = (uf: UnionFindState, x: number): number => {
  if (uf.parent[x] !== x) uf.parent[x] = find(uf, uf.parent[x])
  return uf.parent[x]
}

export const union = (uf: UnionFindState, x: number, y: number): void => {
  const rx = find(uf, x)
  const ry = find(uf, y)
  if (rx === ry) return
  if (uf.rank[rx] < uf.rank[ry]) uf.parent[rx] = ry
  else if (uf.rank[rx] > uf.rank[ry]) uf.parent[ry] = rx
  else {
    uf.parent[ry] = rx
    uf.rank[rx]++
  }
}

export const groups = (uf: UnionFindState): number[][] => {
  const map = new Map<number, number[]>()
  for (let i = 0; i < uf.parent.length; i++) {
    const root = find(uf, i)
    const group = map.get(root)
    if (group) group.push(i)
    else map.set(root, [i])
  }
  return [...map.values()]
}
