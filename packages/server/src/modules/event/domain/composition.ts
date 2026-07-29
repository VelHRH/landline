import type { Regime } from "@landline/domain/event/enums";
import type { AgeBracket, RegimeConfig } from "@landline/domain/event/regime";
import { ageBracketLabel, REGIME_DEFAULTS } from "@landline/domain/event/regime";
import type { ReservationId } from "@landline/domain/reservation/schema";
import type { Gender } from "@landline/domain/user/enums";
import type { UserId } from "@landline/domain/user/schema";

// One Reservation resolved into the facts composition reasons about: the
// compatibility inputs (gender/interestedIn), the bracket input (age at the
// Event's start), and the fairness inputs (drop streak, reservation time).
export interface Candidate {
  readonly reservationId: ReservationId;
  readonly userId: UserId;
  readonly age: number;
  readonly gender: Gender;
  readonly interestedIn: ReadonlyArray<Gender>;
  readonly dropStreak: number;
  readonly reservedAt: number;
}

export interface PlannedRoom {
  readonly ageBracket: string;
  readonly members: ReadonlyArray<Candidate>;
}

// What composition decided for one Event: the Rooms to write, and everyone whose
// Reservation is DROPPED (surplus, or a bracket deferred wholesale).
export interface CompositionPlan {
  readonly rooms: ReadonlyArray<PlannedRoom>;
  readonly dropped: ReadonlyArray<Candidate>;
}

// The per-Event overrides of the regime defaults; null inherits the default.
export interface RegimeOverrides {
  readonly minSize: number | null;
  readonly maxSize: number | null;
  readonly rounds: number | null;
  readonly floor: number | null;
  readonly leadTimeMinutes: number | null;
  readonly brackets: ReadonlyArray<AgeBracket> | null;
}

export const resolveRegimeConfig = (
  regime: Regime,
  overrides: RegimeOverrides,
): RegimeConfig => {
  const defaults = REGIME_DEFAULTS[regime];
  return {
    minSize: overrides.minSize ?? defaults.minSize,
    maxSize: overrides.maxSize ?? defaults.maxSize,
    rounds: overrides.rounds ?? defaults.rounds,
    // A floor below 1 would let composition emit empty Rooms forever.
    floor: Math.max(1, overrides.floor ?? defaults.floor),
    brackets: overrides.brackets ?? defaults.brackets,
    leadTimeMinutes: overrides.leadTimeMinutes ?? defaults.leadTimeMinutes,
  };
};

// Whole years old on `reference`, both read as calendar dates.
export const ageAt = (dateOfBirth: string, reference: Date): number => {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const years = reference.getUTCFullYear() - year!;
  const beforeBirthday = reference.getUTCMonth() + 1 < month!
    || (reference.getUTCMonth() + 1 === month! && reference.getUTCDate() < day!);
  return beforeBirthday ? years - 1 : years;
};

// Two participants are compatible iff each one's gender is in the other's
// interestedIn set — the only relation the algorithm reasons about (ADR-0008).
const compatible = (a: Candidate, b: Candidate): boolean =>
  a.userId !== b.userId
  && a.interestedIn.includes(b.gender)
  && b.interestedIn.includes(a.gender);

const compatibleCount = (
  candidate: Candidate,
  among: ReadonlyArray<Candidate>,
): number => among.reduce((total, other) => compatible(candidate, other) ? total + 1 : total, 0);

// Placement priority: whoever has been dropped most times in a row since their
// last placement goes first, earliest reserver breaks the tie. Surplus is
// whatever this ordering leaves at the bottom (ADR-0008).
const byPlacementPriority = (a: Candidate, b: Candidate): number =>
  b.dropStreak - a.dropStreak || a.reservedAt - b.reservedAt;

// The largest subset in which everyone has at least `rounds` compatible others,
// found by repeatedly discarding whoever falls short. Nobody discarded here can
// sit in a viable Room drawn from this pool — their degree only shrinks in a
// subset — so this is the ceiling on how many can be placed.
const viableCore = (
  pool: ReadonlyArray<Candidate>,
  rounds: number,
): ReadonlyArray<Candidate> => {
  let current = pool;
  for (;;) {
    const next = current.filter((candidate) => compatibleCount(candidate, current) >= rounds);
    if (next.length === current.length) return next;
    current = next;
  }
};

// How many to pull into the next Room. Capped at `maxSize`, but when the cap
// would strand a remainder below the target minimum, the Room shrinks so the
// remainder reaches it instead of being dropped as a runt.
const roomTarget = (poolSize: number, config: RegimeConfig): number => {
  if (poolSize <= config.maxSize) return poolSize;
  const remainder = poolSize - config.maxSize;
  return remainder >= config.minSize
    ? config.maxSize
    : Math.max(config.floor, poolSize - config.minSize);
};

// Grows one Room out of the pool: seeded with the highest-priority reserver, then
// repeatedly adding whoever is compatible with the most of the Room so far
// (priority breaks ties). That self-balances a lopsided pool — the scarce side's
// compatibility score climbs with every addition from the abundant side — and the
// result is pruned to its viable core before being accepted.
const buildRoom = (
  pool: ReadonlyArray<Candidate>,
  config: RegimeConfig,
): ReadonlyArray<Candidate> | null => {
  const ordered = [...pool].sort(byPlacementPriority);
  const target = roomTarget(ordered.length, config);
  const room = [ordered[0]!];
  const rest = ordered.slice(1);

  while (room.length < target && rest.length > 0) {
    let bestIndex = 0;
    let bestScore = -1;
    for (const [index, candidate] of rest.entries()) {
      const score = compatibleCount(candidate, room);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    room.push(rest[bestIndex]!);
    rest.splice(bestIndex, 1);
  }

  const viable = viableCore(room, config.rounds);
  return viable.length >= config.floor ? viable : null;
};

// Rooms never mix brackets, so each bracket is packed independently: carve viable
// Rooms off the core until what is left cannot fill one. A bracket that cannot
// fill even a floor-sized viable Room yields no Rooms at all — everyone in it is
// deferred rather than merged into another bracket.
const composeBracket = (
  pool: ReadonlyArray<Candidate>,
  ageBracket: string,
  config: RegimeConfig,
): ReadonlyArray<PlannedRoom> => {
  const rooms: Array<PlannedRoom> = [];
  let remaining = viableCore(pool, config.rounds);

  while (remaining.length >= config.floor) {
    const members = buildRoom(remaining, config);
    if (members === null) break;
    rooms.push({ ageBracket, members });
    const placed = new Set(members.map((member) => member.userId));
    remaining = viableCore(
      remaining.filter((candidate) => !placed.has(candidate.userId)),
      config.rounds,
    );
  }

  return rooms;
};

const bracketOf = (
  candidate: Candidate,
  brackets: ReadonlyArray<AgeBracket>,
): AgeBracket | undefined =>
  brackets.find((bracket) =>
    candidate.age >= bracket.minAge
    && (bracket.maxAge === null || candidate.age <= bracket.maxAge)
  );

// Turns an Event's reservers into Rooms: split by age bracket, then within each
// bracket build only viable Rooms sized [floor .. maxSize], placing as many as
// possible. Whoever is left over — surplus a viable Room cannot hold, a deferred
// bracket, or an age outside every bracket — is dropped.
export const compose = (
  candidates: ReadonlyArray<Candidate>,
  config: RegimeConfig,
): CompositionPlan => {
  const rooms = config.brackets.flatMap((bracket) =>
    composeBracket(
      candidates.filter((candidate) => bracketOf(candidate, config.brackets) === bracket),
      ageBracketLabel(bracket),
      config,
    )
  );

  const placed = new Set(
    rooms.flatMap((room) => room.members.map((member) => member.userId)),
  );

  return {
    rooms,
    dropped: candidates.filter((candidate) => !placed.has(candidate.userId)),
  };
};
