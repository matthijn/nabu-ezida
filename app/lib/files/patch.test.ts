import { describe, expect, it } from "vitest"
import { applyFilePatch, applyFilePatches } from "./patch"

describe("applyFilePatch", () => {
  it("md file accepts patch", () => {
    const result = applyFilePatch("doc.md", "hello", `@@
-hello
+helloworld`)
    expect(result).toEqual({ path: "doc.md", status: "ok", content: "helloworld" })
  })

  it("json file with valid result", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["old"]}', `@@
-{"tags": ["old"]}
+{"tags": ["new"]}`)
    expect(result).toEqual({
      path: "doc.json",
      status: "ok",
      content: '{\n  "tags": [\n    "new"\n  ]\n}',
      parsed: { tags: ["new"] },
    })
  })

  it("json file with empty object is valid", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["foo"]}', `@@
-{"tags": ["foo"]}
+{}`)
    expect(result).toEqual({ path: "doc.json", status: "ok", content: "{}", parsed: {} })
  })

  it("json file with invalid tag format returns partial, keeps original", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["foo"]}', `@@
-{"tags": ["foo"]}
+{"tags": ["Not A Slug"]}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("partial")
    if (result.status === "partial") {
      expect(result.rejected[0].field).toBe("tags")
      expect(result.rejected[0].reason).toBe("invalid")
      expect(result.parsed).toEqual({ tags: ["foo"] })
    }
  })

  it("json file with wrong type returns partial, keeps original", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["foo"]}', `@@
-{"tags": ["foo"]}
+{"tags": "not-array"}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("partial")
    if (result.status === "partial") {
      expect(result.rejected[0].field).toBe("tags")
      expect(result.rejected[0].reason).toBe("invalid")
      expect(result.parsed).toEqual({ tags: ["foo"] })
    }
  })

  it("json file with invalid json", () => {
    const result = applyFilePatch("doc.json", '{"tags": []}', `@@
-{"tags": []}
+{invalid json}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toBeDefined()
    }
  })

  it("json file with patch context not found", () => {
    const result = applyFilePatch("doc.json", '{"tags": []}', `@@
-{"nonexistent": true}
+{"tags": ["new"]}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toContain("patch context not found")
    }
  })

  it("md file with patch error", () => {
    const result = applyFilePatch("doc.md", "hello", `@@
-nonexistent
+replacement`)
    expect(result.path).toBe("doc.md")
    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toContain("patch context not found")
    }
  })
})

describe("applyFilePatches", () => {
  it("all succeed", () => {
    const result = applyFilePatches([
      { path: "a.md", content: "a", patch: `@@
-a
+ab` },
      { path: "b.json", content: '{"tags":[]}', patch: `@@
-{"tags":[]}
+{"tags":["new"]}` },
    ])
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({ path: "a.md", status: "ok", content: "ab" })
    expect(result.results[1]).toEqual({
      path: "b.json",
      status: "ok",
      content: '{\n  "tags": [\n    "new"\n  ]\n}',
      parsed: { tags: ["new"] },
    })
  })

  it("mixed success and partial rejection", () => {
    const result = applyFilePatches([
      { path: "a.md", content: "", patch: `*** Add File: a.md
content` },
      { path: "b.json", content: '{"tags":[]}', patch: `@@
-{"tags":[]}
+{"tags":["Invalid Tag"]}` },
    ])
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({ path: "a.md", status: "ok", content: "content" })
    expect(result.results[1].path).toBe("b.json")
    expect(result.results[1].status).toBe("partial")
  })

  it("mixed success and patch error", () => {
    const result = applyFilePatches([
      { path: "a.json", content: '{"tags":["x"]}', patch: `@@
-{"tags":["x"]}
+{"tags":["y"]}` },
      { path: "b.md", content: "hello", patch: `@@
-nonexistent
+x` },
    ])
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({
      path: "a.json",
      status: "ok",
      content: '{\n  "tags": [\n    "y"\n  ]\n}',
      parsed: { tags: ["y"] },
    })
    expect(result.results[1].path).toBe("b.md")
    expect(result.results[1].status).toBe("error")
  })

  it("empty patches", () => {
    const result = applyFilePatches([])
    expect(result).toEqual({ results: [] })
  })
})

describe("applyFilePatch with internal option", () => {
  it("annotations accepted without internal option", () => {
    const result = applyFilePatch(
      "doc.json",
      "{}",
      '@@\n-{}\n+{"annotations": [{"text": "test", "reason": "note", "color": "red"}]}',
      {}
    )
    expect(result.status).toBe("ok")
  })

  it("annotations accepted with internal=true", () => {
    const result = applyFilePatch(
      "doc.json",
      "{}",
      '@@\n-{}\n+{"annotations": [{"text": "test", "reason": "note", "color": "red"}]}',
      { internal: true }
    )
    expect(result.status).toBe("ok")
  })

  it("internal still validates field schema", () => {
    const result = applyFilePatch(
      "doc.json",
      "{}",
      '@@\n-{}\n+{"annotations": [{"text": "test"}]}',
      { internal: true }
    )
    expect(result.status).toBe("partial")
    if (result.status === "partial") {
      expect(result.rejected[0].field).toBe("annotations")
      expect(result.rejected[0].reason).toBe("invalid")
    }
  })
})
