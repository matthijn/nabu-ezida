import { describe, it, expect } from "vitest"
import { isAnswerSaved, addAnswer, removeAnswer, toggleAnswer, DECISIONS_HEADING } from "./save-answer"

describe("isAnswerSaved", () => {
  const cases = [
    { name: "undefined content", content: undefined, q: "Which DB?", a: "Postgres", expected: false },
    { name: "empty content", content: "", q: "Which DB?", a: "Postgres", expected: false },
    { name: "no heading", content: "# Notes\nsome text", q: "Which DB?", a: "Postgres", expected: false },
    { name: "heading but no match", content: `${DECISIONS_HEADING}\n\n- **Which DB?** → MySQL\n`, q: "Which DB?", a: "Postgres", expected: false },
    { name: "exact match", content: `${DECISIONS_HEADING}\n\n- **Which DB?** → Postgres\n`, q: "Which DB?", a: "Postgres", expected: true },
    { name: "match among others", content: `${DECISIONS_HEADING}\n\n- **Auth?** → JWT\n- **Which DB?** → Postgres\n`, q: "Which DB?", a: "Postgres", expected: true },
  ]
  cases.forEach(({ name, content, q, a, expected }) =>
    it(name, () => expect(isAnswerSaved(content, q, a)).toBe(expected))
  )
})

describe("addAnswer", () => {
  const cases = [
    { name: "to undefined", content: undefined, q: "Which DB?", a: "Postgres", includes: "- **Which DB?** → Postgres" },
    { name: "to empty", content: "", q: "Which DB?", a: "Postgres", includes: "- **Which DB?** → Postgres" },
    { name: "creates heading when missing", content: "# Notes\nsome text\n", q: "Which DB?", a: "Postgres", includes: DECISIONS_HEADING },
    { name: "appends under existing heading", content: `${DECISIONS_HEADING}\n\n- **Auth?** → JWT\n`, q: "Which DB?", a: "Postgres", includes: "- **Which DB?** → Postgres" },
    { name: "idempotent", content: `${DECISIONS_HEADING}\n\n- **Which DB?** → Postgres\n`, q: "Which DB?", a: "Postgres", exact: `${DECISIONS_HEADING}\n\n- **Which DB?** → Postgres\n` },
  ]
  cases.forEach(({ name, content, q, a, includes, exact }) =>
    it(name, () => {
      const result = addAnswer(content, q, a)
      if (exact !== undefined) expect(result).toBe(exact)
      if (includes !== undefined) expect(result).toContain(includes)
    })
  )

  it("preserves content after next heading", () => {
    const content = `${DECISIONS_HEADING}\n\n- **Auth?** → JWT\n\n## Other\nstuff\n`
    const result = addAnswer(content, "Which DB?", "Postgres")
    expect(result).toContain("- **Which DB?** → Postgres")
    expect(result).toContain("## Other\nstuff")
  })
})

describe("removeAnswer", () => {
  const cases = [
    { name: "from undefined", content: undefined, q: "X?", a: "Y", expected: "" },
    { name: "removes matching entry", content: `${DECISIONS_HEADING}\n\n- **X?** → Y\n- **A?** → B\n`, q: "X?", a: "Y" },
    { name: "no-op when not present", content: `${DECISIONS_HEADING}\n\n- **A?** → B\n`, q: "X?", a: "Y" },
  ]
  cases.forEach(({ name, content, q, a, expected }) =>
    it(name, () => {
      const result = removeAnswer(content, q, a)
      if (expected !== undefined) {
        expect(result).toBe(expected)
      } else {
        expect(result).not.toContain(`- **${q}** → ${a}`)
      }
    })
  )
})

describe("toggleAnswer", () => {
  const cases = [
    { name: "adds when not saved", content: undefined, q: "X?", a: "Y", savedAfter: true },
    { name: "removes when saved", content: `${DECISIONS_HEADING}\n\n- **X?** → Y\n`, q: "X?", a: "Y", savedAfter: false },
  ]
  cases.forEach(({ name, content, q, a, savedAfter }) =>
    it(name, () => {
      const result = toggleAnswer(content, q, a)
      expect(result.includes(`- **${q}** → ${a}`)).toBe(savedAfter)
    })
  )
})
