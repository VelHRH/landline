// How a Reservation resolved at composition. Null (no outcome) until the Cutoff;
// composition then places the user into a Room (PLACED) or drops them (DROPPED).
export enum ReservationOutcome {
  PLACED = "PLACED",
  DROPPED = "DROPPED",
}
