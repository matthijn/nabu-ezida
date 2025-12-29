import { describe, expect, it } from "vitest"
import { createInitialState, applyMessage, getCurrentStep } from "./reducers"
import { selectCurrentStepIndex } from "./selectors"
import type { AgentState, AgentMessage, Plan } from "./types"
import type { CompactionBlock } from "~/lib/llm"

const createPlan = (stepCount: number): Plan => ({
  task: "Test task",
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: String(i + 1),
    description: `Step ${i + 1}`,
    status: "pending" as const,
  })),
})

const createTaskState = (stepCount: number): AgentState => ({
  mode: "task",
  messages: [],
  plan: createPlan(stepCount),
  compactions: [],
  compactedUpTo: 0,
})

describe("createInitialState", () => {
  it("creates state in converse mode with empty messages", () => {
    const state = createInitialState()
    expect(state.mode).toBe("converse")
    expect(state.messages).toEqual([])
    expect(state.plan).toBeNull()
  })
})

describe("applyMessage", () => {
  const initialState = createInitialState()

  const textCases = [
    {
      name: "text message appends to messages without changing mode",
      state: initialState,
      message: { type: "text", content: "Hello" } as AgentMessage,
      expectedMode: "converse",
      expectedMessageCount: 1,
    },
    {
      name: "thinking message appends without changing mode",
      state: initialState,
      message: { type: "thinking", content: "Processing..." } as AgentMessage,
      expectedMode: "converse",
      expectedMessageCount: 1,
    },
  ]

  textCases.forEach(({ name, state, message, expectedMode, expectedMessageCount }) => {
    it(name, () => {
      const result = applyMessage(state, message)
      expect(result.mode).toBe(expectedMode)
      expect(result.messages).toHaveLength(expectedMessageCount)
      expect(result.messages[0]).toEqual(message)
    })
  })

  describe("task_detected message", () => {
    it("transitions to task mode", () => {
      const result = applyMessage(initialState, { type: "task_detected", task: "Build something" })
      expect(result.mode).toBe("task")
      expect(result.plan).toBeNull()
    })
  })

  describe("plan message", () => {
    it("sets plan", () => {
      const plan = createPlan(3)
      const result = applyMessage(initialState, { type: "plan", plan })
      expect(result.plan).toEqual(plan)
      expect(selectCurrentStepIndex(result)).toBe(0)
    })
  })

  describe("step_start message", () => {
    it("updates step status to in_progress", () => {
      const state = createTaskState(3)
      const result = applyMessage(state, { type: "step_start", stepIndex: 0 })
      expect(result.plan!.steps[0].status).toBe("in_progress")
    })

    it("does nothing if no plan exists", () => {
      const result = applyMessage(initialState, { type: "step_start", stepIndex: 0 })
      expect(result.plan).toBeNull()
    })
  })

  describe("step_done message", () => {
    it("updates step status to done", () => {
      const state = createTaskState(3)
      const result = applyMessage(state, { type: "step_done", stepIndex: 0, result: "Completed" })
      expect(result.plan!.steps[0].status).toBe("done")
    })

    it("advances current step index (derived from status)", () => {
      const state = createTaskState(3)
      const result = applyMessage(state, { type: "step_done", stepIndex: 0, result: "Completed" })
      expect(selectCurrentStepIndex(result)).toBe(1)
    })

    it("current step index becomes null when last step is done", () => {
      let state = createTaskState(3)
      state = applyMessage(state, { type: "step_done", stepIndex: 0, result: "Done" })
      state = applyMessage(state, { type: "step_done", stepIndex: 1, result: "Done" })
      state = applyMessage(state, { type: "step_done", stepIndex: 2, result: "Done" })
      expect(selectCurrentStepIndex(state)).toBeNull()
    })

    it("does nothing if no plan exists", () => {
      const result = applyMessage(initialState, { type: "step_done", stepIndex: 0, result: "Done" })
      expect(result.plan).toBeNull()
    })
  })

  describe("error message", () => {
    it("updates current step status to error", () => {
      let state = createTaskState(3)
      state = applyMessage(state, { type: "step_start", stepIndex: 0 })
      const result = applyMessage(state, { type: "error", message: "Something failed" })
      expect(result.plan!.steps[0].status).toBe("error")
    })

    it("does nothing if no plan exists", () => {
      const result = applyMessage(initialState, { type: "error", message: "Error" })
      expect(result.plan).toBeNull()
    })
  })

  describe("done message", () => {
    it("resets to converse mode and clears plan", () => {
      const state = createTaskState(3)
      const result = applyMessage(state, { type: "done", result: "All done" })
      expect(result.mode).toBe("converse")
      expect(result.plan).toBeNull()
    })
  })

  describe("stuck message", () => {
    it("appends message without changing state", () => {
      const state = createTaskState(3)
      const result = applyMessage(state, { type: "stuck", stepIndex: 0, question: "What next?" })
      expect(result.messages).toHaveLength(1)
      expect(result.mode).toBe("task")
    })
  })

  describe("compacted message", () => {
    const createCompaction = (id: string): CompactionBlock => ({
      block_id: id,
      summary: `Summary ${id}`,
    })

    const cases = [
      {
        name: "replaces compactions with new array",
        initialCompactions: [createCompaction("old")],
        newCompactions: [createCompaction("1"), createCompaction("2")],
        expectedCount: 2,
      },
      {
        name: "handles empty initial compactions",
        initialCompactions: [],
        newCompactions: [createCompaction("1")],
        expectedCount: 1,
      },
      {
        name: "handles compaction reducing count",
        initialCompactions: [createCompaction("1"), createCompaction("2"), createCompaction("3")],
        newCompactions: [createCompaction("compacted")],
        expectedCount: 1,
      },
    ]

    cases.forEach(({ name, initialCompactions, newCompactions, expectedCount }) => {
      it(name, () => {
        const state: AgentState = {
          ...createInitialState(),
          messages: [{ type: "text", content: "msg1" }, { type: "text", content: "msg2" }],
          compactions: initialCompactions,
        }
        const result = applyMessage(state, { type: "compacted", compactions: newCompactions })
        expect(result.compactions).toHaveLength(expectedCount)
        expect(result.compactions).toEqual(newCompactions)
      })
    })

    it("sets compactedUpTo to current message count", () => {
      const state: AgentState = {
        ...createInitialState(),
        messages: [{ type: "text", content: "msg1" }, { type: "text", content: "msg2" }],
      }
      const result = applyMessage(state, { type: "compacted", compactions: [createCompaction("1")] })
      expect(result.compactedUpTo).toBe(3)
    })
  })

  describe("immutability", () => {
    it("does not mutate original state", () => {
      const state = createTaskState(3)
      const originalPlan = state.plan
      const originalSteps = [...state.plan!.steps]

      applyMessage(state, { type: "step_done", stepIndex: 0, result: "Done" })

      expect(state.plan).toBe(originalPlan)
      expect(state.plan!.steps).toEqual(originalSteps)
    })
  })
})

describe("getCurrentStep", () => {
  const cases = [
    {
      name: "returns current step when plan has pending steps",
      state: createTaskState(3),
      expectedDescription: "Step 1",
    },
    {
      name: "returns null when no plan",
      state: createInitialState(),
      expectedNull: true,
    },
    {
      name: "returns null when all steps done",
      state: (() => {
        let s = createTaskState(2)
        s = applyMessage(s, { type: "step_done", stepIndex: 0, result: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 1, result: "" })
        return s
      })(),
      expectedNull: true,
    },
  ]

  cases.forEach(({ name, state, expectedDescription, expectedNull }) => {
    it(name, () => {
      const result = getCurrentStep(state)
      if (expectedNull) {
        expect(result).toBeNull()
      } else {
        expect(result?.description).toBe(expectedDescription)
      }
    })
  })
})
