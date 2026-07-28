import { CityId } from "#city/schema.js";
import { Schema } from "effect";
import { Gender, Role } from "./enums.js";

export const UserId = Schema.UUID.pipe(Schema.brand("UserId"));
export type UserId = typeof UserId.Type;

export const DateOfBirth = Schema.String.pipe(
  Schema.pattern(/^\d{4}-\d{2}-\d{2}$/, {
    message: () => "Date of birth must be a calendar date (YYYY-MM-DD)",
  }),
  Schema.brand("DateOfBirth"),
);
export type DateOfBirth = typeof DateOfBirth.Type;

// The public identity other participants may see: deliberately anonymous, no
// profile facts. Profile/role live on `Me`, exposed only to the user themselves.
export class User extends Schema.Class<User>("User")({
  id: UserId,
  email: Schema.String,
  createdAt: Schema.DateTimeUtc,
  updatedAt: Schema.DateTimeUtc,
}) {}

// The dating-facing facts a User provides at registration (CONTEXT.md).
export class Profile extends Schema.Class<Profile>("Profile")({
  dateOfBirth: DateOfBirth,
  gender: Schema.Enums(Gender),
  interestedIn: Schema.NonEmptyArray(Schema.Enums(Gender)),
  cityId: CityId,
}) {}

// The authenticated user's own view of themselves: identity plus role and
// profile. Only ever returned to the user it describes (the `me` endpoint).
export class Me extends Schema.Class<Me>("Me")({
  ...User.fields,
  role: Schema.Enums(Role),
  ...Profile.fields,
}) {}
