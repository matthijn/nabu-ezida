import { describe, it, expect } from "vitest"
import { computeSyncPlan, batchSyncPlan } from "./sync"
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

  it.each(cases)("$name", ({ prev, next, expected }) => {
    const result = computeSyncPlan(prev, next)
    expect(result.deleted.sort()).toEqual(expected.deleted.sort())
    expect(result.changed.sort()).toEqual(expected.changed.sort())
  })
})

describe("batchSyncPlan", () => {
  const cases: { name: string; plan: SyncPlan; batchSize: number; expected: SyncPlan[] }[] = [
    {
      name: "empty plan returns no batches",
      plan: { deleted: [], changed: [] },
      batchSize: 5,
      expected: [],
    },
    {
      name: "deletions go in first batch",
      plan: { deleted: ["old.md"], changed: ["a.md"] },
      batchSize: 10,
      expected: [{ deleted: ["old.md"], changed: ["a.md"] }],
    },
    {
      name: "splits into multiple batches",
      plan: {
        deleted: ["gone.md"],
        changed: ["a.md", "b.md", "c.md", "d.md", "e.md"],
      },
      batchSize: 2,
      expected: [
        { deleted: ["gone.md"], changed: ["a.md", "b.md"] },
        { deleted: [], changed: ["c.md", "d.md"] },
        { deleted: [], changed: ["e.md"] },
      ],
    },
  ]

  it.each(cases)("$name", ({ plan, batchSize, expected }) => {
    expect(batchSyncPlan(plan, batchSize)).toEqual(expected)
  })
})
