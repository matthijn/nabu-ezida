import { describe, it, expect } from "vitest"
import { applyEnrichedOps, type EnrichedPatchConfig } from "./pipeline"
import type { JsonPatchOp } from "./apply"

const config: EnrichedPatchConfig = { fuzzyFields: [] }

describe("applyEnrichedOps — array auto-create", () => {
  interface Case {
    name: string
    doc: unknown
    ops: JsonPatchOp[]
    expected: { doc: unknown; failures: string[]; applied: number }
  }

  const cases: Case[] = [
    {
      name: "append to missing array creates it",
      doc: { name: "settings" },
      ops: [{ op: "add", path: "/tags/-", value: { id: "t1" } }],
      expected: { doc: { name: "settings", tags: [{ id: "t1" }] }, failures: [], applied: 1 },
    },
    {
      name: "append to existing array works normally",
      doc: { tags: [{ id: "t1" }] },
      ops: [{ op: "add", path: "/tags/-", value: { id: "t2" } }],
      expected: { doc: { tags: [{ id: "t1" }, { id: "t2" }] }, failures: [], applied: 1 },
    },
    {
      name: "multiple appends to missing array accumulate",
      doc: {},
      ops: [
        { op: "add", path: "/tags/-", value: { id: "t1" } },
        { op: "add", path: "/tags/-", value: { id: "t2" } },
      ],
      expected: { doc: { tags: [{ id: "t1" }, { id: "t2" }] }, failures: [], applied: 2 },
    },
    {
      name: "non-append add still fails on missing path",
      doc: {},
      ops: [{ op: "replace", path: "/missing/deep", value: "x" }],
      expected: {
        doc: {},
        failures: [expect.stringContaining("/missing/deep") as string],
        applied: 0,
      },
    },
  ]

  it.each(cases)("$name", ({ doc, ops, expected }) => {
    const result = applyEnrichedOps(ops, doc, "", config)
    expect(result.doc).toEqual(expected.doc)
    expect(result.failures).toEqual(expected.failures)
    expect(result.applied).toBe(expected.applied)
  })
})
