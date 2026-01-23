import { unified } from "unified"
import remarkParse from "remark-parse"
import { toString } from "mdast-util-to-string"

export const mdToPlainText = (markdown: string): string => {
  const ast = unified().use(remarkParse).parse(markdown)
  return toString(ast)
}
