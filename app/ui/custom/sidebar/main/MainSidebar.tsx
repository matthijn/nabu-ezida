"use client";

import React from "react";
import { FeatherLogOut, FeatherSettings, FeatherUser } from "@subframe/core";
import * as SubframeCore from "@subframe/core";
import { Avatar } from "~/ui/components/Avatar";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { SidebarRailWithLabels } from "~/ui/components/SidebarRailWithLabels";

export interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  selected?: boolean;
}

export interface UserMenuAction {
  id: string;
  icon: React.ReactNode;
  label: string;
}

export interface MainSidebarProps {
  logoSrc?: string;
  navItemGroups: NavItem[][];
  userAvatarSrc?: string;
  userInitials?: string;
  userMenuActions?: UserMenuAction[];
  onNavItemClick?: (id: string) => void;
  onUserMenuAction?: (actionId: string) => void;
}

const defaultUserMenuActions: UserMenuAction[] = [
  { id: "account", icon: <FeatherUser />, label: "Account" },
  { id: "settings", icon: <FeatherSettings />, label: "Settings" },
  { id: "logout", icon: <FeatherLogOut />, label: "Log out" },
];

export function MainSidebar({
  logoSrc = "https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/y2rsnhq3mex4auk54aye.png",
  navItemGroups,
  userAvatarSrc = "https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif",
  userInitials = "A",
  userMenuActions = defaultUserMenuActions,
  onNavItemClick,
  onUserMenuAction,
}: MainSidebarProps) {
  const handleNavItemClick = (id: string) => () => onNavItemClick?.(id);
  const handleUserMenuAction = (actionId: string) => () => onUserMenuAction?.(actionId);

  const renderNavItem = (item: NavItem) => (
    <SidebarRailWithLabels.NavItem
      key={item.id}
      icon={item.icon}
      tooltip={item.tooltip}
      selected={item.selected}
      onClick={handleNavItemClick(item.id)}
    >
      {item.label}
    </SidebarRailWithLabels.NavItem>
  );

  const renderNavContent = () =>
    navItemGroups.flatMap((group, groupIndex) => {
      const items = group.map(renderNavItem);
      const isLastGroup = groupIndex === navItemGroups.length - 1;
      if (isLastGroup) return items;
      return [
        ...items,
        <div
          key={`divider-${groupIndex}`}
          className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border"
        />,
      ];
    });

  return (
    <SidebarRailWithLabels
      header={
        <div className="flex flex-col items-center justify-center gap-2 px-1 py-1">
          <img
            className="h-6 w-6 flex-none object-cover"
            src={logoSrc}
            alt="Logo"
          />
        </div>
      }
      footer={
        <div className="flex flex-col items-center justify-end gap-1 px-2 py-2">
          <SubframeCore.DropdownMenu.Root>
            <SubframeCore.DropdownMenu.Trigger asChild={true}>
              <Avatar image={userAvatarSrc}>{userInitials}</Avatar>
            </SubframeCore.DropdownMenu.Trigger>
            <SubframeCore.DropdownMenu.Portal>
              <SubframeCore.DropdownMenu.Content
                side="right"
                align="end"
                sideOffset={4}
                asChild={true}
              >
                <DropdownMenu>
                  {userMenuActions.map((action) => (
                    <DropdownMenu.DropdownItem
                      key={action.id}
                      icon={action.icon}
                      onClick={handleUserMenuAction(action.id)}
                    >
                      {action.label}
                    </DropdownMenu.DropdownItem>
                  ))}
                </DropdownMenu>
              </SubframeCore.DropdownMenu.Content>
            </SubframeCore.DropdownMenu.Portal>
          </SubframeCore.DropdownMenu.Root>
        </div>
      }
    >
      {renderNavContent()}
    </SidebarRailWithLabels>
  );
}
