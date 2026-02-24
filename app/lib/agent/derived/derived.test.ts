import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "../types"
import { derive, lastPlan, hasActivePlan, getMode, isPlanPaused, guardCompleteStep, type Files } from "."
import {
  submitPlanCall,
  completeStepCall,
  cancelCall,
  textBlock,
  userBlock,
  resetCallIdCounter,
} from "../test-helpers"

beforeEach(() => resetCallIdCounter())

const mockFiles: Files = {
  "doc1.md": "# Doc 1\n\nParagraph 1.\n\n## Section\n\nParagraph 2.",
  "doc2.md": "# Doc 2\n\nShort content.",
}

describe("derived", () => {
  describe("plan", () => {
    const cases = [
      {
        name: "no history returns null plan",
        history: [] as Block[],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)).toBe(null)
          expect(hasActivePlan(d.plans)).toBe(false)
        },
      },
      {
        name: "submit_plan creates plan",
        history: [...submitPlanCall("Test task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }])],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.task).toBe("Test task")
          expect(plan?.steps).toHaveLength(2)
          expect(plan?.currentStep).toBe(0)
          expect(hasActivePlan(d.plans)).toBe(true)
        },
      },
      {
        name: "complete_step marks step done and advances",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }]), ...completeStepCall("Done")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.steps[0].done).toBe(true)
          expect(plan?.steps[1].done).toBe(false)
          expect(plan?.currentStep).toBe(1)
        },
      },
      {
        name: "complete_step stores internal context",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), ...completeStepCall("Done", "id:123, count:5")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d.plans)
          expect(plan?.steps[0].internal).toBe("id:123, count:5")
          expect(plan?.steps[0].summary).toBe("Done")
        },
      },
      {
        name: "all steps complete returns null currentStep",
        history: [
          ...submitPlanCall("Task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }]),
          ...completeStepCall("Done 1"),
          ...completeStepCall("Done 2"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)?.currentStep).toBe(null)
          expect(hasActivePlan(d.plans)).toBe(false)
        },
      },
      {
        name: "cancel marks plan as aborted",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), ...cancelCall()],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)?.aborted).toBe(true)
          expect(hasActivePlan(d.plans)).toBe(false)
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(history))
    })
  })

  describe("getMode", () => {
    const cases = [
      {
        name: "empty history returns chat",
        history: [] as Block[],
        expected: "chat",
      },
      {
        name: "active plan returns exec",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }])],
        expected: "exec",
      },
      {
        name: "completed plan returns chat",
        history: [...submitPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), ...completeStepCall()],
        expected: "chat",
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        expect(getMode(derive(history))).toBe(expected)
      })
    })
  })

  describe("isPlanPaused", () => {
    const cases = [
      {
        name: "empty history is not paused",
        history: [] as Block[],
        expected: false,
      },
      {
        name: "right after submit_plan is not paused",
        history: [...submitPlanCall("Task", ["Step 1"])],
        expected: false,
      },
      {
        name: "text block after step boundary is paused",
        history: [
          ...submitPlanCall("Task", ["Step 1"]),
          textBlock("Let me ask you something"),
        ],
        expected: true,
      },
      {
        name: "text block followed by user message is still paused",
        history: [
          ...submitPlanCall("Task", ["Step 1"]),
          textBlock("What should I do?"),
          userBlock("Do this"),
        ],
        expected: true,
      },
      {
        name: "text block followed by tool call is still paused",
        history: [
          ...submitPlanCall("Task", ["Step 1"]),
          textBlock("Let me check"),
          { type: "tool_call" as const, calls: [{ id: "99", name: "shell", args: { command: "ls" } }] },
          { type: "tool_result" as const, callId: "99", result: { status: "ok" } },
        ],
        expected: true,
      },
      {
        name: "complete_step after text un-pauses",
        history: [
          ...submitPlanCall("Task", ["Step 1", "Step 2"]),
          textBlock("Pausing here"),
          userBlock("Continue"),
          ...completeStepCall("Done"),
        ],
        expected: false,
      },
      {
        name: "no plan at all is not paused",
        history: [textBlock("Just chatting")],
        expected: false,
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        expect(isPlanPaused(history)).toBe(expected)
      })
    })
  })

  describe("per_section", () => {
    it("creates plan with per_section and flattened steps", () => {
      const history = [
        ...submitPlanCall(
          "Analyze docs",
          [
            { title: "Research", expected: "Research done" },
            { per_section: [{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }], files: ["doc1.md", "doc2.md"] },
            { title: "Summary", expected: "Summarized" },
          ],
        ),
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.steps).toHaveLength(4) // Research + 2 inner + Summary
      expect(plan?.steps.map((s) => s.id)).toEqual(["1", "2.1", "2.2", "3"])
      expect(plan?.perSection).not.toBeNull()
      expect(plan?.perSection?.sections.length).toBeGreaterThan(0)
      expect(plan?.perSection?.currentSection).toBe(0)
    })

    it("advances through inner steps within same section", () => {
      const history = [
        ...submitPlanCall(
          "Task",
          [
            { title: "Pre", expected: "Pre done" },
            { per_section: [{ title: "Inner 1", expected: "Inner 1 done" }, { title: "Inner 2", expected: "Inner 2 done" }], files: ["doc1.md"] },
            { title: "Post", expected: "Post done" },
          ],
        ),
        ...completeStepCall("Pre done"),
        ...completeStepCall("Inner 1 done"),
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.currentStep).toBe(2) // Inner 2 (index 2)
      expect(plan?.perSection?.currentSection).toBe(0) // Still on section 0
    })

    it("loops back to first inner step on section boundary", () => {
      const history = [
        ...submitPlanCall(
          "Task",
          [{ per_section: [{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }], files: ["doc1.md", "doc2.md"] }],
        ),
        ...completeStepCall("Analyze 1"),
        ...completeStepCall("Code 1"), // Completes section 0, should loop
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d.plans)

      // Should be back at first inner step, section advanced
      expect(plan?.currentStep).toBe(0) // Back to Analyze
      expect(plan?.perSection?.currentSection).toBe(1) // Section 1
      expect(plan?.perSection?.completedSections).toHaveLength(1)
      expect(plan?.perSection?.completedSections[0].innerResults).toHaveLength(2)
    })

    it("completes plan when all sections processed", () => {
      // Small files that produce 1 section each
      const smallFiles: Files = {
        "a.md": "Content A",
        "b.md": "Content B",
      }
      const history = [
        ...submitPlanCall(
          "Task",
          [{ per_section: [{ title: "Process", expected: "Processed" }], files: ["a.md", "b.md"] }],
        ),
        ...completeStepCall("Section 1 done"),
        ...completeStepCall("Section 2 done"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.currentStep).toBe(null) // Plan complete
      expect(plan?.perSection?.completedSections).toHaveLength(2)
      expect(hasActivePlan(d.plans)).toBe(false)
    })

    it("tracks section results with internal context", () => {
      const smallFiles: Files = { "doc.md": "Short" }
      const history = [
        ...submitPlanCall(
          "Task",
          [{ per_section: [{ title: "Step A", expected: "A done" }, { title: "Step B", expected: "B done" }], files: ["doc.md"] }],
        ),
        ...completeStepCall("A done", "internal:123"),
        ...completeStepCall("B done", "internal:456"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d.plans)

      const results = plan?.perSection?.completedSections[0].innerResults
      expect(results).toHaveLength(2)
      expect(results?.[0].internal).toBe("internal:123")
      expect(results?.[0].summary).toBe("A done")
      expect(results?.[1].internal).toBe("internal:456")
    })

    it("steps after per_section execute normally", () => {
      const smallFiles: Files = { "doc.md": "Content" }
      const history = [
        ...submitPlanCall(
          "Task",
          [
            { per_section: [{ title: "Process", expected: "Processed" }], files: ["doc.md"] },
            { title: "Final step", expected: "Final done" },
          ],
        ),
        ...completeStepCall("Processed"),
        ...completeStepCall("Final done"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.currentStep).toBe(null)
      expect(plan?.steps[1].done).toBe(true)
      expect(plan?.steps[1].summary).toBe("Final done")
    })

    it("strips attributes block from section content", () => {
      const filesWithAttributes: Files = {
        "doc.md": `# Title

\`\`\`json-attributes
{"tags": ["interview"], "annotations": []}
\`\`\`

Actual content here.`,
      }
      const history = [
        ...submitPlanCall("Task", [{ per_section: [{ title: "Process", expected: "Processed" }], files: ["doc.md"] }]),
      ]
      const d = derive(history, filesWithAttributes)
      const plan = lastPlan(d.plans)

      const sectionContent = plan?.perSection?.sections[0].content ?? ""
      expect(sectionContent).toContain("# Title")
      expect(sectionContent).toContain("Actual content here.")
      expect(sectionContent).not.toContain("json-attributes")
      expect(sectionContent).not.toContain("tags")
    })
  })

  describe("per_section inner step advancement via complete_step", () => {
    const smallFiles: Files = { "a.md": "Content A", "b.md": "Content B" }

    const perSectionPlan = (steps: { title: string; expected: string }[]) =>
      submitPlanCall("Task", [
        { title: "Pre", expected: "Pre done" },
        { per_section: steps, files: ["a.md", "b.md"] },
        { title: "Post", expected: "Post done" },
      ])

    const cases = [
      {
        name: "advances to next inner step within section",
        history: () => [
          ...perSectionPlan([{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }]),
          ...completeStepCall("Pre done"),
          ...completeStepCall("Analyzed"),
        ],
        check: (history: Block[]) => {
          const plan = lastPlan(derive(history, smallFiles).plans)
          expect(plan?.steps[1].done).toBe(true)
          expect(plan?.steps[1].summary).toBe("Analyzed")
          expect(plan?.currentStep).toBe(2)
        },
      },
      {
        name: "does not cycle sections on non-last inner step",
        history: () => [
          ...perSectionPlan([{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }]),
          ...completeStepCall("Pre done"),
          ...completeStepCall("Analyzed"),
        ],
        check: (history: Block[]) => {
          const plan = lastPlan(derive(history, smallFiles).plans)
          expect(plan?.perSection?.currentSection).toBe(0)
          expect(plan?.perSection?.completedSections).toHaveLength(0)
        },
      },
      {
        name: "completing last inner step cycles section",
        history: () => [
          ...perSectionPlan([{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }]),
          ...completeStepCall("Pre done"),
          ...completeStepCall("Analyzed"),
          ...completeStepCall("Section done", "ctx:1"),
        ],
        check: (history: Block[]) => {
          const plan = lastPlan(derive(history, smallFiles).plans)
          expect(plan?.perSection?.currentSection).toBe(1)
          expect(plan?.perSection?.completedSections).toHaveLength(1)
          expect(plan?.currentStep).toBe(1)
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(history()))
    })
  })

  describe("guards", () => {
    const smallFiles: Files = { "doc.md": "Content" }

    const cases = [
      {
        name: "guardCompleteStep: allowed on regular step",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ title: "Regular", expected: "Done" }]),
          ]
          return lastPlan(derive(history).plans)!
        },
        guard: guardCompleteStep,
        expected: true,
      },
      {
        name: "guardCompleteStep: allowed on first inner step",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ per_section: [{ title: "A", expected: "A" }, { title: "B", expected: "B" }], files: ["doc.md"] }]),
          ]
          return lastPlan(derive(history, smallFiles).plans)!
        },
        guard: guardCompleteStep,
        expected: true,
      },
      {
        name: "guardCompleteStep: allowed on last inner step",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ per_section: [{ title: "A", expected: "A" }, { title: "B", expected: "B" }], files: ["doc.md"] }]),
            ...completeStepCall("A done"),
          ]
          return lastPlan(derive(history, smallFiles).plans)!
        },
        guard: guardCompleteStep,
        expected: true,
      },
      {
        name: "guardCompleteStep: denied when plan complete",
        plan: () => {
          const history = [
            ...submitPlanCall("Task", [{ title: "Step", expected: "Done" }]),
            ...completeStepCall("Done"),
          ]
          return lastPlan(derive(history).plans)!
        },
        guard: guardCompleteStep,
        expected: false,
      },
    ]

    cases.forEach(({ name, plan, guard, expected }) => {
      it(name, () => {
        expect(guard(plan()).allowed).toBe(expected)
      })
    })
  })

})
