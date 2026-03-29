import { getAttributes } from "../selectors"

export const getDocumentType = (raw: string): string | undefined => getAttributes(raw)?.type

export const getDocumentSource = (raw: string): string | undefined => getAttributes(raw)?.source

export const getDocumentSubject = (raw: string): string | undefined => getAttributes(raw)?.subject

export const hasClassification = (raw: string): boolean => {
  const attrs = getAttributes(raw)
  return attrs?.type !== undefined || attrs?.source !== undefined || attrs?.subject !== undefined
}
