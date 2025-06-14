CREATE TABLE "owner_listings" (
	"owner_id" uuid NOT NULL,
	"listing_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "owner_listings_owner_id_listing_id_pk" PRIMARY KEY("owner_id","listing_id")
);
--> statement-breakpoint
ALTER TABLE "owner_listings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "owner_listings" ADD CONSTRAINT "owner_listings_owner_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_listings" ADD CONSTRAINT "owner_listings_listing_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_owner_listings_owner_id" ON "owner_listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_owner_listings_listing_id" ON "owner_listings" USING btree ("listing_id");--> statement-breakpoint
CREATE POLICY "Managers can view all owner listings" ON "owner_listings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Owners can view their own owner listings" ON "owner_listings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM public.owners WHERE id = "owner_listings"."owner_id" AND profile_id = auth.uid()));--> statement-breakpoint
CREATE POLICY "Managers can create owner listings" ON "owner_listings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Managers can delete owner listings" ON "owner_listings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));