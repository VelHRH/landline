# Seed data

## GeoNames cities

The city seed (`pnpm seed:cities`) imports the GeoNames `cities15000` dump —
every populated place with more than 15 000 inhabitants. It is not checked in
(it is large and upstream-owned); download it once:

```sh
curl -L https://download.geonames.org/export/dump/cities15000.zip -o /tmp/cities15000.zip
unzip -o /tmp/cities15000.zip cities15000.txt -d packages/server/data/
```

Then, with the database up (`pnpm --filter @landline/server db:up`):

```sh
pnpm --filter @landline/server seed:cities
```

The importer is idempotent — re-running it changes nothing when the dump is
unchanged. Point it at a different file with an argument or the
`GEONAMES_CITIES_FILE` environment variable.

GeoNames data is licensed CC BY 4.0.
