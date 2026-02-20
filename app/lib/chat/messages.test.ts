import { describe, expect, it, beforeEach } from "vitest"
import type { Block } from "~/lib/agent"
import { toRenderMessages, extractAskMessages, isWaitingForAsk, type RenderMessage, type AskMessage } from "./messages"
import {
  createPlanCall,
  completeStepCall,
  cancelCall,
  askCall,
  askCallPending,
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

describe("extractAskMessages", () => {
  const cases = [
    {
      name: "no ask blocks returns empty",
      history: [userBlock("Hello"), textBlock("Hi")],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toEqual([])
        expect(result.consumedUserIndices.size).toBe(0)
      },
    },
    {
      name: "pending single question has selected null",
      history: [...askCallPending([{ question: "Pick one", options: ["A", "B"] }])],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toHaveLength(1)
        expect(result.messages[0].message.question).toBe("Pick one")
        expect(result.messages[0].message.options).toEqual(["A", "B"])
        expect(result.messages[0].message.selected).toBeNull()
      },
    },
    {
      name: "answered single question has selected from answers array",
      history: [...askCall([{ question: "Pick one", options: ["A", "B"] }], ["A"])],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toHaveLength(1)
        expect(result.messages[0].message.selected).toBe("A")
      },
    },
    {
      name: "consumed user blocks between ask and result are tracked",
      history: [...askCall([{ question: "Pick", options: ["X", "Y"] }], ["X"])],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.consumedUserIndices.size).toBe(1)
        expect(result.consumedUserIndices.has(1)).toBe(true)
      },
    },
    {
      name: "multiple separate ask calls all extracted",
      history: [
        ...askCall([{ question: "Q1", options: ["A", "B"] }], ["A"]),
        ...askCall([{ question: "Q2", options: ["C", "D"] }], ["D"]),
      ],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toHaveLength(2)
        expect(result.messages[0].message.question).toBe("Q1")
        expect(result.messages[0].message.selected).toBe("A")
        expect(result.messages[1].message.question).toBe("Q2")
        expect(result.messages[1].message.selected).toBe("D")
      },
    },
    {
      name: "multi-question call answered produces N messages with selections",
      history: [...askCall(
        [
          { question: "Color?", options: ["Red", "Blue"] },
          { question: "Size?", options: ["S", "M", "L"] },
        ],
        ["Red", "M"],
      )],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toHaveLength(2)
        expect(result.messages[0].message).toEqual({ type: "ask", question: "Color?", options: ["Red", "Blue"], selected: "Red" })
        expect(result.messages[1].message).toEqual({ type: "ask", question: "Size?", options: ["S", "M", "L"], selected: "M" })
        expect(result.consumedUserIndices.size).toBe(2)
      },
    },
    {
      name: "multi-question pending shows only first question",
      history: [...askCallPending([
        { question: "Color?", options: ["Red", "Blue"] },
        { question: "Size?", options: ["S", "M", "L"] },
      ])],
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toHaveLength(1)
        expect(result.messages[0].message.question).toBe("Color?")
        expect(result.messages[0].message.selected).toBeNull()
      },
    },
    {
      name: "multi-question partially answered shows answered + current",
      history: (() => {
        const id = "99"
        return [
          { type: "tool_call" as const, calls: [{ id, name: "ask", args: { questions: [
            { question: "Q1", options: ["A", "B"] },
            { question: "Q2", options: ["C", "D"] },
            { question: "Q3", options: ["E", "F"] },
          ] } }] },
          { type: "user" as const, content: "A" },
        ]
      })(),
      check: (result: ReturnType<typeof extractAskMessages>) => {
        expect(result.messages).toHaveLength(2)
        expect(result.messages[0].message.question).toBe("Q1")
        expect(result.messages[0].message.selected).toBe("A")
        expect(result.messages[1].message.question).toBe("Q2")
        expect(result.messages[1].message.selected).toBeNull()
      },
    },
  ]

  cases.forEach(({ name, history, check }) => {
    it(name, () => check(extractAskMessages(history as Block[])))
  })
})

describe("isWaitingForAsk", () => {
  const cases = [
    {
      name: "no ask blocks returns false",
      history: [userBlock("Hello"), textBlock("Hi")],
      expected: false,
    },
    {
      name: "pending ask returns true",
      history: [...askCallPending([{ question: "Pick one", options: ["A", "B"] }])],
      expected: true,
    },
    {
      name: "answered ask returns false",
      history: [...askCall([{ question: "Pick one", options: ["A", "B"] }], ["A"])],
      expected: false,
    },
    {
      name: "ask followed by text returns false",
      history: [...askCallPending([{ question: "Pick", options: ["A", "B"] }]), textBlock("Continuing")],
      expected: false,
    },
    {
      name: "ask followed by user returns false",
      history: [...askCallPending([{ question: "Pick", options: ["A", "B"] }]), userBlock("My answer")],
      expected: false,
    },
    {
      name: "answered ask then new pending ask returns true",
      history: [
        ...askCall([{ question: "Q1", options: ["A", "B"] }], ["A"]),
        ...askCallPending([{ question: "Q2", options: ["C", "D"] }]),
      ],
      expected: true,
    },
  ]

  cases.forEach(({ name, history, expected }) => {
    it(name, () => {
      expect(isWaitingForAsk(history)).toBe(expected)
    })
  })
})
