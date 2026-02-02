import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { applyDiff } from "./parse"

type ApplyScenario = {
  name: string
  content: string
  patch: string
  expected: { ok: true; content: string } | { ok: false; error: string }
}

const loadApplyScenarios = (): ApplyScenario[] => {
  const dir = join(__dirname, "scenarios/apply")
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")))
}

describe("applyDiff", () => {
  const cases = [
    {
      name: "creates new file from Add File",
      content: "",
      patch: `*** Add File: test.md
hello
world`,
      expected: { ok: true, content: "hello\nworld" },
    },
    {
      name: "updates file with single hunk",
      content: "hello\nworld",
      patch: `*** Update File: test.md
@@
-hello
+goodbye
world`,
      expected: { ok: true, content: "goodbye\nworld" },
    },
    {
      name: "applies multiple hunks",
      content: "aaa\nbbb\nccc",
      patch: `*** Update File: test.md
@@
-aaa
+AAA
bbb
@@
bbb
-ccc
+CCC`,
      expected: { ok: true, content: "AAA\nbbb\nCCC" },
    },
    {
      name: "preserves context lines",
      content: "line1\nline2\nline3",
      patch: `*** Update File: test.md
@@
line1
-line2
+replaced
line3`,
      expected: { ok: true, content: "line1\nreplaced\nline3" },
    },
    {
      name: "fails when patch context not found",
      content: "hello",
      patch: `*** Update File: test.md
@@
-nonexistent
+replacement`,
      expected: {
        ok: false,
        error: `patch context not found:\n  searching for: "nonexistent"\n  in content: "hello"`,
      },
    },
    {
      name: "handles function rename example from spec",
      content: "def fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)",
      patch: `@@
-def fib(n):
+def fibonacci(n):
    if n <= 1:
        return n
-    return fib(n-1) + fib(n-2)
+    return fibonacci(n-1) + fibonacci(n-2)`,
      expected: { ok: true, content: "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)" },
    },
    {
      name: "appends to content when old text is empty",
      content: "existing",
      patch: `*** Add File: test.md
appended`,
      expected: { ok: true, content: "existing\nappended" },
    },
    {
      name: "implicit hunk start with + lines",
      content: "",
      patch: `+# Hello
+World`,
      expected: { ok: true, content: "# Hello\nWorld" },
    },
    {
      name: "implicit hunk start with - and + lines",
      content: "old content",
      patch: `-old content
+new content`,
      expected: { ok: true, content: "new content" },
    },
    {
      name: "append with @@ and + lines only",
      content: "# Title",
      patch: `@@
+
+New paragraph here.`,
      expected: { ok: true, content: "# Title\n\nNew paragraph here." },
    },
    {
      name: "append to empty file with @@ and + lines",
      content: "",
      patch: `@@
+# Title`,
      expected: { ok: true, content: "# Title" },
    },
    {
      name: "append multiple sections incrementally",
      content: "# Title",
      patch: `@@
+
+Section one content.`,
      expected: { ok: true, content: "# Title\n\nSection one content." },
    },
    {
      name: "real scenario: append with empty + line",
      content: "# Codebook",
      patch: `@@
+
+This is a *sample* qualitative codebook for analyzing texts.`,
      expected: { ok: true, content: "# Codebook\n\nThis is a *sample* qualitative codebook for analyzing texts." },
    },
    {
      name: "append json block without anchor",
      content: "# Doc\n\nIntro text.",
      patch: `@@
+
+\`\`\`json-callout
+{"id": "test", "type": "codebook-code"}
+\`\`\``,
      expected: { ok: true, content: "# Doc\n\nIntro text.\n\n```json-callout\n{\"id\": \"test\", \"type\": \"codebook-code\"}\n```" },
    },
    {
      name: "create file with @@ and + lines",
      content: "",
      patch: `@@
+# Coffee Bean Research Codebook`,
      expected: { ok: true, content: "# Coffee Bean Research Codebook" },
    },
    {
      name: "malformed: LLM prefixes @@ with +",
      content: "",
      patch: `+@@
++# Coffee Bean Research Codebook`,
      expected: { ok: true, content: "# Coffee Bean Research Codebook" },
    },
    {
      name: "context preserves file content not patch content",
      content: "function test() {\n    return 42\n}",
      patch: `@@
-function test() {
+function renamed() {
    return 42
}`,
      expected: { ok: true, content: "function renamed() {\n    return 42\n}" },
    },
    {
      name: "interleaved context and removes: all preserved correctly",
      content: "line1\nkeep1\nline2\nkeep2\nline3",
      patch: `@@
-line1
+replaced1
keep1
-line2
+replaced2
keep2
-line3
+replaced3`,
      expected: { ok: true, content: "replaced1\nkeep1\nreplaced2\nkeep2\nreplaced3" },
    },
  ]

  it.each(cases)("$name", ({ content, patch, expected }) => {
    const result = applyDiff(content, patch)
    expect(result).toEqual(expected)
  })

  it("shows expanded context for ambiguous matches", () => {
    const content = `line 0
line 1
function foo() {
  return 1
}
line 5
line 6
function foo() {
  return 2
}
line 10`

    const patch = `@@
-function foo() {
+function bar() {`

    const result = applyDiff(content, patch)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("patch ambiguous: 2 matches found")
      expect(result.error).toContain("Match 1:")
      expect(result.error).toContain("Match 2:")
      expect(result.error).toContain("return 1")
      expect(result.error).toContain("return 2")
      expect(result.error).toContain("Include more surrounding lines to disambiguate")
    }
  })

  describe("scenarios", () => {
    const scenarios = loadApplyScenarios()

    it.each(scenarios)("$name", ({ content, patch, expected }) => {
      const result = applyDiff(content, patch)
      expect(result).toEqual(expected)
    })
  })
})
