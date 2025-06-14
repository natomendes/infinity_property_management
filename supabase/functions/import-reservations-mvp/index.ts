import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STAYS_NET_API_BASE_URL = "https://api.stays.net"; // Placeholder

console.log("Hello from import-reservations-mvp function!");

// Helper to ensure date is in ISO 8601 format or null
functionformatDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  try {
    // Check if already a valid ISO-like date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...)
    // This is a simple check; a more robust library might be needed for diverse date formats
    if (dateString.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[\+\-]\d{2}:\d{2})?)?$/)) {
      return new Date(dateString).toISOString();
    }
    // Add more specific parsing logic here if Stays.net provides dates in a known, non-ISO format
    // For MVP, we'll assume it's either ISO-like or we attempt a direct conversion.
    // If Stays.net dates are, for example, DD/MM/YYYY, more complex parsing is needed.
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Could not parse date string: ${dateString}. Returning null.`);
      return null;
    }
    return date.toISOString();
  } catch (e) {
    console.warn(`Error formatting date string: ${dateString}. Error: ${e.message}. Returning null.`);
    return null;
  }
}


serve(async (req) => {
  try {
    // Get environment variables
    const staysNetClientId = Deno.env.get("STAYS_NET_CLIENT_ID");
    const staysNetClientSecret = Deno.env.get("STAYS_NET_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Check if necessary environment variables are set
    if (!staysNetClientId) return new Response("STAYS_NET_CLIENT_ID is not set.", { status: 400 });
    if (!staysNetClientSecret) return new Response("STAYS_NET_CLIENT_SECRET is not set.", { status: 400 });
    if (!supabaseUrl) return new Response("SUPABASE_URL is not set.", { status: 500 });
    if (!supabaseServiceRoleKey) return new Response("SUPABASE_SERVICE_ROLE_KEY is not set.", { status: 500 });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("Supabase client initialized for import-reservations-mvp.");

    // Function to get access token from Stays.net
    async function getStaysNetAccessToken() {
      const tokenUrl = `${STAYS_NET_API_BASE_URL}/external/v1/oauth/token`;
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", staysNetClientId!);
      params.append("client_secret", staysNetClientSecret!);
      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Stays.net token API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to get access token: ${response.status} ${errorBody}`);
      }
      const tokenData = await response.json();
      return tokenData.access_token;
    }

    const accessToken = await getStaysNetAccessToken();
    if (!accessToken) return new Response("Failed to obtain Stays.net access token.", { status: 500 });
    console.log("Successfully obtained Stays.net access token for import-reservations-mvp.");

    // Function to fetch reservations from Stays.net
    async function fetchStaysNetReservations(token: string, skip: number, limit: number) {
      const reservationsUrl = `${STAYS_NET_API_BASE_URL}/external/v1/booking/reservations?skip=${skip}&limit=${limit}`;
      const response = await fetch(reservationsUrl, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Stays.net reservations API error: ${response.status} ${response.statusText}`, errorBody);
        throw new Error(`Failed to fetch reservations: ${response.status} ${errorBody}`);
      }
      return await response.json();
    }

    // Fetch all reservations with pagination
    const fetchLimit = 20;
    let allReservations: any[] = [];
    let currentSkip = 0;
    let hasMore = true;
    console.log("Fetching Stays.net reservations...");

    while (hasMore) {
      const reservationData = await fetchStaysNetReservations(accessToken, currentSkip, fetchLimit);
      if (reservationData && reservationData.data && reservationData.data.length > 0) {
        allReservations = allReservations.concat(reservationData.data);
        currentSkip += reservationData.data.length;
        if (reservationData.data.length < fetchLimit) hasMore = false;
      } else {
        hasMore = false;
      }
      console.log(`Fetched ${allReservations.length} reservations. Current skip: ${currentSkip}. Has more: ${hasMore}`);
    }
    console.log(`Total reservations fetched: ${allReservations.length}`);

    // Function to transform Stays.net reservation data
    function transformReservationData(reservation: any): any {
      // Basic logging for missing foreign keys - full check would query Supabase
      if (!reservation.listingId) console.warn(`Reservation _id=${reservation._id} is missing listingId.`);
      if (!reservation._idclient) console.warn(`Reservation _id=${reservation._id} is missing _idclient.`);

      return {
        id: reservation._id,
        short_id: reservation.id,
        listing_id: reservation.listingId,
        client_id: reservation._idclient,
        type: reservation.type,
        check_in_date: formatDateToISO(reservation.checkInDate),
        check_out_date: formatDateToISO(reservation.checkOutDate),
        guests: reservation.guests,
        creation_date: formatDateToISO(reservation.creationDate),
        // raw_data_stays_net: reservation // Optional for debugging
      };
    }

    if (allReservations.length > 0) {
      const transformedReservations = allReservations.map(transformReservationData);
      console.log(`Transforming ${transformedReservations.length} reservations...`);

      // Upsert data into Supabase 'reservations' table
      const { data: upsertedData, error: upsertError } = await supabase
        .from("reservations")
        .upsert(transformedReservations, { onConflict: "id" });

      if (upsertError) {
        console.error("Error upserting reservation data to Supabase:", upsertError.message);
        return new Response(`Failed to upsert reservation data: ${upsertError.message}`, { status: 500 });
      }

      console.log(`Successfully upserted ${upsertedData ? upsertedData.length : 0} reservations.`);
      const responseData = {
        message: "Successfully fetched, transformed, and upserted reservations.",
        reservationsFetched: allReservations.length,
        reservationsUpserted: upsertedData ? upsertedData.length : 0,
      };
      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    } else {
      console.log("No reservations fetched to process.");
      return new Response(JSON.stringify({ message: "No reservations fetched to process." }), {
        headers: { "Content-Type": "application/json" }, status: 200,
      });
    }

  } catch (error) {
    console.error("Error in import-reservations-mvp Edge Function:", error.message);
    const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
  }
});
