export interface SupabaseReservation {
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
