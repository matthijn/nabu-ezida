import type { Spotlight } from "~/domain/spotlight"

export type EntityKind = "annotation" | "callout" | "text"

export type EntityRef =
  | { kind: "annotation"; id: string }
  | { kind: "callout"; id: string }
  | { kind: "text"; documentId: string; spotlight: Spotlight | null }
