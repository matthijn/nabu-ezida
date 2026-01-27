import { describe, expect, it } from "vitest"
import type { Block } from "./types"
import { derive, lastPlan, hasActivePlan, hasActiveExploration, getMode, type Files } from "./selectors"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
  userBlock,
} from "./test-helpers"

const mockFiles: Files = {
  "doc1.md": { raw: "# Doc 1\n\nParagraph 1.\n\n## Section\n\nParagraph 2." },
  "doc2.md": { raw: "# Doc 2\n\nShort content." },
}

describe("selectors", () => {
  describe("plan", () => {
    const cases = [
      {
        name: "no history returns null plan",
        history: [] as Block[],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d)).toBe(null)
          expect(hasActivePlan(d)).toBe(false)
        },
      },
      {
        name: "create_plan creates plan",
        history: [createPlanCall("Test task", ["Step 1", "Step 2"])],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d)
          expect(plan?.task).toBe("Test task")
          expect(plan?.steps).toHaveLength(2)
          expect(plan?.currentStep).toBe(0)
          expect(hasActivePlan(d)).toBe(true)
        },
      },
      {
        name: "complete_step marks step done and advances",
        history: [createPlanCall("Task", ["Step 1", "Step 2"]), completeStepCall("Done")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d)
          expect(plan?.steps[0].done).toBe(true)
          expect(plan?.steps[1].done).toBe(false)
          expect(plan?.currentStep).toBe(1)
        },
      },
      {
        name: "complete_step stores internal context",
        history: [createPlanCall("Task", ["Step 1"]), completeStepCall("Done", "id:123, count:5")],
        check: (history: Block[]) => {
          const d = derive(history)
          const plan = lastPlan(d)
          expect(plan?.steps[0].internal).toBe("id:123, count:5")
          expect(plan?.steps[0].summary).toBe("Done")
        },
      },
      {
        name: "all steps complete returns null currentStep",
        history: [
          createPlanCall("Task", ["Step 1", "Step 2"]),
          completeStepCall("Done 1"),
          completeStepCall("Done 2"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d)?.currentStep).toBe(null)
          expect(hasActivePlan(d)).toBe(false)
        },
      },
      {
        name: "abort marks plan as aborted",
        history: [createPlanCall("Task", ["Step 1"]), abortCall()],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d)?.aborted).toBe(true)
          expect(hasActivePlan(d)).toBe(false)
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(history))
    })
  })

  describe("exploration", () => {
    const cases = [
      {
        name: "no history returns null exploration",
        history: [] as Block[],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
          expect(hasActiveExploration(d)).toBe(false)
        },
      },
      {
        name: "start_exploration creates exploration",
        history: [startExplorationCall("How does X work?", "Check the docs")],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.question).toBe("How does X work?")
          expect(d.exploration?.findings).toHaveLength(0)
          expect(d.exploration?.currentDirection).toBe("Check the docs")
          expect(hasActiveExploration(d)).toBe(true)
        },
      },
      {
        name: "exploration_step with continue adds finding",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("Found A details", "continue", "Now look at B"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.findings).toHaveLength(1)
          expect(d.exploration?.findings[0].direction).toBe("Look at A")
          expect(d.exploration?.findings[0].learned).toBe("Found A details")
          expect(d.exploration?.currentDirection).toBe("Now look at B")
          expect(hasActiveExploration(d)).toBe(true)
        },
      },
      {
        name: "exploration_step stores internal context",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("Found it", "continue", "Next", "fileId:abc"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.findings[0].internal).toBe("fileId:abc")
          expect(d.exploration?.findings[0].learned).toBe("Found it")
        },
      },
      {
        name: "exploration_step with answer marks completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Answer found", "answer"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.completed).toBe(true)
          expect(hasActiveExploration(d)).toBe(false)
        },
      },
      {
        name: "exploration_step with plan marks completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Ready to plan", "plan"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.completed).toBe(true)
        },
      },
      {
        name: "abort clears exploration",
        history: [startExplorationCall("Question"), abortCall()],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
        },
      },
      {
        name: "create_plan clears exploration",
        history: [startExplorationCall("Question"), createPlanCall("Task", ["Step 1"])],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
          expect(lastPlan(d)?.task).toBe("Task")
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
        name: "active plan returns plan",
        history: [createPlanCall("Task", ["Step 1"])],
        expected: "plan",
      },
      {
        name: "completed plan returns chat",
        history: [createPlanCall("Task", ["Step 1"]), completeStepCall()],
        expected: "chat",
      },
      {
        name: "active exploration returns exploration",
        history: [startExplorationCall("Question")],
        expected: "exploration",
      },
      {
        name: "exploration takes priority over plan",
        history: [createPlanCall("Task", ["Step 1"]), startExplorationCall("Question")],
        expected: "exploration",
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        expect(getMode(derive(history))).toBe(expected)
      })
    })
  })

  describe("per_section", () => {
    it("creates plan with per_section and flattened steps", () => {
      const history = [
        createPlanCall(
          "Analyze docs",
          ["Research", { per_section: ["Analyze", "Code"] }, "Summary"],
          ["doc1.md", "doc2.md"]
        ),
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d)

      expect(plan?.files).toEqual(["doc1.md", "doc2.md"])
      expect(plan?.steps).toHaveLength(4) // Research + 2 inner + Summary
      expect(plan?.steps.map((s) => s.id)).toEqual(["1", "2.1", "2.2", "3"])
      expect(plan?.perSection).not.toBeNull()
      expect(plan?.perSection?.sections.length).toBeGreaterThan(0)
      expect(plan?.perSection?.currentSection).toBe(0)
    })

    it("advances through inner steps within same section", () => {
      const history = [
        createPlanCall(
          "Task",
          ["Pre", { per_section: ["Inner 1", "Inner 2"] }, "Post"],
          ["doc1.md"]
        ),
        completeStepCall("Pre done"),
        completeStepCall("Inner 1 done"),
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d)

      expect(plan?.currentStep).toBe(2) // Inner 2 (index 2)
      expect(plan?.perSection?.currentSection).toBe(0) // Still on section 0
    })

    it("loops back to first inner step on section boundary", () => {
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: ["Analyze", "Code"] }],
          ["doc1.md", "doc2.md"]
        ),
        completeStepCall("Analyze 1"),
        completeStepCall("Code 1"), // Completes section 0, should loop
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d)

      // Should be back at first inner step, section advanced
      expect(plan?.currentStep).toBe(0) // Back to Analyze
      expect(plan?.perSection?.currentSection).toBe(1) // Section 1
      expect(plan?.perSection?.completedSections).toHaveLength(1)
      expect(plan?.perSection?.completedSections[0].innerResults).toHaveLength(2)
    })

    it("completes plan when all sections processed", () => {
      // Small files that produce 1 section each
      const smallFiles: Files = {
        "a.md": { raw: "Content A" },
        "b.md": { raw: "Content B" },
      }
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: ["Process"] }],
          ["a.md", "b.md"]
        ),
        completeStepCall("Section 1 done"),
        completeStepCall("Section 2 done"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d)

      expect(plan?.currentStep).toBe(null) // Plan complete
      expect(plan?.perSection?.completedSections).toHaveLength(2)
      expect(hasActivePlan(d)).toBe(false)
    })

    it("tracks section results with internal context", () => {
      const smallFiles: Files = { "doc.md": { raw: "Short" } }
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: ["Step A", "Step B"] }],
          ["doc.md"]
        ),
        completeStepCall("A done", "internal:123"),
        completeStepCall("B done", "internal:456"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d)

      const results = plan?.perSection?.completedSections[0].innerResults
      expect(results).toHaveLength(2)
      expect(results?.[0].internal).toBe("internal:123")
      expect(results?.[0].summary).toBe("A done")
      expect(results?.[1].internal).toBe("internal:456")
    })

    it("steps after per_section execute normally", () => {
      const smallFiles: Files = { "doc.md": { raw: "Content" } }
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: ["Process"] }, "Final step"],
          ["doc.md"]
        ),
        completeStepCall("Processed"),
        completeStepCall("Final done"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d)

      expect(plan?.currentStep).toBe(null)
      expect(plan?.steps[1].done).toBe(true)
      expect(plan?.steps[1].summary).toBe("Final done")
    })

    it("strips attributes block from section content", () => {
      const filesWithAttributes: Files = {
        "doc.md": {
          raw: `# Title

\`\`\`json-attributes
{"tags": ["interview"], "annotations": []}
\`\`\`

Actual content here.`,
        },
      }
      const history = [
        createPlanCall("Task", [{ per_section: ["Process"] }], ["doc.md"]),
      ]
      const d = derive(history, filesWithAttributes)
      const plan = lastPlan(d)

      const sectionContent = plan?.perSection?.sections[0].content ?? ""
      expect(sectionContent).toContain("# Title")
      expect(sectionContent).toContain("Actual content here.")
      expect(sectionContent).not.toContain("json-attributes")
      expect(sectionContent).not.toContain("tags")
    })
  })

})
