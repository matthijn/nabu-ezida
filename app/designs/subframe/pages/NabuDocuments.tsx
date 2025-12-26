"use client";

import React, { useState } from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { BarChart } from "~/ui/components/BarChart";
import { Button } from "~/ui/components/Button";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { ToggleGroup } from "~/ui/components/ToggleGroup";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout"
import { Proposal } from "~/ui/components/Proposal";
import { ProposalOptions } from "~/ui/components/ProposalOptions";
import { SidebarPanel, filterByQuery } from "~/ui/components/sidebar";
import { TextField } from "~/ui/components/TextField";
import { FeatherBarChart3 } from "@subframe/core";
import { FeatherBold } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherChevronDown } from "@subframe/core";
import { FeatherCircle } from "@subframe/core";
import { FeatherCode2 } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
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
import { FeatherShare2 } from "@subframe/core";
import { FeatherSparkles } from "@subframe/core";
import { FeatherStrikethrough } from "@subframe/core";
import { FeatherTrash } from "@subframe/core";
import { FeatherUnderline } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

type Document = {
  id: string
  title: string
  editedAt: string
  tags: string[]
  pinned: boolean
}

const DOCUMENTS: Document[] = [
  { id: "1", title: "Habitat Destruction Framework", editedAt: "2 hours ago", tags: ["Framework"], pinned: true },
  { id: "2", title: "Research Paper Draft", editedAt: "3 days ago", tags: ["Paper"], pinned: true },
  { id: "3", title: "Amazon Rainforest Case Study", editedAt: "yesterday", tags: ["Corpus", "Field Notes"], pinned: false },
  { id: "4", title: "Literature Review Notes", editedAt: "1 week ago", tags: ["Literature", "Review"], pinned: false },
  { id: "5", title: "Species Survey Data", editedAt: "2 weeks ago", tags: ["Corpus"], pinned: false },
  { id: "6", title: "Methodology & Approach", editedAt: "3 weeks ago", tags: ["Framework"], pinned: false },
]

type DocumentCardProps = {
  document: Document
  selected: boolean
  onClick: () => void
}

const DocumentCard = ({ document, selected, onClick }: DocumentCardProps) => (
  <div
    className={`flex w-full flex-col items-start gap-3 rounded-md px-4 py-4 cursor-pointer ${
      selected ? "bg-brand-50" : "bg-neutral-50"
    }`}
    onClick={onClick}
  >
    <div className="flex w-full flex-col items-start gap-2">
      <span className={selected ? "text-body-bold font-body-bold text-default-font" : "text-body font-body text-default-font"}>
        {document.title}
      </span>
      <div className="flex w-full flex-wrap items-center gap-2">
        <span className="text-caption font-caption text-subtext-color">
          Edited {document.editedAt}
        </span>
        {document.tags.map((tag) => (
          <Badge key={tag} variant={selected ? "brand" : "neutral"} icon={null}>
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  </div>
)

function NabuDocuments() {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("1")
  const [collapsed, setCollapsed] = useState(false)

  const filtered = filterByQuery(DOCUMENTS, query, (d) => d.title + " " + d.tags.join(" "))
  const pinned = filtered.filter((d) => d.pinned)
  const all = filtered.filter((d) => !d.pinned)
  const isEmpty = filtered.length === 0

  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full cursor-pointer items-start bg-default-background">
        <SidebarPanel
          title="Documents"
          collapsed={collapsed}
          onCollapse={() => setCollapsed(true)}
          onExpand={() => setCollapsed(false)}
        >
          <SidebarPanel.Search
            value={query}
            onChange={setQuery}
            placeholder="Search documents..."
          />
          <SidebarPanel.Toolbar>
            <ToggleGroup value="" onValueChange={() => {}}>
              <ToggleGroup.Item icon={null} value="modified">
                Modified
              </ToggleGroup.Item>
              <ToggleGroup.Item icon={null} value="name">
                Name
              </ToggleGroup.Item>
            </ToggleGroup>
            <Button
              variant="brand-primary"
              size="small"
              icon={<FeatherPlus />}
              onClick={() => {}}
            >
              New
            </Button>
          </SidebarPanel.Toolbar>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 overflow-auto">
            {isEmpty ? (
              <SidebarPanel.Empty>
                {query ? "No results" : "Nothing here yet"}
              </SidebarPanel.Empty>
            ) : (
              <>
                <SidebarPanel.Group label="PINNED">
                  {pinned.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      selected={doc.id === selectedId}
                      onClick={() => setSelectedId(doc.id)}
                    />
                  ))}
                </SidebarPanel.Group>
                <SidebarPanel.Group label="ALL DOCUMENTS">
                  {all.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      document={doc}
                      selected={doc.id === selectedId}
                      onClick={() => setSelectedId(doc.id)}
                    />
                  ))}
                </SidebarPanel.Group>
              </>
            )}
          </div>
        </SidebarPanel>
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
              <div className="flex w-full flex-col items-start gap-4">
                <span className="text-heading-1 font-heading-1 text-default-font">
                  Habitat Destruction Framework
                </span>
                <span className="text-body font-body text-subtext-color">
                  A comprehensive analysis of ecosystem degradation patterns and
                  conservation strategies across tropical regions
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Regional Impact Analysis
                </span>
                <Proposal avatar="N" description="added content">
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
                </Proposal>
              </div>
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Recommended Interventions
                </span>
                <Proposal avatar="N" description="updated content">
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
                </Proposal>
              </div>
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Funding and Resource Allocation
                </span>
                <Proposal avatar="N" description="AI is working on this" loading>
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
                </Proposal>
              </div>
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
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
              <div className="flex w-full flex-col items-start gap-4">
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
              <Proposal avatar="N" description="suggested visualizations" className="px-16">
                <ProposalOptions>
                  <ProposalOptions.Option
                    title="Bar Chart Comparison"
                    rationale="Shows clear contrast between carbon storage levels across regions. Best for emphasizing the magnitude differences and making regional comparisons obvious at a glance."
                    icon={<FeatherBarChart3 className="text-body font-body text-brand-600" />}
                  >
                    <BarChart
                      categories={["Carbon Storage (Billion Tons)"]}
                      data={[
                        { Region: "Amazon Basin", "Carbon Storage (Billion Tons)": 86 },
                        { Region: "Congo Rainforest", "Carbon Storage (Billion Tons)": 62 },
                        { Region: "Southeast Asia", "Carbon Storage (Billion Tons)": 48 },
                        { Region: "Madagascar", "Carbon Storage (Billion Tons)": 12 },
                      ]}
                      index={"Region"}
                    />
                  </ProposalOptions.Option>
                  <ProposalOptions.Option
                    title="Pie Chart Distribution"
                    rationale="Displays proportional breakdown of carbon storage by region. Useful for showing relative contributions to total carbon sequestration capacity."
                    icon={<FeatherBarChart3 className="text-body font-body text-brand-600" />}
                  >
                    <BarChart
                      categories={["Carbon Storage (Billion Tons)"]}
                      data={[
                        { Region: "Amazon Basin", "Carbon Storage (Billion Tons)": 86 },
                        { Region: "Congo Rainforest", "Carbon Storage (Billion Tons)": 62 },
                        { Region: "Southeast Asia", "Carbon Storage (Billion Tons)": 48 },
                        { Region: "Madagascar", "Carbon Storage (Billion Tons)": 12 },
                      ]}
                      index={"Region"}
                    />
                  </ProposalOptions.Option>
                  <ProposalOptions.Option
                    title="Stacked Area Timeline"
                    rationale="Shows carbon storage trends over time by region. Ideal for demonstrating historical changes and projected future scenarios."
                    icon={<FeatherBarChart3 className="text-body font-body text-brand-600" />}
                  >
                    <BarChart
                      categories={["Carbon Storage (Billion Tons)"]}
                      data={[
                        { Region: "Amazon Basin", "Carbon Storage (Billion Tons)": 86 },
                        { Region: "Congo Rainforest", "Carbon Storage (Billion Tons)": 62 },
                        { Region: "Southeast Asia", "Carbon Storage (Billion Tons)": 48 },
                        { Region: "Madagascar", "Carbon Storage (Billion Tons)": 12 },
                      ]}
                      index={"Region"}
                    />
                  </ProposalOptions.Option>
                </ProposalOptions>
              </Proposal>
              <div className="flex w-full flex-col items-start gap-4">
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
        </div>
      </div>
    </DefaultPageLayout>
  );
}

export default NabuDocuments;
