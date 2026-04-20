import { describe, it, expect } from "vitest"
import { createUnionFind, find, union, groups } from "./union-find"

describe("union-find", () => {
  const cases: {
    name: string
    n: number
    unions: [number, number][]
    expectedGroups: number[][]
  }[] = [
    {
      name: "no unions — each element is its own group",
      n: 3,
      unions: [],
      expectedGroups: [[0], [1], [2]],
    },
    {
      name: "single union merges two elements",
      n: 3,
      unions: [[0, 1]],
      expectedGroups: [[0, 1], [2]],
    },
    {
      name: "transitive unions form one group",
      n: 4,
      unions: [
        [0, 1],
        [2, 3],
        [1, 2],
      ],
      expectedGroups: [[0, 1, 2, 3]],
    },
    {
      name: "disjoint unions stay separate",
      n: 4,
      unions: [
        [0, 1],
        [2, 3],
      ],
      expectedGroups: [
        [0, 1],
        [2, 3],
      ],
    },
    {
      name: "duplicate union is idempotent",
      n: 2,
      unions: [
        [0, 1],
        [0, 1],
      ],
      expectedGroups: [[0, 1]],
    },
  ]

  it.each(cases)("$name", ({ n, unions, expectedGroups }) => {
    const uf = createUnionFind(n)
    for (const [a, b] of unions) union(uf, a, b)

    const result = groups(uf)

    const sortGroup = (g: number[]) => [...g].sort((a, b) => a - b)
    const sortGroups = (gs: number[][]) => gs.map(sortGroup).sort((a, b) => a[0] - b[0])

    expect(sortGroups(result)).toEqual(sortGroups(expectedGroups))
  })

  it("find returns same root for unified elements", () => {
    const uf = createUnionFind(3)
    union(uf, 0, 2)
    expect(find(uf, 0)).toBe(find(uf, 2))
    expect(find(uf, 1)).not.toBe(find(uf, 0))
  })
})
