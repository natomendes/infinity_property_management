import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgPolicy,
  pgTable,
  text,
  time,
  timestamp,
} from "drizzle-orm/pg-core";
import { authenticatedRole } from "drizzle-orm/supabase";

export const listings = pgTable(
  "listings",
  {
    // Primary identifiers
    id: text("id").primaryKey().notNull(),
    shortId: text("short_id").unique().notNull(),
    internalName: text("internal_name").notNull(),
    propertyTypeId: text("property_type_id").notNull(),
    listingTypeId: text("listing_type_id").notNull(),
    subtype: text("subtype").notNull(),
    status: text("status").notNull().default("draft"),

    // Multilingual fields (JSONB)
    multilangTitle: jsonb("multilang_title"),
    multilangDescription: jsonb("multilang_description"),
    multilangHouseRulesDesc: jsonb("multilang_house_rules_desc"),
    multilangSummaryDesc: jsonb("multilang_summary_desc"),
    multilangNotesDesc: jsonb("multilang_notes_desc"),
    multilangSpaceDesc: jsonb("multilang_space_desc"),
    multilangAccessDesc: jsonb("multilang_access_desc"),
    multilangInteractionDesc: jsonb("multilang_interaction_desc"),
    multilangNeighborhoodOverviewDesc: jsonb(
      "multilang_neighborhood_overview_desc"
    ),
    multilangTransitDesc: jsonb("multilang_transit_desc"),

    // Address fields
    addressAdditional: text("address_additional"),
    addressCity: text("address_city"),
    addressCountryCode: text("address_country_code"),
    addressStreetNumber: integer("address_street_number"),
    addressRegion: text("address_region"),
    addressState: text("address_state"),
    addressStateCode: text("address_state_code"),
    addressStreet: text("address_street"),
    addressZip: text("address_zip"),

    // Geographic coordinates
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),

    // Images and metadata
    mainImageId: text("main_image_id"),
    squareFootage: numeric("square_footage"),

    // Amenities and custom fields
    amenityIds: text("amenity_ids").array(),
    propertyAmenityIds: text("property_amenity_ids").array(),
    customFields: jsonb("custom_fields"),

    // Pricing configuration
    mainCurrency: text("main_currency"),
    feesConfig: jsonb("fees_config"),
    petFeeConfig: jsonb("pet_fee_config"),
    securityDeposit: numeric("security_deposit"),
    guestsIncluded: integer("guests_included"),
    extraGuestsConfig: jsonb("extra_guests_config"),

    // Booking configuration
    cancellationPolicyConfig: jsonb("cancellation_policy_config"),
    instantBookingEnabled: boolean("instant_booking_enabled"),
    checkInTime: time("check_in_time", { withTimezone: false }),
    checkInTimeEnd: time("check_in_time_end", { withTimezone: false }),
    checkOutTimeStart: time("check_out_time_start", { withTimezone: false }),
    checkOutTime: time("check_out_time", { withTimezone: false }),

    // House rules
    houseRulesSmokingAllowed: boolean("house_rules_smoking_allowed"),
    houseRulesEventsAllowed: boolean("house_rules_events_allowed"),
    houseRulesPetsAllowed: text("house_rules_pets_allowed"),
    houseRulesPetsPriceType: text("house_rules_pets_price_type"),
    houseRulesQuietHours: boolean("house_rules_quiet_hours"),
    houseRulesQuietHoursDetails: jsonb("house_rules_quiet_hours_details"),

    // Audit timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    // Indexes for query optimization
    index("idx_listings_short_id").on(table.shortId),
    index("idx_listings_status").on(table.status),
    index("idx_listings_property_type_id").on(table.propertyTypeId),
    index("idx_listings_listing_type_id").on(table.listingTypeId),
    index("idx_listings_address_city").on(table.addressCity),
    index("idx_listings_address_state").on(table.addressState),
    index("idx_listings_latitude_longitude").on(
      table.latitude,
      table.longitude
    ),

    // RLS Policies
    // Policy: Managers can view all listings
    pgPolicy("Managers can view all listings", {
      for: "select",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // // Policy: Owners can view their own listings
    // pgPolicy("Owners can view their own listings", {
    //   for: "select",
    //   to: authenticatedRole,
    //   using: sql`EXISTS (
    //     SELECT 1
    //     FROM owner_listings ol
    //     JOIN owners o ON ol.owner_id = o.id
    //     WHERE ol.listing_id = ${table.id}
    //     AND o.profile_id = auth.uid()
    //   )`,
    // }),

    // Policy: Managers can create listings
    pgPolicy("Managers can create listings", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),

    // Policy: Managers can update listings
    pgPolicy("Managers can update listings", {
      for: "update",
      to: authenticatedRole,
      using: sql`EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND user_role = 'manager')`,
    }),
  ]
);
