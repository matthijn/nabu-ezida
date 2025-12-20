import { useEffect } from "react";
import type { Route } from "./+types/project";
import { AppLayout } from "~/components/app-layout";
import { Editor } from "~/lib/editor";
import { useStateSync } from "~/hooks/useStateSync";
import { getWsUrl } from "~/lib/env";
import type { Project } from "~/domain/project";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nabu - Your AI research partner" },
    { name: "description", content: "Qualitative research workspace" },
  ];
}

export default function ProjectPage({ params }: Route.ComponentProps) {
  const { state, isConnected } = useStateSync<Project>({
    baseUrl: getWsUrl("/ws"),
    resourceId: params.projectId,
  });

  useEffect(() => {
    if (state) {
      console.log("Project loaded:", state.name, "v" + state.version);
    }
  }, [state]);

  return (
    <AppLayout projectId={params.projectId}>
      <Editor />
    </AppLayout>
  );
}
