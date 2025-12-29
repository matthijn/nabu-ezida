import { describe, expect, it } from "vitest"
import { selectCurrentStepIndex, selectEndpoint } from "./selectors"
import { applyMessage } from "./reducers"
import type { AgentState, Plan } from "./types"

const createPlan = (stepCount: number): Plan => ({
  task: "Test task",
  steps: Array.from({ length: stepCount }, (_, i) => ({
    id: String(i + 1),
    description: `Step ${i + 1}`,
    status: "pending" as const,
  })),
})

const converseState: AgentState = {
  mode: "converse",
  messages: [],
  plan: null,
}

const taskStateNoPlan: AgentState = {
  mode: "task",
  messages: [],
  plan: null,
}

const taskStateWithPlan: AgentState = {
  mode: "task",
  messages: [],
  plan: createPlan(3),
}

describe("selectCurrentStepIndex", () => {
  const cases = [
    {
      name: "returns 0 when all steps are pending",
      state: taskStateWithPlan,
      expected: 0,
    },
    {
      name: "returns first non-done step index",
      state: applyMessage(taskStateWithPlan, { type: "step_done", stepIndex: 0, summary: "" }),
      expected: 1,
    },
    {
      name: "returns null when all steps are done",
      state: (() => {
        let s = taskStateWithPlan
        s = applyMessage(s, { type: "step_done", stepIndex: 0, summary: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 1, summary: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 2, summary: "" })
        return s
      })(),
      expected: null,
    },
    {
      name: "returns null when no plan",
      state: converseState,
      expected: null,
    },
  ]

  cases.forEach(({ name, state, expected }) => {
    it(name, () => {
      expect(selectCurrentStepIndex(state)).toBe(expected)
    })
  })
})

describe("selectEndpoint", () => {
  const cases = [
    {
      name: "returns /chat/converse for converse mode",
      state: converseState,
      expected: "/chat/converse",
    },
    {
      name: "returns /chat/plan for task mode without plan",
      state: taskStateNoPlan,
      expected: "/chat/plan",
    },
    {
      name: "returns /chat/execute for task mode with pending steps",
      state: taskStateWithPlan,
      expected: "/chat/execute",
    },
    {
      name: "returns /chat/execute when on middle step",
      state: applyMessage(taskStateWithPlan, { type: "step_done", stepIndex: 0, summary: "" }),
      expected: "/chat/execute",
    },
    {
      name: "returns /chat/converse when all steps done (plan exists but complete)",
      state: (() => {
        let s = taskStateWithPlan
        s = applyMessage(s, { type: "step_done", stepIndex: 0, summary: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 1, summary: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 2, summary: "" })
        return s
      })(),
      expected: "/chat/converse",
    },
  ]

  cases.forEach(({ name, state, expected }) => {
    it(name, () => {
      expect(selectEndpoint(state)).toBe(expected)
    })
  })
})

