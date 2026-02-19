import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "~/lib/agent"
import { toRenderMessages, type RenderMessage } from "./messages"
import {
  createPlanCall,
  completeStepCall,
  cancelCall,
  resetCallIdCounter,
} from "~/lib/agent/test-helpers"

beforeEach(() => resetCallIdCounter())

const userBlock = (content: string): Block => ({ type: "user", content })
const textBlock = (content: string): Block => ({ type: "text", content })
const systemBlock = (content: string): Block => ({ type: "system", content })
const toolResultBlock = (): Block => ({ type: "tool_result", callId: "1", result: {} })

describe("toRenderMessages", () => {
  describe("text messages", () => {
    const cases = [
      {
        name: "user block renders as user text message",
        history: [userBlock("Hello")],
        expected: [{ type: "text", role: "user", content: "Hello" }],
      },
      {
        name: "text block renders as assistant text message",
        history: [textBlock("Hi there")],
        expected: [{ type: "text", role: "assistant", content: "Hi there" }],
      },
      {
        name: "empty content is filtered out",
        history: [userBlock(""), textBlock("   "), userBlock("Real message")],
        expected: [{ type: "text", role: "user", content: "Real message" }],
      },
      {
        name: "system blocks do not render",
        history: [systemBlock("System prompt"), userBlock("Hello")],
        expected: [{ type: "text", role: "user", content: "Hello" }],
      },
      {
        name: "tool_result blocks do not render",
        history: [userBlock("Hello"), toolResultBlock()],
        expected: [{ type: "text", role: "user", content: "Hello" }],
      },
    ]

    cases.forEach(({ name, history, expected }) => {
      it(name, () => {
        const messages = toRenderMessages(history)
        expect(messages).toEqual(expected)
      })
    })
  })

  describe("plan messages", () => {
    const cases = [
      {
        name: "create_plan renders as plan message with all steps pending",
        history: [...createPlanCall("Build feature", ["Design", "Implement", "Test"])],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          expect(messages[0].type).toBe("plan")
          if (messages[0].type === "plan") {
            expect(messages[0].plan.task).toBe("Build feature")
            expect(messages[0].plan.steps).toHaveLength(3)
            expect(messages[0].currentStep).toBe(0)
            expect(messages[0].aborted).toBe(false)
          }
        },
      },
      {
        name: "completed steps are marked done",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2", "Step 3"]),
          ...completeStepCall("Done first"),
          ...completeStepCall("Done second"),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          if (messages[0].type === "plan") {
            expect(messages[0].plan.steps[0].done).toBe(true)
            expect(messages[0].plan.steps[0].summary).toBe("Done first")
            expect(messages[0].plan.steps[1].done).toBe(true)
            expect(messages[0].plan.steps[1].summary).toBe("Done second")
            expect(messages[0].plan.steps[2].done).toBe(false)
            expect(messages[0].currentStep).toBe(2)
          }
        },
      },
      {
        name: "all steps complete sets currentStep to null",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2"]),
          ...completeStepCall(),
          ...completeStepCall(),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          if (messages[0].type === "plan") {
            expect(messages[0].currentStep).toBe(null)
            expect(messages[0].aborted).toBe(false)
          }
        },
      },
      {
        name: "aborted plan shows aborted state",
        history: [
          ...createPlanCall("Task", ["Step 1", "Step 2", "Step 3"]),
          ...completeStepCall("Done"),
          ...cancelCall(),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          if (messages[0].type === "plan") {
            expect(messages[0].plan.steps[0].done).toBe(true)
            expect(messages[0].plan.steps[1].done).toBe(false)
            expect(messages[0].aborted).toBe(true)
          }
        },
      },
      {
        name: "complete_step does not render as separate message",
        history: [...createPlanCall("Task", ["Step 1"]), ...completeStepCall()],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          expect(messages[0].type).toBe("plan")
        },
      },
      {
        name: "cancel does not render as separate message",
        history: [...createPlanCall("Task", ["Step 1"]), ...cancelCall()],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          expect(messages[0].type).toBe("plan")
        },
      },
      {
        name: "new plan after cancel shows only new plan",
        history: [
          ...createPlanCall("First task", ["Step A"]),
          ...cancelCall(),
          ...createPlanCall("Second task", ["Step B"]),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(2)
          if (messages[0].type === "plan" && messages[1].type === "plan") {
            expect(messages[0].plan.task).toBe("First task")
            expect(messages[0].aborted).toBe(true)
            expect(messages[1].plan.task).toBe("Second task")
            expect(messages[1].aborted).toBe(false)
          }
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(toRenderMessages(history)))
    })
  })

  describe("mixed history", () => {
    const cases = [
      {
        name: "user message then plan then text response",
        history: [
          userBlock("Help me build a feature"),
          ...createPlanCall("Build feature", ["Step 1", "Step 2"]),
          textBlock("I'll help you with that"),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(3)
          expect(messages[0].type).toBe("text")
          expect(messages[1].type).toBe("plan")
          expect(messages[2].type).toBe("text")
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(toRenderMessages(history)))
    })
  })
})
