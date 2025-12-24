import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { AppLayout } from "~/ui/layouts/AppLayout";
import { useProjects, getFirstProjectId } from "~/hooks/useProjects";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nabu - Your AI research partner" },
    { name: "description", content: "Qualitative research workspace" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { projects, loading } = useProjects();

  useEffect(() => {
    const firstId = getFirstProjectId(projects);
    if (!loading && firstId) {
      navigate(`/project/${firstId}`, { replace: true });
    }
  }, [projects, loading, navigate]);

  return (
    <AppLayout>
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {loading ? "Loading projects..." : "No projects found"}
      </div>
    </AppLayout>
  );
}
