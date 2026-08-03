import { PgLive } from "#db/pg-client.js";
import { isForeignKeyViolation, isUniqueViolation } from "#db/sql-errors.js";
import { CreateSessionInput, CreateUserInput, SessionsRepo, UsersRepo } from "#modules/user/domain/repo.js";
import { UserWithCredentials } from "#modules/user/domain/schema.js";
import * as SqlClient from "@effect/sql/SqlClient";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { CitySummary } from "@landline/domain/city/schema";
import { CityNotFoundError, EmailAlreadyInUseError } from "@landline/domain/user/errors";
import { Me, Profile, User, UserId } from "@landline/domain/user/schema";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";

const SessionUserRow = Schema.Struct({
  ...User.fields,
  role: Me.fields.role,
  ...Profile.fields,
  cityName: Schema.String,
  cityCountry: Schema.String,
  dropStreak: Me.fields.dropStreak,
});

export const UsersRepoLive = Layer.effect(
  UsersRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const create = SqlSchema.single({
      Result: User,
      Request: CreateUserInput,
      execute: (request) =>
        sql`
        INSERT INTO
          users ${sql.insert(request)}
        RETURNING
          id,
          email,
          created_at,
          updated_at
      `,
    });

    const findByEmail = SqlSchema.findOne({
      Result: UserWithCredentials,
      Request: Schema.String,
      execute: (email) =>
        sql`
        SELECT
          *
        FROM
          users
        WHERE
          email = ${email}
      `,
    });

    return {
      create: (request: CreateUserInput) =>
        create(request).pipe(
          Effect.catchTags({
            SqlError: (error) =>
              isUniqueViolation(error)
                ? new EmailAlreadyInUseError({ email: request.email })
                : isForeignKeyViolation(error)
                ? new CityNotFoundError({ cityId: request.cityId })
                : Effect.die(error),
            NoSuchElementException: Effect.die,
            ParseError: Effect.die,
          }),
        ),
      findByEmail: flow(findByEmail, Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));

export const SessionsRepoLive = Layer.effect(
  SessionsRepo,
  Effect.gen(function*() {
    const sql = yield* SqlClient.SqlClient;

    const create = SqlSchema.void({
      Request: CreateSessionInput,
      execute: (request) =>
        sql`
        INSERT INTO
          sessions ${sql.insert(request)}
      `,
    });

    const findUser = SqlSchema.findOne({
      Result: SessionUserRow,
      Request: Schema.String,
      execute: (tokenHash) =>
        sql`
        SELECT
          users.id,
          users.email,
          users.role,
          users.date_of_birth,
          users.gender,
          users.interested_in::text[] AS interested_in,
          users.city_id,
          cities.name AS city_name,
          cities.country AS city_country,
          users.drop_streak,
          users.created_at,
          users.updated_at
        FROM
          sessions
          INNER JOIN users ON users.id = sessions.user_id
          INNER JOIN cities ON cities.id = users.city_id
        WHERE
          sessions.token_hash = ${tokenHash}
          AND sessions.expires_at > now()
      `,
    });

    const deleteAllForUser = SqlSchema.void({
      Request: UserId,
      execute: (userId) =>
        sql`
        DELETE FROM sessions
        WHERE
          user_id = ${userId}
      `,
    });

    return {
      create: flow(create, Effect.orDie),
      findUser: (tokenHash: string) =>
        findUser(tokenHash).pipe(
          Effect.map(
            Option.map(
              ({ cityCountry, cityName, ...user }) =>
                new Me({
                  ...user,
                  city: new CitySummary({ name: cityName, country: cityCountry }),
                }),
            ),
          ),
          Effect.orDie,
        ),
      deleteAllForUser: flow(deleteAllForUser, Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
