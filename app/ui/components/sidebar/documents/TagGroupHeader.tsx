export const humanize = (tag: string): string =>
  tag.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
