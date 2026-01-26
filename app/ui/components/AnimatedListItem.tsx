"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

type AnimatedListItemProps = {
  children: ReactNode
  className?: string
}

export const AnimatedListItem = ({ children, className }: AnimatedListItemProps) => (
  <motion.div
    layout
    className={`w-full ${className ?? ""}`}
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
    transition={{ type: "spring", stiffness: 500, damping: 30 }}
  >
    {children}
  </motion.div>
)
