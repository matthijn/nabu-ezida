"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { TextField } from "~/ui/components/TextField";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout";
import { FeatherBold } from "@subframe/core";
import { FeatherChevronsLeft } from "@subframe/core";
import { FeatherCode2 } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherFilter } from "@subframe/core";
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
import { FeatherPin } from "@subframe/core";
import { FeatherPlus } from "@subframe/core";
import { FeatherQuote } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherShare2 } from "@subframe/core";
import { FeatherStrikethrough } from "@subframe/core";
import { FeatherTrash } from "@subframe/core";
import { FeatherUnderline } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

function NabuInbox() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full cursor-pointer items-start bg-default-background">
        <div className="flex w-72 flex-none flex-col items-start gap-4 self-stretch border-r border-solid border-neutral-border bg-default-background px-4 py-6 relative">
          <IconButton
            className="absolute top-4 -right-4 z-10"
            variant="brand-secondary"
            size="small"
            icon={<FeatherChevronsLeft />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-heading-2 font-heading-2 text-default-font">
              Inbox
            </span>
            <TextField
              className="h-auto w-full flex-none"
              variant="filled"
              label=""
              helpText=""
              icon={<FeatherSearch />}
            >
              <TextField.Input
                placeholder="Search inbox..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextField>
          </div>
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-caption font-caption text-subtext-color">
                Pending
              </span>
            </div>
            <IconButton
              size="small"
              icon={<FeatherFilter />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-2 overflow-auto">
            <div className="flex w-full flex-col items-start gap-3 rounded-md border-l-2 border-solid border-brand-600 bg-brand-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar variant="brand" size="small" image="">
                  N
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Nabu
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      2h ago
                    </span>
                  </div>
                  <span className="text-body font-body text-default-font">
                    Can you review the citations I added to the funding section?
                  </span>
                  <Badge variant="brand" icon={null}>
                    Habitat Destruction Framework
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md border-l-2 border-solid border-error-600 bg-error-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar
                  variant="error"
                  size="small"
                  image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                >
                  S
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Sarah Chen
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      5h ago
                    </span>
                  </div>
                  <span className="text-body font-body text-default-font">
                    Could you fact-check the deforestation statistics?
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Research Paper Draft
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md border-l-2 border-solid border-brand-600 bg-brand-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar variant="brand" size="small" image="">
                  N
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Nabu
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      Yesterday
                    </span>
                  </div>
                  <span className="text-body font-body text-default-font">
                    I found some conflicting data in the Amazon Basin section.
                    Should I update it?
                  </span>
                  <Badge variant="brand" icon={null}>
                    Habitat Destruction Framework
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md border-l-2 border-solid border-warning-500 bg-warning-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar
                  variant="warning"
                  size="small"
                  image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
                >
                  M
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Marcus Rodriguez
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      Yesterday
                    </span>
                  </div>
                  <span className="text-body font-body text-default-font">
                    Can you add a methodology section explaining our research
                    approach?
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Amazon Rainforest Case Study
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex h-px w-full flex-none items-start bg-neutral-border" />
            <div className="flex w-full items-center gap-2">
              <span className="text-caption font-caption text-subtext-color">
                Completed
              </span>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar
                  variant="success"
                  size="small"
                  image="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop"
                >
                  E
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body font-body text-default-font">
                      Emma Thompson
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      2 days ago
                    </span>
                  </div>
                  <span className="text-body font-body text-subtext-color">
                    Thanks for adding those references to the community
                    engagement section!
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Habitat Destruction Framework
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar variant="brand" size="small" image="">
                  N
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body font-body text-default-font">
                      Nabu
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      3 days ago
                    </span>
                  </div>
                  <span className="text-body font-body text-subtext-color">
                    I&#39;ve finished compiling the literature review notes you
                    requested.
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Literature Review Notes
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar
                  variant="error"
                  size="small"
                  image="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop"
                >
                  D
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body font-body text-default-font">
                      David Park
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      1 week ago
                    </span>
                  </div>
                  <span className="text-body font-body text-subtext-color">
                    Could you expand on the policy recommendations with specific
                    examples?
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Methodology &amp; Approach
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-3">
              <div className="flex w-full items-start gap-3">
                <Avatar
                  variant="neutral"
                  size="small"
                  image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
                >
                  L
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex w-full items-center justify-between">
                    <span className="text-body font-body text-default-font">
                      Lisa Wang
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      1 week ago
                    </span>
                  </div>
                  <span className="text-body font-body text-subtext-color">
                    The species survey data looks great. Nice work organizing
                    it!
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Species Survey Data
                  </Badge>
                </div>
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
                <div className="flex w-full flex-col items-start gap-4 border-l-4 border-solid border-brand-500 pl-6">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Executive Summary
                  </span>
                  <span className="text-body font-body text-default-font">
                    This framework establishes a systematic approach to
                    understanding and addressing habitat destruction in critical
                    ecosystems. Through extensive field research and data
                    analysis, we identify key drivers of degradation and propose
                    evidence-based interventions for biodiversity preservation.
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-4 border-l-4 border-solid border-brand-500 pl-6">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Key Findings
                  </span>
                  <span className="text-body font-body text-default-font">
                    Our three-year study across 24 tropical ecosystems reveals
                    that habitat loss continues at an accelerating rate, with
                    deforestation patterns showing a 34% increase since 2020.
                    Agricultural expansion accounts for 68% of observed habitat
                    destruction, followed by infrastructure development at 19%
                    and resource extraction at 13%.
                  </span>
                  <span className="text-body font-body text-default-font">
                    The most vulnerable regions include the Amazon Basin,
                    Southeast Asian rainforests, and Central African tropical
                    zones. Species diversity has declined by an average of 42%
                    in areas experiencing active degradation, with ripple
                    effects observed in adjacent ecosystems up to 15 kilometers
                    away.
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-4">
                  <span className="text-heading-3 font-heading-3 text-default-font">
                    Habitat Loss by Region (2020-2024)
                  </span>
                  <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-solid border-neutral-border bg-neutral-50 px-6 py-6">
                    <div className="flex w-full items-end gap-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-64 w-16 flex-none flex-col items-center justify-end rounded-md bg-brand-100">
                          <div className="flex w-full items-start rounded-md bg-brand-600" />
                        </div>
                        <span className="text-caption font-caption text-subtext-color">
                          Amazon
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-64 w-16 flex-none flex-col items-center justify-end rounded-md bg-warning-100">
                          <div className="flex w-full items-start rounded-md bg-warning-600" />
                        </div>
                        <span className="text-caption font-caption text-subtext-color">
                          SE Asia
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-64 w-16 flex-none flex-col items-center justify-end rounded-md bg-error-100">
                          <div className="flex w-full items-start rounded-md bg-error-600" />
                        </div>
                        <span className="text-caption font-caption text-subtext-color">
                          C. Africa
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-64 w-16 flex-none flex-col items-center justify-end rounded-md bg-neutral-200">
                          <div className="flex w-full items-start rounded-md bg-neutral-600" />
                        </div>
                        <span className="text-caption font-caption text-subtext-color">
                          Australia
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex h-64 w-16 flex-none flex-col items-center justify-end rounded-md bg-success-100">
                          <div className="flex w-full items-start rounded-md bg-success-600" />
                        </div>
                        <span className="text-caption font-caption text-subtext-color">
                          C. America
                        </span>
                      </div>
                    </div>
                    <span className="text-caption font-caption text-subtext-color">
                      Percentage of total habitat loss measured in hectares
                      (thousands)
                    </span>
                  </div>
                </div>
                <div className="flex w-full flex-col items-start gap-4 border-l-4 border-solid border-brand-500 pl-6">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Methodology
                  </span>
                  <span className="text-body font-body text-default-font">
                    Data collection involved satellite imagery analysis, ground
                    surveys, and collaboration with 47 local conservation
                    organizations. We employed machine learning algorithms to
                    identify land-use changes and validated findings through
                    on-site verification in representative sample areas.
                  </span>
                  <span className="text-body font-body text-default-font">
                    Our biodiversity assessment combined camera trap surveys,
                    acoustic monitoring, and eDNA sampling to track species
                    presence and population trends. All methodologies adhere to
                    IUCN standards and were reviewed by independent ecological
                    assessment panels.
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-4 border-l-4 border-solid border-brand-500 pl-6">
                  <span className="text-heading-2 font-heading-2 text-default-font">
                    Recommendations
                  </span>
                  <span className="text-body font-body text-default-font">
                    Immediate intervention requires establishing protected
                    corridors between fragmented habitats, implementing stricter
                    land-use regulations, and investing in restoration projects.
                    Community engagement programs have shown 73% success rates
                    in reducing illegal deforestation when paired with
                    sustainable livelihood alternatives.
                  </span>
                  <span className="text-body font-body text-default-font">
                    Long-term conservation success depends on policy reform at
                    national and international levels, increased funding for
                    monitoring systems, and partnerships between governments,
                    NGOs, and indigenous communities who serve as primary
                    stewards of these ecosystems.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
}

export default NabuInbox;
