import { describe, it, expect } from "vitest"
import { toDeepSourceContent, type ToDeepSourceFn } from "./parse"
import { calloutToDeepSource } from "~/domain/data-blocks/callout/definition"

const converters: Record<string, ToDeepSourceFn> = {
  "json-callout": calloutToDeepSource,
}

describe("toDeepSourceContent", () => {
  const cases = [
    {
      name: "strips json-attributes singleton",
      input: [
        "# Title",
        "",
        "```json-attributes",
        '{"tags":["t1"],"type":"manual"}',
        "```",
        "",
        "Some prose here.",
      ].join("\n"),
      expected: "# Title\n\nSome prose here.",
    },
    {
      name: "converts json-callout to analysis tag",
      input: [
        "# Codes",
        "",
        "```json-callout",
        '{"id":"callout-abc123","type":"codebook-code","title":"Norm-based justification","content":"Shared norms invoked as justification.","color":"blue","collapsed":false}',
        "```",
        "",
        "Some context.",
      ].join("\n"),
      expected:
        '# Codes\n\n<analysis analysis_source_id="callout-abc123">\n# Norm-based justification\nShared norms invoked as justification.\n</analysis>\n\nSome context.',
    },
    {
      name: "strips json-annotations",
      input: [
        "Prose before.",
        "",
        "```json-annotations",
        '{"annotations":[{"text":"foo","reason":"bar"}]}',
        "```",
      ].join("\n"),
      expected: "Prose before.",
    },
    {
      name: "mixed: keeps callout, strips rest",
      input: [
        "# Doc",
        "",
        "```json-attributes",
        '{"tags":[]}',
        "```",
        "",
        "Intro text.",
        "",
        "```json-callout",
        '{"id":"callout-x","type":"codebook-code","title":"My Code","content":"Definition here.\\nSecond line.","color":"red","collapsed":false}',
        "```",
        "",
        "```json-annotations",
        '{"annotations":[]}',
        "```",
      ].join("\n"),
      expected:
        '# Doc\n\nIntro text.\n\n<analysis analysis_source_id="callout-x">\n# My Code\nDefinition here.\nSecond line.\n</analysis>',
    },
    {
      name: "plain markdown passes through",
      input: "# Just prose\n\nNo code blocks here.",
      expected: "# Just prose\n\nNo code blocks here.",
    },
    {
      name: "malformed callout JSON is dropped",
      input: ["Before.", "", "```json-callout", "not valid json", "```", "", "After."].join("\n"),
      expected: "Before.\n\nAfter.",
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => expect(toDeepSourceContent(input, converters)).toBe(expected))
  })
})
