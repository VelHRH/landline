import { PgLive } from "#db/pg-client.js";
import { CreateSessionInput, CreateUserInput, SessionsRepo, UsersRepo } from "#modules/user/domain/repo.js";
import { UserWithCredentials } from "#modules/user/domain/schema.js";
import * as SqlClient from "@effect/sql/SqlClient";
import type * as SqlError from "@effect/sql/SqlError";
import * as SqlSchema from "@effect/sql/SqlSchema";
import { CityNotFoundError, EmailAlreadyInUseError } from "@landline/domain/user/errors";
import { Me, User, UserId } from "@landline/domain/user/schema";
import * as Effect from "effect/Effect";
import { flow } from "effect/Function";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";

const sqlStateOf = (error: SqlError.SqlError) => (error.cause as { code?: string } | undefined)?.code;
const isUniqueViolation = (error: SqlError.SqlError) => sqlStateOf(error) === "23505";
const isForeignKeyViolation = (error: SqlError.SqlError) => sqlStateOf(error) === "23503";

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
      Result: Me,
      Request: Schema.String,
      execute: (tokenHash) =>
        sql`
        SELECT
          users.id,
          users.email,
          users.role,
          users.date_of_birth,
          users.gender,
          users.interested_in,
          users.city_id,
          users.created_at,
          users.updated_at
        FROM
          sessions
          INNER JOIN users ON users.id = sessions.user_id
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
      findUser: flow(findUser, Effect.orDie),
      deleteAllForUser: flow(deleteAllForUser, Effect.orDie),
    };
  }),
).pipe(Layer.provide(PgLive));
