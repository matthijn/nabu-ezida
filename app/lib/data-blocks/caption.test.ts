import { describe, expect, it } from "vitest"
import { findCaptionIndex, type CaptionEntry } from "./caption"

describe("findCaptionIndex", () => {
  const cases: {
    name: string
    entries: CaptionEntry[]
    pos: number
    captionType: string
    expected: number
  }[] = [
    {
      name: "first of its type",
      entries: [{ captionType: "Figure", pos: 10 }],
      pos: 10,
      captionType: "Figure",
      expected: 1,
    },
    {
      name: "second of its type",
      entries: [
        { captionType: "Figure", pos: 10 },
        { captionType: "Figure", pos: 50 },
      ],
      pos: 50,
      captionType: "Figure",
      expected: 2,
    },
    {
      name: "counts only matching captionType",
      entries: [
        { captionType: "Table", pos: 5 },
        { captionType: "Figure", pos: 10 },
        { captionType: "Table", pos: 30 },
        { captionType: "Figure", pos: 50 },
      ],
      pos: 50,
      captionType: "Figure",
      expected: 2,
    },
    {
      name: "returns 0 when pos not found",
      entries: [{ captionType: "Figure", pos: 10 }],
      pos: 999,
      captionType: "Figure",
      expected: 0,
    },
    {
      name: "returns 0 for empty entries",
      entries: [],
      pos: 10,
      captionType: "Figure",
      expected: 0,
    },
    {
      name: "interleaved types preserve per-type counting",
      entries: [
        { captionType: "Figure", pos: 10 },
        { captionType: "Table", pos: 20 },
        { captionType: "Figure", pos: 30 },
        { captionType: "Table", pos: 40 },
        { captionType: "Figure", pos: 50 },
      ],
      pos: 50,
      captionType: "Figure",
      expected: 3,
    },
  ]

  it.each(cases)("$name", ({ entries, pos, captionType, expected }) => {
    expect(findCaptionIndex(entries, pos, captionType)).toBe(expected)
  })
})
