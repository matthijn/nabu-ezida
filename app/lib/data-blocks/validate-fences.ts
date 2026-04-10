export interface FenceError {
  line: number
  message: string
}

const FENCE = "```"
const LINE_SPLIT_RE = /\r\n|\r|\n/

const isFenceLine = (line: string): boolean => line.trimStart().startsWith(FENCE)

const hasStrayFence = (line: string): boolean => line.includes(FENCE) && !isFenceLine(line)

export const validateFences = (markdown: string): FenceError[] => {
  const errors: FenceError[] = []
  const lines = markdown.split(LINE_SPLIT_RE)
  let fenceCount = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (hasStrayFence(line)) {
      errors.push({
        line: i + 1,
        message: `Code fence \`${FENCE}\` must be at the start of its own line (found inline on line ${i + 1}).`,
      })
      continue
    }
    if (isFenceLine(line)) fenceCount++
  }

  if (fenceCount % 2 !== 0) {
    errors.push({
      line: lines.length,
      message: `Unbalanced code fences: found ${fenceCount} \`${FENCE}\` line(s), expected an even number. A fence was opened but never closed (or closed but never opened).`,
    })
  }

  return errors
}
