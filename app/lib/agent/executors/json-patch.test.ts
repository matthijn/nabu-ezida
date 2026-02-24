import { describe, it, expect } from "vitest"
import { patchJsonBlock, autoFuzzyAnnotationText, resolveSelectors, partitionNumericIndices } from "./tools/patch-json-block"
import type { JsonPatchOp } from "~/lib/diff/json-block/apply"

const makeFiles = (entries: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(entries))

const doc = (json: object, language = "json-attributes"): string =>
  `# Title\n\nSome text.\n\n\`\`\`${language}\n${JSON.stringify(json, null, 2)}\n\`\`\`\n\nMore text.\n`

describe("patch_json_block", () => {
  type Case = {
    name: string
    files: Map<string, string>
    args: Record<string, unknown>
    expectStatus: "ok" | "partial" | "error"
    expectOutput: string | RegExp
    expectMessage?: RegExp
    expectMutations?: number
  }

  const cases: Case[] = [
    {
      name: "replace a field produces update_file operation",
      files: makeFiles({ "doc.md": doc({ color: "red", count: 1 }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/color", value: "blue" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "add a field",
      files: makeFiles({ "doc.md": doc({ name: "test" }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "add", path: "/tags", value: ["a"] }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "remove a field",
      files: makeFiles({ "doc.md": doc({ a: 1, b: 2 }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "remove", path: "/b" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "no-op when result is identical",
      files: makeFiles({ "doc.md": doc({ x: 1 }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/x", value: 1 }],
      },
      expectStatus: "ok",
      expectOutput: /No changes/,
      expectMutations: 0,
    },
    {
      name: "error when file not found",
      files: makeFiles({}),
      args: {
        path: "missing.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/x", value: 1 }],
      },
      expectStatus: "error",
      expectOutput: /No such file/,
    },
    {
      name: "error when block not found",
      files: makeFiles({ "doc.md": "# No blocks here\n" }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/x", value: 1 }],
      },
      expectStatus: "error",
      expectOutput: /No .* block found/,
    },
    {
      name: "error on invalid json pointer path",
      files: makeFiles({ "doc.md": doc({ a: 1 }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/nonexistent/deep", value: "x" }],
      },
      expectStatus: "error",
      expectOutput: /\/nonexistent\/deep/,
    },
    {
      name: "different block language",
      files: makeFiles({ "doc.md": doc({ key: "old" }, "json-callout") }),
      args: {
        path: "doc.md",
        language: "json-callout",
        operations: [{ op: "replace", path: "/key", value: "new" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched.*json-callout/,
      expectMutations: 1,
    },
    {
      name: "multiple operations in sequence",
      files: makeFiles({ "doc.md": doc({ items: ["a"], count: 0 }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          { op: "add", path: "/items/-", value: "b" },
          { op: "replace", path: "/count", value: 2 },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "selector removes by id",
      files: makeFiles({
        "doc.md": doc({
          annotations: [
            { id: "ann_1", text: "first" },
            { id: "ann_2", text: "second" },
          ],
        }),
      }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "remove", path: "/annotations[id=ann_1]" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "selector replaces nested field",
      files: makeFiles({
        "doc.md": doc({
          annotations: [
            { id: "ann_1", code: "old" },
            { id: "ann_2", code: "keep" },
          ],
        }),
      }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/annotations[id=ann_1]/code", value: "new" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "selector error on no match",
      files: makeFiles({
        "doc.md": doc({ annotations: [{ id: "ann_1" }] }),
      }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "remove", path: "/annotations[id=nonexistent]" }],
      },
      expectStatus: "error",
      expectOutput: /No items match/,
    },
    {
      name: "all numeric indices — error",
      files: makeFiles({ "doc.md": doc({ annotations: [{ id: "ann_1" }] }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "remove", path: "/annotations/0" }],
      },
      expectStatus: "error",
      expectOutput: /All operations use numeric array indices/,
    },
    {
      name: "mixed: applies valid ops, reports rejected numeric index",
      files: makeFiles({ "doc.md": doc({ color: "red", annotations: [{ id: "ann_1", code: "x" }] }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          { op: "replace", path: "/color", value: "blue" },
          { op: "replace", path: "/annotations/0/code", value: "y" },
        ],
      },
      expectStatus: "partial",
      expectOutput: /Patched/,
      expectMessage: /Rejected 1 op/,
      expectMutations: 1,
    },
    {
      name: "allows append with /-",
      files: makeFiles({ "doc.md": doc({ annotations: [] }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [{ op: "add", path: "/annotations/-", value: { id: "new", text: "t", reason: "r", color: "red" } }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "partial: one op fails selector, other succeeds",
      files: makeFiles({
        "doc.md": doc({
          color: "red",
          annotations: [{ id: "ann_1", code: "x" }],
        }),
      }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          { op: "replace", path: "/color", value: "blue" },
          { op: "remove", path: "/annotations[id=nonexistent]" },
        ],
      },
      expectStatus: "partial",
      expectOutput: /Patched/,
      expectMessage: /No items match/,
      expectMutations: 1,
    },
    {
      name: "partial: one op fails application, other succeeds",
      files: makeFiles({ "doc.md": doc({ a: 1, b: 2 }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          { op: "replace", path: "/a", value: 99 },
          { op: "replace", path: "/nonexistent/deep", value: "x" },
        ],
      },
      expectStatus: "partial",
      expectOutput: /Patched/,
      expectMessage: /\/nonexistent\/deep/,
      expectMutations: 1,
    },
    {
      name: "error: all ops fail",
      files: makeFiles({ "doc.md": doc({ annotations: [{ id: "ann_1" }] }) }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          { op: "remove", path: "/annotations[id=nope]" },
          { op: "replace", path: "/missing/deep", value: 1 },
        ],
      },
      expectStatus: "error",
      expectOutput: /No items match/,
    },
    {
      name: "partial: numeric rejection + op failure + success",
      files: makeFiles({
        "doc.md": doc({
          color: "red",
          annotations: [{ id: "ann_1", code: "x" }],
        }),
      }),
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          { op: "replace", path: "/color", value: "blue" },
          { op: "replace", path: "/annotations/0/code", value: "y" },
          { op: "remove", path: "/annotations[id=ghost]" },
        ],
      },
      expectStatus: "partial",
      expectOutput: /Patched/,
      expectMessage: /Rejected 1 op.*No items match/s,
      expectMutations: 1,
    },
  ]

  it.each(cases)("$name", async ({ files, args, expectStatus, expectOutput, expectMessage, expectMutations }) => {
    const result = await patchJsonBlock.handle(files, args)
    expect(result.status).toBe(expectStatus)
    if (expectOutput instanceof RegExp) {
      expect(result.output).toMatch(expectOutput)
    } else {
      expect(result.output).toBe(expectOutput)
    }
    if (expectMessage) {
      expect(result.message).toMatch(expectMessage)
    }
    if (expectMutations !== undefined) {
      expect(result.mutations).toHaveLength(expectMutations)
    }
    if (expectMutations && expectMutations > 0) {
      expect(result.mutations[0].type).toBe("update_file")
    }
  })
})

describe("autoFuzzyAnnotationText", () => {
  type Case = {
    name: string
    op: Parameters<typeof autoFuzzyAnnotationText>[0]
    expected: Parameters<typeof autoFuzzyAnnotationText>[0]
  }

  const cases: Case[] = [
    {
      name: "wraps text in annotation entry add",
      op: { op: "add", path: "/annotations/-", value: { text: "some phrase", code: "x" } },
      expected: { op: "add", path: "/annotations/-", value: { text: "FUZZY[[some phrase]]", code: "x" } },
    },
    {
      name: "wraps text in annotation entry replace",
      op: { op: "replace", path: "/annotations/0", value: { text: "some phrase" } },
      expected: { op: "replace", path: "/annotations/0", value: { text: "FUZZY[[some phrase]]" } },
    },
    {
      name: "wraps text field directly",
      op: { op: "replace", path: "/annotations/2/text", value: "some phrase" },
      expected: { op: "replace", path: "/annotations/2/text", value: "FUZZY[[some phrase]]" },
    },
    {
      name: "skips already fuzzy text in entry",
      op: { op: "add", path: "/annotations/-", value: { text: "FUZZY[[already wrapped]]" } },
      expected: { op: "add", path: "/annotations/-", value: { text: "FUZZY[[already wrapped]]" } },
    },
    {
      name: "skips already fuzzy text field",
      op: { op: "replace", path: "/annotations/0/text", value: "FUZZY[[already]]" },
      expected: { op: "replace", path: "/annotations/0/text", value: "FUZZY[[already]]" },
    },
    {
      name: "skips non-annotation path",
      op: { op: "add", path: "/codes/-", value: { text: "some phrase" } },
      expected: { op: "add", path: "/codes/-", value: { text: "some phrase" } },
    },
    {
      name: "skips remove op",
      op: { op: "remove", path: "/annotations/0" },
      expected: { op: "remove", path: "/annotations/0" },
    },
    {
      name: "skips test op",
      op: { op: "test", path: "/annotations/0/text", value: "exact" },
      expected: { op: "test", path: "/annotations/0/text", value: "exact" },
    },
    {
      name: "skips annotation entry without text field",
      op: { op: "add", path: "/annotations/-", value: { code: "x" } },
      expected: { op: "add", path: "/annotations/-", value: { code: "x" } },
    },
    {
      name: "skips non-string annotation text field",
      op: { op: "replace", path: "/annotations/0/text", value: 42 },
      expected: { op: "replace", path: "/annotations/0/text", value: 42 },
    },
  ]

  it.each(cases)("$name", ({ op, expected }) => {
    expect(autoFuzzyAnnotationText(op)).toEqual(expected)
  })
})

describe("resolveSelectors", () => {
  const annotations = [
    { id: "ann_1", code: "code_a", color: "red" },
    { id: "ann_2", code: "code_b", color: "blue", review: "might be code_c" },
    { id: "ann_3", code: "code_a", color: "blue" },
    { id: "ann_4", code: "code_c", color: "green", review: "weak fit" },
  ]
  const docJson = { annotations }

  type Case = {
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
      expected: { ok: true, ops: [{ op: "replace", path: "/annotations/0/code", value: "code_new" }] },
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
      expected: { ok: true, ops: [
        { op: "remove", path: "/annotations/2" },
        { op: "remove", path: "/annotations/1" },
      ]},
    },
    {
      name: "multi-match replace — ascending indices",
      ops: [{ op: "replace", path: "/annotations[code=code_a]/code", value: "code_x" }],
      doc: docJson,
      expected: { ok: true, ops: [
        { op: "replace", path: "/annotations/0/code", value: "code_x" },
        { op: "replace", path: "/annotations/2/code", value: "code_x" },
      ]},
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
      expected: { ok: true, ops: [
        { op: "replace", path: "/annotations/0/code", value: "code_z" },
        { op: "add", path: "/annotations/-", value: { id: "ann_5" } },
      ]},
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
      expected: { ok: true, ops: [
        { op: "replace", path: "/annotations/1/color", value: "red" },
      ]},
    },
    {
      name: "exists — matches items with truthy field",
      ops: [{ op: "remove", path: "/annotations[review]" }],
      doc: docJson,
      expected: { ok: true, ops: [
        { op: "remove", path: "/annotations/3" },
        { op: "remove", path: "/annotations/1" },
      ]},
    },
    {
      name: "not_exists — matches items without field",
      ops: [{ op: "remove", path: "/annotations[!review]" }],
      doc: docJson,
      expected: { ok: true, ops: [
        { op: "remove", path: "/annotations/2" },
        { op: "remove", path: "/annotations/0" },
      ]},
    },
    {
      name: "neq — matches items where field differs",
      ops: [{ op: "remove", path: "/annotations[code!=code_a]" }],
      doc: docJson,
      expected: { ok: true, ops: [
        { op: "remove", path: "/annotations/3" },
        { op: "remove", path: "/annotations/1" },
      ]},
    },
    {
      name: "exists with rest path",
      ops: [{ op: "replace", path: "/annotations[review]/color", value: "yellow" }],
      doc: docJson,
      expected: { ok: true, ops: [
        { op: "replace", path: "/annotations/1/color", value: "yellow" },
        { op: "replace", path: "/annotations/3/color", value: "yellow" },
      ]},
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
  type Case = {
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
