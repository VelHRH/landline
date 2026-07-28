import type { CityInsert } from "#modules/city/domain/repo.js";

// Column offsets in the headerless, tab-separated GeoNames `cities15000` dump.
// Full field list: https://download.geonames.org/export/dump/ → readme.txt.
enum Column {
  GeonameId = 0,
  Name = 1,
  Latitude = 4,
  Longitude = 5,
  CountryCode = 8,
  Population = 14,
  Timezone = 17,
}

const COLUMN_COUNT = 19;

// Parse a GeoNames `cities15000` dump into upsertable rows; blank or malformed
// lines are skipped rather than failing the whole import.
export const parseGeoNamesCities = (content: string): Array<CityInsert> => {
  const cities: Array<CityInsert> = [];

  for (const line of content.split("\n")) {
    if (line.trim().length === 0) continue;

    const fields = line.split("\t");
    if (fields.length < COLUMN_COUNT) continue;

    const geonamesId = Number(fields[Column.GeonameId]);
    const latitude = Number(fields[Column.Latitude]);
    const longitude = Number(fields[Column.Longitude]);
    const population = Number(fields[Column.Population]);
    const name = fields[Column.Name];
    const country = fields[Column.CountryCode];
    const timezone = fields[Column.Timezone];

    if (
      !Number.isInteger(geonamesId)
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || !Number.isInteger(population)
      || name.length === 0
      || country.length === 0
      || timezone.length === 0
    ) {
      continue;
    }

    cities.push({ geonamesId, name, country, timezone, latitude, longitude, population });
  }

  return cities;
};
