"use client";

import React from "react";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { TextField } from "~/ui/components/TextField";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout";
import { AlertDialog } from "~/ui/components/AlertDialog";
import { FeatherBold } from "@subframe/core";
import { FeatherBook } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherChevronDown } from "@subframe/core";
import { FeatherChevronsLeft } from "@subframe/core";
import { FeatherCode2 } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
import { FeatherEdit2 } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherHeading1 } from "@subframe/core";
import { FeatherHeading2 } from "@subframe/core";
import { FeatherHeading3 } from "@subframe/core";
import { FeatherImage } from "@subframe/core";
import { FeatherItalic } from "@subframe/core";
import { FeatherLink } from "@subframe/core";
import { FeatherList } from "@subframe/core";
import { FeatherListChecks } from "@subframe/core";
import { FeatherListOrdered } from "@subframe/core";
import { FeatherLoader2 } from "@subframe/core";
import { FeatherMoreHorizontal } from "@subframe/core";
import { FeatherPin } from "@subframe/core";
import { FeatherPlus } from "@subframe/core";
import { FeatherQuote } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherShare2 } from "@subframe/core";
import { FeatherStrikethrough } from "@subframe/core";
import { FeatherTrash } from "@subframe/core";
import { FeatherUnderline } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

function NabuInbox() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full cursor-pointer items-start bg-default-background">
        <div className="flex w-72 flex-none flex-col items-start self-stretch border-r border-solid border-neutral-border bg-default-background relative">
          <IconButton
            className="absolute top-4 -right-4 z-10"
            variant="brand-secondary"
            size="small"
            icon={<FeatherChevronsLeft />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
          <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-heading-2 font-heading-2 text-default-font">
                Codes
              </span>
              <IconButton
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
                placeholder="Search codes..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextField>
            <Button
              className="h-auto w-full flex-none"
              variant="neutral-secondary"
              size="small"
              icon={<FeatherBook />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              View Full Codebook
            </Button>
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-4 py-4 overflow-auto">
            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <FeatherChevronDown className="text-caption font-caption text-subtext-color" />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  ENVIRONMENTAL IMPACT
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md bg-success-50 px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-success-500" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Conservation Success
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md border border-solid border-warning-500 bg-warning-50 px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-warning-500" />
                <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
                  Habitat Degradation
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md bg-error-50 px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-error-500" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Critical Threat
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <FeatherChevronDown className="text-caption font-caption text-subtext-color" />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  POLICY &amp; GOVERNANCE
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md bg-brand-50 px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-brand-500" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Regulatory Framework
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md bg-[#dbeafeff] px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#93c5fdff]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Stakeholder Engagement
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <FeatherChevronDown className="text-caption font-caption text-subtext-color" />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  COMMUNITY RESPONSE
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md bg-[#fce7f3ff] px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#f9a8d4ff]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Indigenous Knowledge
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-md bg-[#ede9feff] px-3 py-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#a78bfaff]" />
                <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                  Local Resistance
                </span>
              </div>
            </div>
          </div>
          <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border" />
          <div className="flex w-full flex-col items-start gap-3 border-t-2 border-solid border-warning-500 bg-warning-50 px-4 py-4">
            <div className="flex w-full items-center gap-2">
              <div className="flex h-3 w-3 flex-none items-start rounded-full bg-warning-500" />
              <span className="text-body-bold font-body-bold text-default-font">
                Habitat Degradation
              </span>
              <IconButton
                size="small"
                icon={<FeatherEdit2 />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <span className="text-caption font-caption text-default-font">
              Evidence of ecosystem function loss, biodiversity decline, or
              significant environmental deterioration
            </span>
            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-1">
                <FeatherCheck className="text-caption font-caption text-success-600" />
                <span className="text-caption-bold font-caption-bold text-default-font">
                  Inclusion Examples
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-1">
                <span className="text-caption font-caption text-subtext-color">
                  • Deforestation reducing canopy cover
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  • Soil erosion from agricultural practices
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  • Water pollution affecting aquatic life
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-2">
              <div className="flex w-full items-center gap-1">
                <FeatherX className="text-caption font-caption text-error-600" />
                <span className="text-caption-bold font-caption-bold text-default-font">
                  Exclusion Examples
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-1">
                <span className="text-caption font-caption text-subtext-color">
                  • Natural seasonal changes
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  • Managed sustainable practices
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  • Restoration in progress
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex grow shrink-0 basis-0 items-start self-stretch">
          <div className="flex w-8 flex-none flex-col items-center gap-1 self-stretch border-r border-solid border-neutral-border bg-neutral-50 px-1 py-12">
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
            <div className="flex h-10 w-full flex-none items-start" />
            <div className="flex h-3 w-full flex-none items-start rounded-full bg-[#fca5a5ff]" />
            <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#fca5a5ff]" />
            <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4ff]" />
            <div className="flex h-8 w-full flex-none items-start" />
            <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#93c5fdff]" />
            <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#93c5fdff]" />
            <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#93c5fdff]" />
            <div className="flex h-10 w-full flex-none items-start" />
            <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#fcd34dff]" />
            <div className="flex h-1 w-full flex-none items-start rounded-full bg-[#f9a8d4ff]" />
            <div className="flex h-6 w-full flex-none items-start" />
            <div className="flex h-2 w-full flex-none items-start rounded-full bg-[#86efacff]" />
          </div>
          <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
            <div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4">
              <div className="flex w-full items-start gap-2">
                <div className="flex grow shrink-0 basis-0 items-center gap-2">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Habitat Destruction Framework
                  </span>
                </div>
                <IconButton
                  variant="brand-tertiary"
                  size="small"
                  icon={<FeatherPin />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <IconButton
                  size="small"
                  icon={<FeatherShare2 />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <SubframeCore.DropdownMenu.Root>
                  <SubframeCore.DropdownMenu.Trigger asChild={true}>
                    <IconButton
                      size="small"
                      icon={<FeatherMoreHorizontal />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
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
                          Duplicate
                        </DropdownMenu.DropdownItem>
                        <DropdownMenu.DropdownItem icon={<FeatherFileText />}>
                          Export
                        </DropdownMenu.DropdownItem>
                        <DropdownMenu.DropdownItem icon={<FeatherTrash />}>
                          Delete
                        </DropdownMenu.DropdownItem>
                      </DropdownMenu>
                    </SubframeCore.DropdownMenu.Content>
                  </SubframeCore.DropdownMenu.Portal>
                </SubframeCore.DropdownMenu.Root>
              </div>
              <div className="flex w-full items-center gap-2">
                <Badge variant="brand" icon={null}>
                  Framework
                </Badge>
                <Badge variant="neutral" icon={null}>
                  Ecology
                </Badge>
                <Badge variant="neutral" icon={null}>
                  Conservation
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
            <div className="flex w-full grow shrink-0 basis-0 flex-col items-start px-24 py-8 overflow-auto mobile:px-6 mobile:py-6">
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
              <div className="flex w-full max-w-[768px] flex-col items-start gap-8 rounded-lg bg-white px-12 py-10 shadow-md mobile:px-6 mobile:py-6">
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
                    <div className="flex w-full items-start gap-2 relative">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-success-500 mt-2 -ml-5" />
                      <div className="flex flex-col items-start gap-2 rounded-lg border border-solid border-neutral-border bg-default-background px-3 py-3 shadow-lg absolute left-0 top-12 z-10">
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          Color
                        </span>
                        <div className="flex flex-wrap items-start gap-2">
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-success-500 cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#86efacff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#4ade80ff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-warning-500 cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#fcd34dff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#fbbf24ff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-error-500 cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#fca5a5ff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#dc2626ff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-brand-500 cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#93c5fdff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#f9a8d4ff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-[#a78bfaff] cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-neutral-400 cursor-pointer" />
                          <div className="flex h-6 w-6 flex-none items-start rounded-md border border-solid border-neutral-200 bg-neutral-600 cursor-pointer" />
                        </div>
                      </div>
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-success-50 px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Conservation Success
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      Costa Rica&#39;s reforestation program has restored over
                      15,000 hectares of degraded tropical forest since 2021.
                      Payment for ecosystem services initiatives have
                      incentivized 2,400 landowners to maintain forest cover,
                      resulting in a 23% increase in jaguar corridor
                      connectivity. Community-managed reserves now protect 340
                      endemic species previously classified as vulnerable.
                    </span>
                  </div>
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-warning-500 mt-2 -ml-5" />
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-warning-50 px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Habitat Degradation
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      Palm oil expansion in Borneo has eliminated 40% of
                      orangutan habitat over the past decade. Soil erosion from
                      slash-and-burn agriculture destabilizes watersheds
                      affecting downstream communities. Canopy cover reduction
                      of 65% in logging zones has disrupted pollinator networks
                      essential for ecosystem regeneration.
                    </span>
                  </div>
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-error-500 mt-2 -ml-5" />
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-error-50 px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Critical Threat
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      Illegal logging operations in the Leuser Ecosystem
                      threaten the last remaining habitat where orangutans,
                      tigers, elephants, and rhinos coexist. Without immediate
                      intervention, projections indicate complete population
                      collapse within 8-12 years. Mining concessions overlap
                      with 78% of identified biodiversity hotspots requiring
                      urgent protective measures.
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-col items-start gap-6">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Policy &amp; Governance
                  </span>
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-brand-500 mt-2 -ml-5" />
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-brand-50 px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Regulatory Framework
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      New environmental impact assessment protocols require
                      comprehensive biodiversity surveys before land conversion
                      permits. Enforcement mechanisms include satellite
                      monitoring systems that detect illegal deforestation
                      within 48 hours. Penalties have increased 300% with
                      proceeds directed to restoration funds.
                    </span>
                  </div>
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#93c5fdff] mt-2 -ml-5" />
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-[#dbeafeff] px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Stakeholder Engagement
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      Multi-stakeholder dialogues brought together government
                      agencies, conservation NGOs, agricultural cooperatives,
                      and timber companies to develop sustainable land use
                      agreements. Participatory mapping sessions identified 12
                      critical wildlife corridors requiring protection while
                      maintaining economic livelihoods for 8,000 rural
                      households.
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-col items-start gap-6">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Community Response
                  </span>
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#f9a8d4ff] mt-2 -ml-5" />
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-[#fce7f3ff] px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Indigenous Knowledge
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      Traditional ecological knowledge from Dayak communities
                      identifies 47 indicator species that signal ecosystem
                      health changes years before scientific monitoring detects
                      decline. Ancestral fire management practices reduce
                      wildfire risk by 67% compared to government
                      suppression-only approaches. Sacred forest groves
                      maintained for generations harbor 89% of regional
                      medicinal plant diversity.
                    </span>
                  </div>
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start gap-2">
                      <div className="flex h-2 w-2 flex-none items-start rounded-full bg-[#a78bfaff] mt-2 -ml-5" />
                      <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md bg-[#ede9feff] px-3 py-2">
                        <span className="text-heading-3 font-heading-3 text-default-font">
                          Local Resistance
                        </span>
                      </div>
                    </div>
                    <span className="text-body font-body text-default-font">
                      Community blockades prevented logging trucks from
                      accessing old-growth forest areas designated for
                      clear-cutting. Grassroots monitoring networks document
                      violations using smartphone apps, submitting 340 verified
                      reports that led to permit suspensions. Youth activists
                      organized river cleanups removing 12 tons of pollution
                      while pressuring upstream palm oil mills to upgrade
                      filtration systems.
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-full border border-solid border-neutral-border bg-default-background px-4 py-3 shadow-lg">
                <FeatherLoader2 className="text-body font-body text-brand-600 @keyframes spin animate-spin" />
                <span className="text-body-bold font-body-bold text-default-font">
                  Processing codes... (1)
                </span>
              </div>
            </div>
          </div>
        </div>
        <AlertDialog
          title="Pending Actions"
          description="Nabu is attempting to delete codes that are currently in use"
          entries={[
            { title: "Delete Habitat Degradation", description: "Used across 12 documents" },
            { title: "Delete Conservation Success", description: "Used across 8 documents" },
            { title: "Delete Indigenous Knowledge", description: "Used across 5 documents" },
          ]}
          destructiveLabel="Delete All"
          onDestructive={() => {}}
          onCancel={() => {}}
        />
      </div>
    </DefaultPageLayout>
  );
}

export default NabuInbox;
