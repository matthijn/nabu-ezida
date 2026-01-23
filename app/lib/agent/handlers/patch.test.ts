import { describe, it, expect } from "vitest"
import { applyFilePatch, type FileResult } from "~/lib/files"

describe("applyFilePatch", () => {
  const cases: {
    name: string
    path: string
    content: string
    diff: string
    expectStatus: FileResult["status"]
    expectRejectedFields?: string[]
    expectContent?: string
  }[] = [
    {
      name: "json file with valid slug tags succeeds",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": ["valid-tag", "another-one"]}',
      expectStatus: "ok",
    },
    {
      name: "json file with invalid tag format returns partial with rejection",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": ["Invalid Tag"]}',
      expectStatus: "partial",
      expectRejectedFields: ["tags"],
      expectContent: "{}",
    },
    {
      name: "json file with uppercase tag returns partial",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": ["UPPERCASE"]}',
      expectStatus: "partial",
      expectRejectedFields: ["tags"],
    },
    {
      name: "json file with underscore tag returns partial",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": ["tag_with_underscore"]}',
      expectStatus: "partial",
      expectRejectedFields: ["tags"],
    },
    {
      name: "json file with special chars returns partial",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": ["needs-fix!"]}',
      expectStatus: "partial",
      expectRejectedFields: ["tags"],
    },
    {
      name: "json file with empty tags array succeeds",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": []}',
      expectStatus: "ok",
    },
    {
      name: "json file with no tags succeeds",
      path: "test.json",
      content: "",
      diff: '@@\n+{}',
      expectStatus: "ok",
    },
    {
      name: "md file with any content succeeds",
      path: "test.md",
      content: "",
      diff: "@@\n+# Hello World",
      expectStatus: "ok",
    },
    {
      name: "update json with invalid tags returns partial, keeps original",
      path: "doc.json",
      content: '{"tags": ["old-tag"]}',
      diff: '@@\n-{"tags": ["old-tag"]}\n+{"tags": ["New Invalid Tag"]}',
      expectStatus: "partial",
      expectRejectedFields: ["tags"],
      expectContent: '{\n  "tags": [\n    "old-tag"\n  ]\n}',
    },
    {
      name: "annotations field is readonly",
      path: "doc.json",
      content: "{}",
      diff: '@@\n-{}\n+{"annotations": [{"text": "test", "reason": "note", "color": "red"}]}',
      expectStatus: "partial",
      expectRejectedFields: ["annotations"],
    },
    {
      name: "valid tags accepted while annotations rejected",
      path: "doc.json",
      content: "{}",
      diff: '@@\n-{}\n+{"tags": ["valid-tag"], "annotations": [{"text": "test", "reason": "note", "color": "red"}]}',
      expectStatus: "partial",
      expectRejectedFields: ["annotations"],
      expectContent: '{\n  "tags": [\n    "valid-tag"\n  ]\n}',
    },
    {
      name: "both invalid tags and readonly annotations rejected",
      path: "doc.json",
      content: "{}",
      diff: '@@\n-{}\n+{"tags": ["Invalid Tag"], "annotations": [{"text": "test", "reason": "note", "color": "red"}]}',
      expectStatus: "partial",
      expectRejectedFields: ["tags", "annotations"],
      expectContent: "{}",
    },
    {
      name: "pretty prints json output",
      path: "test.json",
      content: "",
      diff: '@@\n+{"tags": ["one", "two"]}',
      expectStatus: "ok",
      expectContent: '{\n  "tags": [\n    "one",\n    "two"\n  ]\n}',
    },
  ]

  it.each(cases)("$name", ({ path, content, diff, expectStatus, expectRejectedFields, expectContent }) => {
    const result = applyFilePatch(path, content, diff)
    expect(result.status).toBe(expectStatus)

    if (expectRejectedFields && result.status === "partial") {
      const rejectedFields = result.rejected.map((r) => r.field)
      expect(rejectedFields).toEqual(expect.arrayContaining(expectRejectedFields))
    }

    if (expectContent && (result.status === "ok" || result.status === "partial")) {
      expect(result.content).toBe(expectContent)
    }
  })
})
