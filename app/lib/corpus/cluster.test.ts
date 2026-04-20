import { describe, it, expect } from "vitest"
import { clusterLabels, buildLabelRemap, buildRemaps, type LabelCluster } from "./cluster"

const embed = (...values: number[]): number[] => values

describe("clusterLabels", () => {
  const cases: {
    name: string
    labels: string[]
    embeddings: number[][]
    threshold: number
    counts?: Map<string, number>
    expected: { representative: string; members: string[] }[]
  }[] = [
    {
      name: "identical embeddings cluster together",
      labels: ["alpha", "beta"],
      embeddings: [embed(1, 0, 0), embed(1, 0, 0)],
      threshold: 0.9,
      expected: [{ representative: "alpha", members: ["alpha", "beta"] }],
    },
    {
      name: "orthogonal embeddings stay separate",
      labels: ["alpha", "beta"],
      embeddings: [embed(1, 0, 0), embed(0, 1, 0)],
      threshold: 0.5,
      expected: [
        { representative: "alpha", members: ["alpha"] },
        { representative: "beta", members: ["beta"] },
      ],
    },
    {
      name: "representative is alphabetically first without counts",
      labels: ["zebra", "apple", "mango"],
      embeddings: [embed(1, 0, 0), embed(1, 0, 0), embed(1, 0, 0)],
      threshold: 0.9,
      expected: [{ representative: "apple", members: ["zebra", "apple", "mango"] }],
    },
    {
      name: "representative is most frequent label",
      labels: ["zebra", "apple", "mango"],
      embeddings: [embed(1, 0, 0), embed(1, 0, 0), embed(1, 0, 0)],
      threshold: 0.9,
      counts: new Map([
        ["zebra", 10],
        ["apple", 3],
        ["mango", 50],
      ]),
      expected: [{ representative: "mango", members: ["zebra", "apple", "mango"] }],
    },
    {
      name: "equal counts fall back to alphabetical",
      labels: ["zebra", "apple"],
      embeddings: [embed(1, 0, 0), embed(1, 0, 0)],
      threshold: 0.9,
      counts: new Map([
        ["zebra", 5],
        ["apple", 5],
      ]),
      expected: [{ representative: "apple", members: ["zebra", "apple"] }],
    },
    {
      name: "transitive clustering via shared neighbor",
      labels: ["a", "b", "c"],
      embeddings: [embed(1, 0), embed(0.95, 0.31), embed(0.81, 0.59)],
      threshold: 0.85,
      expected: [{ representative: "a", members: ["a", "b", "c"] }],
    },
    {
      name: "empty input returns empty",
      labels: [],
      embeddings: [],
      threshold: 0.9,
      expected: [],
    },
    {
      name: "single label returns single cluster",
      labels: ["only"],
      embeddings: [embed(1, 0)],
      threshold: 0.9,
      expected: [{ representative: "only", members: ["only"] }],
    },
    {
      name: "threshold exactly at boundary excludes pair",
      labels: ["a", "b"],
      embeddings: [embed(1, 0), embed(0, 1)],
      threshold: 0.0,
      expected: [
        { representative: "a", members: ["a"] },
        { representative: "b", members: ["b"] },
      ],
    },
  ]

  const sortCluster = (c: LabelCluster) => ({
    representative: c.representative,
    members: [...c.members].sort(),
  })

  const sortClusters = (cs: LabelCluster[]) =>
    cs.map(sortCluster).sort((a, b) => a.representative.localeCompare(b.representative))

  it.each(cases)("$name", ({ labels, embeddings, threshold, counts, expected }) => {
    const result = clusterLabels(labels, embeddings, threshold, counts)
    expect(sortClusters(result)).toEqual(sortClusters(expected))
  })
})

describe("buildLabelRemap", () => {
  const cases: {
    name: string
    clusters: LabelCluster[]
    expected: [string, string][]
  }[] = [
    {
      name: "maps all members to representative",
      clusters: [{ representative: "alpha", members: ["alpha", "beta", "gamma"] }],
      expected: [
        ["alpha", "alpha"],
        ["beta", "alpha"],
        ["gamma", "alpha"],
      ],
    },
    {
      name: "multiple clusters",
      clusters: [
        { representative: "a", members: ["a", "b"] },
        { representative: "x", members: ["x", "y"] },
      ],
      expected: [
        ["a", "a"],
        ["b", "a"],
        ["x", "x"],
        ["y", "x"],
      ],
    },
    {
      name: "empty clusters return empty map",
      clusters: [],
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ clusters, expected }) => {
    const remap = buildLabelRemap(clusters)
    expect([...remap.entries()].sort()).toEqual([...expected].sort())
  })
})

describe("buildRemaps", () => {
  it("combines type and subject clusters into remaps", () => {
    const typeClusters: LabelCluster[] = [
      { representative: "report", members: ["report", "briefing"] },
    ]
    const subjectClusters: LabelCluster[] = [
      { representative: "health", members: ["health", "public health"] },
    ]

    const remaps = buildRemaps(typeClusters, subjectClusters)

    expect(remaps.types.get("briefing")).toBe("report")
    expect(remaps.subjects.get("public health")).toBe("health")
  })
})
