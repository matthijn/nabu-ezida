import { getAttributes } from "../selectors"
import { stripAttributesBlock } from "~/lib/markdown/strip-attributes"
import { fnvHash } from "~/lib/utils/hash"

export const getDocumentType = (raw: string): string | undefined => getAttributes(raw)?.type

export const getDocumentSubject = (raw: string): string | undefined => getAttributes(raw)?.subject

export const contentHash = (raw: string): string => fnvHash(stripAttributesBlock(raw))

export const shouldReclassify = (raw: string): boolean =>
  getAttributes(raw)?.hash !== contentHash(raw)
