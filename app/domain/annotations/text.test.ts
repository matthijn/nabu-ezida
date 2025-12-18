import { describe, it, expect } from "vitest"
import { findTextPosition, resolveTextAnnotations } from "./text"
import type { StoredAnnotation } from "./types"

describe("findTextPosition", () => {
  const cases: {
    name: string
    fullText: string
    searchText: string
    expected: { from: number; to: number } | null
  }[] = [
    {
      name: "finds text at start",
      fullText: "hello world",
      searchText: "hello",
      expected: { from: 0, to: 5 },
    },
    {
      name: "finds text at end",
      fullText: "hello world",
      searchText: "world",
      expected: { from: 6, to: 11 },
    },
    {
      name: "finds text in middle",
      fullText: "the quick brown fox",
      searchText: "quick",
      expected: { from: 4, to: 9 },
    },
    {
      name: "returns null when not found",
      fullText: "hello world",
      searchText: "missing",
      expected: null,
    },
    {
      name: "finds first occurrence",
      fullText: "hello hello hello",
      searchText: "hello",
      expected: { from: 0, to: 5 },
    },
    {
      name: "handles sentence search",
      fullText: "Today I conducted three interviews. The sessions were great.",
      searchText: "The sessions were great.",
      expected: { from: 36, to: 60 },
    },
    {
      name: "handles overlapping substring",
      fullText: "Today I conducted three interviews. The sessions revealed patterns.",
      searchText: "The sessions revealed patterns.",
      expected: { from: 36, to: 67 },
    },
  ]

  cases.forEach(({ name, fullText, searchText, expected }) => {
    it(name, () => {
      expect(findTextPosition(fullText, searchText)).toEqual(expected)
    })
  })
})

describe("resolveTextAnnotations", () => {
  const cases: {
    name: string
    fullText: string
    annotations: StoredAnnotation[]
    expected: { id: string; from: number; to: number; codeIds: string[] }[]
  }[] = [
    {
      name: "resolves single annotation",
      fullText: "hello world",
      annotations: [{ id: "1", text: "hello", codeIds: ["a"] }],
      expected: [{ id: "1", from: 0, to: 5, codeIds: ["a"] }],
    },
    {
      name: "resolves multiple non-overlapping annotations",
      fullText: "hello world",
      annotations: [
        { id: "1", text: "hello", codeIds: ["a"] },
        { id: "2", text: "world", codeIds: ["b"] },
      ],
      expected: [
        { id: "1", from: 0, to: 5, codeIds: ["a"] },
        { id: "2", from: 6, to: 11, codeIds: ["b"] },
      ],
    },
    {
      name: "filters out annotations that are not found",
      fullText: "hello world",
      annotations: [
        { id: "1", text: "hello", codeIds: ["a"] },
        { id: "2", text: "missing", codeIds: ["b"] },
      ],
      expected: [{ id: "1", from: 0, to: 5, codeIds: ["a"] }],
    },
    {
      name: "resolves overlapping annotations",
      fullText: "Today I went. The day was nice.",
      annotations: [
        { id: "1", text: "Today I went. The day was nice.", codeIds: ["a"] },
        { id: "2", text: "The day was nice.", codeIds: ["b"] },
      ],
      expected: [
        { id: "1", from: 0, to: 31, codeIds: ["a"] },
        { id: "2", from: 14, to: 31, codeIds: ["b"] },
      ],
    },
  ]

  cases.forEach(({ name, fullText, annotations, expected }) => {
    it(name, () => {
      expect(resolveTextAnnotations(fullText, annotations)).toEqual(expected)
    })
  })
})
