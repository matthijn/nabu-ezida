"use client";

import React from "react";
import * as SubframeUtils from "../utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...otherProps }: InputProps,
  ref
) {
  return (
    <input
      className={SubframeUtils.twClassNames(
        "h-full w-full border-none bg-transparent text-body font-body text-default-font outline-none placeholder:text-neutral-400",
        className
      )}
      ref={ref}
      {...otherProps}
    />
  );
});

interface TextFieldUnstyledRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

const TextFieldUnstyledRoot = React.forwardRef<HTMLDivElement, TextFieldUnstyledRootProps>(
  function TextFieldUnstyledRoot(
    { children, className, ...otherProps }: TextFieldUnstyledRootProps,
    ref
  ) {
    return (
      <div
        className={SubframeUtils.twClassNames(
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
