import { describe, expect, it } from "vitest"
import { block } from "~/lib/data-blocks/test-helpers"
import { fnvHash } from "~/lib/utils/hash"
import { contentHash, shouldReclassify } from "./selectors"

const attrs = (meta: Record<string, unknown>): string =>
  block("json-attributes", JSON.stringify(meta))

const annotations = (items: unknown[]): string => block("json-annotations", JSON.stringify(items))

const settings = (data: Record<string, unknown>): string =>
  block("json-settings", JSON.stringify(data))

const withMeta = (prose: string, meta: Record<string, unknown>): string =>
  `${prose}\n\n${attrs(meta)}`

const PROSE = "# Doc\n\nSome words here."
const PROSE_HASH = fnvHash(PROSE)

describe("contentHash", () => {
  const cases: { name: string; a: string; b: string; shouldMatch: boolean }[] = [
    {
      name: "matches across presence/absence of attributes block",
      a: PROSE,
      b: withMeta(PROSE, { type: "t", subject: "x", hash: "stale" }),
      shouldMatch: true,
    },
    {
      name: "matches across presence/absence of annotations block",
      a: PROSE,
      b: `${PROSE}\n\n${annotations([{ id: "a1", text: "note" }])}`,
      shouldMatch: true,
    },
    {
      name: "matches across presence/absence of settings block",
      a: PROSE,
      b: `${PROSE}\n\n${settings({ tags: [] })}`,
      shouldMatch: true,
    },
    {
      name: "matches when all singleton blocks present",
      a: PROSE,
      b: `${PROSE}\n\n${attrs({ type: "t" })}\n\n${annotations([])}\n\n${settings({})}`,
      shouldMatch: true,
    },
    {
      name: "changes when prose changes",
      a: PROSE,
      b: `${PROSE} more words`,
      shouldMatch: false,
    },
  ]

  it.each(cases)("$name", ({ a, b, shouldMatch }) => {
    if (shouldMatch) {
      expect(contentHash(a)).toBe(contentHash(b))
    } else {
      expect(contentHash(a)).not.toBe(contentHash(b))
    }
  })
})

describe("shouldReclassify", () => {
  interface Case {
    name: string
    raw: string
    expected: boolean
  }

  const cases: Case[] = [
    {
      name: "no attributes block — must classify",
      raw: PROSE,
      expected: true,
    },
    {
      name: "attributes block without hash (legacy) — must classify",
      raw: withMeta(PROSE, { type: "t", source: "s", subject: "x" }),
      expected: true,
    },
    {
      name: "attributes block with stale hash — must reclassify",
      raw: withMeta(PROSE, { type: "t", source: "s", subject: "x", hash: "deadbeef" }),
      expected: true,
    },
    {
      name: "attributes block with matching hash — skip",
      raw: withMeta(PROSE, { type: "t", source: "s", subject: "x", hash: PROSE_HASH }),
      expected: false,
    },
    {
      name: "matching hash, prose edited — must reclassify",
      raw: withMeta(`${PROSE} edited`, {
        type: "t",
        source: "s",
        subject: "x",
        hash: PROSE_HASH,
      }),
      expected: true,
    },
  ]

  it.each(cases)("$name", ({ raw, expected }) => {
    expect(shouldReclassify(raw)).toBe(expected)
  })
})
