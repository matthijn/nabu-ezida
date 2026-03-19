import { describe, it, expect } from "vitest"
import { computeSyncPlan } from "./sync"
import type { FileStore } from "~/lib/files/store"
import type { SyncPlan } from "./sync"

describe("computeSyncPlan", () => {
  const cases: { name: string; prev: FileStore; next: FileStore; expected: SyncPlan }[] = [
    {
      name: "empty to empty",
      prev: {},
      next: {},
      expected: { deleted: [], changed: [] },
    },
    {
      name: "new files are changed",
      prev: {},
      next: { "a.md": "hello", "b.md": "world" },
      expected: { deleted: [], changed: ["a.md", "b.md"] },
    },
    {
      name: "removed files are deleted",
      prev: { "a.md": "hello", "b.md": "world" },
      next: {},
      expected: { deleted: ["a.md", "b.md"], changed: [] },
    },
    {
      name: "unchanged files are neither",
      prev: { "a.md": "same" },
      next: { "a.md": "same" },
      expected: { deleted: [], changed: [] },
    },
    {
      name: "modified files are changed",
      prev: { "a.md": "old" },
      next: { "a.md": "new" },
      expected: { deleted: [], changed: ["a.md"] },
    },
    {
      name: "mixed add, change, delete, keep",
      prev: { "keep.md": "same", "change.md": "old", "delete.md": "bye" },
      next: { "keep.md": "same", "change.md": "new", "add.md": "hello" },
      expected: { deleted: ["delete.md"], changed: ["change.md", "add.md"] },
    },
  ]

  cases.forEach(({ name, prev, next, expected }) => {
    it(name, () => {
      const result = computeSyncPlan(prev, next)
      expect(result.deleted.sort()).toEqual(expected.deleted.sort())
      expect(result.changed.sort()).toEqual(expected.changed.sort())
    })
  })
})
