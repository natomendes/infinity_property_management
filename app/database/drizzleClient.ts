import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl } from "~/config";

// Disable prefetch as it is not supported for "Transaction" pool mode
export const client = postgres(databaseUrl, { prepare: false });
export const db = drizzle(client);
