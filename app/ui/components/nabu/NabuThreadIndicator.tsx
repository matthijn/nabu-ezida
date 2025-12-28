"use client"

import { FeatherMessageCircle, FeatherMaximize2, FeatherSparkles, FeatherLoader2 } from "@subframe/core"
import { Avatar } from "~/ui/components/Avatar"
import { Badge } from "~/ui/components/Badge"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
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

type NabuThreadIndicatorProps = {
  initiator: Participant
  recipient: Participant
  preview: string
  messageCount: number
  isActive?: boolean
  onClick: () => void
  className?: string
}

export const NabuThreadIndicator = ({
  initiator,
  recipient,
  preview,
  messageCount,
  isActive = false,
  onClick,
  className = "",
}: NabuThreadIndicatorProps) => {
  const variant = recipient.variant

  return (
    <div
      onClick={onClick}
      className={`group flex w-full cursor-pointer items-center gap-2 rounded-full border border-solid px-3 py-1.5 transition-colors hover:opacity-90 ${variantToBorder[variant]} ${variantToBg[variant]} ${className}`}
    >
      <div className="flex items-center">
        {initiator.image ? (
          <Avatar size="x-small" image={initiator.image}>
            {initiator.initial}
          </Avatar>
        ) : (
          <Avatar variant={initiator.variant} size="x-small">
            {initiator.initial}
          </Avatar>
        )}
        {recipient.type === "llm" ? (
          <IconWithBackground
            className="-ml-1"
            variant={recipient.variant}
            size="x-small"
            icon={<FeatherSparkles />}
          />
        ) : (
          <Avatar className="-ml-1" variant={recipient.variant} size="x-small" image={recipient.image}>
            {recipient.initial}
          </Avatar>
        )}
      </div>
      <span className="grow shrink-0 basis-0 truncate text-caption font-caption text-default-font">
        {preview}
      </span>
      {isActive ? (
        <Badge variant={variant} icon={<FeatherLoader2 className="animate-spin" />}>
          Active
        </Badge>
      ) : messageCount > 0 ? (
        <Badge variant={variant} icon={<FeatherMessageCircle />}>
          {messageCount}
        </Badge>
      ) : null}
      <IconButton
        className="hidden group-hover:flex"
        variant="neutral-tertiary"
        size="small"
        icon={<FeatherMaximize2 />}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      />
    </div>
  )
}
