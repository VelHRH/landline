import type { AuthResponse } from "@landline/domain/user/credentials";
import { CredentialsPayload, SignUpPayload } from "@landline/domain/user/credentials";
import type { Gender } from "@landline/domain/user/enums";
import { Effect, Redacted, Schema } from "effect";
import type { ApiClient, ApiResult } from "@/lib/api-client";
import { err, ok, runApi } from "@/lib/api-client";
import type { SessionUser } from "./session.service";
import { toSessionUser } from "./session.service";

export type AuthResult = ApiResult<SessionUser>;

// The profile a user fills in alongside credentials when creating an account.
export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly dateOfBirth: string;
  readonly gender: Gender;
  readonly interestedIn: ReadonlyArray<Gender>;
  readonly cityId: string;
}

// CredentialsPayload validates on construction (email shape, password
// length); surface those as the same kind of readable message as API errors.
const credentials = (email: string, password: string) =>
  Effect.try({
    try: () => new CredentialsPayload({ email, password: Redacted.make(password) }),
    catch: () => new Error("Enter a valid email and a password of at least 8 characters"),
  });

// SignUpPayload adds the profile schema on top of credentials; a decode failure
// (missing city, empty interestedIn, bad date) collapses to a readable message.
const signUpPayload = (input: SignUpInput) =>
  Schema.decodeUnknown(SignUpPayload)(input).pipe(
    Effect.mapError(() => new Error("Check your details and try again")),
  );

// Shared signup/login pipeline: the endpoint's own tagged errors keep their
// readable message; anything else (transport, decode) is not the user's
// fault and collapses to a generic message.
const authCall = <P, E extends { readonly _tag: string; readonly message: string }>(
  buildPayload: Effect.Effect<P, Error>,
  call: (client: ApiClient, payload: P) => Effect.Effect<AuthResponse, E>,
  userFacingTags: ReadonlyArray<string>,
): Promise<AuthResult> =>
  runApi((client) =>
    buildPayload.pipe(
      Effect.flatMap((payload) =>
        call(client, payload).pipe(
          Effect.mapError((error) =>
            userFacingTags.includes(error._tag) ? error : new Error("Something went wrong, try again"),
          ),
        ),
      ),
      Effect.map(({ user }) => ok(toSessionUser(user))),
      Effect.catchAll((error) => Effect.succeed(err(error.message))),
    ),
  );

export const signUp = (input: SignUpInput): Promise<AuthResult> =>
  authCall(
    signUpPayload(input),
    (client, payload) => client.users.signUp({ payload, headers: {} }),
    ["EmailAlreadyInUseError", "CityNotFoundError"],
  );

export const login = (email: string, password: string): Promise<AuthResult> =>
  authCall(
    credentials(email, password),
    (client, payload) => client.users.login({ payload, headers: {} }),
    ["InvalidCredentialsError"],
  );
