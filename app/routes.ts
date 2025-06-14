import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  
  // Auth routes
  layout("routes/_auth.tsx", [
    route("login", "routes/login.tsx"),
  ]),
  
  // App routes (protected)
  layout("routes/_app.tsx", [
    route("dashboard", "routes/_app.dashboard.tsx"),
    route("properties", "routes/_app.properties.tsx"),
    route("my-properties", "routes/_app.my-properties.tsx"),
  ]),
] satisfies RouteConfig;