import { describe, it, expect } from "vitest"
import { patchJsonBlock } from "./json-patch"

const makeFiles = (entries: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(entries))

const doc = (json: object, language = "json-attributes"): string =>
  `# Title\n\nSome text.\n\n\`\`\`${language}\n${JSON.stringify(json, null, 2)}\n\`\`\`\n\nMore text.\n`

describe("patch_json_block", () => {
  type Case = {
    name: string
    files: Map<string, string>
    args: Record<string, unknown>
    expectStatus: "ok" | "error"
    expectOutput: string | RegExp
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
      expectOutput: /Patch failed/,
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
  ]

  it.each(cases)("$name", async ({ files, args, expectStatus, expectOutput, expectMutations }) => {
    const result = await patchJsonBlock.handle(files, args)
    expect(result.status).toBe(expectStatus)
    if (expectOutput instanceof RegExp) {
      expect(result.output).toMatch(expectOutput)
    } else {
      expect(result.output).toBe(expectOutput)
    }
    if (expectMutations !== undefined) {
      expect(result.mutations).toHaveLength(expectMutations)
    }
    if (expectMutations && expectMutations > 0) {
      expect(result.mutations[0].type).toBe("update_file")
    }
  })
})
