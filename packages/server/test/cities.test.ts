import { CitiesRepo } from "#modules/city/domain/repo.js";
import { CitiesRepoLive } from "#modules/city/infrastucture/repository.js";
import { expect, layer } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { makeApiClient, TestServerLive } from "./harness.js";

// Real GeoNames records — the shape the seed importer emits.
const kyiv = {
  geonamesId: 703448,
  name: "Kyiv",
  country: "UA",
  timezone: "Europe/Kyiv",
  latitude: 50.45466,
  longitude: 30.5238,
  population: 2797553,
};
const kharkiv = {
  geonamesId: 706483,
  name: "Kharkiv",
  country: "UA",
  timezone: "Europe/Kyiv",
  latitude: 49.98081,
  longitude: 36.25272,
  population: 1430885,
};

// The api-seam server plus a direct repo handle to seed reference data — cities
// have no create endpoint (they are seeded, not user-authored).
const CitiesTestLive = Layer.merge(TestServerLive, CitiesRepoLive);

layer(CitiesTestLive, { excludeTestServices: true })("cities", (it) => {
  it.effect("prefix search returns the seeded match, typed end-to-end", () =>
    Effect.gen(function*() {
      const repo = yield* CitiesRepo;
      yield* repo.upsertMany([kyiv, kharkiv]);

      const client = yield* makeApiClient;
      const results = yield* client.cities.search({ urlParams: { q: "kyi" } });

      const match = results.find((city) => city.name === "Kyiv");
      expect(match).toBeDefined();
      expect(match?.country).toBe("UA");
      expect(match?.timezone).toBe("Europe/Kyiv");
      // The branded CityId decodes to a plain string on the wire.
      expect(typeof match?.id).toBe("string");
    }));

  it.effect("prefix search is case-insensitive and discriminates by prefix", () =>
    Effect.gen(function*() {
      const repo = yield* CitiesRepo;
      yield* repo.upsertMany([kyiv, kharkiv]);

      const client = yield* makeApiClient;
      const results = yield* client.cities.search({ urlParams: { q: "KHA" } });

      const names = results.map((city) => city.name);
      expect(names).toContain("Kharkiv");
      expect(names).not.toContain("Kyiv");
    }));

  it.effect("re-seeding the same cities changes nothing (idempotent)", () =>
    Effect.gen(function*() {
      const repo = yield* CitiesRepo;
      yield* repo.upsertMany([kyiv, kharkiv]);
      yield* repo.upsertMany([kyiv, kharkiv]);

      const client = yield* makeApiClient;
      const results = yield* client.cities.search({ urlParams: { q: "k", limit: 20 } });

      // Both seeded cities appear exactly once — the unique geonamesId keeps a
      // re-run from duplicating rows.
      const seeded = results.filter((city) => city.country === "UA").map((city) => city.name).sort();
      expect(seeded).toEqual(["Kharkiv", "Kyiv"]);
    }));
});
