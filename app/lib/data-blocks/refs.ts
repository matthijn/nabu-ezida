import type { ValidationError } from "./validate"

interface DanglingReference {
  id: string
  referencedBy: string[]
}

const REFS_BLOCK = "_refs"
const MAX_FILES_IN_MESSAGE = 5

const findRemovedIds = (oldIds: string[], newIds: string[]): string[] => {
  const newSet = new Set(newIds)
  return oldIds.filter((id) => !newSet.has(id))
}

const findDanglingReferences = (
  removedIds: string[],
  references: Map<string, string[]>
): DanglingReference[] =>
  removedIds
    .map((id) => ({ id, referencedBy: references.get(id) ?? [] }))
    .filter((ref) => ref.referencedBy.length > 0)

const formatReferencedBy = (files: string[]): string => {
  const shown = files.slice(0, MAX_FILES_IN_MESSAGE)
  const remaining = files.length - shown.length
  const suffix = remaining > 0 ? ` (and ${remaining} more)` : ""
  return shown.join(", ") + suffix
}

const toValidationError = (ref: DanglingReference): ValidationError => ({
  block: REFS_BLOCK,
  field: ref.id,
  message: `Cannot remove "${ref.id}" — referenced by: ${formatReferencedBy(ref.referencedBy)}`,
})

export const detectDanglingReferences = (
  oldIds: string[],
  newIds: string[],
  references: Map<string, string[]>
): ValidationError[] =>
  findDanglingReferences(findRemovedIds(oldIds, newIds), references).map(toValidationError)
