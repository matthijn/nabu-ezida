import type { Meta, StoryObj } from "@storybook/react-vite"
import { Book, Files, Inbox, Send } from "lucide-react"
import { MainSidebar } from "./MainSidebar"
import type { NavItem } from "./MainSidebar"

const primaryNavItems: NavItem[] = [
  { id: "documents", icon: <Files />, label: "Documents", selected: true },
  { id: "inbox", icon: <Inbox />, label: "Inbox" },
  { id: "outbox", icon: <Send />, label: "Outbox" },
]

const secondaryNavItems: NavItem[] = [{ id: "codes", icon: <Book />, label: "Codes" }]

const meta: Meta<typeof MainSidebar> = {
  title: "Custom/Sidebar/Main/MainSidebar",
  component: MainSidebar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh", display: "flex" }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof MainSidebar>

export const Default: Story = {
  args: {
    navItemGroups: [primaryNavItems, secondaryNavItems],
  },
}

export const InboxSelected: Story = {
  args: {
    navItemGroups: [
      [
        { id: "documents", icon: <Files />, label: "Documents" },
        { id: "inbox", icon: <Inbox />, label: "Inbox", selected: true },
        { id: "outbox", icon: <Send />, label: "Outbox" },
      ],
      secondaryNavItems,
    ],
  },
}

export const NoAvatar: Story = {
  args: {
    navItemGroups: [primaryNavItems, secondaryNavItems],
    userAvatarSrc: "",
    userInitials: "MK",
  },
}
