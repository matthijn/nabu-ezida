import type { Meta, StoryObj } from "@storybook/react-vite"
import { DocumentsSidebar } from "./DocumentsSidebar"

const sampleDocuments = [
  {
    id: "1",
    title: "Habitat Destruction Framework",
    date: "2026-04-04",
    editedAt: "Apr 4, 2026",
    tags: ["ecology", "framework"],
    annotationCount: 5,
  },
  {
    id: "2",
    title: "Research Paper Draft",
    date: "2026-04-01",
    editedAt: "Apr 1, 2026",
    tags: ["paper"],
    annotationCount: 0,
  },
  {
    id: "3",
    title: "Amazon Rainforest Case Study",
    date: "2026-03-20",
    editedAt: "Mar 20, 2026",
    tags: ["corpus", "ecology"],
    annotationCount: 12,
  },
  {
    id: "4",
    title: "Literature Review Notes",
    date: "",
    editedAt: "",
    tags: ["literature"],
    annotationCount: 0,
  },
  {
    id: "5",
    title: "Species Survey Data",
    date: "2026-03-01",
    editedAt: "Mar 1, 2026",
    tags: ["corpus"],
    annotationCount: 3,
  },
  {
    id: "6",
    title: "Methodology & Approach",
    date: "",
    editedAt: "",
    tags: ["framework"],
    annotationCount: 0,
  },
]

const meta: Meta<typeof DocumentsSidebar> = {
  title: "Custom/Sidebar/Documents/DocumentsSidebar",
  component: DocumentsSidebar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DocumentsSidebar>

export const Default: Story = {
  args: {
    documents: sampleDocuments,
    selectedId: "1",
  },
}

export const Empty: Story = {
  args: {
    documents: [],
  },
}

export const WithSearch: Story = {
  args: {
    documents: sampleDocuments,
    searchValue: "habitat",
    selectedId: "1",
  },
}
