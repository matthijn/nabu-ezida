import { useNavigate } from "react-router";
import { FileText, Home, Moon, Settings, Sun } from "lucide-react";
import { motion } from "motion/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import { useTheme } from "~/hooks/use-theme";
import { ProjectSelector } from "~/components/project-selector";

const navItems = [
  { title: "Home", icon: Home, url: "/" },
  { title: "Documents", icon: FileText, url: "/documents" },
  { title: "Settings", icon: Settings, url: "/settings" },
];

const MotionSidebarFooter = motion.create(SidebarFooter);

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { state } = useSidebar();
  const isDark = theme === "dark";
  const isCollapsed = state === "collapsed";

  return (
    <MotionSidebarFooter
      initial={false}
      animate={{ opacity: isCollapsed ? 0 : 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    >
      <Separator />
      <div className="flex items-center justify-end gap-2 py-2 pr-2">
        <Sun className="h-4 w-4" />
        <Switch checked={isDark} onCheckedChange={toggleTheme} />
        <Moon className="h-4 w-4" />
      </div>
    </MotionSidebarFooter>
  );
}

type AppSidebarProps = {
  projectId?: string;
};

const toProjectUrl = (id: string): string => `/project/${id}`;

export function AppSidebar({ projectId }: AppSidebarProps) {
  const navigate = useNavigate();
  const navigateToProject = (id: string) => navigate(toProjectUrl(id));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <ProjectSelector value={projectId ?? null} onChange={navigateToProject} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <ThemeToggle />
    </Sidebar>
  );
}
