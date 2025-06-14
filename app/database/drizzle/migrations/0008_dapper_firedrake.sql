CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"reservation_id" text NOT NULL,
	"payment_provider_id" text,
	"type" text NOT NULL,
	"amount" numeric NOT NULL,
	"status" text,
	"expiration_date" date,
	"payment_date" date,
	"competence_date" date,
	"name" text,
	"description" text,
	"fee" numeric,
	"tax" numeric,
	"readonly" boolean,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payments_reservation_id" ON "payments" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "idx_payments_payment_provider_id" ON "payments" USING btree ("payment_provider_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE POLICY "Managers can view all payments" ON "payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Owners can view their own payments" ON "payments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1
        FROM public.owner_listings ol
        JOIN public.owners o ON ol.owner_id = o.id
        JOIN public.reservations r ON ol.listing_id = r.listing_id
        WHERE "payments"."reservation_id" = r.id
        AND o.profile_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "Managers can manage payments" ON "payments" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager')) WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));