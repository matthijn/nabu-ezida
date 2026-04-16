"use client"

import React from "react"
import {
  FeatherBarChart3,
  FeatherBold,
  FeatherBook,
  FeatherCheck,
  FeatherChevronRight,
  FeatherCode2,
  FeatherCopy,
  FeatherFileText,
  FeatherFiles,
  FeatherFlag,
  FeatherHeading1,
  FeatherHeading2,
  FeatherHeading3,
  FeatherImage,
  FeatherItalic,
  FeatherLink,
  FeatherList,
  FeatherListOrdered,
  FeatherListChecks,
  FeatherMoreHorizontal,
  FeatherPlus,
  FeatherQuote,
  FeatherSearch,
  FeatherSend,
  FeatherStrikethrough,
  FeatherUnderline,
  FeatherX,
} from "@subframe/core"
import * as SubframeCore from "@subframe/core"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { DropdownMenu } from "~/ui/components/DropdownMenu"
import { IconButton } from "~/ui/components/IconButton"
import { SidebarRailWithLabels } from "~/ui/components/SidebarRailWithLabels"
import { TextField } from "~/ui/components/TextField"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { Avatar } from "~/ui/components/Avatar"

const NavRail = () => (
  <SidebarRailWithLabels
    header={
      <div className="flex flex-col items-center justify-center gap-2 px-1 py-1">
        <img
          className="h-6 w-6 flex-none object-cover"
          src="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/y2rsnhq3mex4auk54aye.png"
          alt="Logo"
        />
      </div>
    }
    footer={
      <div className="flex flex-col items-center justify-end gap-1 px-2 py-2">
        <Avatar image="/avatar.png">A</Avatar>
      </div>
    }
  >
    <SidebarRailWithLabels.NavItem icon={<FeatherFiles />} selected>
      Documents
    </SidebarRailWithLabels.NavItem>
    <SidebarRailWithLabels.NavItem icon={<FeatherBarChart3 />}>
      Exhibits
    </SidebarRailWithLabels.NavItem>
    <SidebarRailWithLabels.NavItem icon={<FeatherBook />}>
      <div className="relative">
        Codes
        <div className="absolute -top-1.5 -right-4 flex h-4 w-4 items-center justify-center rounded-full bg-warning-500 text-[10px] font-bold text-white">
          9
        </div>
      </div>
    </SidebarRailWithLabels.NavItem>
    <SidebarRailWithLabels.NavItem icon={<FeatherSearch />}>
      Search
    </SidebarRailWithLabels.NavItem>
  </SidebarRailWithLabels>
)

const RADIX: Record<string, { bg3: string; border8: string; solid9: string }> = {
  tomato:  { bg3: "#fff0ee", border8: "#ec8e7b", solid9: "#e54d2e" },
  red:     { bg3: "#ffe5e1", border8: "#eb9091", solid9: "#e5484d" },
  crimson: { bg3: "#ffe5eb", border8: "#e58fb1", solid9: "#e93d82" },
  purple:  { bg3: "#f3e7fc", border8: "#bf7af0", solid9: "#8e4ec6" },
  violet:  { bg3: "#ede6fe", border8: "#9b8ced", solid9: "#6e56cf" },
  indigo:  { bg3: "#e0e4ff", border8: "#849dff", solid9: "#3e63dd" },
  blue:    { bg3: "#e1efff", border8: "#5eb0ef", solid9: "#0090ff" },
  teal:    { bg3: "#d2f7ef", border8: "#53b9ab", solid9: "#12a594" },
  green:   { bg3: "#ddf3e4", border8: "#5bb98c", solid9: "#30a46c" },
  grass:   { bg3: "#ddf3e0", border8: "#63b473", solid9: "#46a758" },
  amber:   { bg3: "#fff1d6", border8: "#e4a221", solid9: "#ffb224" },
  orange:  { bg3: "#ffe8d7", border8: "#ed8a5c", solid9: "#f76b15" },
  yellow:  { bg3: "#fff3c7", border8: "#d5ae39", solid9: "#f5d90a" },
}

const elementBg = (color: string): string => RADIX[color]?.bg3 ?? "#f5f5f5"
const borderColor = (color: string): string => RADIX[color]?.border8 ?? "#ccc"
const solidBg = (color: string): string => RADIX[color]?.solid9 ?? "#888"

const CodesSidebar = () => (
  <div className="relative z-10 flex h-full w-64 flex-none flex-col items-start bg-default-background shadow-lg">
    <div className="flex w-full flex-none flex-col">
      <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-2 font-heading-2 text-default-font">Codes</span>
          <IconButton variant="brand-primary" size="small" icon={<FeatherPlus />} onClick={() => {}} />
        </div>
        <TextField className="h-auto w-full flex-none" variant="filled" label="" helpText="" icon={<FeatherSearch />}>
          <TextField.Input placeholder="Filter codes..." value="" onChange={() => {}} />
        </TextField>
      </div>
      <NeedsReviewRow count={9} />
    </div>
    <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-4 py-4 overflow-y-auto">
      <CodeGroup label="Economy">
        <CodeItem radix="tomato" label="Fiscal state reporting" />
      </CodeGroup>
      <CodeGroup label="Elasticity">
        <CodeItem radix="purple" label="Exhaustion" />
        <CodeItem radix="purple" label="High flexibility" />
        <CodeItem radix="indigo" label="Crystallization" />
      </CodeGroup>
      <CodeGroup label="Governance">
        <CodeItem radix="teal" label="Citizen-facing rules & thresholds" />
        <CodeItem radix="green" label="Responsibilization" />
        <CodeItem radix="green" label="Privacy & data protection" />
        <CodeItem radix="indigo" label="Monitoring, metrics & steering" />
      </CodeGroup>
      <CodeGroup label="Legitimation">
        <CodeItem radix="indigo" label="Appeal to industry" />
        <CodeItem radix="indigo" label="Appeal to expertise" />
      </CodeGroup>
      <CodeGroup label="Misinfo">
        <CodeItem radix="purple" label="Conspiracy theories" />
      </CodeGroup>
      <CodeGroup label="Neoliberal">
        <CodeItem radix="tomato" label="Market justification" />
        <CodeItem radix="tomato" label="Individual risk calculation" />
        <CodeItem radix="amber" label="Citizens as customers" />
        <CodeItem radix="amber" label="Aid conditionality" />
      </CodeGroup>
      <CodeGroup label="Normative">
        <CodeItem radix="green" label="Solidarity / moral appeal" />
      </CodeGroup>
      <CodeGroup label="Pathdep">
        <CodeItem radix="indigo" label="Philosophical commitment" />
      </CodeGroup>
    </div>
  </div>
)

const NeedsReviewRow = ({ count }: { count: number }) => (
  <>
    <div className="flex w-full items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-warning-50">
      <FeatherFlag className="h-4 w-4 flex-none text-warning-600" />
      <span className="grow shrink-0 basis-0 text-body font-body text-default-font">Needs review</span>
      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-500 px-1.5 text-[11px] font-bold leading-none text-white">
        {count}
      </span>
    </div>
    <div className="flex h-px w-full flex-none bg-neutral-border" />
  </>
)

const CodeGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex w-full flex-col items-start gap-2">
    <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
      {label}
    </span>
    {children}
  </div>
)

const CodeItem = ({ radix, label }: { radix: string; label: string }) => (
  <div
    className="flex w-full cursor-pointer items-center gap-2 rounded-md border-2 border-solid px-3 py-2"
    style={{ backgroundColor: elementBg(radix), borderColor: borderColor(radix) }}
  >
    <div
      className="flex h-2 w-2 flex-none rounded-full"
      style={{ backgroundColor: solidBg(radix) }}
    />
    <span className="grow shrink-0 basis-0 text-body font-body text-default-font">{label}</span>
  </div>
)

const FileHeaderSection = () => (
  <div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4">
    <div className="flex w-full items-start gap-2">
      <span className="grow text-heading-2 font-heading-2 text-default-font">
        Governance Analysis
      </span>
      <SubframeCore.DropdownMenu.Root>
        <SubframeCore.DropdownMenu.Trigger asChild>
          <IconButton size="small" icon={<FeatherMoreHorizontal />} onClick={() => {}} />
        </SubframeCore.DropdownMenu.Trigger>
        <SubframeCore.DropdownMenu.Portal>
          <SubframeCore.DropdownMenu.Content side="bottom" align="end" sideOffset={4} asChild>
            <DropdownMenu>
              <DropdownMenu.DropdownItem icon={<FeatherCopy />}>Copy raw</DropdownMenu.DropdownItem>
              <DropdownMenu.DropdownItem icon={<FeatherFileText />}>Export</DropdownMenu.DropdownItem>
            </DropdownMenu>
          </SubframeCore.DropdownMenu.Content>
        </SubframeCore.DropdownMenu.Portal>
      </SubframeCore.DropdownMenu.Root>
    </div>
    <div className="flex w-full items-center gap-2">
      <Badge variant="brand" icon={null}>
        <div className="flex items-center gap-1">
          Analysis
          <FeatherX className="h-3 w-3 cursor-pointer" />
        </div>
      </Badge>
      <Button variant="neutral-tertiary" size="small" icon={<FeatherPlus />} onClick={() => {}}>
        Add tag
      </Button>
    </div>
  </div>
)

const ToolbarSection = () => (
  <div className="flex w-full items-center justify-center">
    <div className="flex items-start gap-1 rounded-full border border-solid border-neutral-border bg-default-background px-2 py-2 shadow-md">
      <IconButton size="small" icon={<FeatherHeading1 />} />
      <IconButton size="small" icon={<FeatherHeading2 />} />
      <IconButton size="small" icon={<FeatherHeading3 />} />
      <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
      <IconButton size="small" icon={<FeatherBold />} />
      <IconButton size="small" icon={<FeatherItalic />} />
      <IconButton size="small" icon={<FeatherUnderline />} />
      <IconButton size="small" icon={<FeatherStrikethrough />} />
      <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
      <IconButton size="small" icon={<FeatherLink />} />
      <IconButton size="small" icon={<FeatherImage />} />
      <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
      <IconButton size="small" icon={<FeatherList />} />
      <IconButton size="small" icon={<FeatherListOrdered />} />
      <IconButton size="small" icon={<FeatherListChecks />} />
      <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
      <IconButton size="small" icon={<FeatherCode2 />} />
      <IconButton size="small" icon={<FeatherQuote />} />
    </div>
  </div>
)

const EntityLink = ({
  color,
  icon,
  label,
}: {
  color: string
  icon: React.ReactNode
  label: string
}) => (
  <span
    className="inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer transition-colors"
    style={{ backgroundColor: `${color}20`, color }}
  >
    <span className="inline-flex h-3.5 w-3.5 items-center justify-center">{icon}</span>
    <span className="text-body font-body">{label}</span>
  </span>
)

const DocumentContent = () => (
  <div className="flex w-full max-w-[768px] flex-col items-start gap-6 py-8">
    <span className="text-heading-1 font-heading-1 text-default-font">
      Governance Analysis
    </span>

    <div className="flex w-full flex-col items-start gap-4">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Code Frequency Over Time
      </span>
      <span className="text-body font-body text-default-font">
        This chart shows the distribution of governance-related codes across the corpus by month.
      </span>
    </div>

    <div className="flex w-full flex-col items-start gap-4">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Summary of findings
      </span>
      <span className="text-body font-body text-default-font">
        The analysis of governance rhetoric currently spans from March 2020 through July 2020.
        During the establishment phase (March&ndash;May), there is a high frequency of codes related
        to <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-caption font-mono">callout-8icfq22d</code> (Citizen-facing
        rules &amp; thresholds) and <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-caption font-mono">callout-2wnrt1n8</code> (Responsibilization),
        reflecting the intensive initial communication of measures and the shift of responsibility onto the public.
      </span>
      <span className="text-body font-body text-default-font">
        As the crisis progressed into June and July 2020, the volume of these governance markers
        decreased, coinciding with the &ldquo;normalization&rdquo; phase of the pandemic response
        before later waves.
      </span>
    </div>

    <span className="text-body font-body text-default-font">
      Analysis of governance mechanisms and their evolution over time.
    </span>
  </div>
)

const StatusBar = () => (
  <div className="flex w-full items-center justify-center border-t border-solid border-neutral-border px-6 py-2">
    <span className="text-caption font-caption text-subtext-color">
      186 words &middot; &lt; 1 min read
    </span>
  </div>
)

const ScrollGutter = () => (
  <div className="flex w-8 flex-none flex-col items-center gap-1 self-stretch border-l border-solid border-neutral-border bg-neutral-50 px-1 py-12">
    <div className="flex h-2 w-full flex-none rounded-full bg-[#12a594]" />
    <div className="flex h-1 w-full flex-none rounded-full bg-[#30a46c]" />
    <div className="flex h-6 w-full flex-none" />
    <div className="flex h-1 w-full flex-none rounded-full bg-[#3e63dd]" />
    <div className="flex h-1 w-full flex-none rounded-full bg-[#30a46c]" />
    <div className="flex h-8 w-full flex-none" />
    <div className="flex h-3 w-full flex-none rounded-full bg-[#12a594]" />
    <div className="flex h-2 w-full flex-none rounded-full bg-[#e54d2e]" />
    <div className="flex h-1 w-full flex-none rounded-full bg-[#8e4ec6]" />
  </div>
)

const UserBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full items-end justify-end">
    <div className="flex max-w-[95%] flex-col items-start rounded-2xl bg-brand-200 px-4 py-3">
      <span className="text-body font-body text-default-font">{children}</span>
    </div>
  </div>
)

const AssistantBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full items-start">
    <div className="flex max-w-[95%] flex-col items-start rounded-2xl bg-neutral-100 px-4 py-3">
      {children}
    </div>
  </div>
)

const OptionCard = ({
  label,
  selected,
  dimmed,
}: {
  label: string
  selected?: boolean
  dimmed?: boolean
}) => (
  <div
    className={`flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2 ${
      selected
        ? "border-brand-600 bg-brand-50"
        : dimmed
          ? "border-neutral-border bg-white opacity-50"
          : "border-neutral-border bg-white hover:border-brand-600 hover:bg-brand-50 cursor-pointer"
    }`}
  >
    {selected ? (
      <FeatherCheck className="text-body text-brand-600 flex-none" />
    ) : (
      <FeatherChevronRight className="text-body text-neutral-400 flex-none" />
    )}
    <span className="grow text-body font-body text-default-font">{label}</span>
  </div>
)

const ChatPanel = () => (
  <div className="flex w-full grow flex-col rounded-xl bg-white overflow-hidden">
    <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-3 px-4 py-4 overflow-y-auto">
      <UserBubble>Another day, another deep dive into research.</UserBubble>

      <AssistantBubble>
        <span className="text-body font-body text-default-font">
          Ready when you are! What&rsquo;s on the horizon for today&rsquo;s session?
        </span>
      </AssistantBubble>

      <UserBubble>can you tell me which codes are discussed in this file</UserBubble>

      <AssistantBubble>
        <div className="flex flex-col items-start gap-2">
          <span className="text-body font-body text-default-font">
            The{" "}
            <EntityLink color="#12a594" icon={<FeatherFileText className="h-3.5 w-3.5" />} label="Governance Analysis" />{" "}
            file specifically discusses the frequency and trends of governance-related codes from the first phase of the pandemic.
          </span>
          <span className="text-body font-body text-default-font">
            The two codes explicitly highlighted in the findings are:
          </span>
          <ul className="flex w-full flex-col items-start gap-2 pl-4">
            <li className="flex items-start gap-1">
              <span className="text-body font-body text-default-font">
                <EntityLink color="#12a594" icon={<FeatherBook className="h-3.5 w-3.5" />} label="Citizen-facing rules & thresholds" />{" "}
                &mdash; Noted for its high frequency during the establishment phase (March&ndash;May 2020) as behavioral rules were communicated.
              </span>
            </li>
            <li className="flex items-start gap-1">
              <span className="text-body font-body text-default-font">
                <EntityLink color="#30a46c" icon={<FeatherBook className="h-3.5 w-3.5" />} label="Responsibilization" />{" "}
                &mdash; Also highlighted as a key marker during the initial phase, reflecting the shift of responsibility onto public compliance.
              </span>
            </li>
          </ul>
          <span className="text-body font-body text-default-font">
            Additionally, the file includes a chart that tracks the full suite of codes from the{" "}
            <EntityLink color="#30a46c" icon={<FeatherBook className="h-3.5 w-3.5" />} label="Governance" />{" "}
            group, which also includes:
          </span>
          <ul className="flex w-full flex-col items-start gap-1 pl-4">
            <li>
              <EntityLink color="#30a46c" icon={<FeatherBook className="h-3.5 w-3.5" />} label="Privacy & data protection" />
            </li>
            <li>
              <EntityLink color="#3e63dd" icon={<FeatherBook className="h-3.5 w-3.5" />} label="Monitoring, metrics & steering" />
            </li>
          </ul>
        </div>
      </AssistantBubble>

      <UserBubble>can you ask me a question using ask tool I need to try something</UserBubble>

      <AssistantBubble>
        <span className="text-body font-body text-default-font">
          Since &lsquo;Citizen-facing rules &amp; thresholds&rsquo; appears frequently in the early
          transcripts, would you like to split it into specific sub-codes to see if certain types
          of rules drive the trend more than others?
        </span>
      </AssistantBubble>

      <div className="flex w-full flex-col items-start gap-1.5 max-w-[95%]">
        <OptionCard label="Yes, split into sub-codes (e.g., distancing vs. group sizes)" />
        <OptionCard label="No, keep it as a single category for now" />
        <OptionCard label="Wait until the full 2020 sequence is coded before deciding" />
      </div>

      <div className="flex items-center gap-1">
        <FeatherBook className="h-3 w-3 text-subtext-color" />
        <span className="text-caption font-caption text-subtext-color">Codebook</span>
      </div>
    </div>

    <div className="flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3">
      <TextFieldUnstyled className="grow min-h-5">
        <TextFieldUnstyled.Input placeholder="Or type your own answer..." value="" onChange={() => {}} />
      </TextFieldUnstyled>
      <IconButton variant="brand-primary" icon={<FeatherSend />} onClick={() => {}} />
    </div>
  </div>
)

export default function NabuShowcase() {
  return (
    <div className="flex h-screen w-full items-center">
      <div className="relative z-50 flex h-full flex-none">
        <NavRail />
      </div>

      <div className="relative z-40 flex h-full flex-none">
        <CodesSidebar />
      </div>

      <div className="flex h-full grow overflow-hidden bg-neutral-100 p-3">
        <div className="relative flex grow flex-col items-start rounded-xl bg-default-background overflow-hidden" style={{ minWidth: 400 }}>
          <FileHeaderSection />
          <div className="flex w-full grow shrink basis-0 min-h-0 items-stretch overflow-hidden">
            <div className="flex grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto">
              <ToolbarSection />
              <DocumentContent />
            </div>
            <ScrollGutter />
          </div>
          <StatusBar />
        </div>
        <div style={{ width: 12 }} />
        <div className="flex flex-col flex-none h-full" style={{ width: 384 }}>
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
