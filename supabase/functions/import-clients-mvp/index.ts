import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createBasicAuthHash } from "../../utils/createBasicAuthHash.ts";

Deno.serve(async () => {
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
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log("Supabase client initialized for import-clients-mvp.");

    const accessToken = createBasicAuthHash(
      staysNetClientId!,
      staysNetClientSecret!
    );
    if (!accessToken) {
      return new Response("Failed to obtain Stays.net access token.", {
        status: 500,
      });
    }
    console.log(
      "Successfully obtained Stays.net access token for import-clients-mvp."
    );

    // Function to fetch clients from Stays.net
    async function fetchStaysNetClients(
      token: string,
      skip: number,
      limit: number
    ) {
      const clientsUrl = `${staysNetApiBaseUrl}/external/v1/booking/clients?skip=${skip}&limit=${limit}`;
      try {
        const response = await fetch(clientsUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorBody = await response.text();
          console.error(
            `Stays.net clients API error: ${response.status} ${response.statusText}`,
            errorBody
          );
          throw new Error(
            `Failed to fetch clients from Stays.net: ${response.status} ${errorBody}`
          );
        }
        return await response.json();
      } catch (error) {
        console.error(
          "Error fetching Stays.net clients:",
          error instanceof Error ? error.message : String(error)
        );
        throw error;
      }
    }

    // Fetch all clients with pagination
    const fetchLimit = 20; // Stays.net default/max limit for many endpoints
    let allClients: any[] = [];
    let currentSkip = 0;
    let hasMore = true;
    console.log("Fetching Stays.net clients...");

    while (hasMore) {
      const clientData = await fetchStaysNetClients(
        accessToken,
        currentSkip,
        fetchLimit
      );
      // Assuming clientData.data is the array of clients
      if (clientData && clientData.data && clientData.data.length > 0) {
        allClients = allClients.concat(clientData.data);
        currentSkip += clientData.data.length;
        if (clientData.data.length < fetchLimit) {
          hasMore = false; // No more data if less than limit items are returned
        }
        // MVP safety break, remove for production
        // if (currentSkip >= 100) {
        //   console.warn("MVP safety break: Fetched 100 clients, stopping pagination.");
        //   hasMore = false;
        // }
      } else {
        hasMore = false; // No data or empty data array means no more clients
      }
      console.log(
        `Fetched ${allClients.length} clients so far. Current skip: ${currentSkip}. Has more: ${hasMore}`
      );
    }
    console.log(`Total clients fetched: ${allClients.length}`);

    // Function to transform Stays.net client data to Supabase 'owners' table format
    function transformClientData(staysNetClient: any): any {
      const name = `${staysNetClient.fName || ""} ${
        staysNetClient.lName || ""
      }`.trim();
      const phone =
        staysNetClient.phones && staysNetClient.phones.length > 0
          ? staysNetClient.phones[0].number
          : null;
      const documentId =
        staysNetClient.documents && staysNetClient.documents.length > 0
          ? staysNetClient.documents[0].number
          : null;

      return {
        id: staysNetClient._id, // Stays.net `_id` -> Supabase `id`
        name: name,
        email: staysNetClient.email,
        phone: phone,
        document_id: documentId,
        // raw_data_stays_net: staysNetClient // Optional: store raw data for debugging/auditing
      };
    }

    if (allClients.length > 0) {
      const transformedClients = allClients.map(transformClientData);
      console.log(`Transforming ${transformedClients.length} clients...`);

      // Upsert data into Supabase 'owners' table
      const { data: upsertedData, error: upsertError } = await supabase
        .from("owners") // Target table is 'owners'
        .upsert(transformedClients, { onConflict: "id" }); // `id` is the conflict target

      if (upsertError) {
        console.error(
          "Error upserting client data to Supabase:",
          upsertError.message
        );
        return new Response(
          `Failed to upsert client data: ${upsertError.message}`,
          { status: 500 }
        );
      }

      console.log(
        `Successfully upserted ${
          Array.isArray(upsertedData) ? upsertedData.length : 0
        } clients to Supabase 'owners' table.`
      );
      const responseData = {
        message: "Successfully fetched, transformed, and upserted clients.",
        clientsFetched: allClients.length,
        clientsUpserted: upsertedData ? upsertedData?.length : 0,
      };
      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("No clients fetched from Stays.net to process.");
      return new Response(
        JSON.stringify({ message: "No clients fetched to process." }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        "Error in import-clients-mvp Edge Function:",
        error.message
      );
      const errorMessage =
        typeof error.message === "string"
          ? error.message
          : JSON.stringify(error.message);
      return new Response(`Internal Server Error: ${errorMessage}`, {
        status: 500,
      });
    }
    return new Response(
      `Internal Server Error: ${
        error instanceof Error ? error.message : String(error)
      }`,
      {
        status: 500,
      }
    );
  }
});
