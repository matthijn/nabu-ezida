"use client"

import React from "react"
import {
  FeatherBold,
  FeatherBook,
  FeatherCode2,
  FeatherCopy,
  FeatherFiles,
  FeatherFileText,
  FeatherFolder,
  FeatherHash,
  FeatherHeading1,
  FeatherHeading2,
  FeatherHeading3,
  FeatherImage,
  FeatherItalic,
  FeatherLink,
  FeatherList,
  FeatherListChecks,
  FeatherListOrdered,
  FeatherMoreHorizontal,
  FeatherPin,
  FeatherPlus,
  FeatherQuote,
  FeatherSearch,
  FeatherSend,
  FeatherShare2,
  FeatherSparkles,
  FeatherStrikethrough,
  FeatherTrash,
  FeatherUnderline,
} from "@subframe/core"
import * as SubframeCore from "@subframe/core"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { DropdownMenu } from "~/ui/components/DropdownMenu"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
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
    <SidebarRailWithLabels.NavItem icon={<FeatherFiles />} selected tooltip="Browse all your documents">
      Documents
    </SidebarRailWithLabels.NavItem>
    <SidebarRailWithLabels.NavItem icon={<FeatherSearch />} className="opacity-40 pointer-events-none" tooltip="Search across documents">
      Search
    </SidebarRailWithLabels.NavItem>
    <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border" />
    <SidebarRailWithLabels.NavItem icon={<FeatherBook />} tooltip="Your qualitative codebook">
      Codes
    </SidebarRailWithLabels.NavItem>
  </SidebarRailWithLabels>
)

const DocumentsSidebarPanel = () => (
  <div className="flex h-full w-56 flex-none flex-col items-start bg-default-background shadow-lg">
    <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
      <div className="flex w-full items-center justify-between">
        <span className="text-heading-2 font-heading-2 text-default-font">Documents</span>
        <Button variant="brand-primary" size="small" icon={<FeatherPlus />}>New</Button>
      </div>
      <TextField className="h-auto w-full flex-none" variant="filled" label="" helpText="" icon={<FeatherSearch />}>
        <TextField.Input placeholder="Search..." value="" onChange={() => {}} />
      </TextField>
    </div>
    <div className="flex w-full grow shrink-0 basis-0 flex-col items-start py-2 overflow-y-auto">
      <TagRow icon={<FeatherFileText />} label="Interviews" count={4} active />
      <TagRow icon={<FeatherHash />} label="Memos" count={2} />
      <TagRow icon={<FeatherFolder />} label="General" count={1} />
    </div>
  </div>
)

const TagRow = ({ icon, label, count, active }: { icon: React.ReactNode; label: string; count: number; active?: boolean }) => (
  <div
    className="relative flex w-full cursor-default items-center gap-2 px-4 py-2.5 hover:bg-neutral-50"
    style={active ? { backgroundColor: "var(--color-brand-50, #eff6ff)" } : undefined}
  >
    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />}
    <span className="flex-none text-body font-body" style={active ? { color: "var(--color-brand-600, #2563eb)" } : undefined}>
      {icon}
    </span>
    <span className="grow shrink-0 basis-0 truncate text-body font-body text-default-font">
      {label}
    </span>
    <Badge variant="neutral" className="flex-none">{count}</Badge>
  </div>
)

const FileHeaderSection = () => (
  <div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4">
    <div className="flex w-full items-start gap-2">
      <div className="flex grow shrink-0 basis-0 items-center gap-2">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Interview Maria Round 1
        </span>
      </div>
      <IconButton variant="brand-tertiary" size="small" icon={<FeatherPin />} onClick={() => {}} />
      <IconButton size="small" icon={<FeatherShare2 />} onClick={() => {}} />
      <SubframeCore.DropdownMenu.Root>
        <SubframeCore.DropdownMenu.Trigger asChild>
          <IconButton size="small" icon={<FeatherMoreHorizontal />} onClick={() => {}} />
        </SubframeCore.DropdownMenu.Trigger>
        <SubframeCore.DropdownMenu.Portal>
          <SubframeCore.DropdownMenu.Content side="bottom" align="end" sideOffset={4} asChild>
            <DropdownMenu>
              <DropdownMenu.DropdownItem icon={<FeatherCopy />}>Duplicate</DropdownMenu.DropdownItem>
              <DropdownMenu.DropdownItem icon={<FeatherFileText />}>Export</DropdownMenu.DropdownItem>
              <DropdownMenu.DropdownItem icon={<FeatherTrash />}>Delete</DropdownMenu.DropdownItem>
            </DropdownMenu>
          </SubframeCore.DropdownMenu.Content>
        </SubframeCore.DropdownMenu.Portal>
      </SubframeCore.DropdownMenu.Root>
    </div>
    <div className="flex w-full items-center gap-2">
      <Badge variant="brand" icon={null}>Interview</Badge>
      <Badge variant="neutral" icon={null}>Round 1</Badge>
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

const DocumentContent = () => (
  <div className="flex w-full max-w-[768px] flex-col items-start gap-6 py-8">
    <span className="text-heading-1 font-heading-1 text-default-font">
      Interview Maria Round 1
    </span>
    <span className="text-body font-body text-subtext-color">
      Semi-structured interview conducted on January 15, 2024. Focus on community engagement
      and stakeholder perspectives.
    </span>
    <div className="flex w-full flex-col items-start gap-4">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Background
      </span>
      <span className="text-body font-body text-default-font">
        Maria has been working in community development for over fifteen years, primarily
        in rural regions where land use conflicts are common. Her experience spans multiple
        organizations, from grassroots NGOs to international development agencies. She
        describes her approach as &ldquo;listening first&rdquo; — spending time understanding
        community dynamics before proposing interventions.
      </span>
    </div>
    <div className="flex w-full flex-col items-start gap-4">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Stakeholder Dynamics
      </span>
      <span className="text-body font-body text-default-font">
        &ldquo;The hardest part is when people feel they haven&rsquo;t been heard. You can
        have the best technical solution in the world, but if communities don&rsquo;t feel
        ownership over it, it won&rsquo;t last. We learned that the hard way in the northern
        province project.&rdquo;
      </span>
      <span className="text-body font-body text-default-font">
        She highlighted the tension between government timelines and community readiness,
        noting that rushed consultations often led to resistance rather than cooperation.
        The participatory mapping sessions were a turning point — when people could see
        their knowledge reflected in the planning documents, trust began to build.
      </span>
    </div>
    <div className="flex w-full flex-col items-start gap-4">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Reflections
      </span>
      <span className="text-body font-body text-default-font">
        Maria emphasized that sustainable outcomes require patience and genuine partnership.
        &ldquo;We&rsquo;re not just implementing programs — we&rsquo;re building
        relationships that outlast any single project cycle.&rdquo;
      </span>
    </div>
  </div>
)

const ScrollGutterPreview = () => (
  <div className="flex w-8 flex-none flex-col items-center gap-1 self-stretch border-l border-solid border-neutral-border bg-neutral-50 px-1 py-12">
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#86efacff]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#fcd34dff]" />
    <div className="flex h-6 w-full flex-none items-start" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#fcd34dff]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4ff]" />
    <div className="flex h-8 w-full flex-none items-start" />
    <div className="flex h-3 w-full flex-none items-start rounded-full bg-[#86efacff]" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#fca5a5ff]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#86efacff]" />
    <div className="flex h-6 w-full flex-none items-start" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#fcd34dff]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4ff]" />
  </div>
)

const ChatPanel = () => (
  <div className="flex w-full grow flex-col rounded-xl bg-white overflow-hidden">
    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
      <IconWithBackground variant="brand" size="medium" icon={<FeatherSparkles />} />
      <span className="text-body font-body text-subtext-color">How can I help you today?</span>
      <Button variant="brand-primary" icon={<FeatherSparkles />} onClick={() => {}}>
        Start chat
      </Button>
    </div>
    <div className="flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3">
      <TextFieldUnstyled className="grow min-h-5">
        <TextFieldUnstyled.Textarea placeholder="Message Nabu..." />
      </TextFieldUnstyled>
      <IconButton variant="brand-primary" icon={<FeatherSend />} onClick={() => {}} />
    </div>
  </div>
)

export default function NabuCurrent() {
  return (
    <div className="flex h-screen w-full items-center">
      <div className="relative z-50 flex h-full flex-none">
        <NavRail />
      </div>
      <div className="flex h-full grow overflow-hidden bg-neutral-100 p-3">
        <div className="relative flex grow flex-col items-start rounded-xl bg-default-background overflow-hidden" style={{ minWidth: 400 }}>
          <FileHeaderSection />
          <div className="flex w-full grow shrink basis-0 min-h-0 items-stretch overflow-hidden">
            <div className="flex grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto">
              <ToolbarSection />
              <DocumentContent />
            </div>
            <ScrollGutterPreview />
          </div>
        </div>
        <div style={{ width: 12 }} />
        <div className="flex flex-col flex-none h-full" style={{ width: 384 }}>
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
