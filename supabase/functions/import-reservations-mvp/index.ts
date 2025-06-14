import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Reusable Interfaces ---
interface StaysNetTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// --- Interfaces specific to Reservation Import ---
interface StaysNetRawReservation {
  _id: string;
  id: string; // This is the shortId from Stays.net
  listingId?: string;
  _idclient?: string;
  type?: string;
  checkInDate?: string; // Dates are strings from API, will be formatted
  checkOutDate?: string;
  guests?: number;
  creationDate?: string;
  // Allow other properties not explicitly defined
  [key: string]: any;
}

interface StaysNetReservationsApiResponse {
  data: StaysNetRawReservation[];
  metadata?: {
    total?: number;
    skip?: number;
    limit?: number;
  };
  // Allow other top-level properties
  [key: string]: any;
}

interface SupabaseReservation {
  id: string; // Corresponds to StaysNetRawReservation._id
  short_id: string; // Corresponds to StaysNetRawReservation.id
  listing_id?: string;
  client_id?: string;
  type?: string;
  check_in_date?: string | null;
  check_out_date?: string | null;
  guests?: number;
  creation_date?: string | null;
  // raw_data_stays_net?: StaysNetRawReservation; // Optional
}

const STAYS_NET_API_BASE_URL = "https://api.stays.net"; // Placeholder

console.log("Hello from import-reservations-mvp function!");

// Helper to ensure date is in ISO 8601 format or null
function formatDateToISO(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  try {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[\+\-]\d{2}:\d{2})?)?$/)) {
      return new Date(dateString).toISOString();
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn(`Could not parse date string: ${dateString}. Returning null.`);
      return null;
    }
    return date.toISOString();
  } catch (e: any) {
    console.warn(`Error formatting date string: ${dateString}. Error: ${e.message}. Returning null.`);
    return null;
  }
}

Deno.serve(async (req: Request) => {
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
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("Supabase client initialized for import-reservations-mvp.");

    // Function to get access token from Stays.net
    async function getStaysNetAccessToken(): Promise<string> {
      const tokenUrl = `${STAYS_NET_API_BASE_URL}/external/v1/oauth/token`;
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", staysNetClientId); // Checked
      params.append("client_secret", staysNetClientSecret); // Checked

      try {
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
        const tokenData: StaysNetTokenResponse = await response.json();
        if (!tokenData.access_token) {
            throw new Error("Access token not found in Stays.net response.");
        }
        return tokenData.access_token;
      } catch (error: any) {
        console.error("Error fetching Stays.net access token:", error.message);
        throw error;
      }
    }

    const accessToken: string = await getStaysNetAccessToken();
    console.log("Successfully obtained Stays.net access token for import-reservations-mvp.");

    // Function to fetch reservations from Stays.net
    async function fetchStaysNetReservations(token: string, skip: number, limit: number): Promise<StaysNetReservationsApiResponse> {
      const reservationsUrl = `${STAYS_NET_API_BASE_URL}/external/v1/booking/reservations?skip=${skip}&limit=${limit}`;
      try {
        const response = await fetch(reservationsUrl, {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Stays.net reservations API error: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Failed to fetch reservations: ${response.status} ${errorBody}`);
        }
        return await response.json() as StaysNetReservationsApiResponse;
      } catch (error: any) {
        console.error("Error fetching Stays.net reservations:", error.message);
        throw error;
      }
    }

    const fetchLimit = 20;
    let allReservations: StaysNetRawReservation[] = [];
    let currentSkip = 0;
    let hasMore = true;
    console.log("Fetching Stays.net reservations...");

    while (hasMore) {
      const reservationData: StaysNetReservationsApiResponse = await fetchStaysNetReservations(accessToken, currentSkip, fetchLimit);
      if (reservationData && reservationData.data && reservationData.data.length > 0) {
        allReservations = allReservations.concat(reservationData.data);
        currentSkip += reservationData.data.length;
        if (reservationData.data.length < fetchLimit || (reservationData.metadata?.total && allReservations.length >= reservationData.metadata.total)) {
            hasMore = false;
        }
      } else {
        hasMore = false;
      }
      console.log(`Fetched ${allReservations.length} reservations. Current skip: ${currentSkip}. Has more: ${hasMore}`);
    }
    console.log(`Total reservations fetched: ${allReservations.length}`);

    // Function to transform Stays.net reservation data
    function transformReservationData(reservation: StaysNetRawReservation): SupabaseReservation {
      if (!reservation.listingId) console.warn(`Reservation _id=${reservation._id} (shortId ${reservation.id}) is missing listingId.`);
      if (!reservation._idclient) console.warn(`Reservation _id=${reservation._id} (shortId ${reservation.id}) is missing _idclient.`);

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
        // raw_data_stays_net: reservation
      };
    }

    if (allReservations.length > 0) {
      const transformedReservations: SupabaseReservation[] = allReservations.map(transformReservationData);
      console.log(`Transforming ${transformedReservations.length} reservations...`);

      const { data: upsertedData, error: upsertError } = await supabase
        .from("reservations")
        .upsert(transformedReservations, { onConflict: "id" });

      if (upsertError) {
        console.error("Error upserting reservation data to Supabase:", upsertError.message);
        return new Response(`Failed to upsert reservation data: ${upsertError.message}`, { status: 500 });
      }

      console.log(`Successfully upserted data to Supabase 'reservations' table. Processed ${transformedReservations.length} reservations.`);
      const responseData = {
        message: "Successfully fetched, transformed, and upserted reservations.",
        reservationsFetched: allReservations.length,
        reservationsUpserted: transformedReservations.length, // Using input length
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

  } catch (error: any) {
    console.error("Error in import-reservations-mvp Edge Function:", error.message);
    const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
  }
});
