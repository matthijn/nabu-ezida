import { describe, it, expect } from "vitest"
import { segmentByOverlap } from "./overlap"
import type { ResolvedAnnotation, OverlapSegment } from "./types"

const resolved = (id: string, from: number, to: number, code_id: string | null = null): ResolvedAnnotation => ({
  id,
  from,
  to,
  color: "blue",
  code_id,
})

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
      annotations: [resolved("1", 0, 10, "a")],
      expected: [{ from: 0, to: 10, code_ids: ["a"] }],
    },
    {
      name: "two non-overlapping annotations",
      annotations: [
        resolved("1", 0, 5, "a"),
        resolved("2", 10, 15, "b"),
      ],
      expected: [
        { from: 0, to: 5, code_ids: ["a"] },
        { from: 10, to: 15, code_ids: ["b"] },
      ],
    },
    {
      name: "two overlapping annotations create three segments",
      annotations: [
        resolved("1", 0, 20, "a"),
        resolved("2", 10, 30, "b"),
      ],
      expected: [
        { from: 0, to: 10, code_ids: ["a"] },
        { from: 10, to: 20, code_ids: ["a", "b"] },
        { from: 20, to: 30, code_ids: ["b"] },
      ],
    },
    {
      name: "nested annotation (one inside other)",
      annotations: [
        resolved("1", 0, 30, "a"),
        resolved("2", 10, 20, "b"),
      ],
      expected: [
        { from: 0, to: 10, code_ids: ["a"] },
        { from: 10, to: 20, code_ids: ["a", "b"] },
        { from: 20, to: 30, code_ids: ["a"] },
      ],
    },
    {
      name: "exact same range gets merged codes",
      annotations: [
        resolved("1", 0, 10, "a"),
        resolved("2", 0, 10, "b"),
      ],
      expected: [{ from: 0, to: 10, code_ids: ["a", "b"] }],
    },
    {
      name: "partial overlap at start",
      annotations: [
        resolved("1", 0, 31, "a"),
        resolved("2", 14, 31, "b"),
      ],
      expected: [
        { from: 0, to: 14, code_ids: ["a"] },
        { from: 14, to: 31, code_ids: ["a", "b"] },
      ],
    },
    {
      name: "three annotations with complex overlap",
      annotations: [
        resolved("1", 0, 30, "a"),
        resolved("2", 10, 40, "b"),
        resolved("3", 20, 50, "c"),
      ],
      expected: [
        { from: 0, to: 10, code_ids: ["a"] },
        { from: 10, to: 20, code_ids: ["a", "b"] },
        { from: 20, to: 30, code_ids: ["a", "b", "c"] },
        { from: 30, to: 40, code_ids: ["b", "c"] },
        { from: 40, to: 50, code_ids: ["c"] },
      ],
    },
    {
      name: "annotation without code id creates segment with empty code_ids",
      annotations: [resolved("1", 0, 10)],
      expected: [{ from: 0, to: 10, code_ids: [] }],
    },
  ]

  cases.forEach(({ name, annotations, expected }) => {
    it(name, () => {
      expect(segmentByOverlap(annotations)).toEqual(expected)
    })
  })
})
