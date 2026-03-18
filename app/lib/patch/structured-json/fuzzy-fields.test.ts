import { describe, it, expect } from "vitest"
import type { JsonPatchOp } from "./apply"
import {
  autoFuzzyFieldValue,
  parseFuzzyFieldPatterns,
  type FuzzyFieldPattern,
} from "./fuzzy-fields"

const annotationPatterns: FuzzyFieldPattern[] = parseFuzzyFieldPatterns(["annotations.*.text"])

describe("autoFuzzyFieldValue", () => {
  interface Case {
    name: string
    op: JsonPatchOp
    expected: JsonPatchOp
  }

  const cases: Case[] = [
    {
      name: "wraps text in annotation entry add",
      op: { op: "add", path: "/annotations/-", value: { text: "some phrase", code: "x" } },
      expected: {
        op: "add",
        path: "/annotations/-",
        value: { text: "FUZZY[[some phrase]]", code: "x" },
      },
    },
    {
      name: "wraps text in annotation entry replace",
      op: { op: "replace", path: "/annotations/0", value: { text: "some phrase" } },
      expected: { op: "replace", path: "/annotations/0", value: { text: "FUZZY[[some phrase]]" } },
    },
    {
      name: "wraps text field directly",
      op: { op: "replace", path: "/annotations/2/text", value: "some phrase" },
      expected: { op: "replace", path: "/annotations/2/text", value: "FUZZY[[some phrase]]" },
    },
    {
      name: "skips already fuzzy text in entry",
      op: { op: "add", path: "/annotations/-", value: { text: "FUZZY[[already wrapped]]" } },
      expected: { op: "add", path: "/annotations/-", value: { text: "FUZZY[[already wrapped]]" } },
    },
    {
      name: "skips already fuzzy text field",
      op: { op: "replace", path: "/annotations/0/text", value: "FUZZY[[already]]" },
      expected: { op: "replace", path: "/annotations/0/text", value: "FUZZY[[already]]" },
    },
    {
      name: "skips non-annotation path",
      op: { op: "add", path: "/codes/-", value: { text: "some phrase" } },
      expected: { op: "add", path: "/codes/-", value: { text: "some phrase" } },
    },
    {
      name: "skips remove op",
      op: { op: "remove", path: "/annotations/0" },
      expected: { op: "remove", path: "/annotations/0" },
    },
    {
      name: "skips test op",
      op: { op: "test", path: "/annotations/0/text", value: "exact" },
      expected: { op: "test", path: "/annotations/0/text", value: "exact" },
    },
    {
      name: "skips annotation entry without text field",
      op: { op: "add", path: "/annotations/-", value: { code: "x" } },
      expected: { op: "add", path: "/annotations/-", value: { code: "x" } },
    },
    {
      name: "skips non-string annotation text field",
      op: { op: "replace", path: "/annotations/0/text", value: 42 },
      expected: { op: "replace", path: "/annotations/0/text", value: 42 },
    },
  ]

  it.each(cases)("$name", ({ op, expected }) => {
    expect(autoFuzzyFieldValue(op, annotationPatterns)).toEqual(expected)
  })
})
