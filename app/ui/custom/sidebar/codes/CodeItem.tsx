"use client"

import {
  solidBackground,
  elementBackground,
  hoveredElementBorder,
} from "~/lib/colors/radix"
import type { Code } from "./types"

type CodeItemProps = {
  code: Code
  selected?: boolean
  onClick?: () => void
}

export const CodeItem = ({ code, selected = false, onClick }: CodeItemProps) => (
  <div
    className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 ${
      selected ? "border border-solid" : ""
    }`}
    style={{
      backgroundColor: elementBackground(code.color),
      borderColor: selected ? hoveredElementBorder(code.color) : undefined,
    }}
    onClick={onClick}
  >
    <div
      className="flex h-2 w-2 flex-none rounded-full"
      style={{ backgroundColor: solidBackground(code.color) }}
    />
    <span
      className={`grow shrink-0 basis-0 ${
        selected ? "text-body-bold font-body-bold" : "text-body font-body"
      } text-default-font`}
    >
      {code.name}
    </span>
  </div>
)
