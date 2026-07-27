import { parseGeoNamesCities } from "#modules/city/domain/geonames.js";
import { describe, expect, it } from "vitest";

// One well-formed GeoNames `cities15000` row (19 tab-separated columns) and a
// truncated one that must be skipped.
const kyivRow =
  "703448\tKyiv\tKyiv\tKiev,Kyiv\t50.45466\t30.5238\tP\tPPLC\tUA\t\t30\t\t\t\t2797553\t\t187\tEurope/Kyiv\t2023-10-15";
const truncatedRow = "706483\tKharkiv\tKharkiv";

describe("parseGeoNamesCities", () => {
  it("maps a well-formed row to a city insert", () => {
    const cities = parseGeoNamesCities(kyivRow);
    expect(cities).toEqual([
      {
        geonamesId: 703448,
        name: "Kyiv",
        country: "UA",
        timezone: "Europe/Kyiv",
        latitude: 50.45466,
        longitude: 30.5238,
        population: 2797553,
      },
    ]);
  });

  it("skips blank and malformed lines", () => {
    const cities = parseGeoNamesCities(`${kyivRow}\n\n${truncatedRow}\n`);
    expect(cities).toHaveLength(1);
    expect(cities[0].name).toBe("Kyiv");
  });
});
