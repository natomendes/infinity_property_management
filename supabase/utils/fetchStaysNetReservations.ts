import type { StaysNetReservationsApiResponse } from "~/types/stay-net/api-responses";

export type FetchStaysNetReservationsParams = {
  token: string;
  skip?: number;
  limit?: number;
};
// Function to fetch reservations from Stays.net
export const fetchStaysNetReservations = async (
  baseUrl: string,
  options: FetchStaysNetReservationsParams
): Promise<StaysNetReservationsApiResponse> => {
  const { token, skip = 0, limit = 0 } = options;
  const reservationsUrl = `${baseUrl}/external/v1/booking/reservations?skip=${skip}&limit=${limit}`;
  try {
    const response = await fetch(reservationsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `Stays.net reservations API error: ${response.status} ${response.statusText}`,
        errorBody
      );
      throw new Error(
        `Failed to fetch reservations: ${response.status} ${errorBody}`
      );
    }
    return (await response.json()) as StaysNetReservationsApiResponse;
  } catch (error: any) {
    console.error("Error fetching Stays.net reservations:", error.message);
    throw error;
  }
};
