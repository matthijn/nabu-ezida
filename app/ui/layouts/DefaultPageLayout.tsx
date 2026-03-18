"use client"

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type MutableRefObject,
  type MouseEvent,
} from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherBook, FeatherFiles, FeatherSearch } from "@subframe/core"
import { MainSidebar } from "~/ui/components/sidebar/main"
import type { NavItem } from "~/ui/components/sidebar/main"
import { useResizable } from "~/ui/hooks/useResizable"
import { cn } from "~/ui/utils"

type ActiveNav = "documents" | "search" | "codes"

interface DefaultPageLayoutProps {
  children?: ReactNode
  rightPanel?: ReactNode
  sidebarPanels?: Partial<Record<ActiveNav, ReactNode>>
  className?: string
  activeNav?: ActiveNav
  showCodes?: boolean
  onNavChange?: (nav: ActiveNav) => void
  dismissSidebarRef?: MutableRefObject<(() => void) | null>
}

const buildNavItems = (hoveredNav: ActiveNav | null, showCodes: boolean): NavItem[][] => {
  const primary: NavItem[] = [
    {
      id: "documents",
      icon: <FeatherFiles />,
      label: "Documents",
      tooltip: "Browse all your documents",
      selected: hoveredNav === "documents",
    },
    {
      id: "search",
      icon: <FeatherSearch />,
      label: "Search",
      tooltip: "Search across documents",
      disabled: true,
    },
  ]

  const secondary: NavItem[] = showCodes
    ? [
        {
          id: "codes",
          icon: <FeatherBook />,
          label: "Codes",
          tooltip: "Your qualitative codebook",
          selected: hoveredNav === "codes",
        },
      ]
    : []

  return secondary.length > 0 ? [primary, secondary] : [primary]
}

const HANDLE_WIDTH = 12
const CONTAINER_PADDING = 24
const MIN_LEFT_WIDTH = 400
const MIN_RIGHT_WIDTH = 280
const RIGHT_PANEL_DEFAULT = { width: 384, height: 0 }
const RIGHT_PANEL_STORAGE_KEY = "layout:right-panel"

const computeMaxRightWidth = (containerWidth: number): number =>
  Math.floor((containerWidth - CONTAINER_PADDING - HANDLE_WIDTH) / 2)

export const DefaultPageLayout = ({
  children,
  rightPanel,
  sidebarPanels,
  className,
  activeNav: _activeNav = "documents",
  showCodes = false,
  onNavChange,
  dismissSidebarRef,
}: DefaultPageLayoutProps) => {
  const [hoveredNav, setHoveredNav] = useState<ActiveNav | null>(null)
  useEffect(() => {
    if (dismissSidebarRef) dismissSidebarRef.current = () => setHoveredNav(null)
  })
  const activePanel = hoveredNav && sidebarPanels?.[hoveredNav]

  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width + CONTAINER_PADDING)
    )
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const maxRightWidth = computeMaxRightWidth(containerWidth || 800)

  const { size: rightPanelSize, handleResizeMouseDown } = useResizable(RIGHT_PANEL_DEFAULT, {
    bounds: { minWidth: MIN_RIGHT_WIDTH, maxWidth: maxRightWidth, minHeight: 0, maxHeight: 0 },
    storageKey: RIGHT_PANEL_STORAGE_KEY,
  })

  const rightWidth = Math.min(rightPanelSize.width, maxRightWidth)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (!isDragging) return
    const prev = { cursor: document.body.style.cursor, userSelect: document.body.style.userSelect }
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    return () => {
      document.body.style.cursor = prev.cursor
      document.body.style.userSelect = prev.userSelect
    }
  }, [isDragging])

  const onDragStart = useCallback(
    (e: MouseEvent) => {
      setIsDragging(true)
      handleResizeMouseDown(e)
      const onUp = () => {
        setIsDragging(false)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mouseup", onUp)
    },
    [handleResizeMouseDown]
  )

  return (
    <div className={cn("flex h-screen w-full items-center", className)}>
      <div className="relative z-50 flex h-full flex-none" onMouseLeave={() => setHoveredNav(null)}>
        <div className="relative z-30">
          <MainSidebar
            navItemGroups={buildNavItems(hoveredNav, showCodes)}
            onNavItemClick={onNavChange ? (id) => onNavChange(id as ActiveNav) : undefined}
            onNavItemHover={(id) => setHoveredNav(id as ActiveNav)}
          />
        </div>
        <AnimatePresence>
          {activePanel && (
            <motion.div
              key={hoveredNav}
              initial={{ x: -12, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
              className="absolute left-full top-0 h-full z-20 shadow-xl"
            >
              {activePanel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div ref={containerRef} className="flex h-full grow overflow-hidden bg-neutral-100 p-3">
        {children && (
          <div
            className="relative flex grow flex-col items-start gap-4 rounded-xl bg-default-background overflow-hidden"
            style={{ minWidth: MIN_LEFT_WIDTH }}
          >
            {children}
          </div>
        )}
        {rightPanel && (
          <>
            <div
              className="flex-none cursor-col-resize flex items-center justify-center group"
              style={{ width: HANDLE_WIDTH }}
              onMouseDown={onDragStart}
            >
              <div
                className={cn(
                  "w-px h-full bg-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity",
                  isDragging && "!opacity-100"
                )}
              />
            </div>
            <div className="flex flex-col flex-none h-full" style={{ width: rightWidth }}>
              {rightPanel}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export type { ActiveNav }
