import { describe, expect, it } from "vitest"
import type { Block } from "~/lib/agent"
import { toRenderMessages, type RenderMessage } from "./messages"
import {
  createPlanCall,
  completeStepCall,
  abortCall,
  startExplorationCall,
  explorationStepCall,
} from "~/lib/agent/test-helpers"

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
        history: [createPlanCall("Build feature", ["Design", "Implement", "Test"])],
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
          createPlanCall("Task", ["Step 1", "Step 2", "Step 3"]),
          completeStepCall("Done first"),
          completeStepCall("Done second"),
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
          createPlanCall("Task", ["Step 1", "Step 2"]),
          completeStepCall(),
          completeStepCall(),
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
          createPlanCall("Task", ["Step 1", "Step 2", "Step 3"]),
          completeStepCall("Done"),
          abortCall(),
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
        history: [createPlanCall("Task", ["Step 1"]), completeStepCall()],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          expect(messages[0].type).toBe("plan")
        },
      },
      {
        name: "abort does not render as separate message",
        history: [createPlanCall("Task", ["Step 1"]), abortCall()],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          expect(messages[0].type).toBe("plan")
        },
      },
      {
        name: "new plan after abort shows only new plan",
        history: [
          createPlanCall("First task", ["Step A"]),
          abortCall(),
          createPlanCall("Second task", ["Step B"]),
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

  describe("exploration messages", () => {
    const cases = [
      {
        name: "start_exploration renders as exploration message",
        history: [startExplorationCall("How does X work?", "Check docs")],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          expect(messages[0].type).toBe("exploration")
          if (messages[0].type === "exploration") {
            expect(messages[0].exploration.question).toBe("How does X work?")
            expect(messages[0].exploration.currentDirection).toBe("Check docs")
            expect(messages[0].exploration.findings).toHaveLength(0)
          }
        },
      },
      {
        name: "exploration_step adds findings",
        history: [
          startExplorationCall("Question", "Look at A"),
          explorationStepCall("Found info about A", "continue", "Look at B"),
          explorationStepCall("Found info about B", "continue", "Look at C"),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          if (messages[0].type === "exploration") {
            expect(messages[0].exploration.findings).toHaveLength(2)
            expect(messages[0].exploration.findings[0].learned).toBe("Found info about A")
            expect(messages[0].exploration.findings[1].learned).toBe("Found info about B")
            expect(messages[0].exploration.currentDirection).toBe("Look at C")
          }
        },
      },
      {
        name: "exploration with answer decision renders as completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Found the answer", "answer"),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          if (messages[0].type === "exploration") {
            expect(messages[0].completed).toBe(true)
            expect(messages[0].exploration.findings).toHaveLength(1)
          }
        },
      },
      {
        name: "exploration with plan decision renders as completed",
        history: [
          startExplorationCall("Question"),
          explorationStepCall("Ready to plan", "plan"),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(1)
          if (messages[0].type === "exploration") {
            expect(messages[0].completed).toBe(true)
          }
        },
      },
      {
        name: "aborted exploration does not render",
        history: [startExplorationCall("Question"), abortCall()],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(0)
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
          createPlanCall("Build feature", ["Step 1", "Step 2"]),
          textBlock("I'll help you with that"),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(3)
          expect(messages[0].type).toBe("text")
          expect(messages[1].type).toBe("plan")
          expect(messages[2].type).toBe("text")
        },
      },
      {
        name: "exploration followed by plan",
        history: [
          startExplorationCall("What should we do?"),
          explorationStepCall("Found approach", "plan"),
          createPlanCall("Execute approach", ["Do it"]),
        ],
        check: (messages: RenderMessage[]) => {
          expect(messages).toHaveLength(2)
          expect(messages[0].type).toBe("exploration")
          if (messages[0].type === "exploration") {
            expect(messages[0].completed).toBe(true)
          }
          expect(messages[1].type).toBe("plan")
        },
      },
    ]

    cases.forEach(({ name, history, check }) => {
      it(name, () => check(toRenderMessages(history)))
    })
  })
})
