const SUFFIX_LENGTH = 4
const SUFFIX_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"

const generateSuffix = (): string =>
  Array.from({ length: SUFFIX_LENGTH }, () =>
    SUFFIX_CHARS[Math.floor(Math.random() * SUFFIX_CHARS.length)]
  ).join("")

const splitExtension = (filename: string): [string, string] => {
  const lastDot = filename.lastIndexOf(".")
  if (lastDot === -1) return [filename, ""]
  return [filename.slice(0, lastDot), filename.slice(lastDot)]
}

const appendSuffix = (filename: string, suffix: string): string => {
  const [base, ext] = splitExtension(filename)
  return `${base}-${suffix}${ext}`
}

export const deduplicateName = (
  name: string,
  existingNames: Set<string>
): string => {
  if (!existingNames.has(name)) return name

  let candidate = name
  while (existingNames.has(candidate)) {
    candidate = appendSuffix(name, generateSuffix())
  }
  return candidate
}
