import { describe, it, expect, beforeEach } from "vitest"
import { applyFilePatch, type FileResult } from "~/lib/files"

describe("applyFilePatch validation in handler context", () => {
  const cases = [
    {
      name: "json file with valid slug tags succeeds",
      path: "test.json",
      content: "",
      diff: '+{"tags": ["valid-tag", "another-one"]}',
      expectStatus: "ok",
    },
    {
      name: "json file with invalid tag format fails validation",
      path: "test.json",
      content: "",
      diff: '+{"tags": ["Invalid Tag"]}',
      expectStatus: "validation_error",
    },
    {
      name: "json file with uppercase tag fails validation",
      path: "test.json",
      content: "",
      diff: '+{"tags": ["UPPERCASE"]}',
      expectStatus: "validation_error",
    },
    {
      name: "json file with underscore tag fails validation",
      path: "test.json",
      content: "",
      diff: '+{"tags": ["tag_with_underscore"]}',
      expectStatus: "validation_error",
    },
    {
      name: "json file with special chars fails validation",
      path: "test.json",
      content: "",
      diff: '+{"tags": ["needs-fix!"]}',
      expectStatus: "validation_error",
    },
    {
      name: "json file with empty tags array succeeds",
      path: "test.json",
      content: "",
      diff: '+{"tags": []}',
      expectStatus: "ok",
    },
    {
      name: "json file with no tags succeeds",
      path: "test.json",
      content: "",
      diff: '+{}',
      expectStatus: "ok",
    },
    {
      name: "md file with any content succeeds",
      path: "test.md",
      content: "",
      diff: "+# Hello World",
      expectStatus: "ok",
    },
    {
      name: "update json with invalid tags fails validation",
      path: "doc.json",
      content: '{"tags": ["old-tag"]}',
      diff: '-{"tags": ["old-tag"]}\n+{"tags": ["New Invalid Tag"]}',
      expectStatus: "validation_error",
    },
  ]

  it.each(cases)("$name", ({ path, content, diff, expectStatus }) => {
    const result = applyFilePatch(path, content, diff)
    expect(result.status).toBe(expectStatus)
  })
})
