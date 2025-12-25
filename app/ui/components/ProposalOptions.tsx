"use client"

import { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react"
import { IconButton } from "~/ui/components/IconButton"
import { FeatherChevronLeft, FeatherChevronRight } from "@subframe/core"

type OptionProps = {
  title: string
  rationale: string
  icon?: ReactNode
  children: ReactNode
}

const Option = (_props: OptionProps) => null

type OptionData = {
  title: string
  rationale: string
  icon?: ReactNode
  content: ReactNode
}

const extractOptions = (children: ReactNode): OptionData[] => {
  const options: OptionData[] = []
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === Option) {
      const { title, rationale, icon, children: content } = child.props as OptionProps
      options.push({ title, rationale, icon, content })
    }
  })
  return options
}

const Dots = ({ count, current }: { count: number; current: number }) => (
  <div className="flex w-full items-center justify-center gap-2">
    {Array.from({ length: count }, (_, i) => (
      <div
        key={i}
        className={`flex h-2 w-2 flex-none rounded-full ${i === current ? "bg-brand-600" : "bg-neutral-200"}`}
      />
    ))}
  </div>
)

const OptionDescription = ({ option, index }: { option: OptionData; index: number }) => (
  <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
    <div className="flex w-full items-center gap-2">
      {option.icon}
      <span className="text-body-bold font-body-bold text-default-font">
        Option {index + 1}: {option.title}
      </span>
    </div>
    <span className="text-caption font-caption text-subtext-color">
      {option.rationale}
    </span>
  </div>
)

type ProposalOptionsProps = {
  children: ReactNode
}

const ProposalOptionsRoot = ({ children }: ProposalOptionsProps) => {
  const options = extractOptions(children)
  const [current, setCurrent] = useState(0)

  const prev = () => setCurrent((c) => (c - 1 + options.length) % options.length)
  const next = () => setCurrent((c) => (c + 1) % options.length)

  if (options.length === 0) return null

  const currentOption = options[current]

  return (
    <div className="flex w-full flex-col items-start gap-4">
      <div className="relative w-full">
        <IconButton
          className="absolute -left-10 top-1/2 -translate-y-1/2 !w-6"
          variant="brand-secondary"
          size="large"
          icon={<FeatherChevronLeft />}
          onClick={prev}
        />
        {currentOption.content}
        <IconButton
          className="absolute -right-10 top-1/2 -translate-y-1/2 !w-6"
          variant="brand-secondary"
          size="large"
          icon={<FeatherChevronRight />}
          onClick={next}
        />
      </div>
      <Dots count={options.length} current={current} />
      <OptionDescription option={currentOption} index={current} />
    </div>
  )
}

export const ProposalOptions = Object.assign(ProposalOptionsRoot, { Option })
