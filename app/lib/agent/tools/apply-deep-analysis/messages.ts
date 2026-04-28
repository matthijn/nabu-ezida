import { z } from "zod"
import type { SourceFile } from "./def"
import {
  stripBlocksByLanguage,
  toDeepSourceContent,
  type ToDeepSourceFn,
} from "~/lib/data-blocks/parse"
import { stripBoundaryComments } from "~/lib/patch/resolve/json-boundary"
import { calloutToDeepSource } from "~/domain/data-blocks/callout/definition"
import { getCallouts } from "~/domain/data-blocks/callout/selectors"
import { prepareTargetContent, numberSection } from "./format"

interface Message {
  type: "message"
  role: "system" | "user"
  content: string
}

export interface ScopedSources {
  framework: string[]
  dimension: string[]
}

export const buildFindResultSchema = (validIds: string[]) =>
  z.object({
    results: z.array(
      z.object({
        start: z.number().int().min(1),
        end: z.number().int().min(1),
        analysis_source_id:
          validIds.length > 0 ? z.enum(validIds as [string, ...string[]]) : z.string(),
      })
    ),
  })

export const ReasonResultSchema = z.object({
  results: z.array(
    z.object({
      item: z.number().int().min(1),
      reason: z.string(),
    })
  ),
})

export const ReviewResultSchema = z.object({
  results: z.array(
    z.object({
      item: z.number().int().min(1),
      review: z.string(),
    })
  ),
})

export const partitionSources = (files: SourceFile[]): ScopedSources => ({
  framework: files.filter((f) => f.scope === "framework").map((f) => f.path),
  dimension: files.filter((f) => f.scope === "dimension").map((f) => f.path),
})

export const buildCallList = ({ framework, dimension }: ScopedSources): ScopedSources[] =>
  dimension.length === 0
    ? [{ framework, dimension: [] }]
    : dimension.map((p) => ({ framework, dimension: [p] }))

export type ContentResolver = (path: string) => string | undefined

const SINGLETON_LANGUAGES = ["json-attributes", "json-annotations", "json-settings"]

const stripSingletons = (content: string): string =>
  SINGLETON_LANGUAGES.reduce((acc, lang) => stripBlocksByLanguage(acc, lang), content)

const deepSourceConverters: Record<string, ToDeepSourceFn> = {
  "json-callout": calloutToDeepSource,
}

const prepareSourceContent = (raw: string): string =>
  toDeepSourceContent(stripSingletons(stripBoundaryComments(raw)), deepSourceConverters)

const resolveSource = (path: string, resolve: ContentResolver): string | null => {
  const raw = resolve(path)
  if (raw === undefined) return null
  const content = prepareSourceContent(raw)
  return content || null
}

export const extractSourceIds = (
  { framework, dimension }: ScopedSources,
  resolve: ContentResolver
): string[] =>
  [...framework, ...dimension].flatMap((path) => {
    const raw = resolve(path)
    return raw ? getCallouts(raw).map((c) => c.id) : []
  })

export const buildSourceMessages = (
  { framework, dimension }: ScopedSources,
  resolve: ContentResolver
): Message[] =>
  [...framework, ...dimension].reduce<Message[]>((msgs, path) => {
    const content = resolveSource(path, resolve)
    return content ? [...msgs, { type: "message", role: "system", content }] : msgs
  }, [])

const buildSectionMessage = (section: string): string => `<target>\n${section}\n</target>`

const buildLeadingContextMessage = (context: string): string =>
  `<context type="preceding">\n${context}\n</context>`

const buildTrailingContextMessage = (context: string): string =>
  `<context type="following">\n${context}\n</context>`

const buildEnvelope = (
  section: string,
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver,
  callToAction: string
): Message[] => {
  const messages: Message[] = [...buildSourceMessages(sources, resolve)]
  if (leadingCtx) {
    messages.push({
      type: "message",
      role: "system",
      content: buildLeadingContextMessage(leadingCtx),
    })
  }
  messages.push({ type: "message", role: "system", content: buildSectionMessage(section) })
  if (trailingCtx) {
    messages.push({
      type: "message",
      role: "system",
      content: buildTrailingContextMessage(trailingCtx),
    })
  }
  messages.push({ type: "message", role: "user", content: callToAction })
  return messages
}

const FIND_CTA =
  "Analyze the numbered sentences against the source definitions. Return matching spans as JSON."

const REASON_CTA = "Write a reason for each coded section. Return results as JSON."

const REVIEW_CTA = "Write a review note for each flagged section. Return results as JSON."

export const buildFindMessages = (
  numbered: string,
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Message[] => buildEnvelope(numbered, sources, leadingCtx, trailingCtx, resolve, FIND_CTA)

export const buildReasonMessages = (
  presented: string,
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Message[] => buildEnvelope(presented, sources, leadingCtx, trailingCtx, resolve, REASON_CTA)

export const buildReviewMessages = (
  presented: string,
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Message[] => buildEnvelope(presented, sources, leadingCtx, trailingCtx, resolve, REVIEW_CTA)

export interface FindCallResult {
  messages: Message[]
  sentences: string[]
}

export const buildFindCall = (
  rawTarget: string,
  sources: ScopedSources,
  resolve: ContentResolver,
  leadingCtx = "",
  trailingCtx = ""
): FindCallResult => {
  const section = prepareTargetContent(rawTarget)
  const { sentences, numbered } = numberSection(section)
  const messages = buildFindMessages(numbered, sources, leadingCtx, trailingCtx, resolve)
  return { messages, sentences }
}
