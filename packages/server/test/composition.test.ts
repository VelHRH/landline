import type { Candidate, RegimeOverrides } from "#modules/event/domain/composition.js";
import { ageAt, compose, resolveRegimeConfig } from "#modules/event/domain/composition.js";
import { describe, expect, it } from "@effect/vitest";
import { Regime } from "@landline/domain/event/enums";
import type { ReservationId } from "@landline/domain/reservation/schema";
import { Gender } from "@landline/domain/user/enums";
import type { UserId } from "@landline/domain/user/schema";

const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

const noOverrides: RegimeOverrides = {
  minSize: null,
  maxSize: null,
  rounds: null,
  floor: null,
  leadTimeMinutes: null,
  brackets: null,
};

const configWith = (overrides: Partial<RegimeOverrides>) =>
  resolveRegimeConfig(Regime.SPEED_BLIND_DATING, { ...noOverrides, ...overrides });

// A hetero man/woman by default; `age`, `dropStreak` and `reservedAt` are what
// the bracket and fairness rules read.
type CandidateOverrides = Partial<
  Pick<Candidate, "age" | "gender" | "interestedIn" | "dropStreak" | "reservedAt">
>;

const candidate = (n: number, overrides?: CandidateOverrides): Candidate => ({
  reservationId: uuid(n) as ReservationId,
  userId: uuid(n) as UserId,
  age: overrides?.age ?? 25,
  gender: overrides?.gender ?? Gender.FEMALE,
  interestedIn: overrides?.interestedIn ?? [Gender.MALE],
  dropStreak: overrides?.dropStreak ?? 0,
  reservedAt: overrides?.reservedAt ?? n,
});

const women = (from: number, count: number, overrides?: CandidateOverrides) =>
  Array.from({ length: count }, (_, i) => candidate(from + i, { ...overrides }));

const men = (from: number, count: number, overrides?: CandidateOverrides) =>
  Array.from(
    { length: count },
    (_, i) => candidate(from + i, { gender: Gender.MALE, interestedIn: [Gender.FEMALE], ...overrides }),
  );

const idsOf = (candidates: ReadonlyArray<Candidate>) => candidates.map((c) => c.userId).sort();

describe("compose", () => {
  it("places everyone from a balanced pool in one viable room", () => {
    const pool = [...women(1, 20), ...men(100, 20)];

    const plan = compose(pool, configWith({}));

    expect(plan.rooms).toHaveLength(1);
    expect(plan.rooms[0]?.ageBracket).toBe("18-29");
    expect(plan.rooms[0]?.members).toHaveLength(40);
    expect(plan.dropped).toHaveLength(0);
  });

  it("every placed member has at least R compatible others", () => {
    const pool = [...women(1, 8), ...men(100, 40)];
    const config = configWith({});

    const plan = compose(pool, config);

    for (const room of plan.rooms) {
      expect(room.members.length).toBeGreaterThanOrEqual(config.floor);
      expect(room.members.length).toBeLessThanOrEqual(config.maxSize);
      for (const member of room.members) {
        const compatible = room.members.filter((other) =>
          other.userId !== member.userId
          && other.interestedIn.includes(member.gender)
          && member.interestedIn.includes(other.gender)
        );
        expect(compatible.length).toBeGreaterThanOrEqual(config.rounds);
      }
    }
  });

  it("drops the surplus of a lopsided pool by drop streak, then reservation time", () => {
    // Six women cap how many men a viable room can hold, so most men are surplus.
    const pool = [
      ...women(1, 6),
      // Dropped before anyone: never dropped before, and reserved last.
      ...men(100, 30, { dropStreak: 0, reservedAt: 900 }),
      // Kept first: dropped once already.
      ...men(200, 20, { dropStreak: 1, reservedAt: 500 }),
      // Kept next: same streak as the surplus, but reserved earlier.
      ...men(300, 20, { dropStreak: 0, reservedAt: 100 }),
    ];

    const plan = compose(pool, configWith({}));

    expect(plan.rooms).toHaveLength(1);
    expect(plan.dropped).toHaveLength(30);
    expect(idsOf(plan.dropped)).toEqual(idsOf(men(100, 30)));
    // The scarce side is never the surplus.
    expect(plan.dropped.every((c) => c.gender === Gender.MALE)).toBe(true);
  });

  it("defers a bracket that cannot fill even a floor-sized viable room", () => {
    // Two women cannot give 20 men the 5 compatible others viability demands.
    const pool = [...women(1, 2), ...men(100, 20)];

    const plan = compose(pool, configWith({}));

    expect(plan.rooms).toHaveLength(0);
    expect(plan.dropped).toHaveLength(22);
  });

  it("never mixes brackets — a thin bracket is deferred while the other composes", () => {
    const pool = [
      ...women(1, 10, { age: 24 }),
      ...men(100, 10, { age: 26 }),
      ...women(200, 3, { age: 40 }),
      ...men(300, 3, { age: 45 }),
    ];

    const plan = compose(pool, configWith({}));

    expect(plan.rooms).toHaveLength(1);
    expect(plan.rooms[0]?.ageBracket).toBe("18-29");
    expect(plan.rooms[0]?.members.every((member) => member.age < 30)).toBe(true);
    expect(plan.dropped).toHaveLength(6);
    expect(plan.dropped.every((member) => member.age >= 30)).toBe(true);
  });

  it("splits a pool larger than maxSize into several viable rooms", () => {
    const pool = [...women(1, 45), ...men(100, 45)];

    const plan = compose(pool, configWith({}));

    expect(plan.rooms).toHaveLength(2);
    expect(plan.dropped).toHaveLength(0);
    for (const room of plan.rooms) {
      expect(room.members.length).toBeLessThanOrEqual(60);
      expect(room.members.length).toBeGreaterThanOrEqual(30);
    }
  });

  it("drops a reserver whose age falls outside every bracket", () => {
    const pool = [...women(1, 10), ...men(100, 10), candidate(500, { age: 15 })];

    const plan = compose(pool, configWith({}));

    expect(plan.rooms).toHaveLength(1);
    expect(plan.dropped.map((c) => c.age)).toEqual([15]);
  });

  it("honours per-event overrides of the regime defaults", () => {
    const pool = [...women(1, 2), ...men(100, 2)];

    // With the defaults this pool is far below the floor; the overrides make it
    // a viable room.
    expect(compose(pool, configWith({})).rooms).toHaveLength(0);
    expect(compose(pool, configWith({ rounds: 1, floor: 2, minSize: 2, maxSize: 4 })).rooms)
      .toHaveLength(1);
  });
});

describe("resolveRegimeConfig", () => {
  it("inherits the regime default for every null override", () => {
    const config = resolveRegimeConfig(Regime.SPEED_BLIND_DATING, noOverrides);

    expect(config.minSize).toBe(30);
    expect(config.maxSize).toBe(60);
    expect(config.rounds).toBe(5);
    expect(config.floor).toBe(12);
    expect(config.brackets).toEqual([{ minAge: 18, maxAge: 29 }, { minAge: 30, maxAge: null }]);
  });
});

describe("ageAt", () => {
  it("counts whole years, not yet counting an upcoming birthday", () => {
    expect(ageAt("1995-06-15", new Date("2026-07-29T20:00:00Z"))).toBe(31);
    expect(ageAt("1995-08-15", new Date("2026-07-29T20:00:00Z"))).toBe(30);
    expect(ageAt("1995-07-29", new Date("2026-07-29T20:00:00Z"))).toBe(31);
    expect(ageAt("1995-07-30", new Date("2026-07-29T20:00:00Z"))).toBe(30);
  });
});
