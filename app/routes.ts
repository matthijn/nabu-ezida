import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("project/:projectId", "routes/project.tsx"),
  route("designs", "routes/designs.tsx", [
    index("routes/designs._index.tsx"),
    route("documents2", "routes/designs.documents2.tsx"),
  ]),
] satisfies RouteConfig;
