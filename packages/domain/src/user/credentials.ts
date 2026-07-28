import * as Schema from "effect/Schema";
import { Profile, User } from "./schema.js";

const Email = Schema.compose(Schema.Trim, Schema.Lowercase).pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {
    message: () => "Invalid email address",
  }),
  Schema.maxLength(255, {
    message: () => "Email must be at most 255 characters long",
  }),
);

const Password = Schema.Redacted(
  Schema.String.pipe(
    Schema.minLength(8, {
      message: () => "Password must be at least 8 characters long",
    }),
    Schema.maxLength(128, {
      message: () => "Password must be at most 128 characters long",
    }),
  ),
);

export class CredentialsPayload extends Schema.Class<CredentialsPayload>(
  "CredentialsPayload",
)({
  email: Email,
  password: Password,
}) {}

// Sign-up carries credentials plus the registration Profile; login only needs
// credentials, so it keeps using CredentialsPayload.
export class SignUpPayload extends Schema.Class<SignUpPayload>("SignUpPayload")({
  email: Email,
  password: Password,
  ...Profile.fields,
}) {}

// API response for signup/login: `token` is present only for mobile clients
// (X-Client: mobile); web clients get the token via an httpOnly cookie instead.
export class AuthResponse extends Schema.Class<AuthResponse>("AuthResponse")({
  user: User,
  token: Schema.optional(Schema.String),
}) {}
