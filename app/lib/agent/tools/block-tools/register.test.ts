import { describe, it, expect, afterEach } from "vitest"
import { getToolHandlers } from "../../executors/tool"
import "./register"
import { setFiles } from "~/lib/files"
import type { FileStore } from "~/lib/files"

const doc = (json: object, language = "json-attributes"): string =>
  `# Title\n\nSome text.\n\n\`\`\`${language}\n${JSON.stringify(json, null, "\t")}\n\`\`\`\n\nMore text.\n`

const validCallout = (partial: { id: string; title: string; content: string }) => ({
  type: "codebook-code",
  color: "blue",
  collapsed: false,
  ...partial,
})

const multiBlockDoc = (blocks: { id: string; title: string; content: string }[]): string =>
  `# Codebook\n\n${blocks
    .map((b) => `\`\`\`json-callout\n${JSON.stringify(validCallout(b), null, "\t")}\n\`\`\``)
    .join("\n\nSome prose.\n\n")}\n`

const handle = async (toolName: string, files: FileStore, args: Record<string, unknown>) => {
  setFiles(files)
  const handlers = getToolHandlers()
  const handler = handlers[toolName]
  if (!handler) throw new Error(`no handler for ${toolName}`)
  return handler(new Map(), args)
}

describe("block patch tools", () => {
  afterEach(() => setFiles({}))

  interface PatchCase {
    name: string
    tool: string
    files: FileStore
    args: Record<string, unknown>
    expectStatus: "ok" | "partial" | "error"
    expectOutput: RegExp
    expectMutations?: number
  }

  const patchCases: PatchCase[] = [
    {
      name: "patch_attributes: set fields",
      tool: "patch_attributes",
      files: { "doc.md": doc({ tags: ["a"], date: "2024-01-01" }) },
      args: {
        path: "doc.md",
        operations: [{ op: "set", fields: { date: "2025-01-01" } }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "patch_annotations: add annotation",
      tool: "patch_annotations",
      files: {
        "doc.md":
          '# Verslag\n\nDe minister kondigde aan dat er stappen worden genomen.\n\n```json-annotations\n{\n\t"annotations": []\n}\n```\n',
      },
      args: {
        path: "doc.md",
        operations: [
          {
            op: "add_annotation",
            item: {
              text: "De minister kondigde aan dat er stappen worden genomen",
              reason: "key finding",
              color: "blue",
            },
          },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "patch_annotations: remove annotation by id",
      tool: "patch_annotations",
      files: {
        "doc.md": doc(
          { annotations: [{ id: "ann_1", text: "x", reason: "y", color: "red" }] },
          "json-annotations"
        ),
      },
      args: {
        path: "doc.md",
        operations: [{ op: "remove_annotation", match: { id: "ann_1" } }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "patch_annotations: set annotation fields",
      tool: "patch_annotations",
      files: {
        "doc.md": doc(
          {
            annotations: [
              { id: "ann_1", text: "x", reason: "old", color: "red" },
              { id: "ann_2", text: "y", reason: "keep", color: "blue" },
            ],
          },
          "json-annotations"
        ),
      },
      args: {
        path: "doc.md",
        operations: [{ op: "set_annotation", match: { id: "ann_1" }, fields: { reason: "new" } }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "patch_callout: set fields with block_id",
      tool: "patch_callout",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "old" },
          { id: "callout_b", title: "Beta", content: "keep" },
        ]),
      },
      args: {
        path: "codebook.md",
        block_id: "callout_a",
        operations: [{ op: "set", fields: { content: "new" } }],
      },
      expectStatus: "ok",
      expectOutput: /Patched.*json-callout/,
      expectMutations: 1,
    },
    {
      name: "patch_callout: error when block_id missing",
      tool: "patch_callout",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "x" },
          { id: "callout_b", title: "Beta", content: "y" },
        ]),
      },
      args: {
        path: "codebook.md",
        operations: [{ op: "set", fields: { content: "z" } }],
      },
      expectStatus: "error",
      expectOutput: /block_id is required/,
    },
    {
      name: "patch_callout: error on invalid color",
      tool: "patch_callout",
      files: {
        "codebook.md": multiBlockDoc([{ id: "callout_a", title: "A", content: "b" }]),
      },
      args: {
        path: "codebook.md",
        block_id: "callout_a",
        operations: [{ op: "set", fields: { color: "not-a-valid-color" } }],
      },
      expectStatus: "error",
      expectOutput: /invalid.*json-callout/i,
    },
    {
      name: "patch_callout: patch_content applies field diff",
      tool: "patch_callout",
      files: {
        "codebook.md": multiBlockDoc([
          {
            id: "callout_a",
            title: "Alpha",
            content: "Line one.\nLine two.\nLine three.",
          },
        ]),
      },
      args: {
        path: "codebook.md",
        block_id: "callout_a",
        operations: [
          {
            op: "patch_content",
            diff: "@@\nLine one.\n-Line two.\n+Line two updated.\nLine three.",
          },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched.*json-callout/,
      expectMutations: 1,
    },
    {
      name: "patch_callout: patch_content with set in same batch",
      tool: "patch_callout",
      files: {
        "codebook.md": multiBlockDoc([
          {
            id: "callout_a",
            title: "Alpha",
            content: "Original content.",
          },
        ]),
      },
      args: {
        path: "codebook.md",
        block_id: "callout_a",
        operations: [
          { op: "set", fields: { color: "red" } },
          { op: "patch_content", diff: "@@\n-Original content.\n+Updated content." },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched.*json-callout/,
      expectMutations: 1,
    },
    {
      name: "patch_attributes: error when file not found",
      tool: "patch_attributes",
      files: {},
      args: {
        path: "missing.md",
        operations: [{ op: "set", fields: { date: "2025-01-01" } }],
      },
      expectStatus: "error",
      expectOutput: /No such file/,
    },
    {
      name: "patch_attributes: no-op when result is identical",
      tool: "patch_attributes",
      files: { "doc.md": doc({ date: "2024-01-01" }) },
      args: {
        path: "doc.md",
        operations: [{ op: "set", fields: { date: "2024-01-01" } }],
      },
      expectStatus: "ok",
      expectOutput: /No changes/,
      expectMutations: 0,
    },
    {
      name: "patch_attributes: double extension resolves",
      tool: "patch_attributes",
      files: { "doc.md": doc({ date: "2024-01-01" }) },
      args: {
        path: "doc.md.md",
        operations: [{ op: "set", fields: { date: "2025-01-01" } }],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
    {
      name: "patch_settings: add tag",
      tool: "patch_settings",
      files: {
        "settings.hidden.md": doc(
          {
            tags: [{ id: "tag_1", label: "old", display: "Old", color: "blue", icon: "hash" }],
          },
          "json-settings"
        ),
      },
      args: {
        path: "settings.hidden.md",
        operations: [
          {
            op: "add_tag",
            item: { id: "tag_2", label: "new", display: "New", color: "red", icon: "hash" },
          },
        ],
      },
      expectStatus: "ok",
      expectOutput: /Patched/,
      expectMutations: 1,
    },
  ]

  it.each(patchCases)(
    "$name",
    async ({ tool: toolName, files, args, expectStatus, expectOutput, expectMutations }) => {
      const result = await handle(toolName, files, args)
      expect(result.status).toBe(expectStatus)
      expect(result.output).toMatch(expectOutput)
      if (expectMutations !== undefined) {
        expect(result.mutations).toHaveLength(expectMutations)
      }
    }
  )
})

describe("block delete tools", () => {
  afterEach(() => setFiles({}))

  interface DeleteCase {
    name: string
    tool: string
    files: FileStore
    args: Record<string, unknown>
    expectStatus: "ok" | "error"
    expectOutput: RegExp
    expectMutations?: number
    expectNoContent?: RegExp
  }

  const deleteCases: DeleteCase[] = [
    {
      name: "delete_attributes: deletes singleton",
      tool: "delete_attributes",
      files: { "doc.md": doc({ tags: ["a"] }) },
      args: { path: "doc.md" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-attributes/,
      expectMutations: 1,
      expectNoContent: /json-attributes/,
    },
    {
      name: "delete_callout: deletes by block_id",
      tool: "delete_callout",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "keep" },
          { id: "callout_b", title: "Beta", content: "remove" },
        ]),
      },
      args: { path: "codebook.md", block_id: "callout_b" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-callout/,
      expectMutations: 1,
      expectNoContent: /callout_b/,
    },
    {
      name: "delete_callout: error when block_id required but missing",
      tool: "delete_callout",
      files: {
        "codebook.md": multiBlockDoc([
          { id: "callout_a", title: "Alpha", content: "x" },
          { id: "callout_b", title: "Beta", content: "y" },
        ]),
      },
      args: { path: "codebook.md" },
      expectStatus: "error",
      expectOutput: /block_id is required/,
    },
    {
      name: "delete_attributes: error when file not found",
      tool: "delete_attributes",
      files: {},
      args: { path: "missing.md" },
      expectStatus: "error",
      expectOutput: /No such file/,
    },
    {
      name: "delete_annotations: deletes singleton",
      tool: "delete_annotations",
      files: {
        "doc.md": doc(
          { annotations: [{ id: "ann_1", text: "x", reason: "y", color: "red" }] },
          "json-annotations"
        ),
      },
      args: { path: "doc.md" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-annotations/,
      expectMutations: 1,
    },
    {
      name: "delete_settings: deletes singleton",
      tool: "delete_settings",
      files: {
        "settings.hidden.md": doc({ tags: [] }, "json-settings"),
      },
      args: { path: "settings.hidden.md" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-settings/,
      expectMutations: 1,
    },
    {
      name: "delete_chart: deletes by block_id",
      tool: "delete_chart",
      files: {
        "doc.md": `# Report\n\n\`\`\`json-chart\n${JSON.stringify({ id: "chart_1", caption: { label: "Fig 1" }, query: "SELECT 1", spec: { type: "bar", x: "x", y: "y", color: "blue" } }, null, "\t")}\n\`\`\`\n`,
      },
      args: { path: "doc.md", block_id: "chart_1" },
      expectStatus: "ok",
      expectOutput: /Deleted.*json-chart/,
      expectMutations: 1,
    },
  ]

  it.each(deleteCases)(
    "$name",
    async ({
      tool: toolName,
      files,
      args,
      expectStatus,
      expectOutput,
      expectMutations,
      expectNoContent,
    }) => {
      const result = await handle(toolName, files, args)
      expect(result.status).toBe(expectStatus)
      expect(result.output).toMatch(expectOutput)
      if (expectMutations !== undefined) {
        expect(result.mutations).toHaveLength(expectMutations)
      }
      if (expectNoContent && result.mutations.length > 0) {
        const content = (result.mutations[0] as { content: string }).content
        expect(content).not.toMatch(expectNoContent)
      }
    }
  )
})
