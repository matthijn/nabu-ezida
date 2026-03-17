import { describe, it, expect } from "vitest"
import { stripAttributesBlock } from "./markdown"

describe("stripAttributesBlock", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "strips attributes block from content",
      input: `# Title

\`\`\`json-attributes
{"tags": ["interview"]}
\`\`\`

Content here.`,
      expected: `# Title

Content here.`,
    },
    {
      name: "handles content without attributes block",
      input: "# Title\n\nJust content.",
      expected: "# Title\n\nJust content.",
    },
    {
      name: "strips multiple attributes blocks",
      input: `\`\`\`json-attributes
{"a": 1}
\`\`\`

Text.

\`\`\`json-attributes
{"b": 2}
\`\`\``,
      expected: "Text.",
    },
    {
      name: "preserves other code blocks",
      input: `\`\`\`json-attributes
{"tags": []}
\`\`\`

\`\`\`javascript
const x = 1
\`\`\``,
      expected: `\`\`\`javascript
const x = 1
\`\`\``,
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(stripAttributesBlock(input)).toBe(expected)
  })
})
