import { describe, expect, it } from "vitest"
import { applyPatch } from "./patch"

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
