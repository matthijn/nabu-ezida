import type { Route } from "./+types/home";
import { AppLayout } from "~/components/app-layout";
import { Editor } from "~/lib/editor";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nabu" },
    { name: "description", content: "The last editor you'll ever need" },
  ];
}

export default function Home() {
  return (
    <AppLayout>
      <Editor />
    </AppLayout>
  );
}
