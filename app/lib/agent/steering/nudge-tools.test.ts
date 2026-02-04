import { describe, it, expect, beforeEach } from "vitest"
import { collect, systemNudge, type Nudger } from "./nudge-tools"
import { planNudge } from "./nudges/plan"
import { createPlanCall, resetCallIdCounter } from "../test-helpers"
import type { Block, ToolResultBlock } from "../types"

beforeEach(() => resetCallIdCounter())

describe("planNudge with askExpert", () => {
  const fileContent = "Line 1\nLine 2\nLine 3"
  const files = { "doc.md": fileContent, "codebook.md": "# Codebook\nSome codes" }

  type TestCase = {
    name: string
    history: Block[]
    files: Record<string, string>
    expectContext: boolean
    expectPlaceholder: boolean
  }

  const cases: TestCase[] = [
    {
      name: "per_section with askExpert → has context and placeholder",
      history: createPlanCall(
        "Analyze doc",
        [{ per_section: ["Analyze section"] }],
        { files: ["doc.md"], askExpert: { expert: "qualitative-researcher", task: "apply-codebook", using: "cat codebook.md" } }
      ),
      files,
      expectContext: true,
      expectPlaceholder: true,
    },
    {
      name: "per_section without askExpert → no context, no placeholder",
      history: createPlanCall(
        "Analyze doc",
        [{ per_section: ["Analyze section"] }],
        { files: ["doc.md"] }
      ),
      files,
      expectContext: false,
      expectPlaceholder: false,
    },
    {
      name: "regular step with askExpert → no context (only per_section gets it)",
      history: createPlanCall(
        "Simple task",
        ["Step 1"],
        { askExpert: { expert: "qualitative-researcher", task: "apply-codebook", using: "cat codebook.md" } }
      ),
      files,
      expectContext: false,
      expectPlaceholder: false,
    },
  ]

  cases.forEach(({ name, history, files: testFiles, expectContext, expectPlaceholder }) => {
    it(name, () => {
      const nudge = planNudge(history, testFiles)

      expect(nudge).not.toBeNull()
      if (!nudge) return

      if (expectContext) {
        expect(nudge.context).toBeDefined()
      } else {
        expect(nudge.context).toBeUndefined()
      }

      if (expectPlaceholder) {
        expect(nudge.content).toContain("{context}")
      } else {
        expect(nudge.content).not.toContain("{context}")
      }
    })
  })
})

describe("collect error handling", () => {
  const emptyHistory: Block[] = []
  const emptyFiles: Record<string, string> = {}

  type TestCase = {
    name: string
    nudgers: Nudger[]
    expectErrorBlock: boolean
    expectSystemBlock: boolean
  }

  const succeedingNudger: Nudger = () => ({
    type: "system",
    content: "Success message",
    context: () => Promise.resolve("resolved context"),
  })

  const failingNudger: Nudger = () => ({
    type: "system",
    content: "Template {context}",
    context: () => Promise.reject(new Error("Interpretation failed")),
  })

  const simpleNudger: Nudger = () => systemNudge("Simple nudge")

  const cases: TestCase[] = [
    {
      name: "context throws → returns error block",
      nudgers: [failingNudger],
      expectErrorBlock: true,
      expectSystemBlock: false,
    },
    {
      name: "context succeeds → returns system block",
      nudgers: [succeedingNudger],
      expectErrorBlock: false,
      expectSystemBlock: true,
    },
    {
      name: "one fails, one succeeds → both returned",
      nudgers: [failingNudger, simpleNudger],
      expectErrorBlock: true,
      expectSystemBlock: true,
    },
  ]

  const isErrorBlock = (b: Block): b is ToolResultBlock =>
    b.type === "tool_result" && (b.result as { status?: string })?.status === "error"

  const isSystemBlock = (b: Block): boolean => b.type === "system"

  cases.forEach(({ name, nudgers, expectErrorBlock, expectSystemBlock }) => {
    it(name, async () => {
      const multiNudger = collect(...nudgers)
      const result = await multiNudger(emptyHistory, emptyFiles)

      if (expectErrorBlock) {
        const errorBlock = result.find(isErrorBlock)
        expect(errorBlock).toBeDefined()
        expect((errorBlock?.result as { output?: string })?.output).toContain("Interpretation failed")
      }

      if (expectSystemBlock) {
        expect(result.some(isSystemBlock)).toBe(true)
      }
    })
  })
})
