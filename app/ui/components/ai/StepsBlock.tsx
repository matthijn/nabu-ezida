"use client"

import { FeatherAlertTriangle } from "@subframe/core"

interface AbortBoxProps {
  message?: string
}

const AbortBox = ({ message = "Pivoted plan" }: AbortBoxProps) => (
  <div className="flex w-full items-start gap-2 rounded-md border border-solid border-warning-300 bg-warning-50 px-3 py-2 mt-1">
    <FeatherAlertTriangle className="text-body text-warning-600 mt-0.5 flex-none" />
    <span className="text-body font-body text-warning-700">{message}</span>
  </div>
)

export { AbortBox }
