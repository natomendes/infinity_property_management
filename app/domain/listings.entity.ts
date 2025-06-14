export interface TListings {
  id: string;
  shortId: string;
  internalName: string;
  propertyTypeId: string;
  listingTypeId: string;
  subtype: string;
  status: string;

  // Multilingual fields
  multilangTitle?: Record<string, any>;
  multilangDescription?: Record<string, any>;
  multilangHouseRulesDesc?: Record<string, any>;
  multilangSummaryDesc?: Record<string, any>;
  multilangNotesDesc?: Record<string, any>;
  multilangSpaceDesc?: Record<string, any>;
  multilangAccessDesc?: Record<string, any>;
  multilangInteractionDesc?: Record<string, any>;
  multilangNeighborhoodOverviewDesc?: Record<string, any>;
  multilangTransitDesc?: Record<string, any>;

  // Address fields
  addressAdditional?: string;
  addressCity?: string;
  addressCountryCode?: string;
  addressStreetNumber?: number;
  addressRegion?: string;
  addressState?: string;
  addressStateCode?: string;
  addressStreet?: string;
  addressZip?: string;

  // Geographic coordinates
  latitude?: string; // numeric usually maps to string or number depending on the library
  longitude?: string;

  // Images and metadata
  mainImageId?: string;
  squareFootage?: string;

  // Amenities and custom fields
  amenityIds?: string[];
  propertyAmenityIds?: string[];
  customFields?: Record<string, any>;

  // Pricing configuration
  mainCurrency?: string;
  feesConfig?: Record<string, any>;
  petFeeConfig?: Record<string, any>;
  securityDeposit?: string;
  guestsIncluded?: number;
  extraGuestsConfig?: Record<string, any>;

  // Booking configuration
  cancellationPolicyConfig?: Record<string, any>;
  instantBookingEnabled?: boolean;
  checkInTime?: string; // time as string, e.g., "14:00:00"
  checkInTimeEnd?: string;
  checkOutTimeStart?: string;
  checkOutTime?: string;

  // House rules
  houseRulesSmokingAllowed?: boolean;
  houseRulesEventsAllowed?: boolean;
  houseRulesPetsAllowed?: string;
  houseRulesPetsPriceType?: string;
  houseRulesQuietHours?: boolean;
  houseRulesQuietHoursDetails?: Record<string, any>;

  // Audit timestamps
  createdAt?: string; // ISO 8601 string (e.g., "2024-06-14T13:45:00Z")
  updatedAt?: string;
}
