import { describe, it, expect } from "vitest"
import { removeBlock } from "./tools/remove-block"

const makeFiles = (entries: Record<string, string>): Map<string, string> =>
  new Map(Object.entries(entries))

const block = (language: string, json: object): string =>
  "```" + language + "\n" + JSON.stringify(json, null, 2) + "\n```"

const singleDoc = `# Title\n\n${block("json-callout", { id: "c1", text: "hello" })}\n\nEnd.\n`

const multiDoc = [
  "# Title",
  "",
  block("json-callout", { id: "c1", text: "first" }),
  "",
  block("json-callout", { id: "c2", text: "second" }),
  "",
  "End.",
].join("\n")

describe("remove_block", () => {
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
      name: "removes singleton block",
      files: makeFiles({ "doc.md": singleDoc }),
      args: { path: "doc.md", language: "json-callout" },
      expectStatus: "ok",
      expectOutput: /Removed/,
      expectMutations: 1,
    },
    {
      name: "removes block by id",
      files: makeFiles({ "doc.md": multiDoc }),
      args: { path: "doc.md", language: "json-callout", id: "c1" },
      expectStatus: "ok",
      expectOutput: /Removed/,
      expectMutations: 1,
    },
    {
      name: "error when file not found",
      files: makeFiles({}),
      args: { path: "missing.md", language: "json-callout" },
      expectStatus: "error",
      expectOutput: /No such file/,
    },
    {
      name: "error when block not found",
      files: makeFiles({ "doc.md": "# Empty\n" }),
      args: { path: "doc.md", language: "json-callout" },
      expectStatus: "error",
      expectOutput: /No .* block found/,
    },
    {
      name: "error when multiple blocks and no id",
      files: makeFiles({ "doc.md": multiDoc }),
      args: { path: "doc.md", language: "json-callout" },
      expectStatus: "error",
      expectOutput: /Multiple/,
    },
  ]

  it.each(cases)("$name", async ({ files, args, expectStatus, expectOutput, expectMutations }) => {
    const result = await removeBlock.handle(files, args)
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
