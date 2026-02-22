import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sampleAndHold } from "./utils"

describe("sampleAndHold", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const cases: {
    name: string
    holdMs: number
    calls: { args: [number]; advanceMs?: number; expected: string }[]
  }[] = [
    {
      name: "first call samples immediately",
      holdMs: 400,
      calls: [
        { args: [1], expected: "v1" },
      ],
    },
    {
      name: "holds value during hold period",
      holdMs: 400,
      calls: [
        { args: [1], expected: "v1" },
        { args: [2], advanceMs: 100, expected: "v1" },
        { args: [3], advanceMs: 100, expected: "v1" },
      ],
    },
    {
      name: "samples new value after hold expires",
      holdMs: 400,
      calls: [
        { args: [1], expected: "v1" },
        { args: [2], advanceMs: 400, expected: "v2" },
      ],
    },
    {
      name: "new hold starts after resampling",
      holdMs: 200,
      calls: [
        { args: [1], expected: "v1" },
        { args: [2], advanceMs: 200, expected: "v2" },
        { args: [3], advanceMs: 100, expected: "v2" },
        { args: [4], advanceMs: 100, expected: "v4" },
      ],
    },
    {
      name: "holds exactly until boundary",
      holdMs: 100,
      calls: [
        { args: [1], expected: "v1" },
        { args: [2], advanceMs: 99, expected: "v1" },
        { args: [3], advanceMs: 1, expected: "v3" },
      ],
    },
  ]

  for (const { name, holdMs, calls } of cases) {
    it(name, () => {
      const fn = (n: number) => `v${n}`
      const held = sampleAndHold(fn, holdMs)

      for (const { args, advanceMs, expected } of calls) {
        if (advanceMs) vi.advanceTimersByTime(advanceMs)
        expect(held(...args)).toBe(expected)
      }
    })
  }
})
