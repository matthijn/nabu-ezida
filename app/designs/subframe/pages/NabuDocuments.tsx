"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { BarChart } from "~/ui/components/BarChart";
import { Button } from "~/ui/components/Button";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { TextField } from "~/ui/components/TextField";
import { ToggleGroup } from "~/ui/components/ToggleGroup";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout";
import { FeatherAlertCircle } from "@subframe/core";
import { FeatherBarChart3 } from "@subframe/core";
import { FeatherBold } from "@subframe/core";
import { FeatherBook } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherChevronDown } from "@subframe/core";
import { FeatherChevronLeft } from "@subframe/core";
import { FeatherChevronRight } from "@subframe/core";
import { FeatherChevronsLeft } from "@subframe/core";
import { FeatherCircle } from "@subframe/core";
import { FeatherCode } from "@subframe/core";
import { FeatherCode2 } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
import { FeatherEdit2 } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherHeading1 } from "@subframe/core";
import { FeatherHeading2 } from "@subframe/core";
import { FeatherHeading3 } from "@subframe/core";
import { FeatherImage } from "@subframe/core";
import { FeatherItalic } from "@subframe/core";
import { FeatherLightbulb } from "@subframe/core";
import { FeatherLink } from "@subframe/core";
import { FeatherList } from "@subframe/core";
import { FeatherListChecks } from "@subframe/core";
import { FeatherListOrdered } from "@subframe/core";
import { FeatherLoader2 } from "@subframe/core";
import { FeatherLock } from "@subframe/core";
import { FeatherMessageCircle } from "@subframe/core";
import { FeatherMoreHorizontal } from "@subframe/core";
import { FeatherPalette } from "@subframe/core";
import { FeatherPin } from "@subframe/core";
import { FeatherPlus } from "@subframe/core";
import { FeatherQuote } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherShare2 } from "@subframe/core";
import { FeatherSparkles } from "@subframe/core";
import { FeatherStrikethrough } from "@subframe/core";
import { FeatherTrash } from "@subframe/core";
import { FeatherUnderline } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

function NabuDocuments() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full items-start bg-default-background">
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
              Documents
            </span>
            <TextField
              className="h-auto w-full flex-none"
              variant="filled"
              label=""
              helpText=""
              icon={<FeatherSearch />}
            >
              <TextField.Input
                placeholder="Search documents..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextField>
          </div>
          <div className="flex w-full items-center justify-between">
            <ToggleGroup value="" onValueChange={(value: string) => {}}>
              <ToggleGroup.Item icon={null} value="73c3d3c5">
                Modified
              </ToggleGroup.Item>
              <ToggleGroup.Item icon={null} value="6a4ad43f">
                Name
              </ToggleGroup.Item>
            </ToggleGroup>
            <Button
              variant="brand-primary"
              size="small"
              icon={<FeatherPlus />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              New
            </Button>
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 overflow-auto">
            <div className="flex w-full flex-col items-start gap-1">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  PINNED
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-3 overflow-hidden rounded-md bg-brand-50 px-4 py-4 relative">
                <div className="flex w-1 flex-col items-center gap-2 bg-brand-600 shadow-[0px_0px_15px_0px_#65a30dcc] @keyframes pulse absolute left-0 top-0 bottom-0 animate-pulse" />
                <div className="flex w-full flex-col items-start gap-2 pl-2">
                  <span className="text-body-bold font-body-bold text-default-font">
                    Habitat Destruction Framework
                  </span>
                  <div className="flex w-full items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 2 hours ago
                    </span>
                    <Badge variant="brand" icon={null}>
                      Framework
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Research Paper Draft
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 3 days ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Paper
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  ALL DOCUMENTS
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Amazon Rainforest Case Study
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited yesterday
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Corpus
                    </Badge>
                    <Badge variant="neutral" icon={null}>
                      Field Notes
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Literature Review Notes
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 1 week ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Literature
                    </Badge>
                    <Badge variant="neutral" icon={null}>
                      Review
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Species Survey Data
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 2 weeks ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Corpus
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Methodology &amp; Approach
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 3 weeks ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Framework
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch relative">
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
            <div className="flex w-full max-w-[768px] flex-col items-start gap-8 pt-8">
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-1 font-heading-1 text-default-font">
                  Habitat Destruction Framework
                </span>
                <span className="text-body font-body text-subtext-color">
                  A comprehensive analysis of ecosystem degradation patterns and
                  conservation strategies across tropical regions
                </span>
              </div>
              <div className="flex w-full items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background relative">
                <div className="flex w-1 flex-none flex-col items-center gap-2 bg-[#3b82f6ff] absolute left-0 top-0 bottom-0" />
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 pl-5 pr-4 py-4">
                  <div className="flex w-full items-start gap-3">
                    <SubframeCore.DropdownMenu.Root>
                      <SubframeCore.DropdownMenu.Trigger asChild={true}>
                        <div className="flex items-center justify-center rounded-md px-1 py-1 cursor-pointer hover:bg-neutral-100">
                          <FeatherBook className="text-heading-3 font-heading-3 text-[#3b82f6ff]" />
                        </div>
                      </SubframeCore.DropdownMenu.Trigger>
                      <SubframeCore.DropdownMenu.Portal>
                        <SubframeCore.DropdownMenu.Content
                          side="bottom"
                          align="start"
                          sideOffset={4}
                          asChild={true}
                        >
                          <DropdownMenu>
                            <DropdownMenu.DropdownItem icon={<FeatherBook />}>
                              Codebook
                            </DropdownMenu.DropdownItem>
                            <DropdownMenu.DropdownItem icon={<FeatherCode />}>
                              Code
                            </DropdownMenu.DropdownItem>
                          </DropdownMenu>
                        </SubframeCore.DropdownMenu.Content>
                      </SubframeCore.DropdownMenu.Portal>
                    </SubframeCore.DropdownMenu.Root>
                    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
                      <span className="text-heading-2 font-heading-2 text-default-font">
                        Codebook Reference
                      </span>
                      <span className="text-body font-body text-default-font">
                        This code refers to instances where participants discuss
                        systematic approaches to data collection. It includes
                        references to methodology and structured frameworks used
                        in qualitative research. The content can extend to
                        multiple paragraphs and detailed explanations without
                        consuming excessive ink when printed.
                      </span>
                    </div>
                    <SubframeCore.DropdownMenu.Root>
                      <SubframeCore.DropdownMenu.Trigger asChild={true}>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherPalette />}
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
                            <div className="flex w-full flex-col items-start gap-2 px-3 py-2">
                              <span className="text-caption-bold font-caption-bold text-subtext-color">
                                Accent Color
                              </span>
                              <div className="flex w-full flex-wrap items-center gap-2">
                                <div className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#3b82f6ff] cursor-pointer ring-2 ring-[#3b82f6] ring-offset-1" />
                                <div className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#22c55eff] cursor-pointer" />
                                <div className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-[#eab308ff] cursor-pointer" />
                              </div>
                            </div>
                          </DropdownMenu>
                        </SubframeCore.DropdownMenu.Content>
                      </SubframeCore.DropdownMenu.Portal>
                    </SubframeCore.DropdownMenu.Root>
                    <IconButton
                      variant="neutral-tertiary"
                      size="small"
                      icon={<FeatherChevronDown />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
                    />
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
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
              <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-50 bg-brand-50 px-4 py-4">
                <div className="flex w-full items-center gap-3">
                  <Avatar variant="brand" size="small" image="">
                    N
                  </Avatar>
                  <FeatherSparkles className="text-body font-body text-brand-600" />
                </div>
                <TextField
                  className="h-auto w-full flex-none"
                  variant="filled"
                  label=""
                  helpText=""
                >
                  <TextField.Input
                    placeholder="Can you fetch some info from research papers online which supports my claim?"
                    value=""
                    onChange={(
                      event: React.ChangeEvent<HTMLInputElement>
                    ) => {}}
                  />
                </TextField>
                <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-3">
                  <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FeatherLoader2 className="text-body font-body text-brand-600" />
                      <span className="text-caption-bold font-caption-bold text-default-font">
                        Working on it...
                      </span>
                    </div>
                    <IconButton
                      size="small"
                      icon={<FeatherChevronDown />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
                    />
                  </div>
                  <div className="flex w-full flex-col items-start gap-2 pl-6">
                    <div className="flex w-full items-center gap-2">
                      <FeatherCheck className="text-caption font-caption text-success-600" />
                      <span className="text-caption font-caption text-subtext-color">
                        Searched 47 research papers
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <FeatherLoader2 className="text-caption font-caption text-brand-600" />
                      <span className="text-caption font-caption text-subtext-color">
                        Analyzing relevant citations
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <FeatherCircle className="text-caption font-caption text-neutral-400" />
                      <span className="text-caption font-caption text-neutral-400">
                        Formatting results
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-end gap-2">
                  <Button
                    variant="neutral-tertiary"
                    size="small"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Follow up
                  </Button>
                  <Button
                    variant="neutral-secondary"
                    size="small"
                    icon={<FeatherX />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Regional Impact Analysis
                </span>
                <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 px-4 pt-4 pb-12 relative">
                  <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-solid border-neutral-border">
                    <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
                      <span className="w-48 flex-none text-body-bold font-body-bold text-default-font">
                        Region
                      </span>
                      <span className="w-32 flex-none text-body-bold font-body-bold text-default-font">
                        Loss Rate
                      </span>
                      <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
                        Primary Cause
                      </span>
                      <span className="w-24 flex-none text-body-bold font-body-bold text-default-font">
                        Status
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-4 px-4 py-3">
                      <span className="w-48 flex-none text-body font-body text-default-font">
                        Amazon Basin
                      </span>
                      <span className="w-32 flex-none text-body font-body text-default-font">
                        17.3%
                      </span>
                      <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                        Agricultural expansion
                      </span>
                      <Badge variant="error" icon={null}>
                        Critical
                      </Badge>
                    </div>
                    <div className="flex w-full items-center gap-4 px-4 py-3">
                      <span className="w-48 flex-none text-body font-body text-default-font">
                        Congo Rainforest
                      </span>
                      <span className="w-32 flex-none text-body font-body text-default-font">
                        12.1%
                      </span>
                      <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                        Logging operations
                      </span>
                      <Badge variant="warning" icon={null}>
                        Warning
                      </Badge>
                    </div>
                    <div className="flex w-full items-center gap-4 px-4 py-3">
                      <span className="w-48 flex-none text-body font-body text-default-font">
                        Southeast Asia
                      </span>
                      <span className="w-32 flex-none text-body font-body text-default-font">
                        23.7%
                      </span>
                      <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                        Palm oil cultivation
                      </span>
                      <Badge variant="error" icon={null}>
                        Critical
                      </Badge>
                    </div>
                    <div className="flex w-full items-center gap-4 px-4 py-3">
                      <span className="w-48 flex-none text-body font-body text-default-font">
                        Madagascar
                      </span>
                      <span className="w-32 flex-none text-body font-body text-default-font">
                        8.4%
                      </span>
                      <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
                        Subsistence farming
                      </span>
                      <Badge variant="warning" icon={null}>
                        Warning
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border-2 border-solid border-brand-400 bg-default-background px-6 py-2 absolute -bottom-6 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2">
                      <Avatar variant="brand" size="x-small" image="">
                        N
                      </Avatar>
                      <span className="whitespace-nowrap text-caption font-caption text-subtext-color">
                        added content
                      </span>
                    </div>
                    <div className="flex h-4 w-px flex-none flex-col items-center gap-2 bg-neutral-border" />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="brand-primary"
                        size="small"
                        icon={<FeatherCheck />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="neutral-secondary"
                        size="small"
                        icon={<FeatherEdit2 />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Refine
                      </Button>
                      <Button
                        variant="neutral-secondary"
                        size="small"
                        icon={<FeatherX />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Deforestation Rates by Region
                </span>
                <BarChart
                  categories={["Loss Rate"]}
                  data={[
                    { Region: "Amazon Basin", "Loss Rate": 17.3 },
                    { Region: "Congo Rainforest", "Loss Rate": 12.1 },
                    { Region: "Southeast Asia", "Loss Rate": 23.7 },
                    { Region: "Madagascar", "Loss Rate": 8.4 },
                  ]}
                  index={"Region"}
                />
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Key Findings
                </span>
                <div className="flex w-full flex-col items-start gap-2">
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Deforestation rates have accelerated by 43% over the past
                      decade in monitored regions
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Economic incentives for conservation show 3x more
                      effectiveness than regulatory approaches alone
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Indigenous land management practices correlate with 65%
                      lower habitat degradation rates
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Recommended Interventions
                </span>
                <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 px-4 pt-4 pb-12 relative">
                  <span className="text-body font-body text-default-font">
                    Based on our analysis, we propose a multi-tiered
                    intervention strategy that balances immediate protective
                    measures with long-term sustainable development initiatives.
                    Success depends on coordinated action across governmental,
                    NGO, and local community stakeholders.
                  </span>
                  <span className="text-body font-body text-default-font">
                    Recent studies indicate that hybrid conservation models
                    combining protected area designation with sustainable
                    resource extraction zones achieve optimal outcomes.
                    Community-led initiatives show particularly strong results
                    when coupled with technical support and economic
                    alternatives to extractive practices.
                  </span>
                  <div className="flex items-center gap-3 rounded-full border-2 border-solid border-brand-400 bg-default-background px-6 py-2 absolute -bottom-6 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2">
                      <Avatar variant="brand" size="x-small" image="">
                        N
                      </Avatar>
                      <span className="whitespace-nowrap text-caption font-caption text-subtext-color">
                        updated content
                      </span>
                    </div>
                    <div className="flex h-4 w-px flex-none flex-col items-center gap-2 bg-neutral-border" />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="brand-primary"
                        size="small"
                        icon={<FeatherCheck />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="neutral-secondary"
                        size="small"
                        icon={<FeatherEdit2 />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Refine
                      </Button>
                      <Button
                        variant="neutral-secondary"
                        size="small"
                        icon={<FeatherX />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Community Engagement
                </span>
                <span className="text-body font-body text-default-font">
                  Effective conservation requires active participation from
                  local communities who depend on these ecosystems for their
                  livelihoods. Our research demonstrates that projects
                  incorporating traditional ecological knowledge alongside
                  modern conservation science achieve significantly higher
                  success rates.
                </span>
                <span className="text-body font-body text-default-font">
                  Programs that provide economic alternatives to extractive
                  activities—such as ecotourism, sustainable agriculture, and
                  certified forest products—create win-win scenarios for both
                  conservation and community development.
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Funding and Resource Allocation
                </span>
                <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 px-4 pt-4 pb-12 @keyframes pulse relative animate-pulse">
                  <span className="text-body font-body text-default-font">
                    Current funding mechanisms remain insufficient to address
                    the scale of habitat destruction. We estimate that effective
                    conservation requires a 300% increase in annual funding
                    across target regions, with emphasis on long-term
                    commitments rather than short-term project cycles.
                  </span>
                  <div className="flex w-full flex-col items-start gap-2">
                    <div className="flex w-full items-start gap-3">
                      <span className="text-body font-body text-default-font">
                        •
                      </span>
                      <span className="text-body font-body text-default-font">
                        International conservation funds should prioritize
                        protected area expansion and maintenance
                      </span>
                    </div>
                    <div className="flex w-full items-start gap-3">
                      <span className="text-body font-body text-default-font">
                        •
                      </span>
                      <span className="text-body font-body text-default-font">
                        Private sector engagement through carbon offset programs
                        and biodiversity credits
                      </span>
                    </div>
                    <div className="flex w-full items-start gap-3">
                      <span className="text-body font-body text-default-font">
                        •
                      </span>
                      <span className="text-body font-body text-default-font">
                        National governments must allocate minimum 2% of GDP to
                        environmental protection
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border-2 border-solid border-brand-400 bg-default-background px-6 py-2 absolute -bottom-6 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2">
                      <FeatherLock className="text-caption font-caption text-brand-600" />
                      <Avatar variant="brand" size="x-small" image="">
                        N
                      </Avatar>
                      <span className="whitespace-nowrap text-caption font-caption text-subtext-color">
                        AI is working on this
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Monitoring and Evaluation
                </span>
                <span className="text-body font-body text-default-font">
                  Implementing robust monitoring systems is essential for
                  tracking conservation outcomes and adapting strategies based
                  on empirical results. Remote sensing technology, combined with
                  ground-truthing surveys, provides comprehensive data on
                  habitat changes over time.
                </span>
                <span className="text-body font-body text-default-font">
                  We recommend establishing standardized biodiversity indicators
                  across all project sites, with quarterly assessments and
                  annual comprehensive reviews to ensure accountability and
                  enable adaptive management approaches.
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Policy Recommendations
                </span>
                <span className="text-body font-body text-default-font">
                  Effective policy frameworks must integrate conservation
                  objectives into broader economic development plans. This
                  requires reforming subsidy structures that currently
                  incentivize habitat destruction and implementing payment for
                  ecosystem services programs.
                </span>
                <div className="flex w-full flex-col items-start gap-2">
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Strengthen enforcement of existing environmental
                      protection laws
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Create financial mechanisms that reward conservation
                      outcomes
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Mandate environmental impact assessments for all major
                      development projects
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-3">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      Establish legal protections for indigenous land rights
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Technological Innovation
                </span>
                <span className="text-body font-body text-default-font">
                  Emerging technologies offer promising tools for conservation
                  efforts. Satellite imagery with machine learning algorithms
                  can detect illegal deforestation in real-time, while DNA
                  barcoding enables rapid biodiversity assessments. Drone
                  technology provides cost-effective monitoring of remote areas.
                </span>
                <span className="text-body font-body text-default-font">
                  Investment in these technologies should be coupled with
                  capacity building programs to ensure local teams can
                  effectively deploy and maintain monitoring systems.
                  Open-source platforms and data sharing protocols will maximize
                  the impact of technological innovations.
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Climate Change Considerations
                </span>
                <span className="text-body font-body text-default-font">
                  Habitat destruction and climate change create compounding
                  threats to biodiversity. Conservation strategies must account
                  for shifting species ranges and ecosystem boundaries as
                  temperatures rise. Protected area networks should incorporate
                  climate corridors that allow species migration.
                </span>
                <span className="text-body font-body text-default-font">
                  Forest conservation also serves as a critical climate
                  mitigation strategy, with tropical forests storing
                  approximately 250 billion tons of carbon. Protecting these
                  ecosystems delivers dual benefits for biodiversity
                  preservation and climate stabilization.
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-50 bg-brand-50 px-4 py-4">
                <div className="flex w-full items-center gap-3">
                  <Avatar variant="brand" size="small" image="">
                    N
                  </Avatar>
                  <span className="text-body font-body text-default-font">
                    Can you add a graph for this section?
                  </span>
                </div>
              </div>
              <div className="flex w-full items-center gap-4 relative">
                <IconButton
                  className="h-10 w-auto flex-none"
                  variant="brand-secondary"
                  size="large"
                  icon={<FeatherChevronLeft />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 rounded-lg border-2 border-solid border-brand-400 px-4 pt-4 pb-12 relative">
                  <BarChart
                    categories={["Carbon Storage (Billion Tons)"]}
                    data={[
                      {
                        Region: "Amazon Basin",
                        "Carbon Storage (Billion Tons)": 86,
                      },
                      {
                        Region: "Congo Rainforest",
                        "Carbon Storage (Billion Tons)": 62,
                      },
                      {
                        Region: "Southeast Asia",
                        "Carbon Storage (Billion Tons)": 48,
                      },
                      {
                        Region: "Madagascar",
                        "Carbon Storage (Billion Tons)": 12,
                      },
                    ]}
                    index={"Region"}
                  />
                  <div className="flex w-full items-center justify-center gap-2">
                    <div className="flex h-2 w-2 flex-none flex-col items-center gap-2 rounded-full bg-brand-600" />
                    <div className="flex h-2 w-2 flex-none flex-col items-center gap-2 rounded-full bg-neutral-200" />
                    <div className="flex h-2 w-2 flex-none flex-col items-center gap-2 rounded-full bg-neutral-200" />
                  </div>
                  <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
                    <div className="flex w-full items-center gap-2">
                      <FeatherBarChart3 className="text-body font-body text-brand-600" />
                      <span className="text-body-bold font-body-bold text-default-font">
                        Option 1: Bar Chart Comparison
                      </span>
                    </div>
                    <span className="text-caption font-caption text-subtext-color">
                      Shows clear contrast between carbon storage levels across
                      regions. Best for emphasizing the magnitude differences
                      and making regional comparisons obvious at a glance.
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-full border-2 border-solid border-brand-400 bg-default-background px-6 py-2 absolute -bottom-6 left-1/2 -translate-x-1/2">
                    <div className="flex items-center gap-2">
                      <Avatar variant="brand" size="x-small" image="">
                        N
                      </Avatar>
                      <span className="whitespace-nowrap text-caption font-caption text-subtext-color">
                        suggested visualizations
                      </span>
                    </div>
                    <div className="flex h-4 w-px flex-none flex-col items-center gap-2 bg-neutral-border" />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="brand-primary"
                        size="small"
                        icon={<FeatherCheck />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="neutral-secondary"
                        size="small"
                        icon={<FeatherEdit2 />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Refine
                      </Button>
                      <Button
                        variant="neutral-secondary"
                        size="small"
                        icon={<FeatherX />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
                <IconButton
                  className="h-10 w-auto flex-none"
                  variant="brand-secondary"
                  size="large"
                  icon={<FeatherChevronRight />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
              </div>
              <div className="flex w-full flex-col items-start gap-4 relative">
                <IconButton
                  className="absolute -left-12 top-0"
                  variant="brand-secondary"
                  size="small"
                  icon={<FeatherSparkles />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Conclusion
                </span>
                <span className="text-body font-body text-default-font">
                  The challenges facing critical ecosystems require coordinated
                  action across multiple scales—from local community initiatives
                  to international policy frameworks. While the scope of habitat
                  destruction appears daunting, our analysis reveals numerous
                  intervention points where strategic action can yield
                  substantial conservation benefits.
                </span>
                <span className="text-body font-body text-default-font">
                  Success depends on sustained commitment, adequate funding, and
                  genuine collaboration between all stakeholders. The frameworks
                  and recommendations presented here provide a roadmap for
                  moving from crisis response to proactive conservation
                  management.
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-solid border-neutral-border bg-brand-600 px-4 py-4 shadow-lg cursor-pointer transition-colors absolute bottom-6 right-6">
            <FeatherMessageCircle className="text-heading-3 font-heading-3 text-white" />
            <span className="text-body-bold font-body-bold text-white">
              Need help?
            </span>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
}

export default NabuDocuments;
