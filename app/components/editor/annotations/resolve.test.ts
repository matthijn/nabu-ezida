import { describe, it, expect } from "vitest"
import { collectTextNodes, textPosToDocPos } from "./resolve"

describe("textPosToDocPos", () => {
  const cases: {
    name: string
    nodes: { textStart: number; textEnd: number; docStart: number }[]
    textPos: number
    expected: number
  }[] = [
    {
      name: "single text node, start position",
      nodes: [{ textStart: 0, textEnd: 10, docStart: 1 }],
      textPos: 0,
      expected: 1,
    },
    {
      name: "single text node, middle position",
      nodes: [{ textStart: 0, textEnd: 10, docStart: 1 }],
      textPos: 5,
      expected: 6,
    },
    {
      name: "single text node, end position",
      nodes: [{ textStart: 0, textEnd: 10, docStart: 1 }],
      textPos: 10,
      expected: 11,
    },
    {
      name: "two text nodes in separate blocks",
      nodes: [
        { textStart: 0, textEnd: 5, docStart: 1 },
        { textStart: 5, textEnd: 15, docStart: 8 },
      ],
      textPos: 5,
      expected: 8,
    },
    {
      name: "two text nodes, position in second node",
      nodes: [
        { textStart: 0, textEnd: 5, docStart: 1 },
        { textStart: 5, textEnd: 15, docStart: 8 },
      ],
      textPos: 10,
      expected: 13,
    },
    {
      name: "heading + paragraph structure",
      nodes: [
        { textStart: 0, textEnd: 30, docStart: 2 },
        { textStart: 30, textEnd: 200, docStart: 35 },
      ],
      textPos: 30,
      expected: 35,
    },
    {
      name: "heading + paragraph, middle of second",
      nodes: [
        { textStart: 0, textEnd: 30, docStart: 2 },
        { textStart: 30, textEnd: 200, docStart: 35 },
      ],
      textPos: 100,
      expected: 105,
    },
  ]

  cases.forEach(({ name, nodes, textPos, expected }) => {
    it(name, () => {
      expect(textPosToDocPos(nodes, textPos)).toBe(expected)
    })
  })
})
