import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    ALTER TABLE users
        ADD COLUMN role TEXT NOT NULL DEFAULT 'USER',
        ADD COLUMN date_of_birth DATE NOT NULL,
        ADD COLUMN gender TEXT NOT NULL,
        ADD COLUMN interested_in TEXT[] NOT NULL,
        ADD COLUMN city_id UUID NOT NULL REFERENCES cities (id);

    CREATE INDEX users_city_id_idx ON users (city_id);
  `,
);
