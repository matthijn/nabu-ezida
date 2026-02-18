/**
 * Pending-ref markers for cross-file ID dependencies.
 *
 * Foreign key references that can't be resolved yet are marked as #[id].
 * When the definition appears, markers are resolved (replaced with bare id).
 * This triggers cache invalidation since content changes.
 */

const PENDING_REF_PATTERN = /#\[([^\]]+)\]/g
const ID_SOURCE = "[a-z]+_\\d[a-z0-9]{7}"
const ID_PATTERN = new RegExp(ID_SOURCE, "g")

export const stripPendingRefs = (content: string): string =>
  content.replace(PENDING_REF_PATTERN, "$1")

export const findPendingRefs = (content: string): string[] => {
  const results: string[] = []
  let match
  while ((match = PENDING_REF_PATTERN.exec(content)) !== null) {
    results.push(match[1])
  }
  PENDING_REF_PATTERN.lastIndex = 0
  return results
}

export const hasPendingRefs = (content: string): boolean =>
  PENDING_REF_PATTERN.test(content) && (PENDING_REF_PATTERN.lastIndex = 0, true)

const findAllIds = (content: string): string[] => {
  const results: string[] = []
  let match
  while ((match = ID_PATTERN.exec(content)) !== null) {
    results.push(match[0])
  }
  ID_PATTERN.lastIndex = 0
  return results
}

export const findDefinitionIds = (content: string): Set<string> => {
  const ids = new Set<string>()
  const pattern = new RegExp(`"id"\\s*:\\s*"(${ID_SOURCE})"`, "g")
  let match
  while ((match = pattern.exec(content)) !== null) {
    ids.add(match[1])
  }
  return ids
}

const findForeignIds = (content: string): string[] => {
  const definitions = findDefinitionIds(content)
  return findAllIds(content).filter((id) => !definitions.has(id))
}

export const getAllDefinitions = (files: Record<string, string>): Set<string> => {
  const all = new Set<string>()
  for (const content of Object.values(files)) {
    for (const id of findDefinitionIds(stripPendingRefs(content))) {
      all.add(id)
    }
  }
  return all
}

export const markPendingRefs = (content: string, definitions: Set<string>): string => {
  const foreign = findForeignIds(content)
  let result = content
  for (const id of foreign) {
    if (!definitions.has(id)) {
      result = result.replace(new RegExp(`"${id}"`, "g"), `"#[${id}]"`)
    }
  }
  return result
}

export const resolvePendingRef = (content: string, definitionId: string): string =>
  content.replace(new RegExp(`#\\[${definitionId}\\]`, "g"), definitionId)

export const resolveAllPendingRefs = (content: string, definitions: Set<string>): string => {
  let result = content
  for (const id of findPendingRefs(content)) {
    if (definitions.has(id)) {
      result = resolvePendingRef(result, id)
    }
  }
  return result
}
