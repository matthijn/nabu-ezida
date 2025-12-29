import { describe, expect, it } from "vitest"
import { selectCurrentStepIndex, selectEndpoint, selectUncompactedMessages, hasUncompactedMessages } from "./selectors"
import { applyMessage } from "./reducers"
import type { AgentState, Plan, AgentMessage } from "./types"

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
  compactions: [],
  compactedUpTo: 0,
}

const taskStateNoPlan: AgentState = {
  mode: "task",
  messages: [],
  plan: null,
  compactions: [],
  compactedUpTo: 0,
}

const taskStateWithPlan: AgentState = {
  mode: "task",
  messages: [],
  plan: createPlan(3),
  compactions: [],
  compactedUpTo: 0,
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
      state: applyMessage(taskStateWithPlan, { type: "step_done", stepIndex: 0, result: "" }),
      expected: 1,
    },
    {
      name: "returns null when all steps are done",
      state: (() => {
        let s = taskStateWithPlan
        s = applyMessage(s, { type: "step_done", stepIndex: 0, result: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 1, result: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 2, result: "" })
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
      state: applyMessage(taskStateWithPlan, { type: "step_done", stepIndex: 0, result: "" }),
      expected: "/chat/execute",
    },
    {
      name: "returns /chat/converse when all steps done (plan exists but complete)",
      state: (() => {
        let s = taskStateWithPlan
        s = applyMessage(s, { type: "step_done", stepIndex: 0, result: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 1, result: "" })
        s = applyMessage(s, { type: "step_done", stepIndex: 2, result: "" })
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

const createMessages = (count: number): AgentMessage[] =>
  Array.from({ length: count }, (_, i) => ({ type: "text", content: `msg${i + 1}` }))

describe("selectUncompactedMessages", () => {
  const cases = [
    {
      name: "returns all messages when none compacted",
      messages: createMessages(3),
      compactedUpTo: 0,
      expectedCount: 3,
    },
    {
      name: "returns messages after compactedUpTo",
      messages: createMessages(5),
      compactedUpTo: 2,
      expectedCount: 3,
    },
    {
      name: "returns empty when all compacted",
      messages: createMessages(3),
      compactedUpTo: 3,
      expectedCount: 0,
    },
    {
      name: "returns empty when no messages",
      messages: [],
      compactedUpTo: 0,
      expectedCount: 0,
    },
  ]

  cases.forEach(({ name, messages, compactedUpTo, expectedCount }) => {
    it(name, () => {
      const state: AgentState = { ...converseState, messages, compactedUpTo }
      expect(selectUncompactedMessages(state)).toHaveLength(expectedCount)
    })
  })

  it("returns correct slice of messages", () => {
    const state: AgentState = {
      ...converseState,
      messages: createMessages(5),
      compactedUpTo: 2,
    }
    const result = selectUncompactedMessages(state)
    expect(result[0]).toEqual({ type: "text", content: "msg3" })
    expect(result[2]).toEqual({ type: "text", content: "msg5" })
  })
})

describe("hasUncompactedMessages", () => {
  const cases = [
    {
      name: "returns true when messages exist past compactedUpTo",
      messageCount: 5,
      compactedUpTo: 2,
      expected: true,
    },
    {
      name: "returns false when all compacted",
      messageCount: 3,
      compactedUpTo: 3,
      expected: false,
    },
    {
      name: "returns false when no messages",
      messageCount: 0,
      compactedUpTo: 0,
      expected: false,
    },
    {
      name: "returns true when none compacted and messages exist",
      messageCount: 2,
      compactedUpTo: 0,
      expected: true,
    },
  ]

  cases.forEach(({ name, messageCount, compactedUpTo, expected }) => {
    it(name, () => {
      const state: AgentState = {
        ...converseState,
        messages: createMessages(messageCount),
        compactedUpTo,
      }
      expect(hasUncompactedMessages(state)).toBe(expected)
    })
  })
})
