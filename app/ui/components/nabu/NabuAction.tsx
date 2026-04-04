"use client"

import { Bot } from "lucide-react"
import { Button } from "~/ui/components/Button"
import { NabuGate } from "./NabuGate"

interface NabuActionProps {
  label?: string
  tooltip?: string
  onClick: () => void
}

export const NabuAction = ({ label, tooltip, onClick }: NabuActionProps) => (
  <NabuGate tooltip={tooltip}>
    <Button variant="brand-tertiary" size="small" icon={<Bot />} onClick={onClick}>
      {label}
    </Button>
  </NabuGate>
)
