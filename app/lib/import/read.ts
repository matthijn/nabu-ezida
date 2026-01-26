export type ReadResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

export const readFileContent = (file: File): Promise<ReadResult> =>
  new Promise((resolve) => {
    const reader = new FileReader()

    reader.onload = () => {
      const content = reader.result
      if (typeof content === "string") {
        resolve({ ok: true, content })
      } else {
        resolve({ ok: false, error: "Failed to read file as text" })
      }
    }

    reader.onerror = () => {
      resolve({ ok: false, error: reader.error?.message ?? "Read failed" })
    }

    reader.readAsText(file)
  })

export const isMarkdownFile = (filename: string): boolean =>
  filename.toLowerCase().endsWith(".md")
