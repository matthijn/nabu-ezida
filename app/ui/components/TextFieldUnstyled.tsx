"use client";

import { forwardRef, type InputHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "~/ui/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
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
  );
});

interface TextFieldUnstyledRootProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

const TextFieldUnstyledRoot = forwardRef<HTMLDivElement, TextFieldUnstyledRootProps>(
  function TextFieldUnstyledRoot(
    { children, className, ...otherProps }: TextFieldUnstyledRootProps,
    ref
  ) {
    return (
      <div
        className={cn(
          "flex h-8 w-full items-center",
          className
        )}
        ref={ref}
        {...otherProps}
      >
        {children}
      </div>
    );
  }
);

export const TextFieldUnstyled = Object.assign(TextFieldUnstyledRoot, {
  Input,
});
