import type { Spotlight } from "~/lib/editor/spotlight"

export type EntityKind = "annotation" | "callout" | "search" | "tag" | "text"

export type EntityRef =
  | { kind: "annotation"; id: string }
  | { kind: "callout"; id: string }
  | { kind: "search"; id: string }
  | { kind: "tag"; id: string }
  | { kind: "text"; documentId: string; spotlight: Spotlight | null }
