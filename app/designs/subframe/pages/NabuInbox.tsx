"use client"

import React from "react"
import {
  FeatherBook,
  FeatherCheck,
  FeatherCopy,
  FeatherFiles,
  FeatherFileText,
  FeatherFlag,
  FeatherLoader2,
  FeatherMoreHorizontal,
  FeatherPin,
  FeatherPlus,
  FeatherSearch,
  FeatherShare2,
  FeatherTrash,
  FeatherX,
} from "@subframe/core"
import * as SubframeCore from "@subframe/core"
import { Avatar } from "~/ui/components/Avatar"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { DropdownMenu } from "~/ui/components/DropdownMenu"
import { IconButton } from "~/ui/components/IconButton"
import { SidebarRailWithLabels } from "~/ui/components/SidebarRailWithLabels"
import { TextField } from "~/ui/components/TextField"

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
    <SidebarRailWithLabels.NavItem icon={<FeatherFiles />}>
      Documents
    </SidebarRailWithLabels.NavItem>
    <SidebarRailWithLabels.NavItem icon={<FeatherSearch />} className="opacity-40 pointer-events-none">
      Search
    </SidebarRailWithLabels.NavItem>
    <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border" />
    <SidebarRailWithLabels.NavItem icon={<FeatherBook />} selected>
      Codes
    </SidebarRailWithLabels.NavItem>
  </SidebarRailWithLabels>
)

const CodeItem = ({
  name,
  color,
  highlighted,
}: {
  name: string
  color: string
  highlighted?: boolean
}) => (
  <div
    className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-solid px-3 py-2"
    style={{
      backgroundColor: color + "1a",
      borderColor: highlighted ? color : "transparent",
    }}
  >
    <div
      className="flex h-2 w-2 flex-none rounded-full"
      style={{ backgroundColor: color }}
    />
    <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
      {name}
    </span>
  </div>
)

const CodesSidebarPanel = () => (
  <div className="relative z-10 flex h-full w-56 flex-none flex-col items-start bg-default-background shadow-lg">
    <div className="flex w-full flex-none flex-col">
      <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-2 font-heading-2 text-default-font">Codes</span>
          <Button variant="brand-primary" size="small" icon={<FeatherPlus />} onClick={() => {}} />
        </div>
        <TextField className="h-auto w-full flex-none" variant="filled" label="" helpText="" icon={<FeatherSearch />}>
          <TextField.Input placeholder="Filter codes..." value="" onChange={() => {}} />
        </TextField>
      </div>
      <div className="flex w-full items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-warning-50">
        <FeatherFlag className="text-body font-body text-warning-600" />
        <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
          Needs review
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-warning-500 px-1.5 text-[11px] font-bold leading-none text-white">
          3
        </span>
      </div>
      <div className="flex h-px w-full flex-none bg-neutral-border" />
    </div>
    <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-4 py-4 overflow-auto">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
          ENVIRONMENTAL IMPACT
        </span>
        <CodeItem name="Conservation Success" color="#22c55e" />
        <CodeItem name="Habitat Degradation" color="#eab308" highlighted />
        <CodeItem name="Critical Threat" color="#ef4444" />
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
          POLICY &amp; GOVERNANCE
        </span>
        <CodeItem name="Regulatory Framework" color="#3b82f6" />
        <CodeItem name="Stakeholder Engagement" color="#93c5fd" />
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
          COMMUNITY RESPONSE
        </span>
        <CodeItem name="Indigenous Knowledge" color="#f9a8d4" />
        <CodeItem name="Local Resistance" color="#a78bfa" />
      </div>
    </div>

    {/* Code detail panel — shown on hover of "Habitat Degradation" */}
    <div className="absolute left-full top-0 h-full w-80 flex flex-col items-start bg-default-background [box-shadow:4px_0_6px_-1px_rgb(0_0_0/0.1),4px_0_4px_-2px_rgb(0_0_0/0.1)]">
      <div className="flex w-full items-center gap-2 border-b-2 border-solid border-warning-500 bg-warning-50 px-4 py-4">
        <div className="flex h-3 w-3 flex-none rounded-full bg-warning-500" />
        <span className="text-heading-3 font-heading-3 text-default-font">
          Habitat Degradation
        </span>
        <button className="ml-auto flex-none cursor-pointer text-warning-600">
          <FeatherSearch className="h-4 w-4" />
        </button>
      </div>
      <div className="flex w-full grow flex-col items-start gap-3 px-4 pb-4 pt-3 overflow-y-auto">
        <span className="text-body font-body text-default-font">
          Evidence of ecosystem function loss, biodiversity decline, or
          significant environmental deterioration
        </span>
        <span className="text-body-bold font-body-bold text-default-font mt-2">
          Inclusion Examples
        </span>
        <div className="flex flex-col gap-1 pl-2">
          <span className="text-body font-body text-subtext-color">
            Deforestation reducing canopy cover
          </span>
          <span className="text-body font-body text-subtext-color">
            Soil erosion from agricultural practices
          </span>
          <span className="text-body font-body text-subtext-color">
            Water pollution affecting aquatic life
          </span>
        </div>
        <span className="text-body-bold font-body-bold text-default-font mt-2">
          Exclusion Examples
        </span>
        <div className="flex flex-col gap-1 pl-2">
          <span className="text-body font-body text-subtext-color">
            Natural seasonal changes
          </span>
          <span className="text-body font-body text-subtext-color">
            Managed sustainable practices
          </span>
          <span className="text-body font-body text-subtext-color">
            Restoration in progress
          </span>
        </div>
      </div>
    </div>
  </div>
)

const FileHeaderSection = () => (
  <div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4">
    <div className="flex w-full items-start gap-2">
      <div className="flex grow shrink-0 basis-0 items-center gap-2">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Habitat Destruction Framework
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
      <Badge variant="brand" icon={null}>Framework</Badge>
      <Badge variant="neutral" icon={null}>Ecology</Badge>
      <Badge variant="neutral" icon={null}>Conservation</Badge>
      <Button variant="neutral-tertiary" size="small" icon={<FeatherPlus />} onClick={() => {}}>
        Add tag
      </Button>
    </div>
  </div>
)

const DocumentContent = () => (
  <div className="flex w-full max-w-[768px] flex-col items-start gap-8 py-8">
    <div className="flex w-full flex-col items-start gap-4">
      <span className="text-heading-1 font-heading-1 text-default-font">
        Habitat Destruction Framework
      </span>
      <span className="text-body font-body text-subtext-color">
        A comprehensive analysis of ecosystem degradation patterns
        and conservation strategies across tropical regions
      </span>
    </div>
    <div className="flex w-full flex-col items-start gap-6">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Environmental Impact
      </span>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Conservation Success
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font">
            Costa Rica&#39;s
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-success-50 px-1">
            reforestation program
          </span>
          <span className="text-body font-body text-default-font">
            has restored over 15,000 hectares of degraded tropical
            forest since 2021. Payment for ecosystem services
            initiatives have incentivized 2,400 landowners to
            maintain forest cover, resulting in a 23% increase in
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-warning-50 px-1">
            jaguar corridor connectivity
          </span>
          <span className="text-body font-body text-default-font">
            . Community-managed reserves now protect
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-success-50 px-1">
            340 endemic species
          </span>
          <span className="text-body font-body text-default-font">
            previously classified as vulnerable.
          </span>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Habitat Degradation
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font">
            Palm oil expansion in
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-warning-50 px-1">
            Borneo
          </span>
          <span className="text-body font-body text-default-font">
            has eliminated 40% of orangutan habitat over the past
            decade.
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-error-50 px-1">
            Soil erosion from slash-and-burn agriculture
          </span>
          <span className="text-body font-body text-default-font">
            destabilizes watersheds affecting downstream
            communities. Canopy cover reduction of 65% in logging
            zones has disrupted
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-success-50 px-1">
            pollinator networks
          </span>
          <span className="text-body font-body text-default-font">
            essential for ecosystem regeneration.
          </span>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Critical Threat
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font">
            Illegal logging operations in the
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-warning-50 px-1">
            Leuser Ecosystem
          </span>
          <span className="text-body font-body text-default-font">
            threaten the last remaining habitat where orangutans,
            tigers, elephants, and rhinos coexist. Without
            immediate intervention, projections indicate
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-error-50 px-1">
            complete population collapse within 8-12 years
          </span>
          <span className="text-body font-body text-default-font">
            .
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-error-50 px-1">
            Mining concessions
          </span>
          <span className="text-body font-body text-default-font">
            overlap with 78% of identified
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-[#fce7f3ff] px-1">
            biodiversity hotspots
          </span>
          <span className="text-body font-body text-default-font">
            requiring urgent protective measures.
          </span>
        </div>
      </div>
    </div>
    <div className="flex w-full flex-col items-start gap-6">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Policy &amp; Governance
      </span>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Regulatory Framework
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font">
            New
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-[#dbeafeff] px-1">
            environmental impact assessment protocols
          </span>
          <span className="text-body font-body text-default-font">
            require comprehensive biodiversity surveys before land
            conversion permits.
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-[#dbeafeff] px-1">
            Enforcement mechanisms include satellite monitoring
            systems
          </span>
          <span className="text-body font-body text-default-font">
            that detect illegal deforestation within 48 hours.
            Penalties have increased 300% with proceeds directed
            to restoration funds.
          </span>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Stakeholder Engagement
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font rounded-sm bg-[#dbeafeff] px-1">
            Multi-stakeholder dialogues
          </span>
          <span className="text-body font-body text-default-font">
            brought together government agencies, conservation
            NGOs, agricultural cooperatives, and timber companies
            to develop
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-warning-50 px-1">
            sustainable land use agreements
          </span>
          <span className="text-body font-body text-default-font">
            .
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-[#fce7f3ff] px-1">
            Participatory mapping sessions
          </span>
          <span className="text-body font-body text-default-font">
            identified 12 critical wildlife corridors requiring
            protection while maintaining economic livelihoods for
            8,000 rural households.
          </span>
        </div>
      </div>
    </div>
    <div className="flex w-full flex-col items-start gap-6">
      <span className="text-heading-2 font-heading-2 text-default-font">
        Community Response
      </span>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Indigenous Knowledge
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font">
            Traditional ecological knowledge from
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-warning-50 px-1">
            Dayak communities
          </span>
          <span className="text-body font-body text-default-font">
            identifies 47 indicator species that signal ecosystem
            health changes years before scientific monitoring
            detects decline.
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-[#fce7f3ff] px-1">
            Ancestral fire management practices
          </span>
          <span className="text-body font-body text-default-font">
            reduce wildfire risk by 67% compared to government
            suppression-only approaches.
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-success-50 px-1">
            Sacred forest groves
          </span>
          <span className="text-body font-body text-default-font">
            maintained for generations harbor 89% of regional
            medicinal plant diversity.
          </span>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Local Resistance
        </span>
        <div className="flex w-full flex-wrap gap-1 items-baseline">
          <span className="text-body font-body text-default-font rounded-sm bg-warning-50 px-1">
            Community blockades
          </span>
          <span className="text-body font-body text-default-font">
            prevented logging trucks from accessing old-growth
            forest areas designated for clear-cutting.
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-[#fce7f3ff] px-1">
            Grassroots monitoring networks
          </span>
          <span className="text-body font-body text-default-font">
            document violations using smartphone apps, submitting
            340 verified reports that led to permit suspensions.
          </span>
          <span className="text-body font-body text-default-font rounded-sm bg-success-50 px-1">
            Youth activists organized river cleanups
          </span>
          <span className="text-body font-body text-default-font">
            removing 12 tons of pollution while pressuring
            upstream palm oil mills to upgrade filtration systems.
          </span>
        </div>
      </div>
    </div>
  </div>
)

const ScrollGutterPreview = () => (
  <div className="flex w-8 flex-none flex-col items-center gap-1 self-stretch border-l border-solid border-neutral-border bg-neutral-50 px-1 py-10">
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#86efac]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#fcd34d]" />
    <div className="flex h-6 w-full flex-none items-start" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#fcd34d]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4]" />
    <div className="flex h-8 w-full flex-none items-start" />
    <div className="flex h-3 w-full flex-none items-start rounded-full bg-[#86efac]" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#fca5a5]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#86efac]" />
    <div className="flex h-6 w-full flex-none items-start" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#fcd34d]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4]" />
    <div className="flex h-10 w-full flex-none items-start" />
    <div className="flex h-3 w-full flex-none items-start rounded-full bg-[#fca5a5]" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#fca5a5]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4]" />
    <div className="flex h-8 w-full flex-none items-start" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#93c5fd]" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#93c5fd]" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#93c5fd]" />
    <div className="flex h-10 w-full flex-none items-start" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#fcd34d]" />
    <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4]" />
    <div className="flex h-6 w-full flex-none items-start" />
    <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#86efac]" />
  </div>
)

export default function NabuInbox() {
  return (
    <div className="flex h-screen w-full items-center">
      <div className="relative z-50 flex h-full flex-none" >
        <div className="relative z-30">
          <NavRail />
        </div>
        <div className="absolute left-full top-0 h-full z-20 shadow-xl">
          <CodesSidebarPanel />
        </div>
      </div>
      <div className="flex h-full grow overflow-hidden bg-neutral-100 p-3">
        <div className="relative flex grow flex-col items-start rounded-xl bg-default-background overflow-hidden" style={{ minWidth: 400 }}>
          <FileHeaderSection />
          <div className="flex w-full grow shrink basis-0 min-h-0 items-stretch overflow-hidden">
            <div className="flex grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto">
              <DocumentContent />
              <div className="flex items-center gap-3 rounded-full border border-solid border-neutral-border bg-default-background px-4 py-3 shadow-lg">
                <FeatherLoader2 className="text-body font-body text-brand-600 animate-spin" />
                <span className="text-body-bold font-body-bold text-default-font">
                  Processing codes... (1)
                </span>
              </div>
            </div>
            <ScrollGutterPreview />
          </div>
        </div>
      </div>
    </div>
  )
}
