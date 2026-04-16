"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { CheckableWrap } from "~/ui/components/CheckableWrap";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { SidebarRailWithLabels } from "~/ui/components/SidebarRailWithLabels";
import { TextField } from "~/ui/components/TextField";
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled";
import { FeatherBarChart3 } from "@subframe/core";
import { FeatherBold } from "@subframe/core";
import { FeatherBook } from "@subframe/core";
import { FeatherChevronRight } from "@subframe/core";
import { FeatherCode2 } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
import { FeatherFiles } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherFlag } from "@subframe/core";
import { FeatherFolderInput } from "@subframe/core";
import { FeatherHeading1 } from "@subframe/core";
import { FeatherHeading2 } from "@subframe/core";
import { FeatherHeading3 } from "@subframe/core";
import { FeatherImage } from "@subframe/core";
import { FeatherItalic } from "@subframe/core";
import { FeatherLink } from "@subframe/core";
import { FeatherList } from "@subframe/core";
import { FeatherListChecks } from "@subframe/core";
import { FeatherListOrdered } from "@subframe/core";
import { FeatherMoreHorizontal } from "@subframe/core";
import { FeatherPlus } from "@subframe/core";
import { FeatherQuote } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherSend } from "@subframe/core";
import { FeatherSparkles } from "@subframe/core";
import { FeatherStrikethrough } from "@subframe/core";
import { FeatherTrash2 } from "@subframe/core";
import { FeatherUnderline } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

function DocumentAnalysisInterface2() {
  return (
    <div className="flex h-full w-full bg-default-background items-stretch">
      <SidebarRailWithLabels
        className="h-auto w-auto flex-none self-stretch relative z-50"
        header={
          <div className="flex flex-col items-center justify-center gap-2 px-1 py-1">
            <img
              className="h-6 w-6 flex-none object-cover"
              src="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/y2rsnhq3mex4auk54aye.png"
            />
          </div>
        }
        footer={
          <div className="flex flex-col items-center justify-end gap-1 px-2 py-2">
            <Avatar image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif">
              A
            </Avatar>
          </div>
        }
      >
        <SidebarRailWithLabels.NavItem icon={<FeatherFiles />} selected={true}>
          Documents
        </SidebarRailWithLabels.NavItem>
        <SidebarRailWithLabels.NavItem icon={<FeatherBarChart3 />}>
          Exhibits
        </SidebarRailWithLabels.NavItem>
        <div className="flex w-full flex-col items-center relative">
          <SidebarRailWithLabels.NavItem icon={<FeatherBook />}>
            Codes
          </SidebarRailWithLabels.NavItem>
          <div className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-warning-500 absolute top-1 right-2">
            <span className="font-['Manrope'] text-[10px] font-[700] leading-[15px] text-white">
              9
            </span>
          </div>
        </div>
        <SidebarRailWithLabels.NavItem icon={<FeatherSearch />}>
          Search
        </SidebarRailWithLabels.NavItem>
      </SidebarRailWithLabels>
      <div className="flex w-64 flex-none flex-col items-start self-stretch bg-default-background shadow-lg relative z-40">
        <div className="flex w-full flex-col items-start">
          <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-heading-2 font-heading-2 text-default-font">
                Codes
              </span>
              <IconButton
                variant="brand-primary"
                size="small"
                icon={<FeatherPlus />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <TextField
              className="h-auto w-full flex-none"
              variant="filled"
              label=""
              helpText=""
              icon={<FeatherSearch />}
            >
              <TextField.Input
                placeholder="Filter codes..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextField>
          </div>
          <div className="flex w-full items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-warning-50">
            <FeatherFlag className="text-body font-body text-warning-600" />
            <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
              Needs review
            </span>
            <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-warning-500 px-1.5">
              <span className="font-['Manrope'] text-[11px] font-[700] leading-[11px] text-white">
                9
              </span>
            </div>
          </div>
          <div className="flex h-px w-full flex-none items-start bg-neutral-border" />
        </div>
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-4 py-4 overflow-y-auto">
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Economy
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#ec8e7b] bg-[#fff0ee] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#e54d2e]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Fiscal state reporting
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Elasticity
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#bf7af0] bg-[#f3e7fc] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#8e4ec6]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Exhaustion
                </span>
              </div>
            </div>
            <CheckableWrap color="purple" checked={false} onToggle={() => {}}>
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#bf7af0] bg-[#f3e7fc] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#8e4ec6]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  High flexibility
                </span>
              </div>
            </CheckableWrap>
            <CheckableWrap color="indigo" checked={false} onToggle={() => {}}>
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#849dff] bg-[#e0e4ff] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#3e63dd]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Crystallization
                </span>
              </div>
            </CheckableWrap>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Governance
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#53b9ab] bg-[#d2f7ef] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#12a594]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Citizen-facing rules &amp; thresholds
                </span>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#5bb98c] bg-[#ddf3e4] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#30a46c]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Responsibilization
                </span>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#5bb98c] bg-[#ddf3e4] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#30a46c]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Privacy &amp; data protection
                </span>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#849dff] bg-[#e0e4ff] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#3e63dd]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Monitoring, metrics &amp; steering
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Legitimation
            </span>
            <CheckableWrap color="indigo" checked={false} onToggle={() => {}}>
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#849dff] bg-[#e0e4ff] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#3e63dd]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Appeal to industry
                </span>
              </div>
            </CheckableWrap>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#849dff] bg-[#e0e4ff] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#3e63dd]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Appeal to expertise
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Misinfo
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#bf7af0] bg-[#f3e7fc] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#8e4ec6]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Conspiracy theories
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Neoliberal
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#ec8e7b] bg-[#fff0ee] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#e54d2e]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Market justification
                </span>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#ec8e7b] bg-[#fff0ee] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#e54d2e]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Individual risk calculation
                </span>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#e4a221] bg-[#fff1d6] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#ffb224]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Citizens as customers
                </span>
              </div>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#e4a221] bg-[#fff1d6] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#ffb224]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Aid conditionality
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Normative
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#5bb98c] bg-[#ddf3e4] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#30a46c]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Solidarity / moral appeal
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font">
              Pathdep
            </span>
            <div className="flex w-full items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border-2 border-solid border-[#849dff] bg-[#e0e4ff] px-3 py-2 grow cursor-pointer">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#3e63dd]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Philosophical commitment
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex self-stretch overflow-hidden bg-neutral-100 px-3 py-3 grow items-stretch">
        <div className="flex flex-col items-start overflow-hidden rounded-xl bg-default-background grow">
          <div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4">
            <div className="flex w-full items-start gap-2">
              <span className="grow shrink-0 basis-0 text-heading-2 font-heading-2 text-default-font">
                Governance Analysis
              </span>
              <SubframeCore.DropdownMenu.Root>
                <SubframeCore.DropdownMenu.Trigger asChild={true}>
                  <IconButton
                    size="small"
                    icon={<FeatherMoreHorizontal />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                </SubframeCore.DropdownMenu.Trigger>
                <SubframeCore.DropdownMenu.Portal>
                  <SubframeCore.DropdownMenu.Content
                    side="bottom"
                    align="end"
                    sideOffset={4}
                    asChild={true}
                  >
                    <DropdownMenu>
                      <DropdownMenu.DropdownItem icon={<FeatherCopy />}>
                        Copy raw
                      </DropdownMenu.DropdownItem>
                      <DropdownMenu.DropdownItem icon={<FeatherFileText />}>
                        Export
                      </DropdownMenu.DropdownItem>
                    </DropdownMenu>
                  </SubframeCore.DropdownMenu.Content>
                </SubframeCore.DropdownMenu.Portal>
              </SubframeCore.DropdownMenu.Root>
            </div>
            <div className="flex w-full items-center gap-2">
              <Badge variant="brand" icon={null} iconRight={<FeatherX />}>
                Analysis
              </Badge>
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherPlus />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Add tag
              </Button>
            </div>
          </div>
          <div className="flex min-h-[0px] w-full grow shrink-0 basis-0 overflow-hidden items-stretch">
            <div className="flex grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto mobile:px-4 mobile:py-6">
              <div className="flex w-full items-center justify-center">
                <div className="flex items-start gap-1 rounded-full border border-solid border-neutral-border bg-default-background px-2 py-2 shadow-md">
                  <IconButton
                    size="small"
                    icon={<FeatherHeading1 />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherHeading2 />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherHeading3 />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
                  <IconButton
                    size="small"
                    icon={<FeatherBold />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherItalic />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherUnderline />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherStrikethrough />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
                  <IconButton
                    size="small"
                    icon={<FeatherLink />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherImage />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
                  <IconButton
                    size="small"
                    icon={<FeatherList />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherListOrdered />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherListChecks />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <div className="flex w-px flex-none flex-col items-center gap-2 self-stretch bg-neutral-border" />
                  <IconButton
                    size="small"
                    icon={<FeatherCode2 />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                  <IconButton
                    size="small"
                    icon={<FeatherQuote />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                </div>
              </div>
              <div className="flex w-full max-w-[768px] flex-col items-start gap-6 py-8">
                <span className="text-heading-1 font-heading-1 text-default-font">
                  Governance Analysis
                </span>
                <div className="flex w-full flex-col items-start gap-4">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Code Frequency Over Time
                  </span>
                  <span className="text-body font-body text-default-font">
                    This chart shows the distribution of governance-related
                    codes across the corpus by month.
                  </span>
                  <div className="flex w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 py-12">
                    <span className="text-body font-body text-subtext-color">
                      Chart placeholder — code frequency by month
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-col items-start gap-4">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Summary of findings
                  </span>
                  <span className="text-body font-body text-default-font">
                    The analysis of governance rhetoric currently spans from
                    March 2020 through July 2020. During the establishment phase
                    (March–May), there is a high frequency of codes related to
                  </span>
                  <div className="flex w-full flex-wrap gap-1 items-baseline">
                    <span className="text-caption font-caption text-default-font rounded bg-neutral-100 px-1.5 py-0.5">
                      callout-8icfq22d
                    </span>
                    <span className="text-body font-body text-default-font">
                      (Citizen-facing rules &amp; thresholds) and
                    </span>
                    <span className="text-caption font-caption text-default-font rounded bg-neutral-100 px-1.5 py-0.5">
                      callout-2wnrt1n8
                    </span>
                    <span className="text-body font-body text-default-font">
                      (Responsibilization), reflecting the intensive initial
                      communication of measures and the shift of responsibility
                      onto the public.
                    </span>
                  </div>
                  <span className="text-body font-body text-default-font">
                    As the crisis progressed into June and July 2020, the volume
                    of these governance markers decreased, coinciding with the
                    &quot;normalization&quot; phase of the pandemic response
                    before later waves.
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-4">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Key Observations
                  </span>
                  <span className="text-body font-body text-default-font">
                    Three distinct governance patterns emerge across the early
                    pandemic timeline. First, citizen-facing rules dominated
                    March through April as governments scrambled to communicate
                    new behavioral expectations. Second, responsibilization
                    language peaked in late April — coinciding with the shift
                    from top-down enforcement to appeals for personal
                    compliance. Third, monitoring and metrics rhetoric steadily
                    increased from May onward, reflecting a move toward
                    data-driven justifications for policy continuation.
                  </span>
                  <span className="text-body font-body text-default-font">
                    Notably, privacy and data protection codes remained
                    relatively low throughout, appearing primarily in contexts
                    where contact-tracing apps or digital surveillance measures
                    were introduced. This suggests governance discourse
                    prioritized compliance framing over rights-based framing
                    during the initial crisis period.
                  </span>
                </div>
                <span className="text-body font-body text-default-font">
                  Analysis of governance mechanisms and their evolution over
                  time.
                </span>
              </div>
            </div>
            <div className="flex w-8 flex-none flex-col items-center gap-1 self-stretch border-l border-solid border-neutral-border bg-neutral-50 px-1 py-12">
              <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#12a594]" />
              <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#30a46c]" />
              <div className="flex h-6 w-full flex-none items-start" />
              <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#3e63dd]" />
              <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#30a46c]" />
              <div className="flex h-8 w-full flex-none items-start" />
              <div className="flex h-3 w-full flex-none items-start rounded-full bg-[#12a594]" />
              <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#e54d2e]" />
              <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#8e4ec6]" />
            </div>
          </div>
          <div className="flex w-full items-center justify-center border-t border-solid border-neutral-border px-6 py-2">
            <span className="text-caption font-caption text-subtext-color">
              186 words · &lt; 1 min read
            </span>
          </div>
        </div>
        <div className="flex w-3 flex-none items-start" />
        <div className="flex w-96 flex-none flex-col items-start self-stretch overflow-hidden rounded-xl bg-default-background">
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-3 px-4 py-4 overflow-y-auto">
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-4 py-3 max-w-[95%]">
                <span className="text-body font-body text-default-font">
                  Another day, another deep dive into research.
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-3 max-w-[95%]">
                <span className="text-body font-body text-default-font">
                  Ready when you are! What&#39;s on the horizon for today&#39;s
                  session?
                </span>
              </div>
            </div>
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-4 py-3 max-w-[95%]">
                <span className="text-body font-body text-default-font">
                  can you tell me which codes are discussed in this file
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start gap-2 rounded-2xl bg-neutral-100 px-4 py-3 max-w-[95%]">
                <div className="flex flex-wrap gap-1 items-baseline">
                  <span className="text-body font-body text-default-font">
                    The
                  </span>
                  <span className="text-body font-body text-default-font inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer bg-[#12a59420]">
                    Governance Analysis
                  </span>
                  <span className="text-body font-body text-default-font">
                    file specifically discusses the frequency and trends of
                    governance-related codes from the first phase of the
                    pandemic.
                  </span>
                </div>
                <span className="text-body font-body text-default-font">
                  The two codes explicitly highlighted in the findings are:
                </span>
                <div className="flex w-full flex-col items-start gap-2 pl-4">
                  <div className="flex items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <div className="flex flex-wrap gap-1 items-baseline">
                      <span className="text-body font-body text-default-font inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer bg-[#12a59420]">
                        Citizen-facing rules &amp; thresholds
                      </span>
                      <span className="text-body font-body text-default-font">
                        — Noted for its high frequency during the establishment
                        phase (March–May 2020) as behavioral rules were
                        communicated.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <div className="flex flex-wrap gap-1 items-baseline">
                      <span className="text-body font-body text-default-font inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer bg-[#30a46c20]">
                        Responsibilization
                      </span>
                      <span className="text-body font-body text-default-font">
                        — Also highlighted as a key marker during the initial
                        phase, reflecting the shift of responsibility onto
                        public compliance.
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 items-baseline">
                  <span className="text-body font-body text-default-font">
                    Additionally, the file includes a chart that tracks the full
                    suite of codes from the
                  </span>
                  <span className="text-body font-body text-default-font inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer bg-[#30a46c20]">
                    Governance
                  </span>
                  <span className="text-body font-body text-default-font">
                    group, which also includes:
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-1 pl-4">
                  <div className="flex items-center gap-1">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer bg-[#30a46c20]">
                      Privacy &amp; data protection
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font inline-flex items-center gap-1 rounded px-1 py-0.5 cursor-pointer bg-[#3e63dd20]">
                      Monitoring, metrics &amp; steering
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-4 py-3 max-w-[95%]">
                <span className="text-body font-body text-default-font">
                  can you ask me a question using ask tool I need to try
                  something
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-3 max-w-[95%]">
                <span className="text-body font-body text-default-font">
                  Since &#39;Citizen-facing rules &amp; thresholds&#39; appears
                  frequently in the early transcripts, would you like to split
                  it into specific sub-codes to see if certain types of rules
                  drive the trend more than others?
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1.5 max-w-[95%]">
              <div className="flex w-full items-center gap-2 rounded-lg border-2 border-solid border-neutral-border bg-white px-3 py-2 cursor-pointer hover:border-brand-600 hover:bg-brand-50">
                <FeatherChevronRight className="text-body font-body text-neutral-400 flex-none" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Yes, split into sub-codes (e.g., distancing vs. group sizes)
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border-2 border-solid border-neutral-border bg-white px-3 py-2 cursor-pointer hover:border-brand-600 hover:bg-brand-50">
                <FeatherChevronRight className="text-body font-body text-neutral-400 flex-none" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  No, keep it as a single category for now
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border-2 border-solid border-neutral-border bg-white px-3 py-2 cursor-pointer hover:border-brand-600 hover:bg-brand-50">
                <FeatherChevronRight className="text-body font-body text-neutral-400 flex-none" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Wait until the full 2020 sequence is coded before deciding
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <FeatherBook className="text-caption font-caption text-subtext-color" />
              <span className="text-caption font-caption text-subtext-color">
                Codebook
              </span>
            </div>
          </div>
          <div className="flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3">
            <TextFieldUnstyled className="grow">
              <TextFieldUnstyled.Input
                placeholder="Or type your own answer..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextFieldUnstyled>
            <IconButton
              variant="brand-primary"
              icon={<FeatherSend />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2.5 rounded-2xl bg-neutral-900 px-5 py-3.5 shadow-lg fixed bottom-6 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-body-bold font-body-bold text-white">
              3 codes selected
            </span>
            <span className="text-caption font-caption text-neutral-400 cursor-pointer hover:text-brand-400">
              · Select all 9
            </span>
          </div>
          <div className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-neutral-700 cursor-pointer hover:bg-neutral-600">
            <FeatherX className="font-['Manrope'] text-[12px] font-[400] leading-[18px] text-neutral-400 flex-none" />
          </div>
        </div>
        <div className="flex h-px w-full flex-none items-start bg-neutral-700" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 cursor-pointer">
            <FeatherTrash2 className="text-body font-body text-neutral-300 flex-none" />
            <span className="text-caption-bold font-caption-bold text-neutral-300">
              Delete
            </span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer">
            <FeatherFolderInput className="text-body font-body text-neutral-300 flex-none" />
            <span className="text-caption-bold font-caption-bold text-neutral-300">
              Move
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-solid border-brand-600 px-2.5 py-1 bg-brand-900/40 cursor-pointer">
            <FeatherSparkles className="text-caption font-caption text-brand-400 flex-none" />
            <span className="text-caption-bold font-caption-bold text-brand-300">
              Code file
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-solid border-brand-600 px-2.5 py-1 bg-brand-900/40 cursor-pointer">
            <FeatherSparkles className="text-caption font-caption text-brand-400 flex-none" />
            <span className="text-caption-bold font-caption-bold text-brand-300">
              Merge
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentAnalysisInterface2;
