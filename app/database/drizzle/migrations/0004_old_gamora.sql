CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"short_id" text NOT NULL,
	"internal_name" text NOT NULL,
	"property_type_id" text NOT NULL,
	"listing_type_id" text NOT NULL,
	"subtype" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"multilang_title" jsonb,
	"multilang_description" jsonb,
	"multilang_house_rules_desc" jsonb,
	"multilang_summary_desc" jsonb,
	"multilang_notes_desc" jsonb,
	"multilang_space_desc" jsonb,
	"multilang_access_desc" jsonb,
	"multilang_interaction_desc" jsonb,
	"multilang_neighborhood_overview_desc" jsonb,
	"multilang_transit_desc" jsonb,
	"address_additional" text,
	"address_city" text,
	"address_country_code" text,
	"address_street_number" integer,
	"address_region" text,
	"address_state" text,
	"address_state_code" text,
	"address_street" text,
	"address_zip" text,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"main_image_id" text,
	"square_footage" numeric,
	"amenity_ids" text[],
	"property_amenity_ids" text[],
	"custom_fields" jsonb,
	"main_currency" text,
	"fees_config" jsonb,
	"pet_fee_config" jsonb,
	"security_deposit" numeric,
	"guests_included" integer,
	"extra_guests_config" jsonb,
	"cancellation_policy_config" jsonb,
	"instant_booking_enabled" boolean,
	"check_in_time" time,
	"check_in_time_end" time,
	"check_out_time_start" time,
	"check_out_time" time,
	"house_rules_smoking_allowed" boolean,
	"house_rules_events_allowed" boolean,
	"house_rules_pets_allowed" text,
	"house_rules_pets_price_type" text,
	"house_rules_quiet_hours" boolean,
	"house_rules_quiet_hours_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "listings_short_id_unique" UNIQUE("short_id")
);
--> statement-breakpoint
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "idx_listings_short_id" ON "listings" USING btree ("short_id");--> statement-breakpoint
CREATE INDEX "idx_listings_status" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_listings_property_type_id" ON "listings" USING btree ("property_type_id");--> statement-breakpoint
CREATE INDEX "idx_listings_listing_type_id" ON "listings" USING btree ("listing_type_id");--> statement-breakpoint
CREATE INDEX "idx_listings_address_city" ON "listings" USING btree ("address_city");--> statement-breakpoint
CREATE INDEX "idx_listings_address_state" ON "listings" USING btree ("address_state");--> statement-breakpoint
CREATE INDEX "idx_listings_latitude_longitude" ON "listings" USING btree ("latitude","longitude");--> statement-breakpoint
CREATE POLICY "Managers can view all listings" ON "listings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Managers can create listings" ON "listings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Managers can update listings" ON "listings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'manager'));