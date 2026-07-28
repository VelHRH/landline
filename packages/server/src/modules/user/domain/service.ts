import type { CredentialsPayload, SignUpPayload } from "@landline/domain/user/credentials";
import type {
  CityNotFoundError,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  UnauthorizedError,
} from "@landline/domain/user/errors";
import type { Me, UserId } from "@landline/domain/user/schema";
import * as Context from "effect/Context";
import * as Duration from "effect/Duration";
import type * as Effect from "effect/Effect";
import type * as Redacted from "effect/Redacted";
import type { AuthResult } from "./dto/auth-result.js";

export const SESSION_TTL = Duration.days(30);

export class AuthService extends Context.Tag("AuthService")<
  AuthService,
  {
    readonly signUp: (
      payload: SignUpPayload,
    ) => Effect.Effect<AuthResult, EmailAlreadyInUseError | CityNotFoundError>;
    readonly login: (
      payload: CredentialsPayload,
    ) => Effect.Effect<AuthResult, InvalidCredentialsError>;
    readonly identify: (
      token: Redacted.Redacted<string>,
    ) => Effect.Effect<Me, UnauthorizedError>;
    readonly logout: (userId: UserId) => Effect.Effect<void>;
  }
>() {}
