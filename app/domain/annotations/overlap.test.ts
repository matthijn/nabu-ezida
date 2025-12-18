import { describe, it, expect } from "vitest"
import { segmentByOverlap } from "./overlap"
import type { ResolvedAnnotation, OverlapSegment } from "./types"

describe("segmentByOverlap", () => {
  const cases: {
    name: string
    annotations: ResolvedAnnotation[]
    expected: OverlapSegment[]
  }[] = [
    {
      name: "empty annotations returns empty segments",
      annotations: [],
      expected: [],
    },
    {
      name: "single annotation returns single segment",
      annotations: [{ id: "1", from: 0, to: 10, codeIds: ["a"] }],
      expected: [{ from: 0, to: 10, codeIds: ["a"] }],
    },
    {
      name: "two non-overlapping annotations",
      annotations: [
        { id: "1", from: 0, to: 5, codeIds: ["a"] },
        { id: "2", from: 10, to: 15, codeIds: ["b"] },
      ],
      expected: [
        { from: 0, to: 5, codeIds: ["a"] },
        { from: 10, to: 15, codeIds: ["b"] },
      ],
    },
    {
      name: "two overlapping annotations create three segments",
      annotations: [
        { id: "1", from: 0, to: 20, codeIds: ["a"] },
        { id: "2", from: 10, to: 30, codeIds: ["b"] },
      ],
      expected: [
        { from: 0, to: 10, codeIds: ["a"] },
        { from: 10, to: 20, codeIds: ["a", "b"] },
        { from: 20, to: 30, codeIds: ["b"] },
      ],
    },
    {
      name: "nested annotation (one inside other)",
      annotations: [
        { id: "1", from: 0, to: 30, codeIds: ["a"] },
        { id: "2", from: 10, to: 20, codeIds: ["b"] },
      ],
      expected: [
        { from: 0, to: 10, codeIds: ["a"] },
        { from: 10, to: 20, codeIds: ["a", "b"] },
        { from: 20, to: 30, codeIds: ["a"] },
      ],
    },
    {
      name: "exact same range gets merged codes",
      annotations: [
        { id: "1", from: 0, to: 10, codeIds: ["a"] },
        { id: "2", from: 0, to: 10, codeIds: ["b"] },
      ],
      expected: [{ from: 0, to: 10, codeIds: ["a", "b"] }],
    },
    {
      name: "partial overlap at start",
      annotations: [
        { id: "1", from: 0, to: 31, codeIds: ["a"] },
        { id: "2", from: 14, to: 31, codeIds: ["b"] },
      ],
      expected: [
        { from: 0, to: 14, codeIds: ["a"] },
        { from: 14, to: 31, codeIds: ["a", "b"] },
      ],
    },
    {
      name: "three annotations with complex overlap",
      annotations: [
        { id: "1", from: 0, to: 30, codeIds: ["a"] },
        { id: "2", from: 10, to: 40, codeIds: ["b"] },
        { id: "3", from: 20, to: 50, codeIds: ["c"] },
      ],
      expected: [
        { from: 0, to: 10, codeIds: ["a"] },
        { from: 10, to: 20, codeIds: ["a", "b"] },
        { from: 20, to: 30, codeIds: ["a", "b", "c"] },
        { from: 30, to: 40, codeIds: ["b", "c"] },
        { from: 40, to: 50, codeIds: ["c"] },
      ],
    },
    {
      name: "deduplicates code ids",
      annotations: [
        { id: "1", from: 0, to: 10, codeIds: ["a", "b"] },
        { id: "2", from: 0, to: 10, codeIds: ["b", "c"] },
      ],
      expected: [{ from: 0, to: 10, codeIds: ["a", "b", "c"] }],
    },
  ]

  cases.forEach(({ name, annotations, expected }) => {
    it(name, () => {
      expect(segmentByOverlap(annotations)).toEqual(expected)
    })
  })
})
