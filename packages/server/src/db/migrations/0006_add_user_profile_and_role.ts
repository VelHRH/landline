import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

    CREATE TYPE user_gender AS ENUM ('MALE', 'FEMALE', 'NONBINARY');

    ALTER TABLE users
        ADD COLUMN role user_role NOT NULL DEFAULT 'USER',
        ADD COLUMN date_of_birth DATE NOT NULL,
        ADD COLUMN gender user_gender NOT NULL,
        ADD COLUMN interested_in user_gender[] NOT NULL,
        ADD COLUMN city_id UUID NOT NULL REFERENCES cities (id);

    CREATE INDEX users_city_id_idx ON users (city_id);
  `,
);
