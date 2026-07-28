// The dating mode an Event runs under. Only speed blind dating exists today;
// future regimes are additive (CONTEXT.md > Regime).
export enum Regime {
  SPEED_BLIND_DATING = "SPEED_BLIND_DATING",
}

// The pre-live lifecycle of an Event: it accepts reservations while SCHEDULED,
// flips to COMPOSED when rooms are built at the Cutoff, or CANCELLED if no
// viable rooms form. Live-night states arrive with the future WS engine.
export enum EventStatus {
  SCHEDULED = "SCHEDULED",
  COMPOSED = "COMPOSED",
  CANCELLED = "CANCELLED",
}
