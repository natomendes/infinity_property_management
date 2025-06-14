import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { listings } from "~/database/schemas/listings-schema";
import { owners } from "~/database/schemas/owners-schema";

export const ownerListings = pgTable(
  "owner_listings",
  {
    ownerId: uuid("owner_id").notNull(),
    listingId: text("listing_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Composite primary key
    primaryKey({ columns: [table.ownerId, table.listingId] }),

    // Foreign key constraints
    foreignKey({
      columns: [table.ownerId],
      foreignColumns: [owners.id],
      name: "owner_listings_owner_id_fk",
    }).onDelete("cascade"),

    foreignKey({
      columns: [table.listingId],
      foreignColumns: [listings.id],
      name: "owner_listings_listing_id_fk",
    }).onDelete("cascade"),

    // Indexes for query optimization
    index("idx_owner_listings_owner_id").on(table.ownerId),
    index("idx_owner_listings_listing_id").on(table.listingId),

    // RLS Policies
    // Policy: Managers can view all owner listings
    pgPolicy("Managers can view all owner listings", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Policy: Owners can view their own owner listings
    pgPolicy("Owners can view their own owner listings", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.owners WHERE id = ${table.ownerId} AND profile_id = auth.uid())`,
    }),

    // Policy: Managers can create owner listings
    pgPolicy("Managers can create owner listings", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Policy: Managers can delete owner listings
    pgPolicy("Managers can delete owner listings", {
      for: "delete",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),
  ]
);
