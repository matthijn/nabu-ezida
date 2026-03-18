import { describe, it, expect, afterEach } from "vitest"
import { patchJsonBlock } from "./handler"
import { setFiles } from "~/lib/files"
import type { FileStore } from "~/lib/files"

const doc = (json: object, language = "json-attributes"): string =>
  `# Title\n\nSome text.\n\n\`\`\`${language}\n${JSON.stringify(json, null, "\t")}\n\`\`\`\n\nMore text.\n`

const multiBlockDoc = (blocks: { id: string; title: string; content: string }[]): string =>
  `# Codebook\n\n${blocks.map((b) => `\`\`\`json-callout\n${JSON.stringify(b, null, "\t")}\n\`\`\``).join("\n\nSome prose.\n\n")}\n`

describe("patch_json_block", () => {
  afterEach(() => setFiles({}))

  interface Case {
    name: string
    files: FileStore
    args: Record<string, unknown>
    expectStatus: "ok" | "partial" | "error"
    expectOutput: string | RegExp
    expectMessage?: RegExp
    expectMutations?: number
  }

  const cases: Case[] = [
    {
      name: "replace a field produces update_file operation",
      files: { "doc.md": doc({ color: "red", count: 1 }) },
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
      files: { "doc.md": doc({ name: "test" }) },
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
      files: { "doc.md": doc({ a: 1, b: 2 }) },
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
      files: { "doc.md": doc({ x: 1 }) },
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
      files: {},
      args: {
        path: "missing.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/x", value: 1 }],
      },
      expectStatus: "error",
      expectOutput: /No such file/,
    },
    {
      name: "error when block not found for unknown language",
      files: { "doc.md": "# No blocks here\n" },
      args: {
        path: "doc.md",
        language: "json-unknown",
        operations: [{ op: "replace", path: "/x", value: 1 }],
      },
      expectStatus: "error",
      expectOutput: /No .* block found/,
    },
    {
      name: "auto-creates block for known language",
      files: { "doc.md": "# No blocks here\n" },
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          {
            op: "add",
            path: "/annotations/-",
            value: { text: "No blocks here", reason: "r", color: "red" },
          },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "double extension resolves to correct file",
      files: { "doc.md": doc({ color: "red" }) },
      args: {
        path: "doc.md.md",
        language: "json-attributes",
        operations: [{ op: "replace", path: "/color", value: "blue" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "error on invalid json pointer path",
      files: { "doc.md": doc({ a: 1 }) },
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
      files: { "doc.md": doc({ id: "callout_1", key: "old" }, "json-callout") },
      args: {
        path: "doc.md",
        language: "json-callout",
        block_id: "callout_1",
        operations: [{ op: "replace", path: "/key", value: "new" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched.*json-callout/,
      expectMutations: 1,
    },
    {
      name: "multiple operations in sequence",
      files: { "doc.md": doc({ items: ["a"], count: 0 }) },
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
      files: {
        "doc.md": doc({
          annotations: [
            { id: "ann_1", text: "first" },
            { id: "ann_2", text: "second" },
          ],
        }),
      },
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
      files: {
        "doc.md": doc({
          annotations: [
            { id: "ann_1", code: "old" },
            { id: "ann_2", code: "keep" },
          ],
        }),
      },
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
      files: {
        "doc.md": doc({ annotations: [{ id: "ann_1" }] }),
      },
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
      files: { "doc.md": doc({ annotations: [{ id: "ann_1" }] }) },
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
      files: { "doc.md": doc({ color: "red", annotations: [{ id: "ann_1", code: "x" }] }) },
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
      files: { "doc.md": doc({ annotations: [] }) },
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          {
            op: "add",
            path: "/annotations/-",
            value: { id: "new", text: "Some text", reason: "r", color: "red" },
          },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "annotation text fuzzy-resolved against document",
      files: {
        "doc.md":
          '# Verslag\n\nDe minister kondigde aan dat er stappen worden genomen om het beleid te wijzigen.\n\n```json-attributes\n{\n\t"annotations": []\n}\n```\n',
      },
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          {
            op: "add",
            path: "/annotations/-",
            value: {
              text: "De minister kondigde aan dat er stappn worden genomen om het beleid te wijzigen",
              reason: "typo in quote",
              code: "x",
            },
          },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "annotation text not found in document — error",
      files: { "doc.md": doc({ annotations: [] }) },
      args: {
        path: "doc.md",
        language: "json-attributes",
        operations: [
          {
            op: "add",
            path: "/annotations/-",
            value: {
              text: "completely nonexistent phrase that appears nowhere",
              reason: "r",
              code: "x",
            },
          },
        ],
      },
      expectStatus: "error",
      expectOutput: /Text not found in document/,
    },
    {
      name: "partial: one op fails selector, other succeeds",
      files: {
        "doc.md": doc({
          color: "red",
          annotations: [{ id: "ann_1", code: "x" }],
        }),
      },
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
      files: { "doc.md": doc({ a: 1, b: 2 }) },
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
      files: { "doc.md": doc({ annotations: [{ id: "ann_1" }] }) },
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
      files: {
        "doc.md": doc({
          color: "red",
          annotations: [{ id: "ann_1", code: "x" }],
        }),
      },
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
    {
      name: "multi-block: patches correct block by id",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "old" },
          { id: "callout_b", title: "Beta", content: "keep" },
        ]),
      },
      args: {
        path: "codebook.md",
        language: "json-callout",
        block_id: "callout_a",
        operations: [{ op: "replace", path: "/content", value: "new" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched.*json-callout/,
      expectMutations: 1,
    },
    {
      name: "multi-block: error when block_id missing",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "x" },
          { id: "callout_b", title: "Beta", content: "y" },
        ]),
      },
      args: {
        path: "codebook.md",
        language: "json-callout",
        operations: [{ op: "replace", path: "/content", value: "z" }],
      },
      expectStatus: "error",
      expectOutput: /block_id is required.*callout_a \(Alpha\).*callout_b \(Beta\)/s,
    },
    {
      name: "multi-block: error when block_id not found lists available",
      files: {
        "codebook.md": multiBlockDoc([{ id: "callout_a", title: "Alpha", content: "x" }]),
      },
      args: {
        path: "codebook.md",
        language: "json-callout",
        block_id: "callout_nope",
        operations: [{ op: "replace", path: "/content", value: "z" }],
      },
      expectStatus: "error",
      expectOutput: /No.*block with id "callout_nope".*callout_a \(Alpha\)/s,
    },
    {
      name: "multi-block: does not modify other blocks",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "stay" },
          { id: "callout_b", title: "Beta", content: "old" },
        ]),
      },
      args: {
        path: "codebook.md",
        language: "json-callout",
        block_id: "callout_b",
        operations: [{ op: "replace", path: "/content", value: "new" }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
  ]

  it.each(cases)(
    "$name",
    async ({ files, args, expectStatus, expectOutput, expectMessage, expectMutations }) => {
      setFiles(files)
      const result = await patchJsonBlock.handle(new Map(), args)
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
        expect(result.mutations[0].type).toBe("write_file")
      }
    }
  )
})
