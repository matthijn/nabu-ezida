"use client"

import { useEffect, useState } from "react"
import { FeatherLoader2 } from "@subframe/core"
import { subscribe, getTaskMessage } from "~/lib/tasks"

export const TaskIndicator = () => {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    return subscribe((tasks) => {
      setMessage(getTaskMessage(tasks))
    })
  }, [])

  if (!message) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border border-solid border-neutral-border bg-default-background px-4 py-3 shadow-lg">
      <FeatherLoader2 className="text-body font-body text-brand-600 animate-spin" />
      <span className="text-body-bold font-body-bold text-default-font">
        {message}
      </span>
    </div>
  )
}
