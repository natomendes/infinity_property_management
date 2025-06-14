import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Reusable Interfaces (consider moving to a shared types file if used across many functions) ---
interface StaysNetTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// --- Interfaces specific to Client Import ---
interface StaysNetPhone {
  number: string;
  type?: string; // e.g., "cellphone", "home", "work"
  // any other properties the phone object might have
  [key: string]: any;
}

interface StaysNetDocument {
  number: string;
  type?: string; // e.g., "CPF", "Passport"
  // any other properties the document object might have
  [key: string]: any;
}

interface StaysNetRawClient {
  _id: string;
  fName?: string;
  lName?: string;
  email?: string;
  phones?: StaysNetPhone[];
  documents?: StaysNetDocument[];
  // Allow other properties not explicitly defined
  [key: string]: any;
}

interface StaysNetClientsApiResponse {
  data: StaysNetRawClient[];
  metadata?: {
    total?: number;
    skip?: number;
    limit?: number;
  };
  // Allow other top-level properties
  [key: string]: any;
}

interface SupabaseOwner {
  id: string; // Corresponds to StaysNetRawClient._id
  name: string;
  email?: string;
  phone?: string | null;
  document_id?: string | null;
  // raw_data_stays_net?: StaysNetRawClient; // Optional: if you decide to store raw data
}


const STAYS_NET_API_BASE_URL = "https://api.stays.net"; // Placeholder

console.log("Hello from import-clients-mvp function!");

Deno.serve(async (req: Request) => {
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
    // ... (other checks remain the same)
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
    const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("Supabase client initialized for import-clients-mvp.");

    // Function to get access token from Stays.net
    async function getStaysNetAccessToken(): Promise<string> {
      const tokenUrl = `${STAYS_NET_API_BASE_URL}/external/v1/oauth/token`;
      const params = new URLSearchParams();
      params.append("grant_type", "client_credentials");
      params.append("client_id", staysNetClientId); // Already checked
      params.append("client_secret", staysNetClientSecret); // Already checked

      try {
        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Stays.net token API error: ${response.status} ${response.statusText}`, errorBody);
          throw new Error(`Failed to get access token from Stays.net: ${response.status} ${errorBody}`);
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
    console.log("Successfully obtained Stays.net access token for import-clients-mvp.");

    // Function to fetch clients from Stays.net
    async function fetchStaysNetClients(token: string, skip: number, limit: number): Promise<StaysNetClientsApiResponse> {
      const clientsUrl = `${STAYS_NET_API_BASE_URL}/external/v1/booking/clients?skip=${skip}&limit=${limit}`;
      try {
        const response = await fetch(clientsUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`Stays.net clients API error: ${response.status} ${response.statusText}`, errorBody);
          throw new Error(`Failed to fetch clients from Stays.net: ${response.status} ${errorBody}`);
        }
        return await response.json() as StaysNetClientsApiResponse;
      } catch (error: any) {
        console.error("Error fetching Stays.net clients:", error.message);
        throw error;
      }
    }

    const fetchLimit = 20;
    let allClients: StaysNetRawClient[] = [];
    let currentSkip = 0;
    let hasMore = true;
    console.log("Fetching Stays.net clients...");

    while (hasMore) {
      const clientData: StaysNetClientsApiResponse = await fetchStaysNetClients(accessToken, currentSkip, fetchLimit);
      if (clientData && clientData.data && clientData.data.length > 0) {
        allClients = allClients.concat(clientData.data);
        currentSkip += clientData.data.length;
        if (clientData.data.length < fetchLimit || (clientData.metadata?.total && allClients.length >= clientData.metadata.total)) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      console.log(`Fetched ${allClients.length} clients so far. Current skip: ${currentSkip}. Has more: ${hasMore}`);
    }
    console.log(`Total clients fetched: ${allClients.length}`);

    // Function to transform Stays.net client data to Supabase 'owners' table format
    function transformClientData(staysNetClient: StaysNetRawClient): SupabaseOwner {
      const name = `${staysNetClient.fName || ""} ${staysNetClient.lName || ""}`.trim();

      let phone: string | null = null;
      if (staysNetClient.phones && staysNetClient.phones.length > 0 && staysNetClient.phones[0].number) {
        phone = staysNetClient.phones[0].number;
      }

      let documentId: string | null = null;
      if (staysNetClient.documents && staysNetClient.documents.length > 0 && staysNetClient.documents[0].number) {
        documentId = staysNetClient.documents[0].number;
      }

      return {
        id: staysNetClient._id,
        name: name,
        email: staysNetClient.email,
        phone: phone,
        document_id: documentId,
        // raw_data_stays_net: staysNetClient // Optional
      };
    }

    if (allClients.length > 0) {
      const transformedClients: SupabaseOwner[] = allClients.map(transformClientData);
      console.log(`Transforming ${transformedClients.length} clients...`);

      const { data: upsertedData, error: upsertError } = await supabase
        .from("owners")
        .upsert(transformedClients, { onConflict: "id" });

      if (upsertError) {
        console.error("Error upserting client data to Supabase:", upsertError.message);
        return new Response(`Failed to upsert client data: ${upsertError.message}`, { status: 500 });
      }

      console.log(`Successfully upserted data to Supabase 'owners' table. Processed ${transformedClients.length} clients.`);
      const responseData = {
        message: "Successfully fetched, transformed, and upserted clients.",
        clientsFetched: allClients.length,
        clientsUpserted: transformedClients.length, // Using input length for accuracy
      };
      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("No clients fetched from Stays.net to process.");
      return new Response(JSON.stringify({ message: "No clients fetched to process." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error: any) {
    console.error("Error in import-clients-mvp Edge Function:", error.message);
    const errorMessage = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
    return new Response(`Internal Server Error: ${errorMessage}`, { status: 500 });
  }
});
