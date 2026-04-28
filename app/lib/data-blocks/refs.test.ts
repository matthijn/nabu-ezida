import { describe, it, expect } from "vitest"
import { detectDanglingReferences } from "./refs"

describe("detectDanglingReferences", () => {
  const cases = [
    {
      name: "removed tag referenced → error",
      oldIds: ["tag-1", "tag-2"],
      newIds: ["tag-2"],
      references: new Map([["tag-1", ["doc.md"]]]),
      expected: [
        {
          block: "_refs",
          field: "tag-1",
          message: 'Cannot remove "tag-1" — referenced by: doc.md',
        },
      ],
    },
    {
      name: "removed tag not referenced → no error",
      oldIds: ["tag-1"],
      newIds: [],
      references: new Map<string, string[]>(),
      expected: [],
    },
    {
      name: "tag still present → no error",
      oldIds: ["tag-1"],
      newIds: ["tag-1"],
      references: new Map([["tag-1", ["doc.md"]]]),
      expected: [],
    },
    {
      name: "no change → no error",
      oldIds: ["tag-1"],
      newIds: ["tag-1"],
      references: new Map([["tag-1", ["a.md", "b.md"]]]),
      expected: [],
    },
    {
      name: "multiple removed, mixed refs",
      oldIds: ["t1", "t2", "t3"],
      newIds: ["t3"],
      references: new Map<string, string[]>([
        ["t1", ["a.md"]],
        ["t2", []],
      ]),
      expected: [
        {
          block: "_refs",
          field: "t1",
          message: 'Cannot remove "t1" — referenced by: a.md',
        },
      ],
    },
    {
      name: "all removed, all referenced",
      oldIds: ["t1", "t2"],
      newIds: [],
      references: new Map([
        ["t1", ["a.md"]],
        ["t2", ["b.md"]],
      ]),
      expected: [
        {
          block: "_refs",
          field: "t1",
          message: 'Cannot remove "t1" — referenced by: a.md',
        },
        {
          block: "_refs",
          field: "t2",
          message: 'Cannot remove "t2" — referenced by: b.md',
        },
      ],
    },
    {
      name: "error message caps file list at 5",
      oldIds: ["tag-x"],
      newIds: [],
      references: new Map([["tag-x", ["a.md", "b.md", "c.md", "d.md", "e.md", "f.md", "g.md"]]]),
      expected: [
        {
          block: "_refs",
          field: "tag-x",
          message:
            'Cannot remove "tag-x" — referenced by: a.md, b.md, c.md, d.md, e.md (and 2 more)',
        },
      ],
    },
    {
      name: "empty old IDs → no error",
      oldIds: [],
      newIds: ["tag-1"],
      references: new Map([["tag-1", ["x.md"]]]),
      expected: [],
    },
    {
      name: "error message includes the removed ID",
      oldIds: ["tag-abc"],
      newIds: [],
      references: new Map([["tag-abc", ["x.md"]]]),
      expected: [
        {
          block: "_refs",
          field: "tag-abc",
          message: 'Cannot remove "tag-abc" — referenced by: x.md',
        },
      ],
    },
  ]

  it.each(cases)("$name", ({ oldIds, newIds, references, expected }) => {
    const result = detectDanglingReferences(oldIds, newIds, references)
    expect(result).toEqual(expected)
  })
})
