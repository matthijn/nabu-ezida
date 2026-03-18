import { describe, it, expect } from "vitest"
import type { JsonPatchOp } from "./apply"
import { resolveSelectors, partitionNumericIndices } from "./selector"

describe("resolveSelectors", () => {
  const annotations = [
    { id: "ann_1", code: "code_a", color: "red" },
    { id: "ann_2", code: "code_b", color: "blue", review: "might be code_c" },
    { id: "ann_3", code: "code_a", color: "blue" },
    { id: "ann_4", code: "code_c", color: "green", review: "weak fit" },
  ]
  const docJson = { annotations }

  interface Case {
    name: string
    ops: JsonPatchOp[]
    doc: unknown
    expected: { ok: true; ops: JsonPatchOp[] } | { ok: false; error: string | RegExp }
  }

  const cases: Case[] = [
    {
      name: "no selector — passthrough",
      ops: [{ op: "remove", path: "/annotations/0" }],
      doc: docJson,
      expected: { ok: true, ops: [{ op: "remove", path: "/annotations/0" }] },
    },
    {
      name: "single match by id",
      ops: [{ op: "remove", path: "/annotations[id=ann_2]" }],
      doc: docJson,
      expected: { ok: true, ops: [{ op: "remove", path: "/annotations/1" }] },
    },
    {
      name: "single match with rest path",
      ops: [{ op: "replace", path: "/annotations[id=ann_1]/code", value: "code_new" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [{ op: "replace", path: "/annotations/0/code", value: "code_new" }],
      },
    },
    {
      name: "nested key selector",
      ops: [{ op: "remove", path: "/annotations[color=green]" }],
      doc: docJson,
      expected: { ok: true, ops: [{ op: "remove", path: "/annotations/3" }] },
    },
    {
      name: "multi-match remove — descending indices",
      ops: [{ op: "remove", path: "/annotations[color=blue]" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "remove", path: "/annotations/2" },
          { op: "remove", path: "/annotations/1" },
        ],
      },
    },
    {
      name: "multi-match replace — ascending indices",
      ops: [{ op: "replace", path: "/annotations[code=code_a]/code", value: "code_x" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "replace", path: "/annotations/0/code", value: "code_x" },
          { op: "replace", path: "/annotations/2/code", value: "code_x" },
        ],
      },
    },
    {
      name: "no matches — error",
      ops: [{ op: "remove", path: "/annotations[id=nonexistent]" }],
      doc: docJson,
      expected: { ok: false, error: /No items match/ },
    },
    {
      name: "mixed selector and normal ops",
      ops: [
        { op: "replace", path: "/annotations[id=ann_1]/code", value: "code_z" },
        { op: "add", path: "/annotations/-", value: { id: "ann_5" } },
      ],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "replace", path: "/annotations/0/code", value: "code_z" },
          { op: "add", path: "/annotations/-", value: { id: "ann_5" } },
        ],
      },
    },
    {
      name: "selector on non-array path — no matches",
      ops: [{ op: "remove", path: "/annotations[id=ann_1]" }],
      doc: { annotations: "not an array" },
      expected: { ok: false, error: /No items match/ },
    },
    {
      name: "rest path after selector",
      ops: [{ op: "replace", path: "/annotations[id=ann_2]/color", value: "red" }],
      doc: docJson,
      expected: { ok: true, ops: [{ op: "replace", path: "/annotations/1/color", value: "red" }] },
    },
    {
      name: "exists — matches items with truthy field",
      ops: [{ op: "remove", path: "/annotations[review]" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "remove", path: "/annotations/3" },
          { op: "remove", path: "/annotations/1" },
        ],
      },
    },
    {
      name: "not_exists — matches items without field",
      ops: [{ op: "remove", path: "/annotations[!review]" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "remove", path: "/annotations/2" },
          { op: "remove", path: "/annotations/0" },
        ],
      },
    },
    {
      name: "neq — matches items where field differs",
      ops: [{ op: "remove", path: "/annotations[code!=code_a]" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "remove", path: "/annotations/3" },
          { op: "remove", path: "/annotations/1" },
        ],
      },
    },
    {
      name: "exists with rest path",
      ops: [{ op: "replace", path: "/annotations[review]/color", value: "yellow" }],
      doc: docJson,
      expected: {
        ok: true,
        ops: [
          { op: "replace", path: "/annotations/1/color", value: "yellow" },
          { op: "replace", path: "/annotations/3/color", value: "yellow" },
        ],
      },
    },
    {
      name: "exists — no matches when no items have field",
      ops: [{ op: "remove", path: "/annotations[missing]" }],
      doc: docJson,
      expected: { ok: false, error: /No items match/ },
    },
  ]

  it.each(cases)("$name", ({ ops, doc, expected }) => {
    const result = resolveSelectors(ops, doc)
    if (expected.ok) {
      expect(result).toEqual(expected)
    } else {
      expect(result.ok).toBe(false)
      if (!result.ok) {
        if (expected.error instanceof RegExp) {
          expect(result.error).toMatch(expected.error)
        } else {
          expect(result.error).toBe(expected.error)
        }
      }
    }
  })
})

describe("partitionNumericIndices", () => {
  interface Case {
    name: string
    ops: JsonPatchOp[]
    expectedAccepted: JsonPatchOp[]
    expectedRejected: string[]
  }

  const cases: Case[] = [
    {
      name: "rejects /annotations/0",
      ops: [{ op: "remove", path: "/annotations/0" }],
      expectedAccepted: [],
      expectedRejected: ["/annotations/0"],
    },
    {
      name: "rejects /annotations/0/text",
      ops: [{ op: "replace", path: "/annotations/0/text", value: "x" }],
      expectedAccepted: [],
      expectedRejected: ["/annotations/0/text"],
    },
    {
      name: "rejects numeric in move from",
      ops: [{ op: "move", from: "/items/3", path: "/other/-" }],
      expectedAccepted: [],
      expectedRejected: ["/other/-"],
    },
    {
      name: "allows /annotations/-",
      ops: [{ op: "add", path: "/annotations/-", value: {} }],
      expectedAccepted: [{ op: "add", path: "/annotations/-", value: {} }],
      expectedRejected: [],
    },
    {
      name: "allows /color",
      ops: [{ op: "replace", path: "/color", value: "red" }],
      expectedAccepted: [{ op: "replace", path: "/color", value: "red" }],
      expectedRejected: [],
    },
    {
      name: "allows selector path",
      ops: [{ op: "remove", path: "/annotations[id=ann_1]" }],
      expectedAccepted: [{ op: "remove", path: "/annotations[id=ann_1]" }],
      expectedRejected: [],
    },
    {
      name: "allows /nested/deep/field",
      ops: [{ op: "replace", path: "/nested/deep/field", value: 1 }],
      expectedAccepted: [{ op: "replace", path: "/nested/deep/field", value: 1 }],
      expectedRejected: [],
    },
    {
      name: "partitions mixed ops",
      ops: [
        { op: "replace", path: "/color", value: "blue" },
        { op: "remove", path: "/annotations/2" },
        { op: "remove", path: "/annotations[id=ann_1]" },
      ],
      expectedAccepted: [
        { op: "replace", path: "/color", value: "blue" },
        { op: "remove", path: "/annotations[id=ann_1]" },
      ],
      expectedRejected: ["/annotations/2"],
    },
  ]

  it.each(cases)("$name", ({ ops, expectedAccepted, expectedRejected }) => {
    const { accepted, rejectedPaths } = partitionNumericIndices(ops)
    expect(accepted).toEqual(expectedAccepted)
    expect(rejectedPaths).toEqual(expectedRejected)
  })
})
