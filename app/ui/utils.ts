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
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "sf-text-style": [{ text: subframeTypography }],
      "sf-font-family": [{ font: subframeTypography }],
    },
  },
});

export function twClassNames(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
