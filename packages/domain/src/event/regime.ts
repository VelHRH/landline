import { Regime } from "./enums.js";

// A single age band a Room is composed within. `maxAge: null` is the open-ended
// top bracket (e.g. 30+).
export interface AgeBracket {
  readonly minAge: number;
  readonly maxAge: number | null;
}

// The composition params a Regime runs with. An Event may override any of these
// per-event; a null override inherits the value here.
export interface RegimeConfig {
  readonly minSize: number;
  readonly maxSize: number;
  readonly rounds: number;
  readonly floor: number;
  readonly brackets: ReadonlyArray<AgeBracket>;
  readonly leadTimeMinutes: number;
}

// The code-level default config every Event draws from. `leadTimeMinutes` is the
// only default resolved at creation (it fixes the Cutoff); the rest are consumed
// by room composition at the Cutoff.
export const REGIME_DEFAULTS: Record<Regime, RegimeConfig> = {
  [Regime.SPEED_BLIND_DATING]: {
    minSize: 30,
    maxSize: 60,
    rounds: 5,
    floor: 12,
    brackets: [{ minAge: 18, maxAge: 29 }, { minAge: 30, maxAge: null }],
    leadTimeMinutes: 120,
  },
};
