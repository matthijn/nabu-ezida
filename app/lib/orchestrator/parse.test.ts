import { describe, expect, it } from "vitest"
import { parseResponse } from "./parse"
import type { ToolCall } from "~/lib/llm"

describe("parseResponse", () => {
  const cases = [
    {
      name: "plain text returns text type",
      content: "Hello, how can I help you?",
      toolCalls: undefined,
      expected: { type: "text", content: "Hello, how can I help you?" },
    },
    {
      name: "JSON task with description field",
      content: '```json\n{"type": "task", "description": "Build a login form"}\n```',
      toolCalls: undefined,
      expected: { type: "task", task: "Build a login form" },
    },
    {
      name: "JSON step_complete in code block",
      content: '```json\n{"type": "step_complete", "summary": "Created the component successfully"}\n```',
      toolCalls: undefined,
      expected: { type: "step_complete", summary: "Created the component successfully" },
    },
    {
      name: "JSON stuck in code block",
      content: '```json\n{"type": "stuck", "question": "Which database should I use?"}\n```',
      toolCalls: undefined,
      expected: { type: "stuck", question: "Which database should I use?" },
    },
    {
      name: "JSON plan with object steps",
      content: '```json\n{"type": "plan", "task": "Build form", "steps": [{"description": "Step 1"}, {"description": "Step 2"}]}\n```',
      toolCalls: undefined,
      expectedType: "plan",
      expectedPlanTask: "Build form",
      expectedStepCount: 2,
    },
    {
      name: "OpenAI tool call takes precedence",
      content: "Some text content",
      toolCalls: [
        {
          id: "call_123",
          function: { name: "read_file", arguments: '{"path": "/src/index.ts"}' },
        },
      ] as ToolCall[],
      expected: {
        type: "tool_call",
        name: "read_file",
        id: "call_123",
        args: { path: "/src/index.ts" },
      },
    },
    {
      name: "OpenAI tool call with invalid JSON args returns empty object",
      content: "Some text",
      toolCalls: [
        {
          id: "call_456",
          function: { name: "some_tool", arguments: "not valid json" },
        },
      ] as ToolCall[],
      expected: {
        type: "tool_call",
        name: "some_tool",
        id: "call_456",
        args: {},
      },
    },
    {
      name: "stuck with default question",
      content: '```json\n{"type": "stuck"}\n```',
      toolCalls: undefined,
      expected: { type: "stuck", question: "What should I do?" },
    },
    {
      name: "invalid JSON in code block falls through to text",
      content: '```json\n{invalid json}\n```',
      toolCalls: undefined,
      expected: { type: "text", content: '```json\n{invalid json}\n```' },
    },
  ]

  cases.forEach(({ name, content, toolCalls, expected, expectedType, expectedPlanTask, expectedStepCount }) => {
    it(name, () => {
      const result = parseResponse(content, toolCalls)

      if (expected) {
        expect(result).toEqual(expected)
      } else if (expectedType === "plan") {
        expect(result.type).toBe("plan")
        if (result.type === "plan") {
          expect(result.plan.task).toBe(expectedPlanTask)
          expect(result.plan.steps).toHaveLength(expectedStepCount!)
        }
      }
    })
  })

  const errorCases = [
    {
      name: "task without description throws",
      content: '```json\n{"type": "task", "task": "old format"}\n```',
      expectedError: "task requires description field",
    },
    {
      name: "plan without task throws",
      content: '```json\n{"type": "plan", "steps": [{"description": "step"}]}\n```',
      expectedError: "plan requires task field",
    },
    {
      name: "plan without steps throws",
      content: '```json\n{"type": "plan", "task": "do thing"}\n```',
      expectedError: "plan requires steps array",
    },
    {
      name: "plan with string steps throws",
      content: '```json\n{"type": "plan", "task": "do thing", "steps": ["step 1"]}\n```',
      expectedError: "step 0 requires description field",
    },
  ]

  errorCases.forEach(({ name, content, expectedError }) => {
    it(name, () => {
      expect(() => parseResponse(content)).toThrow(expectedError)
    })
  })
})
