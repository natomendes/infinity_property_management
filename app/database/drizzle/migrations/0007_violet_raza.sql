CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"short_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"client_id" text,
	"type" text NOT NULL,
	"check_in_date" date NOT NULL,
	"check_in_time" time,
	"check_out_date" date NOT NULL,
	"check_out_time" time,
	"guests" integer,
	"guests_details" jsonb,
	"promocode" text,
	"partner" jsonb,
	"operator" jsonb,
	"agent" jsonb,
	"price" jsonb,
	"internal_note" text,
	"cancel_message" text,
	"creation_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "reservations_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
ALTER TABLE "reservations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_reservations_listing_id" ON "reservations" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "idx_reservations_check_in_date" ON "reservations" USING btree ("check_in_date");--> statement-breakpoint
CREATE INDEX "idx_reservations_check_out_date" ON "reservations" USING btree ("check_out_date");--> statement-breakpoint
CREATE INDEX "idx_reservations_client_id" ON "reservations" USING btree ("client_id");--> statement-breakpoint
CREATE POLICY "Managers can view all reservations" ON "reservations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Owners can view their own reservations" ON "reservations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (
        SELECT 1
        FROM public.owner_listings ol
        JOIN public.owners o ON ol.owner_id = o.id
        WHERE ol.listing_id = "reservations"."listing_id"
        AND o.profile_id = auth.uid()
      ));--> statement-breakpoint
CREATE POLICY "Managers can manage reservations" ON "reservations" AS PERMISSIVE FOR ALL TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));