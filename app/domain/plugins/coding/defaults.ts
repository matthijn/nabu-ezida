import type { CodingAnnotation } from "./types"

export const sampleAnnotations: CodingAnnotation[] = [
  {
    id: "1",
    text: "Today I conducted three interviews with participants from the target demographic. The sessions revealed interesting patterns in how users approach the onboarding flow.",
    actor: "user",
    color: "blue",
    reason: "Key observation about user behavior patterns",
    payload: {
      type: "coding",
      code_id: "theme-identity",
      confidence: "high",
    },
  },
  {
    id: "2",
    text: "The sessions revealed interesting patterns in how users approach the onboarding flow.",
    actor: "user",
    color: "green",
    reason: "Methodology note",
    payload: {
      type: "coding",
      code_id: "method-interview",
      confidence: "medium",
    },
  },
]

export const initialContent = [
  {
    type: "heading" as const,
    props: { level: 1 as const },
    content: "Research Notes: User Interviews",
  },
  {
    type: "paragraph" as const,
    content: "Today I conducted three interviews with participants from the target demographic. The sessions revealed interesting patterns in how users approach the onboarding flow.",
  },
  {
    type: "heading" as const,
    props: { level: 2 as const },
    content: "Key Findings",
  },
  {
    type: "paragraph" as const,
    content: "Users consistently mentioned feeling overwhelmed by the number of options presented. Several participants suggested a more guided approach would help.",
  },
  {
    type: "bulletListItem" as const,
    content: "Navigation confusion was common in first-time users",
  },
  {
    type: "bulletListItem" as const,
    content: "Most preferred dark mode by default",
  },
  {
    type: "bulletListItem" as const,
    content: "Mobile experience needs improvement",
  },
  {
    type: "paragraph" as const,
    content: "",
  },
]
