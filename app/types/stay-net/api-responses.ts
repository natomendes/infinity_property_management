export interface StaysNetRawReservation {
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

export interface StaysNetReservationsApiResponse {
  data: StaysNetRawReservation[];
  metadata?: {
    total?: number;
    skip?: number;
    limit?: number;
  };
  // Allow other top-level properties
  [key: string]: any;
}
