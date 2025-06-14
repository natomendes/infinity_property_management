import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

// Define user role enum type for better type safety
export type UserRole = "manager" | "owner";

// Define the profiles table with RLS policies
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().notNull(),
    email: text("email").unique().notNull(),
    fullName: text("full_name"),
    userRole: text("user_role", { enum: ["manager", "owner"] })
      .notNull()
      .default("owner"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Indexes for query optimization
    index("idx_profiles_email").on(table.email),
    index("idx_profiles_user_role").on(table.userRole),

    // Foreign key constraint to auth.users
    foreignKey({
      columns: [table.id],
      foreignColumns: [authUsers.id],
      name: "profiles_id_fk",
    }).onDelete("cascade"),

    // RLS Policies
    // Policy: Authenticated users can view their own profile
    pgPolicy("Allow authenticated users to view their own profile", {
      for: "select",
      to: authenticatedRole,
      using: sql`auth.uid() = ${table.id}`,
    }),

    // Policy: Authenticated users can update their own profile
    pgPolicy("Allow authenticated users to update their own profile", {
      for: "update",
      to: authenticatedRole,
      using: sql`auth.uid() = ${table.id}`,
    }),

    // Policy: Managers can view all profiles
    pgPolicy("Managers can view all profiles", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Policy: Managers can create profiles (useful for adding new owners)
    pgPolicy("Managers can create profiles", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),
  ]
);

// Type inference for the profiles table
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

// Helper type for profile with required fields
export interface CreateProfileData {
  id: string;
  email: string;
  fullName?: string | null;
  userRole?: UserRole;
}

// Helper type for updating profile
export interface UpdateProfileData {
  email?: string;
  fullName?: string | null;
  userRole?: UserRole;
  updatedAt?: Date;
}
