import { describe, it, expect, beforeEach } from "vitest"
import { collect, systemNudge, type Nudger } from "./nudge-tools"
import { createPlanNudge } from "./nudges/plan"
import { createPlanCall, resetCallIdCounter } from "../test-helpers"
import type { Block, SystemBlock } from "../types"

beforeEach(() => resetCallIdCounter())

describe("planNudge with askExpert", () => {
  const fileContent = "Line 1\nLine 2\nLine 3"
  const files = { "doc.md": fileContent, "codebook.md": "# Codebook\nSome codes" }

  const expertResultBlock: SystemBlock = {
    type: "system",
    content: "<!-- expert-result:1 -->\nPrevious expert analysis",
  }

  type TestCase = {
    name: string
    history: Block[]
    files: Record<string, string>
    expectContext: boolean
  }

  const cases: TestCase[] = [
    {
      name: "per_section with askExpert → has context",
      history: createPlanCall(
        "Analyze doc",
        [{ per_section: ["Analyze section"] }],
        { files: ["doc.md"], askExpert: { expert: "qualitative-researcher", task: "apply-codebook", using: "cat codebook.md" } }
      ),
      files,
      expectContext: true,
    },
    {
      name: "per_section without askExpert → no context",
      history: createPlanCall(
        "Analyze doc",
        [{ per_section: ["Analyze section"] }],
        { files: ["doc.md"] }
      ),
      files,
      expectContext: false,
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
    },
    {
      name: "per_section with askExpert + existing expert_result → no context (already ran)",
      history: [
        ...createPlanCall(
          "Analyze doc",
          [{ per_section: ["Analyze section"] }],
          { files: ["doc.md"], askExpert: { expert: "qualitative-researcher", task: "apply-codebook", using: "cat codebook.md" } }
        ),
        expertResultBlock,
      ],
      files,
      expectContext: false,
    },
  ]

  cases.forEach(({ name, history, files: testFiles, expectContext }) => {
    it(name, () => {
      const planNudge = createPlanNudge(() => testFiles)
      const nudge = planNudge(history)

      expect(nudge).not.toBeNull()
      if (!nudge) return

      expect(nudge.content).not.toContain("{context}")

      if (expectContext) {
        expect(nudge.context).toBeDefined()
      } else {
        expect(nudge.context).toBeUndefined()
      }
    })
  })
})

describe("collect error handling", () => {
  const emptyHistory: Block[] = []

  type TestCase = {
    name: string
    nudgers: Nudger[]
    expectErrorMessage: string | null
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

  const isSystemBlock = (b: Block): b is SystemBlock => b.type === "system"

  const cases: TestCase[] = [
    {
      name: "context throws → returns system error block",
      nudgers: [failingNudger],
      expectErrorMessage: "Interpretation failed",
      expectSystemBlock: true,
    },
    {
      name: "context succeeds → returns system block",
      nudgers: [succeedingNudger],
      expectErrorMessage: null,
      expectSystemBlock: true,
    },
    {
      name: "one fails, one succeeds → both returned as system blocks",
      nudgers: [failingNudger, simpleNudger],
      expectErrorMessage: "Interpretation failed",
      expectSystemBlock: true,
    },
  ]

  cases.forEach(({ name, nudgers, expectErrorMessage, expectSystemBlock }) => {
    it(name, async () => {
      const multiNudger = collect(...nudgers)
      const result = await multiNudger(emptyHistory)

      if (expectErrorMessage) {
        const errorBlock = result.filter(isSystemBlock).find((b) => b.content.includes("nudge context error"))
        expect(errorBlock).toBeDefined()
        expect(errorBlock!.content).toContain(expectErrorMessage)
      }

      if (expectSystemBlock) {
        expect(result.some(isSystemBlock)).toBe(true)
      }
    })
  })
})
