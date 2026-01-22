import { describe, expect, it } from "vitest"
import { applyPatch, applyFilePatch, applyFilePatches } from "./patch"

describe("applyPatch", () => {
  const cases = [
    {
      name: "creates new file from raw diff",
      content: "",
      patch: `+hello
+world`,
      expected: { ok: true, content: "hello\nworld" },
    },
    {
      name: "creates new file from Add File patch",
      content: "",
      patch: `*** Begin Patch
*** Add File: test.md
+hello
+world
*** End Patch`,
      expected: { ok: true, content: "hello\nworld" },
    },
    {
      name: "updates file with Update File patch",
      content: "hello\nworld",
      patch: `*** Begin Patch
*** Update File: test.md
@@@ hello @@@
-hello
+goodbye
*** End Patch`,
      expected: { ok: true, content: "goodbye\nworld" },
    },
    {
      name: "applies multiple hunks",
      content: "aaa\nbbb\nccc",
      patch: `*** Begin Patch
*** Update File: test.md
@@@ aaa @@@
-aaa
+AAA
@@@ ccc @@@
-ccc
+CCC
*** End Patch`,
      expected: { ok: true, content: "AAA\nbbb\nCCC" },
    },
    {
      name: "preserves context lines in hunk",
      content: "line1\nline2\nline3",
      patch: `*** Begin Patch
*** Update File: test.md
@@@ line1 @@@
 line1
-line2
+replaced
 line3
*** End Patch`,
      expected: { ok: true, content: "line1\nreplaced\nline3" },
    },
    {
      name: "fails when patch context not found",
      content: "hello",
      patch: `*** Begin Patch
*** Update File: test.md
@@@ x @@@
-nonexistent
+replacement
*** End Patch`,
      expected: { ok: false, error: 'patch context not found: "nonexistent..."' },
    },
    {
      name: "appends to content when old text is empty",
      content: "existing",
      patch: `*** Begin Patch
*** Add File: test.md
+appended
*** End Patch`,
      expected: { ok: true, content: "existingappended" },
    },
  ]

  cases.forEach(({ name, content, patch, expected }) => {
    it(name, () => {
      const result = applyPatch(content, patch)
      expect(result).toEqual(expected)
    })
  })
})

describe("applyFilePatch", () => {
  it("md file accepts any patch", () => {
    const result = applyFilePatch("doc.md", "hello", "+world")
    expect(result).toEqual({ path: "doc.md", status: "ok", content: "helloworld" })
  })

  it("json file with valid result", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["old"]}', `-{"tags": ["old"]}
+{"tags": ["new"]}`)
    expect(result).toEqual({ path: "doc.json", status: "ok", content: '{"tags": ["new"]}' })
  })

  it("json file with empty object is valid", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["foo"]}', `-{"tags": ["foo"]}
+{}`)
    expect(result).toEqual({ path: "doc.json", status: "ok", content: "{}" })
  })

  it("json file with invalid tag format", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["foo"]}', `-{"tags": ["foo"]}
+{"tags": ["Not A Slug"]}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("validation_error")
    if (result.status === "validation_error") {
      expect(result.issues[0].path).toBe("tags.0")
      expect(result.current).toEqual({ tags: ["Not A Slug"] })
    }
  })

  it("json file with wrong type", () => {
    const result = applyFilePatch("doc.json", '{"tags": ["foo"]}', `-{"tags": ["foo"]}
+{"tags": "not-array"}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("validation_error")
    if (result.status === "validation_error") {
      expect(result.issues[0].path).toBe("tags")
      expect(result.current).toEqual({ tags: "not-array" })
    }
  })

  it("json file with invalid json", () => {
    const result = applyFilePatch("doc.json", '{"tags": []}', `-{"tags": []}
+{invalid json}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toBeDefined()
    }
  })

  it("json file with patch context not found", () => {
    const result = applyFilePatch("doc.json", '{"tags": []}', `-{"nonexistent": true}
+{"tags": ["new"]}`)
    expect(result.path).toBe("doc.json")
    expect(result.status).toBe("error")
    if (result.status === "error") {
      expect(result.error).toContain("patch context not found")
    }
  })

  it("md file with patch error", () => {
    const result = applyFilePatch("doc.md", "hello", `-nonexistent
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
      { path: "a.md", content: "a", patch: "+b" },
      { path: "b.json", content: '{"tags":[]}', patch: `-{"tags":[]}
+{"tags":["new"]}` },
    ])
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({ path: "a.md", status: "ok", content: "ab" })
    expect(result.results[1]).toEqual({ path: "b.json", status: "ok", content: '{"tags":["new"]}' })
  })

  it("mixed success and validation error", () => {
    const result = applyFilePatches([
      { path: "a.md", content: "", patch: "+content" },
      { path: "b.json", content: '{"tags":[]}', patch: `-{"tags":[]}
+{"tags":["Invalid Tag"]}` },
    ])
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({ path: "a.md", status: "ok", content: "content" })
    expect(result.results[1].path).toBe("b.json")
    expect(result.results[1].status).toBe("validation_error")
  })

  it("mixed success and patch error", () => {
    const result = applyFilePatches([
      { path: "a.json", content: '{"tags":["x"]}', patch: `-{"tags":["x"]}
+{"tags":["y"]}` },
      { path: "b.md", content: "hello", patch: `-nonexistent
+x` },
    ])
    expect(result.results).toHaveLength(2)
    expect(result.results[0]).toEqual({ path: "a.json", status: "ok", content: '{"tags":["y"]}' })
    expect(result.results[1].path).toBe("b.md")
    expect(result.results[1].status).toBe("error")
  })

  it("empty patches", () => {
    const result = applyFilePatches([])
    expect(result).toEqual({ results: [] })
  })
})
