"use client"

import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type ChangeEvent,
} from "react"
import { cn } from "~/ui/utils"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...otherProps }: InputProps,
  ref
) {
  return (
    <input
      className={cn(
        "h-full w-full border-none bg-transparent text-body font-body text-default-font outline-none placeholder:text-neutral-400",
        className
      )}
      ref={ref}
      {...otherProps}
    />
  )
})

const LINE_HEIGHT = 20
const MAX_LINES = 4

const calcHeight = (el: HTMLTextAreaElement): number => {
  el.style.height = "auto"
  const lines = Math.min(Math.ceil(el.scrollHeight / LINE_HEIGHT), MAX_LINES)
  return lines * LINE_HEIGHT
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

const assignRef = <T,>(ref: React.ForwardedRef<T>, value: T | null): void => {
  if (typeof ref === "function") ref(value)
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, onChange, value, ...otherProps }: TextareaProps,
  forwardedRef
) {
  const localRef = useRef<HTMLTextAreaElement | null>(null)

  const internalRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      localRef.current = el
      if (el) el.style.height = `${calcHeight(el)}px`
      assignRef(forwardedRef, el)
    },
    [forwardedRef]
  )

  useLayoutEffect(() => {
    const el = localRef.current
    if (el) el.style.height = `${calcHeight(el)}px`
  }, [value])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      e.target.style.height = `${calcHeight(e.target)}px`
      onChange?.(e)
    },
    [onChange]
  )

  return (
    <textarea
      className={cn(
        "w-full resize-none border-none bg-transparent text-body font-body text-default-font outline-none placeholder:text-neutral-400 leading-5",
        className
      )}
      ref={internalRef}
      rows={1}
      value={value}
      onChange={handleChange}
      {...otherProps}
    />
  )
})

interface TextFieldUnstyledRootProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode
  className?: string
}

const TextFieldUnstyledRoot = forwardRef<HTMLDivElement, TextFieldUnstyledRootProps>(
  function TextFieldUnstyledRoot(
    { children, className, ...otherProps }: TextFieldUnstyledRootProps,
    ref
  ) {
    return (
      <div className={cn("flex min-h-8 w-full items-center", className)} ref={ref} {...otherProps}>
        {children}
      </div>
    )
  }
)

export const TextFieldUnstyled = Object.assign(TextFieldUnstyledRoot, {
  Input,
  Textarea,
})
