import type { ComponentType } from "react"

type BlockProps = {
  block: { props: { lockedBy?: string | null } }
  editor: unknown
  contentRef?: (el: HTMLElement | null) => void
}

export const withLock = <P extends BlockProps>(
  BlockComponent: ComponentType<P>
): ComponentType<P> => {
  const WrappedComponent = (props: P) => {
    const { block } = props
    const isLocked = block.props.lockedBy != null
    // TODO: get current user id from context
    const currentUserId = null
    const isLockedByMe = block.props.lockedBy === currentUserId

    const lockedByOther = isLocked && !isLockedByMe

    return (
      <div className={lockedByOther ? "pointer-events-none opacity-50" : ""}>
        {isLocked && (
          <div className="text-caption text-subtext-color">
            🔒 {isLockedByMe ? "Locked by you" : `Locked by ${block.props.lockedBy}`}
          </div>
        )}
        <BlockComponent {...props} />
      </div>
    )
  }

  WrappedComponent.displayName = `withLock(${BlockComponent.displayName || BlockComponent.name || "Component"})`

  return WrappedComponent
}
