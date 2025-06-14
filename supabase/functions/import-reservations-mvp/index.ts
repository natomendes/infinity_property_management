import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import {
  StaysNetRawReservation,
  StaysNetReservationsApiResponse,
} from "../../../app/types/stay-net/api-responses.ts";
import { SupabaseReservation } from "../../types/reservation-type.ts";
import { createBasicAuthHash } from "../../utils/createBasicAuthHash.ts";
import { fetchStaysNetReservations } from "../../utils/fetchStaysNetReservations.ts";
import { formatDateToISO } from "../../utils/formatDateIso.ts";

Deno.serve(async () => {
  try {
    // Get environment variables
    const staysNetApiBaseUrl = Deno.env.get("STAYS_NET_API_BASE_URL");
    const staysNetClientId = Deno.env.get("STAYS_NET_CLIENT_ID");
    const staysNetClientSecret = Deno.env.get("STAYS_NET_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Check if necessary environment variables are set
    if (!staysNetApiBaseUrl) {
      return new Response("STAYS_NET_API_BASE_URL is not set.", {
        status: 400,
      });
    }
    if (!staysNetClientId) {
      return new Response("STAYS_NET_CLIENT_ID is not set.", { status: 400 });
    }
    if (!staysNetClientSecret) {
      return new Response("STAYS_NET_CLIENT_SECRET is not set.", {
        status: 400,
      });
    }
    if (!supabaseUrl) {
      return new Response("SUPABASE_URL is not set.", { status: 500 });
    }
    if (!supabaseServiceRoleKey) {
      return new Response("SUPABASE_SERVICE_ROLE_KEY is not set.", {
        status: 500,
      });
    }

    // Initialize Supabase client
    const supabase: SupabaseClient = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );
    console.log("Supabase client initialized for import-reservations-mvp.");

    const accessToken: string = createBasicAuthHash(
      staysNetClientId,
      staysNetClientSecret
    );
    console.log(
      "Successfully obtained Stays.net access token for import-reservations-mvp."
    );

    const fetchLimit = 20;
    let allReservations: StaysNetRawReservation[] = [];
    let currentSkip = 0;
    let hasMore = true;
    console.log("Fetching Stays.net reservations...");

    while (hasMore) {
      const reservationData: StaysNetReservationsApiResponse =
        await fetchStaysNetReservations(staysNetApiBaseUrl, {
          token: accessToken,
          skip: currentSkip,
          limit: fetchLimit,
        });
      if (
        reservationData &&
        reservationData.data &&
        reservationData.data.length > 0
      ) {
        allReservations = allReservations.concat(reservationData.data);
        currentSkip += reservationData.data.length;
        if (
          reservationData.data.length < fetchLimit ||
          (reservationData.metadata?.total &&
            allReservations.length >= reservationData.metadata.total)
        ) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      console.log(
        `Fetched ${allReservations.length} reservations. Current skip: ${currentSkip}. Has more: ${hasMore}`
      );
    }
    console.log(`Total reservations fetched: ${allReservations.length}`);

    // Function to transform Stays.net reservation data
    function transformReservationData(
      reservation: StaysNetRawReservation
    ): SupabaseReservation {
      if (!reservation.listingId) {
        console.warn(
          `Reservation _id=${reservation._id} (shortId ${reservation.id}) is missing listingId.`
        );
      }
      if (!reservation._idclient) {
        console.warn(
          `Reservation _id=${reservation._id} (shortId ${reservation.id}) is missing _idclient.`
        );
      }

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
      const transformedReservations: SupabaseReservation[] =
        allReservations.map(transformReservationData);
      console.log(
        `Transforming ${transformedReservations.length} reservations...`
      );

      const { data: upsertedData, error: upsertError } = await supabase
        .from("reservations")
        .upsert(transformedReservations, { onConflict: "id" });

      if (upsertError) {
        console.error(
          "Error upserting reservation data to Supabase:",
          upsertError.message
        );
        return new Response(
          `Failed to upsert reservation data: ${upsertError.message}`,
          { status: 500 }
        );
      }

      console.log(
        `Successfully upserted data to Supabase 'reservations' table. Processed ${transformedReservations.length} reservations.`
      );
      const responseData = {
        message:
          "Successfully fetched, transformed, and upserted reservations.",
        reservationsFetched: allReservations.length,
        reservationsUpserted: transformedReservations.length, // Using input length
      };
      return new Response(JSON.stringify(responseData), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      console.log("No reservations fetched to process.");
      return new Response(
        JSON.stringify({ message: "No reservations fetched to process." }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    }
  } catch (error: any) {
    console.error(
      "Error in import-reservations-mvp Edge Function:",
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
});
