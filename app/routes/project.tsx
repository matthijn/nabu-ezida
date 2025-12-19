import type { Route } from "./+types/project";
import { AppLayout } from "~/components/app-layout";
import { Editor } from "~/lib/editor";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nabu - Your AI research partner" },
    { name: "description", content: "Qualitative research workspace" },
  ];
}

export default function Project({ params }: Route.ComponentProps) {
  return (
    <AppLayout projectId={params.projectId}>
      <Editor />
    </AppLayout>
  );
}
