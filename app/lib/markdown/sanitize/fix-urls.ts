const encodeUrlForMarkdown = (url: string): string => url.replace(/"/g, "%22")

export const fixMarkdownUrls = (content: string): string =>
  content.replace(/\]\(([^)<>]+)\)/g, (_, url: string) => `](<${encodeUrlForMarkdown(url)}>)`)
