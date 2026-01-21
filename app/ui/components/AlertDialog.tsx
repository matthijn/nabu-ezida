"use client"

import { FeatherAlertCircle } from "@subframe/core"
import { Button } from "./Button"

type AlertEntry = {
  title: string
  description: string
}

type AlertDialogProps = {
  title: string
  description: string
  entries: AlertEntry[]
  destructiveLabel: string
  onDestructive: () => void
  onCancel: () => void
}

export const AlertDialog = ({
  title,
  description,
  entries,
  destructiveLabel,
  onDestructive,
  onCancel,
}: AlertDialogProps) => (
  <div className="flex grow shrink-0 basis-0 items-center justify-center self-stretch bg-neutral-900/40 absolute inset-0 z-50">
    <div className="flex max-w-[448px] grow shrink-0 basis-0 flex-col items-start gap-6 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 shadow-lg">
      <div className="flex w-full flex-col items-start gap-1">
        <span className="text-heading-2 font-heading-2 text-default-font">
          {title}
        </span>
        <span className="text-caption font-caption text-subtext-color">
          {description}
        </span>
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        {entries.map((entry) => (
          <div key={entry.title} className="flex w-full items-start gap-3">
            <FeatherAlertCircle className="text-body font-body text-error-600" />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-body font-body text-default-font">
                {entry.title}
              </span>
              <span className="text-caption font-caption text-subtext-color">
                {entry.description}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full items-center justify-end gap-2">
        <Button variant="neutral-secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="destructive-primary" onClick={onDestructive}>
          {destructiveLabel}
        </Button>
      </div>
    </div>
  </div>
)
