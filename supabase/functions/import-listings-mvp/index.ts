import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    if (!supabaseUrl) {
      console.error("SUPABASE_URL is not set.");
      return new Response("SUPABASE_URL is not set.", { status: 500 });
    }
    if (!supabaseServiceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set.");
      return new Response("SUPABASE_SERVICE_ROLE_KEY is not set.", {
        status: 500,
      });
    }

    // Initialize Supabase client
    const supabase: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    console.log("Supabase client initialized.");

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

      const { data: upsertedData, error: upsertError } = await supabase
        .from("listings")
        .upsert(transformedListings, { onConflict: "id" });

      if (upsertError) {
        console.error("Error upserting data to Supabase:", upsertError.message);
        return new Response(`Failed to upsert data: ${upsertError.message}`, {
          status: 500,
        });
      }

      // Supabase typings might mean upsertedData is not directly the array of SupabaseListing,
      // but often it is or contains it. For count, it's safer to rely on the input length or a count from Supabase if available.
      // The actual type of `upsertedData` depends on the Supabase client library version and specific call.
      // For this MVP, we will assume the log message is for feedback and doesn't need strict typing for `upsertedData` itself.
      console.log(
        `Successfully upserted data to Supabase. Processed ${transformedListings.length} listings.`
      );
      const responseData = {
        message: "Successfully fetched, transformed, and upserted listings.",
        listingsFetched: allListings.length,
        listingsUpserted: transformedListings.length, // More reliable count based on input
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
