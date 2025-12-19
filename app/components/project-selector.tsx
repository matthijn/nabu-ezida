import { AlertCircle, ChevronsUpDown, FolderOpen, Plus } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "~/components/ui/sidebar"
import type { ProjectSummary } from "~/lib/api"
import {
  useProjects,
  findProjectById,
  resolveState,
  type SelectorState,
} from "~/hooks/useProjects"

type ProjectButtonContentProps = {
  icon: LucideIcon
  title: string
  subtitle: string
}

const ProjectButtonContent = ({
  icon: Icon,
  title,
  subtitle,
}: ProjectButtonContentProps) => (
  <>
    <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
      <Icon className="size-4" />
    </div>
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{title}</span>
      <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
    </div>
  </>
)

type StaticButtonProps = {
  icon: LucideIcon
  title: string
  subtitle: string
  disabled?: boolean
}

const StaticButton = ({ icon, title, subtitle, disabled }: StaticButtonProps) => (
  <SidebarMenuButton size="lg" disabled={disabled}>
    <ProjectButtonContent icon={icon} title={title} subtitle={subtitle} />
  </SidebarMenuButton>
)

type ProjectDropdownProps = {
  activeProject: ProjectSummary | undefined
  projects: ProjectSummary[]
  isMobile: boolean
  onChange: (projectId: string) => void
}

const ProjectDropdown = ({
  activeProject,
  projects,
  isMobile,
  onChange,
}: ProjectDropdownProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <SidebarMenuButton
        size="lg"
        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
      >
        <ProjectButtonContent
          icon={FolderOpen}
          title={activeProject?.name ?? "Select project"}
          subtitle={activeProject?.description || "No description"}
        />
        <ChevronsUpDown className="ml-auto" />
      </SidebarMenuButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent
      className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
      align="start"
      side={isMobile ? "bottom" : "right"}
      sideOffset={4}
    >
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        Projects
      </DropdownMenuLabel>
      {projects.map((project) => (
        <DropdownMenuItem
          key={project.id}
          onClick={() => onChange(project.id)}
          className="gap-2 p-2"
        >
          <div className="flex size-6 items-center justify-center rounded-md border">
            <FolderOpen className="size-3.5 shrink-0" />
          </div>
          {project.name}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="gap-2 p-2">
        <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
          <Plus className="size-4" />
        </div>
        <div className="text-muted-foreground font-medium">New project</div>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)

type ProjectSelectorProps = {
  value: string | null
  onChange: (projectId: string) => void
}

export const ProjectSelector = ({ value, onChange }: ProjectSelectorProps) => {
  const { isMobile } = useSidebar()
  const { projects, loading, error } = useProjects()
  const activeProject = findProjectById(projects, value)
  const state = resolveState(loading, error, projects)

  const stateContent: Record<SelectorState, React.ReactNode> = {
    loading: (
      <StaticButton
        icon={FolderOpen}
        title="Loading..."
        subtitle="Your AI research partner"
        disabled
      />
    ),
    error: (
      <StaticButton
        icon={AlertCircle}
        title="Error"
        subtitle={error?.message ?? "Unknown error"}
        disabled
      />
    ),
    empty: (
      <StaticButton
        icon={Plus}
        title="No projects"
        subtitle="Create your first project"
      />
    ),
    ready: (
      <ProjectDropdown
        activeProject={activeProject}
        projects={projects}
        isMobile={isMobile}
        onChange={onChange}
      />
    ),
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>{stateContent[state]}</SidebarMenuItem>
    </SidebarMenu>
  )
}
