/**
 * Pending resolution markers for cross-file dependencies.
 *
 * Foreign key references that can't be resolved yet are marked as #[id].
 * When the definition appears, markers are resolved (replaced with bare id).
 * This triggers cache invalidation since content changes.
 */

const PENDING_PATTERN = /#\[([^\]]+)\]/g
const ID_PATTERN = /[a-z]+_[a-z0-9]{8}/g

export const stripPending = (content: string): string =>
  content.replace(PENDING_PATTERN, "$1")

export const findPending = (content: string): string[] => {
  const results: string[] = []
  let match
  while ((match = PENDING_PATTERN.exec(content)) !== null) {
    results.push(match[1])
  }
  PENDING_PATTERN.lastIndex = 0
  return results
}

export const hasPending = (content: string): boolean =>
  PENDING_PATTERN.test(content) && (PENDING_PATTERN.lastIndex = 0, true)

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
  const pattern = /"id"\s*:\s*"([a-z]+_[a-z0-9]{8})"/g
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
    for (const id of findDefinitionIds(stripPending(content))) {
      all.add(id)
    }
  }
  return all
}

export const markPending = (content: string, definitions: Set<string>): string => {
  const foreign = findForeignIds(content)
  let result = content
  for (const id of foreign) {
    if (!definitions.has(id)) {
      result = result.replace(new RegExp(`"${id}"`, "g"), `"#[${id}]"`)
    }
  }
  return result
}

export const resolvePending = (content: string, definitionId: string): string =>
  content.replace(new RegExp(`#\\[${definitionId}\\]`, "g"), definitionId)

export const resolveAllPending = (content: string, definitions: Set<string>): string => {
  let result = content
  for (const id of findPending(content)) {
    if (definitions.has(id)) {
      result = resolvePending(result, id)
    }
  }
  return result
}
