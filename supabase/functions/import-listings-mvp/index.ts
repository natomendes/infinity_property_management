import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Hello from Functions!");

serve(async (req) => {
  try {
    // Get environment variables
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
      return new Response("STAYS_NET_CLIENT_SECRET is not set.", { status: 400 });
    }
    if (!supabaseUrl) {
      console.error("SUPABASE_URL is not set.");
      return new Response("SUPABASE_URL is not set.", { status: 500 });
    }
    if (!supabaseServiceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not set.");
      return new Response("SUPABASE_SERVICE_ROLE_KEY is not set.", { status: 500 });
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    console.log("Supabase client initialized.");

    // Function to get access token from Stays.net
    async function getStaysNetAccessToken() {
      const tokenUrl = "https://api.stays.net/external/v1/oauth/token"; // Replace with actual Stays.net token URL if different
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", staysNetClientId!);
      params.append("client_secret", staysNetClientSecret!);

      try {
        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Stays.net token API error: ${response.status} ${response.statusText}`, errorBody);
          throw new Error(`Failed to get access token from Stays.net: ${response.status} ${errorBody}`);
        }

        const tokenData = await response.json();
        return tokenData.access_token;
      } catch (error) {
        console.error("Error fetching Stays.net access token:", error.message);
        throw error; // Re-throw the error to be caught by the main handler
      }
    }

    // Get the access token
    const accessToken = await getStaysNetAccessToken();
    if (!accessToken) {
      // Error is already logged in getStaysNetAccessToken, just return
      return new Response("Failed to obtain Stays.net access token.", { status: 500 });
    }
    console.log("Successfully obtained Stays.net access token.");

    // Function to fetch listings from Stays.net
    async function fetchStaysNetListings(token: string, skip: number, limit: number) {
      const listingsUrl = `https://api.stays.net/external/v1/content/listings?skip=${skip}&limit=${limit}`; // Replace with actual Stays.net listings URL if different
      try {
        const response = await fetch(listingsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Stays.net listings API error: ${response.status} ${response.statusText}`, errorBody);
          throw new Error(`Failed to fetch listings from Stays.net: ${response.status} ${errorBody}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching Stays.net listings:", error.message);
        throw error;
      }
    }

    // Fetch listings (initial fetch, actual loop will be implemented next)
    const initialLimit = 20; // Stays.net default/max limit
    let allListings: any[] = [];
    let currentSkip = 0;
    let totalFetched = 0;
    let hasMore = true;

    console.log("Fetching Stays.net listings...");

    // Loop to handle pagination
    while (hasMore) {
      const listingsData = await fetchStaysNetListings(accessToken, currentSkip, initialLimit);
      if (listingsData && listingsData.data && listingsData.data.length > 0) {
        allListings = allListings.concat(listingsData.data);
        totalFetched += listingsData.data.length;
        currentSkip += listingsData.data.length;
        // Assuming the API indicates if there are more items, e.g., via a total count or a specific flag.
        // For this MVP, we'll assume if we get less than the limit, there's no more data.
        // Stays.net API might have a `total` field in `listingsData.metadata` or `listingsData.paging`
        // e.g. hasMore = totalFetched < listingsData.metadata.total;
        if (listingsData.data.length < initialLimit) {
          hasMore = false;
        }
        // Safety break for MVP if API doesn't stop sending data or no clear end condition.
        // if (currentSkip >= 100) { // Limiting to 5 pages for MVP development
        //   console.warn("Reached development fetch limit (100 listings). Stopping pagination.");
        //   hasMore = false;
        // }
      } else {
        hasMore = false;
      }
      console.log(`Fetched ${totalFetched} listings so far. Current skip: ${currentSkip}. Has more: ${hasMore}`);
    }

    console.log(`Total listings fetched: ${allListings.length}`);

    // Function to transform Stays.net listing data to Supabase format
    function transformListingData(staysNetListing: any): any {
      return {
        id: staysNetListing._id, // Stays.net `_id` -> Supabase `id`
        short_id: staysNetListing.id, // Stays.net `id` (short ID) -> Supabase `short_id`
        internal_name: staysNetListing.internalName,
        property_type_id: staysNetListing._idpropertyType,
        listing_type_id: staysNetListing._idtype,
        subtype: staysNetListing.subtype,
        status: staysNetListing.status,
        multilang_title: staysNetListing._mstitle, // Assuming this is already a JSONB compatible object
        address_city: staysNetListing.address?.city,
        address_country: staysNetListing.address?.country,
        address_street: staysNetListing.address?.street,
        address_zipcode: staysNetListing.address?.zipcode,
        latitude: staysNetListing.latLng?._f_lat,
        longitude: staysNetListing.latLng?._f_lng,
        // Add original Stays.net data for reference, if needed
        // raw_data: staysNetListing
      };
    }

    if (allListings.length > 0) {
      const transformedListings = allListings.map(transformListingData);
      console.log(`Transforming ${transformedListings.length} listings...`);

      // Upsert data into Supabase
      // The table name is 'listings' and it's in the 'public' schema.
      const { data: upsertedData, error: upsertError } = await supabase
        .from("listings") // Ensure this is your actual table name
        .upsert(transformedListings, { onConflict: "id" }); // `id` is the conflict target

      if (upsertError) {
        console.error("Error upserting data to Supabase:", upsertError.message);
        // Consider the nature of the error. If it's a data issue, it might be a 400.
        // If it's a DB connection or server issue, it's a 500.
        return new Response(`Failed to upsert data: ${upsertError.message}`, { status: 500 });
      }

      console.log(`Successfully upserted ${upsertedData ? upsertedData.length : 0} listings to Supabase.`);
      const responseData = {
        message: "Successfully fetched, transformed, and upserted listings.",
        listingsFetched: allListings.length,
        listingsUpserted: upsertedData ? upsertedData.length : 0,
      };
      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      console.log("No listings fetched to process.");
      return new Response(JSON.stringify({ message: "No listings fetched to process." }), {
        headers: { "Content-Type": "application/json" },
        status: 200, // Or 204 No Content, depending on desired behavior
      });
    }

  } catch (error) {
    console.error("Error in Edge Function:", error.message);
    // Ensure error.message is a string. If it's an object, stringify it or extract relevant info.
    const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
  }
});
