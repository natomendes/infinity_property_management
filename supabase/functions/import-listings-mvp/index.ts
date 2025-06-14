// @deno-types="npm:@types/pg"
import { db } from "../../../app/database/drizzleClient.ts";
import { listings } from "../../../app/database/schema.ts"; // Assuming schema for listings is here
// import { eq } from "npm:drizzle-orm"; // If needed for specific queries
import { createBasicAuthHash } from "../../utils/createBasicAuthHash.ts";

// Define Interfaces
interface StaysNetTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface StaysNetListingAddress {
  city?: string;
  country?: string;
  street?: string;
  zipcode?: string;
}

interface StaysNetLatLng {
  _f_lat?: number;
  _f_lng?: number;
}

interface StaysNetRawListing {
  _id: string;
  id: string; // This is the shortId from Stays.net
  internalName?: string;
  _idpropertyType?: string;
  _idtype?: string;
  subtype?: string;
  status?: string;
  _mstitle?: any; // For MVP, 'any' is used. Define more strictly if structure is known.
  address?: StaysNetListingAddress;
  latLng?: StaysNetLatLng;
  // Add any other fields that might come from the API but are not used in SupabaseListing
  [key: string]: any; // Allows for other properties not explicitly defined
}

interface StaysNetListingsApiResponse {
  data: StaysNetRawListing[];
  metadata?: {
    // Assuming metadata might exist based on common API patterns
    total?: number;
    skip?: number;
    limit?: number;
  };
  // Potentially other top-level properties from Stays.net response
  [key: string]: any;
}

interface SupabaseListing {
  id: string; // Corresponds to StaysNetRawListing._id
  short_id: string; // Corresponds to StaysNetRawListing.id
  internal_name?: string;
  property_type_id?: string;
  listing_type_id?: string;
  subtype?: string;
  status?: string;
  multilang_title?: any; // For MVP, 'any' is used.
  address_city?: string;
  address_country?: string;
  address_street?: string;
  address_zipcode?: string;
  latitude?: number;
  longitude?: number;
}

Deno.serve(async (req: Request) => {
  try {
    // Get environment variables
    const staysNetApiBaseUrl = Deno.env.get("STAYS_NET_API_BASE_URL");
    const staysNetClientId = Deno.env.get("STAYS_NET_CLIENT_ID");
    const staysNetClientSecret = Deno.env.get("STAYS_NET_CLIENT_SECRET");
    // const supabaseUrl = Deno.env.get("SUPABASE_URL"); // Not needed for Drizzle
    // const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Not needed for Drizzle

    // Check if necessary environment variables are set
    if (!staysNetClientId) {
      console.error("STAYS_NET_CLIENT_ID is not set.");
      return new Response("STAYS_NET_CLIENT_ID is not set.", { status: 400 });
    }
    if (!staysNetClientSecret) {
      console.error("STAYS_NET_CLIENT_SECRET is not set.");
      return new Response("STAYS_NET_CLIENT_SECRET is not set.", {
        status: 400,
      });
    }
    // supabaseUrl and supabaseServiceRoleKey checks removed as they are no longer direct dependencies for this function with Drizzle.
    // Drizzle client (db) should handle its own connection config.

    console.log("Drizzle client will be used for database operations."); // New log

    // Get the access token
    const accessToken: string = createBasicAuthHash(
      staysNetClientId,
      staysNetClientSecret
    );
    // No explicit check for !accessToken needed here due to Promise<string> and error throwing in getStaysNetAccessToken

    console.log("Successfully obtained Stays.net access token.");

    // Function to fetch listings from Stays.net
    async function fetchStaysNetListings(
      token: string,
      skip: number,
      limit: number
    ): Promise<StaysNetListingsApiResponse> {
      const listingsUrl = `${staysNetApiBaseUrl}/external/v1/content/listings?skip=${skip}&limit=${limit}`; // Replace with actual Stays.net listings URL if different
      try {
        const response = await fetch(listingsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `Stays.net listings API error: ${response.status} ${response.statusText}`,
            errorBody
          );
          throw new Error(
            `Failed to fetch listings from Stays.net: ${response.status} ${errorBody}`
          );
        }
        // Assuming the response JSON structure matches StaysNetListingsApiResponse
        return (await response.json()) as StaysNetListingsApiResponse;
      } catch (error: any) {
        console.error("Error fetching Stays.net listings:", error.message);
        throw error;
      }
    }

    const initialLimit = 20;
    let allListings: StaysNetRawListing[] = [];
    let currentSkip = 0;
    let hasMore = true;

    console.log("Fetching Stays.net listings...");

    while (hasMore) {
      const listingsData: StaysNetListingsApiResponse =
        await fetchStaysNetListings(accessToken, currentSkip, initialLimit);
      if (listingsData && listingsData.data && listingsData.data.length > 0) {
        allListings = allListings.concat(listingsData.data);
        currentSkip += listingsData.data.length;
        if (
          listingsData.data.length < initialLimit ||
          (listingsData.metadata?.total &&
            allListings.length >= listingsData.metadata.total)
        ) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      console.log(
        `Fetched ${allListings.length} listings so far. Current skip: ${currentSkip}. Has more: ${hasMore}`
      );
    }

    console.log(`Total listings fetched: ${allListings.length}`);

    // Function to transform Stays.net listing data to Supabase format
    function transformListingData(
      staysNetListing: StaysNetRawListing
    ): SupabaseListing {
      return {
        id: staysNetListing._id,
        short_id: staysNetListing.id,
        internal_name: staysNetListing.internalName,
        property_type_id: staysNetListing._idpropertyType,
        listing_type_id: staysNetListing._idtype,
        subtype: staysNetListing.subtype,
        status: staysNetListing.status,
        multilang_title: staysNetListing._mstitle,
        address_city: staysNetListing.address?.city,
        address_country: staysNetListing.address?.country,
        address_street: staysNetListing.address?.street,
        address_zipcode: staysNetListing.address?.zipcode,
        latitude: staysNetListing.latLng?._f_lat,
        longitude: staysNetListing.latLng?._f_lng,
      };
    }

    if (allListings.length > 0) {
      const transformedListings: SupabaseListing[] =
        allListings.map(transformListingData);
      console.log(`Transforming ${transformedListings.length} listings...`);

      console.log(`Upserting ${transformedListings.length} listings using Drizzle...`);
      let upsertedCount = 0;
      try {
        for (const listing of transformedListings) {
          // Assuming 'listings' is the Drizzle schema object for the 'listings' table
          // and it has an 'id' column that corresponds to transformedListing.id.
          await db.insert(listings).values(listing).onConflictDoUpdate({
            target: listings.id, // Ensure 'listings.id' is the correct conflict target column in your Drizzle schema
            set: {
              short_id: listing.short_id,
              internal_name: listing.internal_name,
              property_type_id: listing.property_type_id,
              listing_type_id: listing.listing_type_id,
              subtype: listing.subtype,
              status: listing.status,
              multilang_title: listing.multilang_title,
              address_city: listing.address_city,
              address_country: listing.address_country,
              address_street: listing.address_street,
              address_zipcode: listing.address_zipcode,
              latitude: listing.latitude,
              longitude: listing.longitude,
            }
          });
          upsertedCount++;
        }
        console.log(
          `Successfully upserted ${upsertedCount} listings to 'listings' table using Drizzle.`
        );
      } catch (upsertError) {
        console.error(
          "Error upserting listing data to 'listings' table using Drizzle:",
          upsertError.message
        );
        return new Response(
          `Failed to upsert listing data using Drizzle: ${upsertError.message}`,
          { status: 500 }
        );
      }
      // Update the responseData to reflect the changes
      const responseData = {
          message: "Successfully fetched, transformed, and upserted listings using Drizzle.",
          listingsFetched: allListings.length,
          listingsUpserted: upsertedCount, // Use the count of successfully processed items
      };
      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("No listings fetched to process.");
      return new Response(
        JSON.stringify({ message: "No listings fetched to process." }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error("Error in Edge Function:", error.message);
    const errorMessage =
      typeof error.message === "string"
        ? error.message
        : JSON.stringify(error.message);
    return new Response(`Internal Server Error: ${errorMessage}`, {
      status: 500,
    });
  }
});
