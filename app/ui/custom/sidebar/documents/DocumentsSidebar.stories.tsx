import type { Meta, StoryObj } from "@storybook/react-vite"
import { DocumentsSidebar } from "./DocumentsSidebar"

const sampleDocuments = [
  {
    id: "1",
    title: "Habitat Destruction Framework",
    editedAt: "Edited 2 hours ago",
    tags: ["ecology", "framework"],
  },
  {
    id: "2",
    title: "Research Paper Draft",
    editedAt: "Edited 3 days ago",
    tags: ["paper"],
  },
  {
    id: "3",
    title: "Amazon Rainforest Case Study",
    editedAt: "Edited yesterday",
    tags: ["corpus", "ecology"],
  },
  {
    id: "4",
    title: "Literature Review Notes",
    editedAt: "Edited 1 week ago",
    tags: ["literature"],
  },
  {
    id: "5",
    title: "Species Survey Data",
    editedAt: "Edited 2 weeks ago",
    tags: ["corpus"],
  },
  {
    id: "6",
    title: "Methodology & Approach",
    editedAt: "Edited 3 weeks ago",
    tags: ["framework"],
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
