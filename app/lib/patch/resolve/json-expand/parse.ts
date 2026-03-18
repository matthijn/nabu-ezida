export const repairJsonNewlines = (json: string): string => {
  let result = ""
  let inString = false
  let i = 0

  while (i < json.length) {
    const char = json[i]

    if (char === '"' && (i === 0 || json[i - 1] !== "\\")) {
      inString = !inString
      result += char
    } else if (inString && char === "\n") {
      result += "\\n"
    } else if (inString && char === "\r") {
      result += "\\r"
    } else {
      result += char
    }
    i++
  }

  return result
}
