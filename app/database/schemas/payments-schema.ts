import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  foreignKey,
  index,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";
import { reservations } from "~/database/schemas/reservations-schema";

// Define payment type enum for better type safety
export type PaymentType = "credit" | "debit";
export type PaymentStatus = "pending" | "completed";

// Define the payments table with RLS policies
export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey().notNull(), // Corresponds to stays.net's _id
    reservationId: text("reservation_id").notNull(), // References public.reservations(id)
    paymentProviderId: text("payment_provider_id"), // Corresponds to stays.net's _idpaymentProvider
    type: text("type", { enum: ["credit", "debit"] }).notNull(),
    amount: numeric("amount").notNull(), // Corresponds to stays.net's *f*val
    status: text("status", { enum: ["pending", "completed"] }),
    expirationDate: date("expiration_date"),
    paymentDate: date("payment_date"),
    competenceDate: date("competence_date"),
    name: text("name"),
    description: text("description"), // Corresponds to stays.net's desc
    fee: numeric("fee"), // Corresponds to stays.net's *f*fee
    tax: numeric("tax"), // Corresponds to stays.net's *f*tax
    readonly: boolean("readonly"), // Indicates if payment can be modified via API
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Indexes for query optimization
    index("idx_payments_reservation_id").on(table.reservationId),
    index("idx_payments_payment_provider_id").on(table.paymentProviderId),
    index("idx_payments_status").on(table.status),

    // Foreign key constraint to public.reservations
    foreignKey({
      columns: [table.reservationId],
      foreignColumns: [reservations.id],
      name: "payments_reservation_id_fk",
    }).onDelete("cascade"),

    // RLS Policies
    // Policy: Managers can view all payments
    pgPolicy("Managers can view all payments", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Policy: Owners can view only payments from their properties
    pgPolicy("Owners can view their own payments", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (
        SELECT 1
        FROM public.owner_listings ol
        JOIN public.owners o ON ol.owner_id = o.id
        JOIN public.reservations r ON ol.listing_id = r.listing_id
        WHERE ${table.reservationId} = r.id
        AND o.profile_id = auth.uid()
      )`,
    }),

    // Policy: Managers can manage payments (create/update/delete via external API)
    pgPolicy("Managers can manage payments", {
      for: "all",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
      withCheck: sql`EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),
  ]
);

// Type inference for the payments table
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

// Helper type for payment with required fields
export interface CreatePaymentData {
  id: string;
  reservationId: string;
  type: PaymentType;
  amount: string; // Using string for numeric values to handle precision
  paymentProviderId?: string | null;
  status?: PaymentStatus | null;
  expirationDate?: Date | null;
  paymentDate?: Date | null;
  competenceDate?: Date | null;
  name?: string | null;
  description?: string | null;
  fee?: string | null; // Using string for numeric values
  tax?: string | null; // Using string for numeric values
  readonly?: boolean | null;
}

// Helper type for updating payment
export interface UpdatePaymentData {
  reservationId?: string;
  paymentProviderId?: string | null;
  type?: PaymentType;
  amount?: string;
  status?: PaymentStatus | null;
  expirationDate?: Date | null;
  paymentDate?: Date | null;
  competenceDate?: Date | null;
  name?: string | null;
  description?: string | null;
  fee?: string | null;
  tax?: string | null;
  readonly?: boolean | null;
  updatedAt?: Date;
}
