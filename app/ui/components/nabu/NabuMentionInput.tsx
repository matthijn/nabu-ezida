"use client"

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from "react"
import { FeatherSparkles, FeatherSend, FeatherX } from "@subframe/core"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { IconButton } from "~/ui/components/IconButton"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import type { Participant, ParticipantVariant } from "~/domain/participant"

const variantToBorder: Record<ParticipantVariant, string> = {
  brand: "border-brand-300",
  neutral: "border-neutral-300",
  error: "border-error-300",
  success: "border-success-300",
  warning: "border-warning-300",
}

const variantToBg: Record<ParticipantVariant, string> = {
  brand: "bg-brand-50",
  neutral: "bg-neutral-50",
  error: "bg-error-50",
  success: "bg-success-50",
  warning: "bg-warning-50",
}

const variantToText: Record<ParticipantVariant, string> = {
  brand: "text-brand-700",
  neutral: "text-neutral-700",
  error: "text-error-700",
  success: "text-success-700",
  warning: "text-warning-700",
}

type NabuMentionInputProps = {
  recipient: Participant
  onSend: (message: string) => void
  onCancel: () => void
  autoFocus?: boolean
  className?: string
}

export const NabuMentionInput = ({
  recipient,
  onSend,
  onCancel,
  autoFocus = true,
  className = "",
}: NabuMentionInputProps) => {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [autoFocus])

  const handleSend = useCallback(() => {
    if (!value.trim()) return
    onSend(value.trim())
  }, [value, onSend])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
      if (e.key === "Escape") {
        e.preventDefault()
        onCancel()
      }
    },
    [handleSend, onCancel]
  )

  const variant = recipient.variant

  return (
    <div
      className={`flex w-full items-center gap-2 rounded-full border border-solid px-3 py-2 ${variantToBorder[variant]} ${variantToBg[variant]} ${className}`}
    >
      <IconWithBackground variant={variant} size="x-small" icon={<FeatherSparkles />} />
      <span className={`text-caption-bold font-caption-bold ${variantToText[variant]}`}>
        @{recipient.name.toLowerCase()}
      </span>
      <TextFieldUnstyled className="h-auto grow shrink-0 basis-0">
        <TextFieldUnstyled.Input
          ref={inputRef}
          placeholder={`Ask ${recipient.name}...`}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </TextFieldUnstyled>
      <IconButton
        variant="brand-primary"
        size="small"
        icon={<FeatherSend />}
        onClick={handleSend}
      />
      <IconButton
        variant="neutral-tertiary"
        size="small"
        icon={<FeatherX />}
        onClick={onCancel}
      />
    </div>
  )
}
