import { describe, it, expect } from "vitest"
import {
  prepareUpsertAnnotations,
  prepareDeleteAnnotations,
  type AnnotationInput,
} from "./annotations"
import type { StoredAnnotation } from "./schema"

describe("prepareUpsertAnnotations", () => {
  const upsertCases: {
    name: string
    existing: StoredAnnotation[]
    inputs: AnnotationInput[]
    expectAppliedCount: number
    expectRejectedCount: number
    expectAnnotationsCount: number
  }[] = [
    {
      name: "adds new annotation with color",
      existing: [],
      inputs: [{ text: "quick brown", reason: "important", color: "red" }],
      expectAppliedCount: 1,
      expectRejectedCount: 0,
      expectAnnotationsCount: 1,
    },
    {
      name: "adds new annotation with code",
      existing: [],
      inputs: [{ text: "lazy dog", reason: "theme", code: "animal" }],
      expectAppliedCount: 1,
      expectRejectedCount: 0,
      expectAnnotationsCount: 1,
    },
    {
      name: "stores any text without validation",
      existing: [],
      inputs: [{ text: "nonexistent text", reason: "test", color: "blue" }],
      expectAppliedCount: 1,
      expectRejectedCount: 0,
      expectAnnotationsCount: 1,
    },
    {
      name: "rejects when neither color nor code",
      existing: [],
      inputs: [{ text: "quick", reason: "test" }],
      expectAppliedCount: 0,
      expectRejectedCount: 1,
      expectAnnotationsCount: 0,
    },
    {
      name: "rejects when both color and code",
      existing: [],
      inputs: [{ text: "quick", reason: "test", color: "red", code: "c1" }],
      expectAppliedCount: 0,
      expectRejectedCount: 1,
      expectAnnotationsCount: 0,
    },
    {
      name: "accepts color with empty string code",
      existing: [],
      inputs: [{ text: "quick brown", reason: "test", color: "red", code: "" }],
      expectAppliedCount: 1,
      expectRejectedCount: 0,
      expectAnnotationsCount: 1,
    },
    {
      name: "accepts code with empty string color",
      existing: [],
      inputs: [{ text: "quick brown", reason: "test", color: "", code: "c1" }],
      expectAppliedCount: 1,
      expectRejectedCount: 0,
      expectAnnotationsCount: 1,
    },
    {
      name: "rejects when both are empty strings",
      existing: [],
      inputs: [{ text: "quick brown", reason: "test", color: "", code: "" }],
      expectAppliedCount: 0,
      expectRejectedCount: 1,
      expectAnnotationsCount: 0,
    },
    {
      name: "replaces existing annotation",
      existing: [{ text: "quick brown", reason: "old", color: "blue" }],
      inputs: [{ text: "quick brown", reason: "new", color: "red" }],
      expectAppliedCount: 1,
      expectRejectedCount: 0,
      expectAnnotationsCount: 1,
    },
    {
      name: "stores multiple annotations",
      existing: [],
      inputs: [
        { text: "quick brown", reason: "found", color: "red" },
        { text: "any text", reason: "also stored", color: "blue" },
      ],
      expectAppliedCount: 2,
      expectRejectedCount: 0,
      expectAnnotationsCount: 2,
    },
  ]

  it.each(upsertCases)(
    "$name",
    ({ existing, inputs, expectAppliedCount, expectRejectedCount, expectAnnotationsCount }) => {
      const result = prepareUpsertAnnotations(existing, inputs)
      expect(result.applied).toHaveLength(expectAppliedCount)
      expect(result.rejected).toHaveLength(expectRejectedCount)
      expect(result.annotations).toHaveLength(expectAnnotationsCount)
    }
  )

  it("stores text exactly as provided", () => {
    const result = prepareUpsertAnnotations([], [
      { text: "QUICK BROWN", reason: "test", color: "red" },
    ])
    expect(result.applied[0].text).toBe("QUICK BROWN")
    expect(result.annotations[0].text).toBe("QUICK BROWN")
  })

  it("replaced annotation has updated fields", () => {
    const existing: StoredAnnotation[] = [{ text: "quick brown", reason: "old", color: "blue" }]
    const result = prepareUpsertAnnotations(existing, [
      { text: "quick brown", reason: "new", color: "red" },
    ])
    expect(result.annotations[0].reason).toBe("new")
    expect(result.annotations[0].color).toBe("red")
  })

  it("rejection includes error message for invalid input", () => {
    const result = prepareUpsertAnnotations([], [{ text: "test", reason: "test" }])
    expect(result.rejected[0].text).toBe("test")
    expect(result.rejected[0].error).toBe("Either color or code must be set")
  })
})

describe("prepareDeleteAnnotations", () => {
  const deleteCases: {
    name: string
    existing: StoredAnnotation[]
    texts: string[]
    expectAnnotationsCount: number
  }[] = [
    {
      name: "deletes existing annotation",
      existing: [{ text: "hello world", reason: "test", color: "red" }],
      texts: ["hello world"],
      expectAnnotationsCount: 0,
    },
    {
      name: "no-op when not found",
      existing: [],
      texts: ["missing"],
      expectAnnotationsCount: 0,
    },
    {
      name: "deletes multiple",
      existing: [
        { text: "first", reason: "a", color: "red" },
        { text: "second", reason: "b", color: "blue" },
      ],
      texts: ["first", "second"],
      expectAnnotationsCount: 0,
    },
    {
      name: "preserves other annotations",
      existing: [
        { text: "keep", reason: "a", color: "red" },
        { text: "delete", reason: "b", color: "blue" },
      ],
      texts: ["delete"],
      expectAnnotationsCount: 1,
    },
    {
      name: "case insensitive match",
      existing: [{ text: "hello world", reason: "test", color: "red" }],
      texts: ["HELLO WORLD"],
      expectAnnotationsCount: 0,
    },
  ]

  it.each(deleteCases)("$name", ({ existing, texts, expectAnnotationsCount }) => {
    const result = prepareDeleteAnnotations(existing, texts)
    expect(result.annotations).toHaveLength(expectAnnotationsCount)
  })

  it("preserves correct annotation when deleting", () => {
    const existing: StoredAnnotation[] = [
      { text: "keep me", reason: "a", color: "red" },
      { text: "delete me", reason: "b", color: "blue" },
    ]
    const result = prepareDeleteAnnotations(existing, ["delete me"])
    expect(result.annotations[0].text).toBe("keep me")
  })
})
