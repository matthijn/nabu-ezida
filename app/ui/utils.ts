import clsx, { type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const subframeTypography = [
  "caption",
  "caption-bold",
  "body",
  "body-bold",
  "heading-1",
  "heading-2",
  "heading-3",
  "monospace-body",
] as const;

const twMerge = extendTailwindMerge<"sf-text-style" | "sf-font-family">({
  extend: {
    classGroups: {
      "sf-text-style": [{ text: [...subframeTypography] }],
      "sf-font-family": [{ font: [...subframeTypography] }],
    },
  },
});

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
