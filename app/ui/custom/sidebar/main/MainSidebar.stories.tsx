import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  FeatherBook,
  FeatherFiles,
  FeatherInbox,
  FeatherSend,
} from "@subframe/core";
import { MainSidebar } from "./MainSidebar";
import type { NavItem } from "./MainSidebar";

const primaryNavItems: NavItem[] = [
  { id: "documents", icon: <FeatherFiles />, label: "Documents", selected: true },
  { id: "inbox", icon: <FeatherInbox />, label: "Inbox" },
  { id: "outbox", icon: <FeatherSend />, label: "Outbox" },
];

const secondaryNavItems: NavItem[] = [
  { id: "codes", icon: <FeatherBook />, label: "Codes" },
];

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
};

export default meta;
type Story = StoryObj<typeof MainSidebar>;

export const Default: Story = {
  args: {
    navItemGroups: [primaryNavItems, secondaryNavItems],
  },
};

export const InboxSelected: Story = {
  args: {
    navItemGroups: [
      [
        { id: "documents", icon: <FeatherFiles />, label: "Documents" },
        { id: "inbox", icon: <FeatherInbox />, label: "Inbox", selected: true },
        { id: "outbox", icon: <FeatherSend />, label: "Outbox" },
      ],
      secondaryNavItems,
    ],
  },
};

export const NoAvatar: Story = {
  args: {
    navItemGroups: [primaryNavItems, secondaryNavItems],
    userAvatarSrc: "",
    userInitials: "MK",
  },
};
