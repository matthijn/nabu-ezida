import type { Route } from "./+types/designs";
import NabuDocuments from "~/designs/subframe/pages/NabuDocuments";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Design Preview" }];
}

export default function DesignsPage() {
  return <NabuDocuments />;
}
