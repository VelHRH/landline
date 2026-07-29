import type * as SqlError from "@effect/sql/SqlError";

// Postgres surfaces the constraint kind as a SQLSTATE code on the driver error;
// these let repos map a specific violation to a domain error and re-raise the
// rest. https://www.postgresql.org/docs/current/errcodes-appendix.html
const sqlStateOf = (error: SqlError.SqlError) => (error.cause as { code?: string } | undefined)?.code;

export const isUniqueViolation = (error: SqlError.SqlError) => sqlStateOf(error) === "23505";

export const isForeignKeyViolation = (error: SqlError.SqlError) => sqlStateOf(error) === "23503";
