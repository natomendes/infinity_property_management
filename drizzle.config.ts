import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in the environment variables.");
}

export default defineConfig({
  out: "./app/database/drizzle/migrations",
  dialect: "postgresql",
  schema: "./app/database/schemas/*",
  dbCredentials: {
    url: databaseUrl,
  },
  entities: {
    roles: {
      provider: "supabase", // This excludes Supabase's built-in roles from management
    },
  },
});
