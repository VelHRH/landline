import { HttpApiSchema } from "@effect/platform";
import * as Schema from "effect/Schema";

export class EmailAlreadyInUseError extends Schema.TaggedError<EmailAlreadyInUseError>(
  "EmailAlreadyInUseError",
)(
  "EmailAlreadyInUseError",
  { email: Schema.String },
  HttpApiSchema.annotations({
    status: 409,
  }),
) {
  get message() {
    return `Email ${this.email} is already in use`;
  }
}

export class CityNotFoundError extends Schema.TaggedError<CityNotFoundError>(
  "CityNotFoundError",
)(
  "CityNotFoundError",
  { cityId: Schema.String },
  HttpApiSchema.annotations({
    status: 400,
  }),
) {
  get message() {
    return `No city with id ${this.cityId}`;
  }
}

export class InvalidCredentialsError extends Schema.TaggedError<InvalidCredentialsError>(
  "InvalidCredentialsError",
)(
  "InvalidCredentialsError",
  {},
  HttpApiSchema.annotations({
    status: 401,
  }),
) {
  get message() {
    return "Invalid email or password";
  }
}

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>(
  "UnauthorizedError",
)(
  "UnauthorizedError",
  {},
  HttpApiSchema.annotations({
    status: 401,
  }),
) {
  get message() {
    return "Missing or invalid access token";
  }
}
