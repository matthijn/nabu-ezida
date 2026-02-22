import { describe, test, expect } from "vitest"
import { resolveEntityLink, type ResolvedLink, type EntityIcons } from "./resolve"

const StubIcon = () => null

const icons: EntityIcons = {
  text: StubIcon,
}

const fileWithAnnotation = (id: string, text: string, color: string): string =>
  `# Doc\n\n\`\`\`json-attributes\n${JSON.stringify({ annotations: [{ id, text, color, reason: "test" }] })}\n\`\`\``

const fileWithCallout = (id: string, title: string, color: string): string =>
  `# Codebook\n\n\`\`\`json-callout\n${JSON.stringify({ id, type: "codebook-code", title, content: "detail", color, collapsed: false })}\n\`\`\``

describe("resolveEntityLink", () => {
  const cases: { name: string; href: string; files: Record<string, string>; expected: Partial<ResolvedLink> | null }[] = [
    {
      name: "returns null for non-file link",
      href: "https://example.com",
      files: {},
      expected: null,
    },
    {
      name: "resolves annotation ref",
      href: "file://annotation_abc",
      files: { "doc.md": fileWithAnnotation("annotation_abc", "hello world", "red") },
      expected: {
        kind: "annotation",
        colors: { text: "var(--red-11)", icon: "var(--red-9)", background: "var(--red-3)", backgroundHover: "var(--red-4)" },
        url: "/project/proj1/file/doc.md?entity=annotation_abc",
        label: "hello world",
      },
    },
    {
      name: "returns null for missing annotation",
      href: "file://annotation_missing",
      files: { "doc.md": "# Empty" },
      expected: null,
    },
    {
      name: "resolves callout ref",
      href: "file://callout_xyz",
      files: { "codebook.md": fileWithCallout("callout_xyz", "My Code", "blue") },
      expected: {
        kind: "callout",
        colors: { text: "var(--blue-11)", icon: "var(--blue-9)", background: "var(--blue-3)", backgroundHover: "var(--blue-4)" },
        url: "/project/proj1/file/codebook.md?entity=callout_xyz",
        label: "My Code",
      },
    },
    {
      name: "returns null for missing callout",
      href: "file://callout_missing",
      files: {},
      expected: null,
    },
    {
      name: "resolves text ref without spotlight",
      href: "file://my-doc",
      files: {},
      expected: {
        kind: "text",
        colors: { text: "var(--color-brand-700)", icon: "var(--color-brand-600)", background: "var(--color-brand-100)", backgroundHover: "var(--color-brand-200)" },
        url: "/project/proj1/file/my-doc",
        label: "my-doc",
      },
    },
    {
      name: "resolves text ref with spotlight",
      href: "file://my-doc/hello%20world",
      files: {},
      expected: {
        kind: "text",
        colors: { text: "var(--color-brand-700)", icon: "var(--color-brand-600)", background: "var(--color-brand-100)", backgroundHover: "var(--color-brand-200)" },
        url: "/project/proj1/file/my-doc?spotlight=hello%20world",
        label: "my-doc",
      },
    },
  ]

  test.each(cases)("$name", ({ href, files, expected }) => {
    const result = resolveEntityLink(href, files, "proj1", icons)
    if (expected === null) {
      expect(result).toBeNull()
    } else {
      expect(result).toMatchObject(expected)
    }
  })
})
