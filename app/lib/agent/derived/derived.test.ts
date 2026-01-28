import { describe, expect, it } from "vitest"
import type { Block } from "../types"
import { derive, lastPlan, hasActivePlan, hasActiveExploration, getMode, type Files } from "."
import { createFileEntry } from "~/lib/files"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
  userBlock,
} from "../test-helpers"

const mockFiles: Files = {
  "doc1.md": createFileEntry("# Doc 1\n\nParagraph 1.\n\n## Section\n\nParagraph 2."),
  "doc2.md": createFileEntry("# Doc 2\n\nShort content."),
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
        name: "create_plan creates plan",
        history: [createPlanCall("Test task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }])],
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
        history: [createPlanCall("Task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }]), completeStepCall("Done")],
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
        history: [createPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), completeStepCall("Done", "id:123, count:5")],
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
          createPlanCall("Task", [{ title: "Step 1", expected: "Done 1" }, { title: "Step 2", expected: "Done 2" }]),
          completeStepCall("Done 1"),
          completeStepCall("Done 2"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(lastPlan(d.plans)?.currentStep).toBe(null)
          expect(hasActivePlan(d.plans)).toBe(false)
        },
      },
      {
        name: "abort marks plan as aborted",
        history: [createPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), abortCall()],
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

  describe("exploration", () => {
    const cases = [
      {
        name: "no history returns null exploration",
        history: [] as Block[],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
          expect(hasActiveExploration(d.exploration)).toBe(false)
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
          expect(hasActiveExploration(d.exploration)).toBe(true)
        },
      },
      {
        name: "exploration_step with continue adds finding",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("ctx:abc", "Found A details", "continue", "Now look at B"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.findings).toHaveLength(1)
          expect(d.exploration?.findings[0].direction).toBe("Look at A")
          expect(d.exploration?.findings[0].learned).toBe("Found A details")
          expect(d.exploration?.currentDirection).toBe("Now look at B")
          expect(hasActiveExploration(d.exploration)).toBe(true)
        },
      },
      {
        name: "exploration_step stores internal context",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("fileId:abc", "Found it", "continue", "Next"),
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
          explorationStepCall("ctx:done", "Answer found", "answer"),
        ],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration?.completed).toBe(true)
          expect(hasActiveExploration(d.exploration)).toBe(false)
        },
      },
      {
        name: "exploration_step with plan marks completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("ctx:ready", "Ready to plan", "plan"),
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
        history: [startExplorationCall("Question"), createPlanCall("Task", [{ title: "Step 1", expected: "Complete" }])],
        check: (history: Block[]) => {
          const d = derive(history)
          expect(d.exploration).toBe(null)
          expect(lastPlan(d.plans)?.task).toBe("Task")
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
        history: [createPlanCall("Task", [{ title: "Step 1", expected: "Complete" }])],
        expected: "plan",
      },
      {
        name: "completed plan returns chat",
        history: [createPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), completeStepCall()],
        expected: "chat",
      },
      {
        name: "active exploration returns exploration",
        history: [startExplorationCall("Question")],
        expected: "exploration",
      },
      {
        name: "exploration takes priority over plan",
        history: [createPlanCall("Task", [{ title: "Step 1", expected: "Complete" }]), startExplorationCall("Question")],
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
          [
            { title: "Research", expected: "Research done" },
            { per_section: [{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }] },
            { title: "Summary", expected: "Summarized" },
          ],
          ["doc1.md", "doc2.md"]
        ),
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d.plans)

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
          [
            { title: "Pre", expected: "Pre done" },
            { per_section: [{ title: "Inner 1", expected: "Inner 1 done" }, { title: "Inner 2", expected: "Inner 2 done" }] },
            { title: "Post", expected: "Post done" },
          ],
          ["doc1.md"]
        ),
        completeStepCall("Pre done"),
        completeStepCall("Inner 1 done"),
      ]
      const d = derive(history, mockFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.currentStep).toBe(2) // Inner 2 (index 2)
      expect(plan?.perSection?.currentSection).toBe(0) // Still on section 0
    })

    it("loops back to first inner step on section boundary", () => {
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: [{ title: "Analyze", expected: "Analyzed" }, { title: "Code", expected: "Coded" }] }],
          ["doc1.md", "doc2.md"]
        ),
        completeStepCall("Analyze 1"),
        completeStepCall("Code 1"), // Completes section 0, should loop
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
        "a.md": createFileEntry("Content A"),
        "b.md": createFileEntry("Content B"),
      }
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: [{ title: "Process", expected: "Processed" }] }],
          ["a.md", "b.md"]
        ),
        completeStepCall("Section 1 done"),
        completeStepCall("Section 2 done"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.currentStep).toBe(null) // Plan complete
      expect(plan?.perSection?.completedSections).toHaveLength(2)
      expect(hasActivePlan(d.plans)).toBe(false)
    })

    it("tracks section results with internal context", () => {
      const smallFiles: Files = { "doc.md": createFileEntry("Short") }
      const history = [
        createPlanCall(
          "Task",
          [{ per_section: [{ title: "Step A", expected: "A done" }, { title: "Step B", expected: "B done" }] }],
          ["doc.md"]
        ),
        completeStepCall("A done", "internal:123"),
        completeStepCall("B done", "internal:456"),
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
      const smallFiles: Files = { "doc.md": createFileEntry("Content") }
      const history = [
        createPlanCall(
          "Task",
          [
            { per_section: [{ title: "Process", expected: "Processed" }] },
            { title: "Final step", expected: "Final done" },
          ],
          ["doc.md"]
        ),
        completeStepCall("Processed"),
        completeStepCall("Final done"),
      ]
      const d = derive(history, smallFiles)
      const plan = lastPlan(d.plans)

      expect(plan?.currentStep).toBe(null)
      expect(plan?.steps[1].done).toBe(true)
      expect(plan?.steps[1].summary).toBe("Final done")
    })

    it("strips attributes block from section content", () => {
      const filesWithAttributes: Files = {
        "doc.md": createFileEntry(`# Title

\`\`\`json-attributes
{"tags": ["interview"], "annotations": []}
\`\`\`

Actual content here.`),
      }
      const history = [
        createPlanCall("Task", [{ per_section: [{ title: "Process", expected: "Processed" }] }], ["doc.md"]),
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

})
