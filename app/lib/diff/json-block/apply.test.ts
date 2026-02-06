import { describe, it, expect } from "vitest"
import { applyJsonPatchOps, type JsonPatchOp } from "./apply"

describe("applyJsonPatchOps", () => {
  type Case = {
    name: string
    doc: unknown
    ops: JsonPatchOp[]
    expected: { ok: true; result: unknown } | { ok: false; error: string }
  }

  const cases: Case[] = [
    {
      name: "replace a field",
      doc: { foo: "bar" },
      ops: [{ op: "replace", path: "/foo", value: "baz" }],
      expected: { ok: true, result: { foo: "baz" } },
    },
    {
      name: "add a field",
      doc: { a: 1 },
      ops: [{ op: "add", path: "/b", value: 2 }],
      expected: { ok: true, result: { a: 1, b: 2 } },
    },
    {
      name: "remove a field",
      doc: { a: 1, b: 2 },
      ops: [{ op: "remove", path: "/b" }],
      expected: { ok: true, result: { a: 1 } },
    },
    {
      name: "add to array end",
      doc: { items: ["a", "b"] },
      ops: [{ op: "add", path: "/items/-", value: "c" }],
      expected: { ok: true, result: { items: ["a", "b", "c"] } },
    },
    {
      name: "replace array element",
      doc: { items: ["a", "b", "c"] },
      ops: [{ op: "replace", path: "/items/1", value: "B" }],
      expected: { ok: true, result: { items: ["a", "B", "c"] } },
    },
    {
      name: "remove array element",
      doc: { items: [1, 2, 3] },
      ops: [{ op: "remove", path: "/items/0" }],
      expected: { ok: true, result: { items: [2, 3] } },
    },
    {
      name: "multiple operations",
      doc: { name: "old", count: 0, tags: [] },
      ops: [
        { op: "replace", path: "/name", value: "new" },
        { op: "replace", path: "/count", value: 5 },
        { op: "add", path: "/tags/-", value: "alpha" },
      ],
      expected: { ok: true, result: { name: "new", count: 5, tags: ["alpha"] } },
    },
    {
      name: "move operation",
      doc: { a: { x: 1 }, b: {} },
      ops: [{ op: "move", from: "/a/x", path: "/b/x" }],
      expected: { ok: true, result: { a: {}, b: { x: 1 } } },
    },
    {
      name: "nested path",
      doc: { a: { b: { c: "deep" } } },
      ops: [{ op: "replace", path: "/a/b/c", value: "deeper" }],
      expected: { ok: true, result: { a: { b: { c: "deeper" } } } },
    },
    {
      name: "error on unresolvable path",
      doc: { foo: "bar" },
      ops: [{ op: "replace", path: "/nonexistent/deep", value: "x" }],
      expected: { ok: false, error: expect.stringContaining("path that does not exist") as string },
    },
    {
      name: "error on failed test op",
      doc: { foo: "bar" },
      ops: [{ op: "test", path: "/foo", value: "wrong" }],
      expected: { ok: false, error: expect.stringContaining("Test operation failed") as string },
    },
    {
      name: "does not mutate original",
      doc: { x: 1 },
      ops: [{ op: "replace", path: "/x", value: 99 }],
      expected: { ok: true, result: { x: 99 } },
    },
  ]

  it.each(cases)("$name", ({ doc, ops, expected }) => {
    const original = JSON.parse(JSON.stringify(doc))
    const result = applyJsonPatchOps(doc, ops)
    expect(result).toEqual(expected)
    expect(doc).toEqual(original)
  })
})
