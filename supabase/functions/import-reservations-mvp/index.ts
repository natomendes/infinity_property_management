// @deno-types="npm:@types/pg"
import { db } from "../../../app/database/drizzleClient.ts";
import { reservations } from "../../../app/database/schema.ts"; // Assuming schema for reservations is here
// import { eq } from "npm:drizzle-orm"; // If needed for specific queries
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
    // const supabaseUrl = Deno.env.get("SUPABASE_URL"); // Not needed for Drizzle
    // const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"); // Not needed for Drizzle

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
    // supabaseUrl and supabaseServiceRoleKey checks removed as they are no longer direct dependencies for this function with Drizzle.
    // Drizzle client (db) should handle its own connection config.

    console.log("Drizzle client will be used for database operations for import-reservations-mvp."); // New log

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

      console.log(`Upserting ${transformedReservations.length} reservations using Drizzle...`);
      let upsertedCount = 0;
      try {
        for (const reservation of transformedReservations) {
          // Assuming 'reservations' is the Drizzle schema object for the 'reservations' table
          // and it has an 'id' column that corresponds to transformedReservation.id.
          await db.insert(reservations).values(reservation).onConflictDoUpdate({
            target: reservations.id, // Ensure 'reservations.id' is the correct conflict target column
            set: {
              short_id: reservation.short_id,
              listing_id: reservation.listing_id,
              client_id: reservation.client_id,
              type: reservation.type,
              check_in_date: reservation.check_in_date,
              check_out_date: reservation.check_out_date,
              guests: reservation.guests,
              creation_date: reservation.creation_date,
              // raw_data_stays_net: reservation.raw_data_stays_net // Uncomment if this column exists and needs updating
            }
          });
          upsertedCount++;
        }
        console.log(
          `Successfully upserted ${upsertedCount} reservations to 'reservations' table using Drizzle.`
        );
      } catch (upsertError) {
        console.error(
          "Error upserting reservation data to 'reservations' table using Drizzle:",
          upsertError.message
        );
        return new Response(
          `Failed to upsert reservation data using Drizzle: ${upsertError.message}`,
          { status: 500 }
        );
      }
      // Update the responseData to reflect the changes
      const responseData = {
          message: "Successfully fetched, transformed, and upserted reservations using Drizzle.",
          reservationsFetched: allReservations.length,
          reservationsUpserted: upsertedCount, // Use the count of successfully processed items
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
