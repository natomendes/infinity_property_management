CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
	"profile_id" uuid,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"document_id" text,
	"bank_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "owners_email_unique" UNIQUE("email"),
	CONSTRAINT "owners_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "owners" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "owners" ADD CONSTRAINT "owners_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_owners_email" ON "owners" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_owners_profile_id" ON "owners" USING btree ("profile_id");--> statement-breakpoint
CREATE POLICY "Managers can view all owners" ON "owners" AS PERMISSIVE FOR SELECT TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Owners can view their own record" ON "owners" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("owners"."profile_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "Managers can create owners" ON "owners" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Managers can update owners" ON "owners" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));--> statement-breakpoint
CREATE POLICY "Owners can update their own record" ON "owners" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ("owners"."profile_id" = auth.uid()) WITH CHECK ("owners"."profile_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "Managers can delete owners" ON "owners" AS PERMISSIVE FOR DELETE TO "authenticated" USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'manager'));