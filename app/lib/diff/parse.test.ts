import { describe, expect, it } from "vitest"
import { applyDiff } from "./parse"

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
      expected: { ok: false, error: 'patch context not found: "nonexistent..."' },
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
      expected: { ok: true, content: "existingappended" },
    },
  ]

  it.each(cases)("$name", ({ content, patch, expected }) => {
    const result = applyDiff(content, patch)
    expect(result).toEqual(expected)
  })
})
