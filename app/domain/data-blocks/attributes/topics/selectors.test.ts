import { describe, expect, it } from "vitest"
import { block } from "~/lib/data-blocks/test-helpers"
import { fnvHash } from "~/lib/utils/hash"
import { contentHash, shouldReclassify } from "./selectors"

const attrs = (meta: Record<string, unknown>): string =>
  block("json-attributes", JSON.stringify(meta))

const withMeta = (prose: string, meta: Record<string, unknown>): string =>
  `${prose}\n\n${attrs(meta)}`

const PROSE = "# Doc\n\nSome words here."
const PROSE_HASH = fnvHash(PROSE)

describe("contentHash", () => {
  it("matches across presence/absence of attributes block", () => {
    const bare = PROSE
    const withBlock = withMeta(PROSE, { type: "t", source: "s", subject: "x", hash: "stale" })
    expect(contentHash(bare)).toBe(contentHash(withBlock))
  })

  it("changes when prose changes", () => {
    expect(contentHash(PROSE)).not.toBe(contentHash(`${PROSE} more words`))
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
