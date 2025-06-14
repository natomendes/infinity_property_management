import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  layout("routes/_app.tsx", [
    route("dashboard", "routes/_app.dashboard.tsx"),
    route("properties", "routes/_app.properties.tsx"),
    route("my-properties", "routes/_app.my-properties.tsx"),
  ]),
] satisfies RouteConfig;