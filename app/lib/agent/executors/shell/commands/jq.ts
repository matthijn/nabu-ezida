import { command, ok, err } from "./command"

type JqValue = unknown

const isArray = (v: JqValue): v is unknown[] => Array.isArray(v)
const isObject = (v: JqValue): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

const getField = (obj: JqValue, field: string): JqValue => {
  if (isObject(obj)) return obj[field]
  return undefined
}

const getIndex = (arr: JqValue, idx: number): JqValue => {
  if (isArray(arr)) return arr[idx < 0 ? arr.length + idx : idx]
  return undefined
}

const iterate = (val: JqValue): JqValue[] => {
  if (isArray(val)) return val
  if (isObject(val)) return Object.values(val)
  return []
}

type PathSegment =
  | { type: "identity" }
  | { type: "field"; name: string }
  | { type: "index"; idx: number }
  | { type: "iterate" }

const parsePathSegments = (expr: string): PathSegment[] | null => {
  if (expr === ".") return [{ type: "identity" }]

  const segments: PathSegment[] = []
  let rest = expr.slice(1) // skip leading dot

  while (rest.length > 0) {
    // .[n] or .[]
    if (rest.startsWith("[")) {
      const end = rest.indexOf("]")
      if (end === -1) return null
      const inner = rest.slice(1, end)
      if (inner === "") {
        segments.push({ type: "iterate" })
      } else {
        const idx = parseInt(inner, 10)
        if (isNaN(idx)) return null
        segments.push({ type: "index", idx })
      }
      rest = rest.slice(end + 1)
      if (rest.startsWith(".")) rest = rest.slice(1)
    }
    // .field
    else {
      const match = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/)
      if (!match) return null
      segments.push({ type: "field", name: match[1] })
      rest = rest.slice(match[1].length)
      if (rest.startsWith(".")) rest = rest.slice(1)
    }
  }

  return segments.length > 0 ? segments : [{ type: "identity" }]
}

const applyPath = (values: JqValue[], segments: PathSegment[]): JqValue[] => {
  for (const seg of segments) {
    switch (seg.type) {
      case "identity":
        break
      case "field":
        values = values.map((v) => getField(v, seg.name))
        break
      case "index":
        values = values.map((v) => getIndex(v, seg.idx))
        break
      case "iterate":
        values = values.flatMap((v) => iterate(v))
        break
    }
  }
  return values
}

type Filter = (input: JqValue) => JqValue[]

const findMatchingParen = (expr: string, start: number): number => {
  let depth = 0
  for (let i = start; i < expr.length; i++) {
    if (expr[i] === "(") depth++
    else if (expr[i] === ")") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

const parseFilter = (expr: string): Filter => {
  expr = expr.trim()

  // Identity
  if (expr === ".") return (v) => [v]

  // Parenthesized expression
  if (expr.startsWith("(")) {
    const close = findMatchingParen(expr, 0)
    if (close === expr.length - 1) {
      return parseFilter(expr.slice(1, -1))
    }
  }

  // Pipe (lowest precedence - split first, then each segment handles //)
  if (expr.includes("|")) {
    const parts = splitPipe(expr)
    if (parts.length > 1) {
      const filters = parts.map(parseFilter)
      return (v) => filters.reduce((vals, f) => vals.flatMap(f), [v])
    }
  }

  // Alternative operator // (higher precedence than pipe)
  if (expr.includes("//")) {
    const parts = splitAlt(expr)
    if (parts.length > 1) {
      const filters = parts.map(parseFilter)
      return (v) => {
        for (const f of filters) {
          const result = f(v)
          const val = result[0]
          if (result.length > 0 && val !== null && val !== false && val !== undefined) {
            return result
          }
        }
        return [null]
      }
    }
  }

  // Logical or
  {
    const parts = splitOnWord(expr, "or")
    if (parts.length > 1) {
      const filters = parts.map(parseFilter)
      return (v) => {
        for (const f of filters) {
          const result = f(v)[0]
          if (result !== null && result !== false && result !== undefined) return [true]
        }
        return [false]
      }
    }
  }

  // Logical and
  {
    const parts = splitOnWord(expr, "and")
    if (parts.length > 1) {
      const filters = parts.map(parseFilter)
      return (v) => {
        for (const f of filters) {
          const result = f(v)[0]
          if (result === null || result === false || result === undefined) return [false]
        }
        return [true]
      }
    }
  }

  // Array construction [expr] or [expr, expr, ...]
  if (expr.startsWith("[") && expr.endsWith("]")) {
    const inner = expr.slice(1, -1).trim()
    if (inner === "") return () => [[]] // Empty array literal
    // Check for comma-separated elements (but not inside nested structures)
    const elements = splitObjectFields(inner)
    if (elements.length > 1) {
      const filters = elements.map(parseFilter)
      return (v) => [filters.flatMap((f) => f(v))]
    }
    const innerFilter = parseFilter(inner)
    return (v) => [innerFilter(v)]
  }

  // Object construction {key: expr, key2, ...}
  if (expr.startsWith("{") && expr.endsWith("}")) {
    const inner = expr.slice(1, -1).trim()
    const fields = splitObjectFields(inner)
    const fieldFilters: { key: string; filter: Filter }[] = fields.map((f) => {
      const colonIdx = f.indexOf(":")
      if (colonIdx === -1) {
        // shorthand: {foo} means {foo: .foo}
        const key = f.trim()
        return { key, filter: parseFilter(`.${key}`) }
      }
      const key = f.slice(0, colonIdx).trim()
      const valExpr = f.slice(colonIdx + 1).trim()
      return { key, filter: parseFilter(valExpr) }
    })
    return (v) => {
      const result: Record<string, unknown> = {}
      for (const { key, filter } of fieldFilters) {
        result[key] = filter(v)[0]
      }
      return [result]
    }
  }

  // Path expressions: ., .foo, .[n], .[], and chains like .[].foo, .[0].bar
  if (expr.startsWith(".")) {
    const segments = parsePathSegments(expr)
    if (segments) {
      return (v) => applyPath([v], segments)
    }
  }

  // Built-in functions
  if (expr === "length") return (v) => [isArray(v) ? v.length : isObject(v) ? Object.keys(v).length : 0]
  if (expr === "keys") return (v) => [isObject(v) ? Object.keys(v) : isArray(v) ? v.map((_, i) => i) : []]
  if (expr === "values") return (v) => [isObject(v) ? Object.values(v) : isArray(v) ? v : []]
  if (expr === "type") return (v) => [isArray(v) ? "array" : isObject(v) ? "object" : typeof v]
  if (expr === "first") return (v) => isArray(v) && v.length > 0 ? [v[0]] : []
  if (expr === "last") return (v) => isArray(v) && v.length > 0 ? [v[v.length - 1]] : []
  if (expr === "unique") return (v) => isArray(v) ? [[...new Set(v.map(x => JSON.stringify(x)))].map(x => JSON.parse(x))] : [v]
  if (expr === "flatten") return (v) => isArray(v) ? [v.flat()] : [v]
  if (expr === "add") return (v) => {
    if (!isArray(v)) return [v]
    if (v.length === 0) return [null]
    if (typeof v[0] === "number") return [v.reduce((a: number, b) => a + (b as number), 0)]
    if (typeof v[0] === "string") return [v.join("")]
    if (isArray(v[0])) return [v.flat()]
    return [v]
  }
  if (expr === "sort") return (v) => isArray(v) ? [[...v].sort()] : [v]
  if (expr === "reverse") return (v) => isArray(v) ? [[...v].reverse()] : [v]
  if (expr === "not") return (v) => [!v]

  // sort_by(.field)
  const sortByMatch = expr.match(/^sort_by\((.+)\)$/)
  if (sortByMatch) {
    const keyFilter = parseFilter(sortByMatch[1])
    return (v) => {
      if (!isArray(v)) return [v]
      return [[...v].sort((a, b) => {
        const ka = keyFilter(a)[0] as string | number
        const kb = keyFilter(b)[0] as string | number
        if (ka < kb) return -1
        if (ka > kb) return 1
        return 0
      })]
    }
  }

  // group_by(.field)
  const groupByMatch = expr.match(/^group_by\((.+)\)$/)
  if (groupByMatch) {
    const keyFilter = parseFilter(groupByMatch[1])
    return (v) => {
      if (!isArray(v)) return [[v]]
      const groups = new Map<string, unknown[]>()
      for (const item of v) {
        const key = JSON.stringify(keyFilter(item)[0])
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(item)
      }
      return [Array.from(groups.values())]
    }
  }

  // map(expr)
  const mapMatch = expr.match(/^map\((.+)\)$/)
  if (mapMatch) {
    const innerFilter = parseFilter(mapMatch[1])
    return (v) => {
      if (!isArray(v)) return [v]
      return [v.flatMap((item) => innerFilter(item))]
    }
  }

  // select(condition)
  const selectMatch = expr.match(/^select\((.+)\)$/)
  if (selectMatch) {
    const cond = parseCondition(selectMatch[1])
    return (v) => cond(v) ? [v] : []
  }

  // @tsv
  if (expr === "@tsv") return (v) => {
    if (!isArray(v)) return [String(v)]
    return [v.map((x) => String(x ?? "")).join("\t")]
  }

  // @csv
  if (expr === "@csv") return (v) => {
    if (!isArray(v)) return [String(v)]
    return [v.map((x) => {
      const s = String(x ?? "")
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(",")]
  }

  // String literal
  if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
    return () => [expr.slice(1, -1)]
  }

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) {
    return () => [parseFloat(expr)]
  }

  // Boolean and null literals
  if (expr === "null") return () => [null]
  if (expr === "true") return () => [true]
  if (expr === "false") return () => [false]

  // has("key")
  const hasMatch = expr.match(/^has\(["'](.+)["']\)$/)
  if (hasMatch) {
    const key = hasMatch[1]
    return (v) => [isObject(v) && key in v]
  }

  // test("regex")
  const testMatch = expr.match(/^test\(["'](.+)["']\)$/)
  if (testMatch) {
    const re = new RegExp(testMatch[1])
    return (v) => [typeof v === "string" && re.test(v)]
  }

  // index(expr)
  const indexMatch = expr.match(/^index\((.+)\)$/)
  if (indexMatch) {
    const searchFilter = parseFilter(indexMatch[1])
    return (v) => {
      const needle = searchFilter(v)[0]
      if (isArray(v)) {
        const idx = v.findIndex((item) => JSON.stringify(item) === JSON.stringify(needle))
        return [idx >= 0 ? idx : null]
      }
      if (typeof v === "string" && typeof needle === "string") {
        const idx = v.indexOf(needle)
        return [idx >= 0 ? idx : null]
      }
      return [null]
    }
  }

  throw new Error(`Unknown filter: ${expr}`)
}

const parseCondition = (expr: string): (v: JqValue) => boolean => {
  expr = expr.trim()

  // Comparison operators
  for (const op of ["==", "!=", ">=", "<=", ">", "<"]) {
    const idx = expr.indexOf(op)
    if (idx > 0) {
      const left = parseFilter(expr.slice(0, idx).trim())
      const right = parseFilter(expr.slice(idx + op.length).trim())
      return (v) => {
        const l = left(v)[0]
        const r = right(v)[0]
        switch (op) {
          case "==": return JSON.stringify(l) === JSON.stringify(r)
          case "!=": return JSON.stringify(l) !== JSON.stringify(r)
          case ">": return (l as number) > (r as number)
          case "<": return (l as number) < (r as number)
          case ">=": return (l as number) >= (r as number)
          case "<=": return (l as number) <= (r as number)
        }
        return false
      }
    }
  }

  // Truthy check
  const filter = parseFilter(expr)
  return (v) => {
    const result = filter(v)[0]
    return result !== null && result !== false && result !== undefined
  }
}

const splitByChar = (expr: string, sep: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let current = ""

  for (const char of expr) {
    if (char === "(" || char === "[" || char === "{") depth++
    else if (char === ")" || char === "]" || char === "}") depth--
    else if (char === sep && depth === 0) {
      parts.push(current.trim())
      current = ""
      continue
    }
    current += char
  }
  parts.push(current.trim())
  return parts
}

const splitPipe = (expr: string): string[] => splitByChar(expr, "|")
const splitObjectFields = (expr: string): string[] => splitByChar(expr, ",")

const splitOnWord = (expr: string, word: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let current = ""
  let i = 0
  const sep = ` ${word} `

  while (i < expr.length) {
    const char = expr[i]
    if (char === "(" || char === "[" || char === "{") depth++
    else if (char === ")" || char === "]" || char === "}") depth--
    else if (depth === 0 && expr.slice(i, i + sep.length) === sep) {
      parts.push(current.trim())
      current = ""
      i += sep.length
      continue
    }
    current += char
    i++
  }
  parts.push(current.trim())
  return parts
}

const splitAlt = (expr: string): string[] => {
  const parts: string[] = []
  let depth = 0
  let current = ""
  let i = 0

  while (i < expr.length) {
    const char = expr[i]
    if (char === "(" || char === "[" || char === "{") depth++
    else if (char === ")" || char === "]" || char === "}") depth--
    else if (depth === 0 && char === "/" && expr[i + 1] === "/") {
      parts.push(current.trim())
      current = ""
      i += 2
      continue
    }
    current += char
    i++
  }
  parts.push(current.trim())
  return parts
}

export const jq = command({
  description: "Filter/transform JSON. Paths: .foo, .[0], .[]. Pipes: |. Alt: //. Logic: and, or, not. Parens: (expr). Functions: map, select, has, test, index, sort_by, group_by, keys, length, unique, flatten, add, first, last, @csv, @tsv. Literals: null, true, false",
  usage: `jq [-r] [-c] <filter> [file]
  jq ".[].title" data.json
  jq ".[] | select(.type == \\"code\\")" data.json
  jq "map({id, name: .title})" data.json
  jq "group_by(.category) | map({cat: .[0].category, count: length})" data.json
  jq -r ".[] | [.name, .value] | @tsv" data.json`,
  flags: {
    "-r": { alias: "--raw-output", description: "output raw strings without quotes" },
    "-c": { alias: "--compact-output", description: "compact output (one line per result)" },
  },
  handler: (files) => (args, flags, stdin) => {
    const [filterExpr, filename] = args
    if (!filterExpr) return err("jq: missing filter argument")

    let input: JqValue
    try {
      const raw = filename ? files.get(filename) : stdin
      if (!raw) return err(filename ? `jq: ${filename}: No such file` : "jq: no input")
      input = JSON.parse(raw)
    } catch {
      return err("jq: invalid JSON input")
    }

    try {
      const filter = parseFilter(filterExpr)
      const results = filter(input)

      const rawOutput = flags.has("-r")
      const compact = flags.has("-c")

      const formatted = results.map((r) => {
        if (rawOutput && typeof r === "string") return r
        return compact ? JSON.stringify(r) : JSON.stringify(r, null, 2)
      })

      return ok(formatted.join("\n"))
    } catch (e) {
      return err(`jq: ${e instanceof Error ? e.message : String(e)}`)
    }
  },
})
