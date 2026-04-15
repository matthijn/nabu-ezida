import { describe, expect, it } from "vitest"
import {
  detectBlockTouches,
  formatBlockTouchErrors,
  detectBlockCreations,
  formatBlockCreationErrors,
  type BlockTouch,
} from "./block-guard"

const calloutBlock = (id: string): string =>
  [
    "```json-callout",
    "{",
    `\t"id": "${id}",`,
    '\t"type": "codebook",',
    '\t"color": "blue",',
    '\t"content": "Some content."',
    "}",
    "```",
  ].join("\n")

const settingsBlock = (): string =>
  ["```json-settings", "{", '\t"view": "grid"', "}", "```"].join("\n")

const fileWithCallout = [
  "# Document",
  "",
  "Some text here.",
  "",
  calloutBlock("code_abc"),
  "",
  "More text.",
].join("\n")

const fileWithMultipleBlocks = [
  "# Document",
  "",
  settingsBlock(),
  "",
  "Paragraph one.",
  "",
  calloutBlock("code_abc"),
  "",
  "Paragraph two.",
  "",
  calloutBlock("code_def"),
  "",
  "End.",
].join("\n")

describe("detectBlockTouches", () => {
  const cases: { name: string; content: string; diff: string; expected: BlockTouch[] }[] = [
    {
      name: "hunk touching callout block returns touch with id",
      content: fileWithCallout,
      diff: [
        "@@",
        '\t"id": "code_abc",',
        '\t"type": "codebook",',
        '-\t"color": "blue",',
        '+\t"color": "red",',
        '\t"content": "Some content."',
      ].join("\n"),
      expected: [{ language: "json-callout", shortName: "callout", blockId: "code_abc" }],
    },
    {
      name: "hunk outside any block returns empty",
      content: fileWithCallout,
      diff: ["@@", "-Some text here.", "+Updated text."].join("\n"),
      expected: [],
    },
    {
      name: "pure append (no context) returns empty",
      content: fileWithCallout,
      diff: "@@\n+\n+New paragraph.",
      expected: [],
    },
    {
      name: "hunk touching singleton settings block returns touch without id",
      content: fileWithMultipleBlocks,
      diff: ["@@", '-\t"view": "grid"', '+\t"view": "list"'].join("\n"),
      expected: [{ language: "json-settings", shortName: "settings", blockId: undefined }],
    },
    {
      name: "hunk spanning fence boundary returns touch",
      content: fileWithCallout,
      diff: [
        "@@",
        "-```json-callout",
        "-{",
        '-\t"id": "code_abc",',
        "+```json-callout",
        "+{",
        '+\t"id": "code_abc",',
      ].join("\n"),
      expected: [{ language: "json-callout", shortName: "callout", blockId: "code_abc" }],
    },
    {
      name: "two hunks touching different blocks returns both",
      content: fileWithMultipleBlocks,
      diff: [
        "@@",
        '-\t"view": "grid"',
        '+\t"view": "list"',
        "@@",
        '\t"id": "code_abc",',
        '\t"type": "codebook",',
        '-\t"color": "blue",',
        '+\t"color": "red",',
        '\t"content": "Some content."',
      ].join("\n"),
      expected: [
        { language: "json-settings", shortName: "settings", blockId: undefined },
        { language: "json-callout", shortName: "callout", blockId: "code_abc" },
      ],
    },
    {
      name: "two hunks touching same block returns one touch",
      content: fileWithCallout,
      diff: [
        "@@",
        '\t"id": "code_abc",',
        '\t"type": "codebook",',
        '-\t"color": "blue",',
        '+\t"color": "red",',
        '\t"content": "Some content."',
        "@@",
        '\t"color": "red",',
        '-\t"content": "Some content."',
        '+\t"content": "Updated."',
      ].join("\n"),
      expected: [{ language: "json-callout", shortName: "callout", blockId: "code_abc" }],
    },
    {
      name: "mixed hunks: one in block, one outside — returns only the block touch",
      content: fileWithCallout,
      diff: [
        "@@",
        "-Some text here.",
        "+Updated text.",
        "@@",
        '\t"id": "code_abc",',
        '\t"type": "codebook",',
        '-\t"color": "blue",',
        '+\t"color": "red",',
        '\t"content": "Some content."',
      ].join("\n"),
      expected: [{ language: "json-callout", shortName: "callout", blockId: "code_abc" }],
    },
    {
      name: "no json blocks in file returns empty",
      content: "# Document\n\nJust plain text.",
      diff: ["@@", "-Just plain text.", "+Updated text."].join("\n"),
      expected: [],
    },
    {
      name: "non-json code block is ignored",
      content: "# Doc\n\n```typescript\nconst x = 1\n```\n\nText.",
      diff: ["@@", "-const x = 1", "+const x = 2"].join("\n"),
      expected: [],
    },
    {
      name: "block content as anchor context for prose edit returns empty",
      content: fileWithCallout,
      diff: [
        "@@",
        '\t"content": "Some content."',
        "}",
        "```",
        "-More text.",
        "+Different text.",
      ].join("\n"),
      expected: [],
    },
    {
      name: "full block delete (all removes) returns empty",
      content: fileWithCallout,
      diff: [
        "@@",
        "Some text here.",
        "",
        "-```json-callout",
        "-{",
        '-\t"id": "code_abc",',
        '-\t"type": "codebook",',
        '-\t"color": "blue",',
        '-\t"content": "Some content."',
        "-}",
        "-```",
        "",
        "More text.",
      ].join("\n"),
      expected: [],
    },
    {
      name: "partial block delete (some lines removed, some kept) returns touch",
      content: fileWithCallout,
      diff: [
        "@@",
        '\t"id": "code_abc",',
        '\t"type": "codebook",',
        '-\t"color": "blue",',
        '-\t"content": "Some content."',
        "}",
      ].join("\n"),
      expected: [{ language: "json-callout", shortName: "callout", blockId: "code_abc" }],
    },
    {
      name: "full block delete with surrounding prose edit returns empty",
      content: fileWithCallout,
      diff: [
        "@@",
        "-Some text here.",
        "+Before.",
        "",
        "-```json-callout",
        "-{",
        '-\t"id": "code_abc",',
        '-\t"type": "codebook",',
        '-\t"color": "blue",',
        '-\t"content": "Some content."',
        "-}",
        "-```",
        "",
        "-More text.",
        "+After.",
      ].join("\n"),
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ content, diff, expected }) => {
    expect(detectBlockTouches(content, diff)).toEqual(expected)
  })
})

describe("formatBlockTouchErrors", () => {
  const cases: { name: string; touches: BlockTouch[]; expected: string }[] = [
    {
      name: "block with id",
      touches: [{ language: "json-callout", shortName: "callout", blockId: "code_abc" }],
      expected:
        '`json-callout` block "code_abc" is read-only for this tool. Use `patch_callout` or `delete_callout` for targeted changes to block "code_abc".',
    },
    {
      name: "singleton block without id",
      touches: [{ language: "json-settings", shortName: "settings", blockId: undefined }],
      expected:
        "`json-settings` block is read-only for this tool. Use `patch_settings` or `delete_settings` for targeted changes.",
    },
    {
      name: "multiple blocks joined",
      touches: [
        { language: "json-settings", shortName: "settings", blockId: undefined },
        { language: "json-callout", shortName: "callout", blockId: "code_abc" },
      ],
      expected: [
        "`json-settings` block is read-only for this tool. Use `patch_settings` or `delete_settings` for targeted changes.",
        '`json-callout` block "code_abc" is read-only for this tool. Use `patch_callout` or `delete_callout` for targeted changes to block "code_abc".',
      ].join("\n"),
    },
  ]

  it.each(cases)("$name", ({ touches, expected }) => {
    expect(formatBlockTouchErrors(touches)).toBe(expected)
  })
})

describe("detectBlockCreations", () => {
  const cases: { name: string; diff: string; expected: string[] }[] = [
    {
      name: "added callout fence detected",
      diff: [
        "@@",
        "Some prose.",
        "+",
        "+```json-callout",
        "+{",
        '+\t"id": "callout_x"',
        "+}",
        "+```",
      ].join("\n"),
      expected: ["json-callout"],
    },
    {
      name: "added chart fence detected",
      diff: ["@@", "+```json-chart", "+{}", "+```"].join("\n"),
      expected: ["json-chart"],
    },
    {
      name: "multiple block types in one diff",
      diff: [
        "@@",
        "+```json-callout",
        "+{}",
        "+```",
        "+",
        "+```json-annotations",
        "+{}",
        "+```",
      ].join("\n"),
      expected: ["json-callout", "json-annotations"],
    },
    {
      name: "removed fence not detected",
      diff: ["@@", "-```json-callout", "-{}", "-```"].join("\n"),
      expected: [],
    },
    {
      name: "context fence not detected",
      diff: ["@@", "```json-callout", "-old line", "+new line", "```"].join("\n"),
      expected: [],
    },
    {
      name: "non-block language fence ignored",
      diff: ["@@", "+```typescript", "+const x = 1", "+```"].join("\n"),
      expected: [],
    },
    {
      name: "no add lines returns empty",
      diff: ["@@", "Some context.", "-removed."].join("\n"),
      expected: [],
    },
    {
      name: "duplicate fences deduplicated",
      diff: ["@@", "+```json-callout", "+{}", "+```", "+```json-callout", "+{}", "+```"].join("\n"),
      expected: ["json-callout"],
    },
  ]

  it.each(cases)("$name", ({ diff, expected }) => {
    expect(detectBlockCreations(diff)).toEqual(expected)
  })
})

describe("formatBlockCreationErrors", () => {
  const cases: { name: string; languages: string[]; expected: string }[] = [
    {
      name: "non-singleton names add tool",
      languages: ["json-callout"],
      expected:
        "Cannot create `json-callout` block with this tool. Use `add_callout` to place the block, then `patch_callout` to populate it.",
    },
    {
      name: "singleton names patch tool only",
      languages: ["json-settings"],
      expected:
        "Cannot create `json-settings` block with this tool. Use `patch_settings` to populate it.",
    },
    {
      name: "multiple languages joined",
      languages: ["json-callout", "json-settings"],
      expected: [
        "Cannot create `json-callout` block with this tool. Use `add_callout` to place the block, then `patch_callout` to populate it.",
        "Cannot create `json-settings` block with this tool. Use `patch_settings` to populate it.",
      ].join("\n"),
    },
  ]

  it.each(cases)("$name", ({ languages, expected }) => {
    expect(formatBlockCreationErrors(languages)).toBe(expected)
  })
})
