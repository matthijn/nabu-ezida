import { command, ok, err } from "./command"

export type JqInstance = {
  raw: (input: string, filter: string, flags?: string[]) => string
}

let instance: JqInstance | null = null
let pending: Promise<void> | null = null

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })

const loadJqBrowser = async (): Promise<JqInstance> => {
  await loadScript("/jq.js")
  return await (window as unknown as { jq: Promise<JqInstance> }).jq
}

export const initJq = (provided?: JqInstance): Promise<void> => {
  if (instance) return Promise.resolve()
  if (provided) { instance = provided; return Promise.resolve() }
  if (pending) return pending
  pending = loadJqBrowser().then((jq) => { instance = jq })
  return pending
}

const getJq = (): JqInstance => {
  if (!instance) throw new Error("jq-web not initialized — call initJq() first")
  return instance
}

const extractJqError = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e)
  const lines = msg.split("\n")
  const jqLines = lines.filter((l) => !l.startsWith("Non-zero exit code"))
  return jqLines.length > 0 ? jqLines.join("\n").trim() : msg
}

export const jq = command({
  description:
    "Filter/transform JSON using jq (full jq language). See https://jqlang.github.io/jq/manual/ for complete syntax reference.",
  usage: `jq [-r] [-c] <filter> [file]
  jq ".[].title" data.json
  jq ".[] | select(.type == \\"code\\")" data.json
  jq "map({id, name: .title})" data.json
  jq "group_by(.category) | map({cat: .[0].category, count: length})" data.json
  jq -r ".[] | [.name, .value] | @tsv" data.json
  jq "to_entries | map(select(.value > 1))" data.json
  jq "[.[] | {key: .name, value: .score}] | from_entries" data.json`,
  flags: {
    "-r": { alias: "--raw-output", description: "output raw strings without quotes" },
    "-c": { alias: "--compact-output", description: "compact output (one line per result)" },
  },
  handler: (files) => (args, flags, stdin) => {
    const [filterExpr, filename] = args
    if (!filterExpr) return err("jq: missing filter argument")

    const input = filename ? files.get(filename) : stdin
    if (!input) return err(filename ? `jq: ${filename}: No such file` : "jq: no input")

    try {
      const jqFlags: string[] = []
      if (flags.has("-r")) jqFlags.push("-r")
      if (flags.has("-c")) jqFlags.push("-c")

      const result = getJq().raw(input, filterExpr, jqFlags.length > 0 ? jqFlags : undefined)
      return ok(result.trimEnd())
    } catch (e) {
      return err(extractJqError(e))
    }
  },
})
