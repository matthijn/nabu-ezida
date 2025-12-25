"use client"

import type { ReactNode } from "react"
import { Avatar } from "~/ui/components/Avatar"
import { Button } from "~/ui/components/Button"
import { FeatherCheck, FeatherEdit2, FeatherLock, FeatherX } from "@subframe/core"

type ProposalProps = {
  avatar: string
  description: string
  loading?: boolean
  onAccept?: () => void
  onRefine?: () => void
  onReject?: () => void
  children: ReactNode
  className?: string
}

const ProposalPill = ({
  avatar,
  description,
  loading,
  onAccept,
  onRefine,
  onReject,
}: Omit<ProposalProps, "children">) => (
  <div className="flex items-center gap-3 rounded-full border-2 border-solid border-brand-400 bg-default-background px-6 py-2 absolute -bottom-6 left-1/2 -translate-x-1/2">
    <div className="flex items-center gap-2">
      {loading && <FeatherLock className="text-caption font-caption text-brand-600" />}
      <Avatar variant="brand" size="x-small">
        {avatar}
      </Avatar>
      <span className="whitespace-nowrap text-caption font-caption text-subtext-color">
        {description}
      </span>
    </div>
    {!loading && (
      <>
        <div className="flex h-4 w-px flex-none flex-col items-center gap-2 bg-neutral-border" />
        <div className="flex items-center gap-2">
          <Button
            variant="brand-primary"
            size="small"
            icon={<FeatherCheck />}
            onClick={onAccept}
          >
            Accept
          </Button>
          <Button
            variant="neutral-secondary"
            size="small"
            icon={<FeatherEdit2 />}
            onClick={onRefine}
          >
            Refine
          </Button>
          <Button
            variant="neutral-secondary"
            size="small"
            icon={<FeatherX />}
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      </>
    )}
  </div>
)

export const Proposal = ({
  avatar,
  description,
  loading = false,
  onAccept,
  onRefine,
  onReject,
  children,
  className = "",
}: ProposalProps) => (
  <div
    className={`flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 px-4 pt-4 pb-12 relative overflow-visible ${loading ? "animate-pulse" : ""} ${className}`}
  >
    {children}
    <ProposalPill
      avatar={avatar}
      description={description}
      loading={loading}
      onAccept={onAccept}
      onRefine={onRefine}
      onReject={onReject}
    />
  </div>
)
