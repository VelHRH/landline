import type { AuthResponse } from "@landline/domain/user/credentials";
import { CredentialsPayload, SignUpPayload } from "@landline/domain/user/credentials";
import type { Gender } from "@landline/domain/user/enums";
import { Effect, Redacted, Schema } from "effect";
import type { ApiClient, ApiResult } from "@/lib/api-client";
import { err, ok, runApi } from "@/lib/api-client";
import { toVeeValidationSchema } from "@/lib/effect-schema-validation";
import { translate, type MessageKey } from "@/lib/i18n";
import type { SessionUser } from "./session.service";
import { toSessionUser } from "./session.service";

export type AuthResult = ApiResult<SessionUser>;

export interface SignUpInput {
  readonly email: string;
  readonly password: string;
  readonly dateOfBirth: string;
  readonly gender: Gender;
  readonly interestedIn: ReadonlyArray<Gender>;
  readonly cityId: string;
}

export interface AuthFormValues {
  readonly email: string;
  readonly password: string;
  readonly dateOfBirth: string;
  readonly gender: Gender | "";
  readonly interestedIn: ReadonlyArray<Gender>;
  readonly cityId: string | null;
}

const validationMessages = {
  email: "validation.email",
  password: "validation.password",
  dateOfBirth: "validation.dateOfBirth",
  gender: "validation.gender",
  interestedIn: "validation.interestedIn",
  cityId: "validation.cityId",
} satisfies Readonly<Record<keyof AuthFormValues, MessageKey>>;

const validationMessageForPath = (path: string | undefined): string =>
  translate(
    path && path in validationMessages
      ? validationMessages[path as keyof typeof validationMessages]
      : "validation.invalid",
  );

export const credentialsValidationSchema = toVeeValidationSchema<AuthFormValues>(
  CredentialsPayload,
  validationMessageForPath,
);
export const signUpValidationSchema = toVeeValidationSchema<AuthFormValues>(
  SignUpPayload,
  validationMessageForPath,
);

const credentials = (email: string, password: string) =>
  Effect.try({
    try: () => new CredentialsPayload({ email, password: Redacted.make(password) }),
    catch: () => new Error(translate("errors.credentials")),
  });

const signUpPayload = (input: SignUpInput) =>
  Schema.decodeUnknown(SignUpPayload)(input).pipe(
    Effect.mapError(() => new Error(translate("errors.signup"))),
  );

const authCall = <P, E extends { readonly _tag: string; readonly message: string }>(
  buildPayload: Effect.Effect<P, Error>,
  call: (client: ApiClient, payload: P) => Effect.Effect<AuthResponse, E>,
  userFacingMessages: Readonly<Record<string, MessageKey>>,
): Promise<AuthResult> =>
  runApi((client) =>
    buildPayload.pipe(
      Effect.flatMap((payload) =>
        call(client, payload).pipe(
          Effect.mapError(
            (error) => new Error(translate(userFacingMessages[error._tag] ?? "errors.generic")),
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
    {
      EmailAlreadyInUseError: "errors.emailInUse",
      CityNotFoundError: "errors.cityNotFound",
    },
  );

export const login = (email: string, password: string): Promise<AuthResult> =>
  authCall(
    credentials(email, password),
    (client, payload) => client.users.login({ payload, headers: {} }),
    { InvalidCredentialsError: "errors.invalidCredentials" },
  );
