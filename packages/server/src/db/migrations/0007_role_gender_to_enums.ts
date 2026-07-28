import { SqlClient } from "@effect/sql";
import { Effect } from "effect";

// Promote role/gender from TEXT to native Postgres enum types so the value set
// is enforced by the database, not just the domain schema. interested_in
// becomes an array of the gender enum so its elements are constrained too.
export default Effect.flatMap(
  SqlClient.SqlClient,
  (sql) =>
    sql`
    CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');

    CREATE TYPE user_gender AS ENUM ('MALE', 'FEMALE', 'NONBINARY');

    ALTER TABLE users
        ALTER COLUMN role DROP DEFAULT,
        ALTER COLUMN role TYPE user_role USING role::user_role,
        ALTER COLUMN role SET DEFAULT 'USER',
        ALTER COLUMN gender TYPE user_gender USING gender::user_gender,
        ALTER COLUMN interested_in TYPE user_gender[] USING interested_in::user_gender[];
  `,
);
