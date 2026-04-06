import { describe, it, expect, afterEach } from "vitest"
import { deleteJsonBlock } from "./handler"
import { setFiles } from "~/lib/files"
import type { FileStore } from "~/lib/files"

const doc = (json: object, language = "json-attributes"): string =>
  `# Title\n\nSome text.\n\n\`\`\`${language}\n${JSON.stringify(json, null, "\t")}\n\`\`\`\n\nMore text.\n`

const multiBlockDoc = (blocks: { id: string; title: string; content: string }[]): string =>
  `# Codebook\n\n${blocks.map((b) => `\`\`\`json-callout\n${JSON.stringify(b, null, "\t")}\n\`\`\``).join("\n\nSome prose.\n\n")}\n`

describe("delete_json_block", () => {
  afterEach(() => setFiles({}))

  interface Case {
    name: string
    files: FileStore
    args: Record<string, unknown>
    expectStatus: "ok" | "error"
    expectOutput: string | RegExp
    expectMutations?: number
    expectContent?: RegExp
    expectNoContent?: RegExp
  }

  const cases: Case[] = [
    {
      name: "deletes singleton block",
      files: { "doc.md": doc({ color: "red" }) },
      args: { path: "doc.md", language: "json-attributes" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-attributes/,
      expectMutations: 1,
      expectNoContent: /json-attributes/,
    },
    {
      name: "preserves surrounding prose",
      files: { "doc.md": doc({ color: "red" }) },
      args: { path: "doc.md", language: "json-attributes" },
      expectStatus: "ok",
      expectOutput: /Deleted/,
      expectMutations: 1,
      expectContent: /# Title/,
    },
    {
      name: "deletes specific block by id",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "keep" },
          { id: "callout_b", title: "Beta", content: "remove" },
        ]),
      },
      args: { path: "codebook.md", language: "json-callout", block_id: "callout_b" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-callout/,
      expectMutations: 1,
      expectContent: /callout_a/,
      expectNoContent: /callout_b/,
    },
    {
      name: "collapses triple blank lines after deletion",
      files: {
        "doc.md": "# Title\n\n```json-attributes\n{}\n```\n\nMore text.\n",
      },
      args: { path: "doc.md", language: "json-attributes" },
      expectStatus: "ok",
      expectOutput: /Deleted/,
      expectMutations: 1,
      expectNoContent: /\n{3,}/,
    },
    {
      name: "error when file not found",
      files: {},
      args: { path: "missing.md", language: "json-attributes" },
      expectStatus: "error",
      expectOutput: /No such file/,
    },
    {
      name: "error when block not found",
      files: { "doc.md": "# No blocks\n" },
      args: { path: "doc.md", language: "json-attributes" },
      expectStatus: "error",
      expectOutput: /No.*block found/,
    },
    {
      name: "error when block_id required but missing",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "x" },
          { id: "callout_b", title: "Beta", content: "y" },
        ]),
      },
      args: { path: "codebook.md", language: "json-callout" },
      expectStatus: "error",
      expectOutput: /block_id is required.*callout_a \(Alpha\).*callout_b \(Beta\)/s,
    },
    {
      name: "error when block_id not found lists available",
      files: {
        "codebook.md": multiBlockDoc([{ id: "callout_a", title: "Alpha", content: "x" }]),
      },
      args: { path: "codebook.md", language: "json-callout", block_id: "callout_nope" },
      expectStatus: "error",
      expectOutput: /No.*block with id "callout_nope".*callout_a \(Alpha\)/s,
    },
    {
      name: "double extension resolves to correct file",
      files: { "doc.md": doc({ color: "red" }) },
      args: { path: "doc.md.md", language: "json-attributes" },
      expectStatus: "ok",
      expectOutput: /Deleted/,
      expectMutations: 1,
    },
    {
      name: "error for unknown language with no blocks",
      files: { "doc.md": "# No blocks here\n" },
      args: { path: "doc.md", language: "json-unknown" },
      expectStatus: "error",
      expectOutput: /No.*block found/,
    },
  ]

  it.each(cases)(
    "$name",
    async ({
      files,
      args,
      expectStatus,
      expectOutput,
      expectMutations,
      expectContent,
      expectNoContent,
    }) => {
      setFiles(files)
      const result = await deleteJsonBlock.handle(new Map(), args)
      expect(result.status).toBe(expectStatus)
      if (expectOutput instanceof RegExp) {
        expect(result.output).toMatch(expectOutput)
      } else {
        expect(result.output).toBe(expectOutput)
      }
      if (expectMutations !== undefined) {
        expect(result.mutations).toHaveLength(expectMutations)
      }
      if (expectContent && result.mutations.length > 0) {
        const content = (result.mutations[0] as { content: string }).content
        expect(content).toMatch(expectContent)
      }
      if (expectNoContent && result.mutations.length > 0) {
        const content = (result.mutations[0] as { content: string }).content
        expect(content).not.toMatch(expectNoContent)
      }
    }
  )
})
