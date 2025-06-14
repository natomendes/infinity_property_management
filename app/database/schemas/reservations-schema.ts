import { sql } from "drizzle-orm";
import {
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { listings } from "~/database/schemas/listings-schema";

export const reservations = pgTable(
  "reservations",
  {
    // Primary identifiers
    id: text("id").primaryKey().notNull(),
    shortId: text("short_id").unique().notNull(),
    listingId: text("listing_id").notNull(),
    clientId: text("client_id"),

    // Reservation details
    type: text("type").notNull(), // 'reserved', 'booked', 'contract', 'blocked', 'maintenance', 'canceled'
    checkInDate: date("check_in_date").notNull(),
    checkInTime: time("check_in_time", { withTimezone: false }),
    checkOutDate: date("check_out_date").notNull(),
    checkOutTime: time("check_out_time", { withTimezone: false }),

    // Guest information
    guests: integer("guests"),
    guestsDetails: jsonb("guests_details"), // adults, children

    // Booking metadata
    promocode: text("promocode"),
    partner: jsonb("partner"), // partner._id, partner.name, partner.commission
    operator: jsonb("operator"), // operator._id, operator.name
    agent: jsonb("agent"), // agent._id, agent.name
    price: jsonb("price"), // currency, *f*expected (if overwritten)

    // Notes and messages
    internalNote: text("internal_note"),
    cancelMessage: text("cancel_message"), // For canceled reservations

    // Timestamps
    creationDate: timestamp("creation_date", { withTimezone: true }), // Corresponds to stays.net's creationDate
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Foreign key constraint
    foreignKey({
      columns: [table.listingId],
      foreignColumns: [listings.id],
      name: "reservations_listing_id_fk",
    }).onDelete("cascade"),

    // Indexes for query optimization
    index("idx_reservations_listing_id").on(table.listingId),
    index("idx_reservations_check_in_date").on(table.checkInDate),
    index("idx_reservations_check_out_date").on(table.checkOutDate),
    index("idx_reservations_client_id").on(table.clientId),

    // RLS Policies
    // Policy: Managers can view all reservations
    pgPolicy("Managers can view all reservations", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Policy: Owners can view their own reservations
    pgPolicy("Owners can view their own reservations", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1
        FROM public.owner_listings ol
        JOIN public.owners o ON ol.owner_id = o.id
        WHERE ol.listing_id = ${table.listingId}
        AND o.profile_id = auth.uid()
      )`,
    }),

    // Policy: Managers can manage reservations (ALL operations)
    pgPolicy("Managers can manage reservations", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),
  ]
);
