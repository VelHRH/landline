import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    CREATE TABLE cities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        geonames_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        country TEXT NOT NULL,
        timezone TEXT NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        population INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE INDEX cities_name_lower_idx ON cities (lower(name) text_pattern_ops);

    CREATE TRIGGER cities_set_updated_at
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  `,
);
