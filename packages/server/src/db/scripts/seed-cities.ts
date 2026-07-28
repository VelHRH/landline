import { parseGeoNamesCities } from "#modules/city/domain/geonames.js";
import { CitiesRepo } from "#modules/city/domain/repo.js";
import { CitiesRepoLive } from "#modules/city/infrastucture/repository.js";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Array as Arr, Effect } from "effect";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Download/unzip the dump once (see data/README.md); override its location with
// a path argument or GEONAMES_CITIES_FILE.
const defaultFile = fileURLToPath(new URL("../../../data/cities15000.txt", import.meta.url));
const sourceFile = process.argv[2] ?? process.env.GEONAMES_CITIES_FILE ?? defaultFile;

// Keeps each INSERT under Postgres' 65535-parameter ceiling (7 columns/row).
const BATCH_SIZE = 1000;

NodeRuntime.runMain(
  Effect.gen(function*() {
    const repo = yield* CitiesRepo;

    const content = yield* Effect.tryPromise({
      try: () => readFile(sourceFile, "utf8"),
      catch: (cause) =>
        new Error(
          `Could not read GeoNames dump at ${path.resolve(sourceFile)} — see data/README.md`,
          { cause },
        ),
    });

    const cities = parseGeoNamesCities(content);
    yield* Effect.log(`Parsed ${cities.length} cities from ${path.resolve(sourceFile)}`);

    for (const batch of Arr.chunksOf(cities, BATCH_SIZE)) {
      yield* repo.upsertMany(batch);
    }

    yield* Effect.log(`Seeded ${cities.length} cities`);
  }).pipe(Effect.provide([NodeContext.layer, CitiesRepoLive])),
);
