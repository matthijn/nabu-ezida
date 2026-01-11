import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("project/:projectId", "routes/project.tsx", [
    index("routes/project._index.tsx"),
    route("file/:fileId", "routes/project.file.tsx"),
  ]),
  route("designs", "routes/designs.tsx", [
    index("routes/designs._index.tsx"),
    route("documents2", "routes/designs.documents2.tsx"),
    route("documents3", "routes/designs.documents3.tsx"),
    route("codes2", "routes/designs.codes2.tsx"),
    route("inbox", "routes/designs.inbox.tsx"),
  ]),
] satisfies RouteConfig;
