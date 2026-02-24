import { describe, it, expect } from "vitest"
import { diffFileContent } from "./diff"
import type { HistoryEntry } from "./types"

const TS = 1000

const buildAttributes = (attrs: object): string =>
  ["```json-attributes", JSON.stringify(attrs, null, 2), "```"].join("\n")

const buildCallout = (callout: object): string =>
  ["```json-callout", JSON.stringify(callout, null, 2), "```"].join("\n")

const buildDoc = (...blocks: string[]): string =>
  ["# Title", "", "Some prose.", "", ...blocks].join("\n")

const annotation = (id: string, text: string, overrides: Record<string, unknown> = {}) => ({
  id,
  text,
  reason: "test reason",
  color: "red",
  ...overrides,
})

const code = (id: string, title: string, overrides: Record<string, unknown> = {}) => ({
  id,
  type: "codebook-code",
  title,
  content: "description",
  color: "blue",
  collapsed: false,
  ...overrides,
})

const pick = (entry: HistoryEntry) => ({
  verb: entry.verb,
  entityKind: entry.entityKind,
  entityId: entry.entityId,
  label: entry.label,
  ...(entry.color ? { color: entry.color } : {}),
})

describe("diffFileContent", () => {
  const cases = [
    {
      name: "empty → one annotation (added with color + text updated)",
      oldRaw: "",
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "hello world")] })),
      expected: [
        { verb: "added", entityKind: "annotation", entityId: "annotation_1", label: "hello world", color: "red" },
        { verb: "updated", entityKind: "text", entityId: null, label: "test.md" },
      ],
    },
    {
      name: "one annotation → empty (removed + text updated)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "hello world")] })),
      newRaw: "",
      expected: [
        { verb: "removed", entityKind: "annotation", entityId: "annotation_1", label: "hello world", color: "red" },
        { verb: "updated", entityKind: "text", entityId: null, label: "test.md" },
      ],
    },
    {
      name: "annotation text changed (updated)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "old text")] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "new text")] })),
      expected: [{ verb: "updated", entityKind: "annotation", entityId: "annotation_1", label: "new text", color: "red" }],
    },
    {
      name: "annotation color changed (updated)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { color: "red" })] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { color: "blue" })] })),
      expected: [{ verb: "updated", entityKind: "annotation", entityId: "annotation_1", label: "text", color: "blue" }],
    },
    {
      name: "annotation code changed (updated)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { code: "code_1", color: undefined })] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { code: "code_2", color: undefined })] })),
      expected: [{ verb: "updated", entityKind: "annotation", entityId: "annotation_1", label: "text" }],
    },
    {
      name: "annotation reason changed (updated)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { reason: "old" })] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { reason: "new" })] })),
      expected: [{ verb: "updated", entityKind: "annotation", entityId: "annotation_1", label: "text", color: "red" }],
    },
    {
      name: "annotation review changed (updated)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text")] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "text", { review: "needs check" })] })),
      expected: [{ verb: "updated", entityKind: "annotation", entityId: "annotation_1", label: "text", color: "red" }],
    },
    {
      name: "two annotations: one added, one removed",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "keep me")] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_2", "new one")] })),
      expected: [
        { verb: "removed", entityKind: "annotation", entityId: "annotation_1", label: "keep me", color: "red" },
        { verb: "added", entityKind: "annotation", entityId: "annotation_2", label: "new one", color: "red" },
      ],
    },
    {
      name: "same annotation unchanged (empty result)",
      oldRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "same")] })),
      newRaw: buildDoc(buildAttributes({ annotations: [annotation("annotation_1", "same")] })),
      expected: [],
    },
    {
      name: "code added (carries code color)",
      oldRaw: buildDoc(),
      newRaw: buildDoc(buildCallout(code("callout_1", "My Code"))),
      expected: [{ verb: "added", entityKind: "code", entityId: "callout_1", label: "My Code", color: "blue" }],
    },
    {
      name: "code removed",
      oldRaw: buildDoc(buildCallout(code("callout_1", "My Code"))),
      newRaw: buildDoc(),
      expected: [{ verb: "removed", entityKind: "code", entityId: "callout_1", label: "My Code", color: "blue" }],
    },
    {
      name: "code title updated",
      oldRaw: buildDoc(buildCallout(code("callout_1", "Old Title"))),
      newRaw: buildDoc(buildCallout(code("callout_1", "New Title"))),
      expected: [{ verb: "updated", entityKind: "code", entityId: "callout_1", label: "New Title", color: "blue" }],
    },
    {
      name: "code content updated",
      oldRaw: buildDoc(buildCallout(code("callout_1", "Title", { content: "old desc" }))),
      newRaw: buildDoc(buildCallout(code("callout_1", "Title", { content: "new desc" }))),
      expected: [{ verb: "updated", entityKind: "code", entityId: "callout_1", label: "Title", color: "blue" }],
    },
    {
      name: "tag added (no color)",
      oldRaw: buildDoc(buildAttributes({ tags: ["existing"] })),
      newRaw: buildDoc(buildAttributes({ tags: ["existing", "new-tag"] })),
      expected: [{ verb: "added", entityKind: "tag", entityId: null, label: "new-tag" }],
    },
    {
      name: "tag removed (no color)",
      oldRaw: buildDoc(buildAttributes({ tags: ["remove-me", "keep"] })),
      newRaw: buildDoc(buildAttributes({ tags: ["keep"] })),
      expected: [{ verb: "removed", entityKind: "tag", entityId: null, label: "remove-me" }],
    },
    {
      name: "composite: annotation + tag in same diff",
      oldRaw: buildDoc(buildAttributes({ tags: ["old-tag"] })),
      newRaw: buildDoc(buildAttributes({ tags: ["new-tag"], annotations: [annotation("annotation_1", "hello")] })),
      expected: [
        { verb: "added", entityKind: "annotation", entityId: "annotation_1", label: "hello", color: "red" },
        { verb: "removed", entityKind: "tag", entityId: null, label: "old-tag" },
        { verb: "added", entityKind: "tag", entityId: null, label: "new-tag" },
      ],
    },
    {
      name: "no blocks → no blocks (empty result)",
      oldRaw: buildDoc(),
      newRaw: buildDoc(),
      expected: [],
    },
    {
      name: "prose changed emits text updated",
      oldRaw: "# Title\n\nOld prose here.",
      newRaw: "# Title\n\nNew prose here.",
      expected: [{ verb: "updated", entityKind: "text", entityId: null, label: "test.md" }],
    },
    {
      name: "prose unchanged emits nothing",
      oldRaw: "# Title\n\nSame prose.",
      newRaw: "# Title\n\nSame prose.",
      expected: [],
    },
    {
      name: "annotation added + prose changed emits both",
      oldRaw: "# Title\n\nOld text.\n\n" + buildAttributes({}),
      newRaw: "# Title\n\nNew text.\n\n" + buildAttributes({ annotations: [annotation("annotation_1", "New text.")] }),
      expected: [
        { verb: "added", entityKind: "annotation", entityId: "annotation_1", label: "New text.", color: "red" },
        { verb: "updated", entityKind: "text", entityId: null, label: "test.md" },
      ],
    },
  ]

  cases.forEach(({ name, oldRaw, newRaw, expected }) => {
    it(name, () => {
      const entries = diffFileContent(oldRaw, newRaw, "test.md", TS)
      expect(entries.map(pick)).toEqual(expected)
      entries.forEach((e) => {
        expect(e.path).toBe("test.md")
        expect(e.timestamp).toBe(TS)
      })
    })
  })
})
