import { HttpApiEndpoint, HttpApiGroup, HttpApiMiddleware, HttpApiSecurity } from "@effect/platform";
import { Context } from "effect";
import * as Schema from "effect/Schema";
import { AuthResponse, CredentialsPayload, SignUpPayload } from "./credentials.js";
import { CityNotFoundError, EmailAlreadyInUseError, InvalidCredentialsError, UnauthorizedError } from "./errors.js";
import { Me } from "./schema.js";

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  Me
>() {}

export const SessionCookie = HttpApiSecurity.apiKey({
  in: "cookie",
  key: "session",
});

export class Authorization extends HttpApiMiddleware.Tag<Authorization>()(
  "Authorization",
  {
    failure: UnauthorizedError,
    provides: CurrentUser,
    security: {
      cookie: SessionCookie,
      bearer: HttpApiSecurity.bearer,
    },
  },
) {}

export const ClientHeaders = Schema.Struct({
  "x-client": Schema.optional(Schema.String), // we will use it when login through mobile to understand we should return token in response
});

export class UsersGroup extends HttpApiGroup.make("users")
  .add(
    HttpApiEndpoint.post("signUp", "/signup")
      .setPayload(SignUpPayload)
      .setHeaders(ClientHeaders)
      .addSuccess(AuthResponse)
      .addError(EmailAlreadyInUseError)
      .addError(CityNotFoundError),
  )
  .add(
    HttpApiEndpoint.post("login", "/login")
      .setPayload(CredentialsPayload)
      .setHeaders(ClientHeaders)
      .addSuccess(AuthResponse)
      .addError(InvalidCredentialsError),
  )
  .add(
    HttpApiEndpoint.get("me", "/me").addSuccess(Me).middleware(Authorization),
  )
  .add(
    HttpApiEndpoint.post("logout", "/logout")
      .addSuccess(Schema.Void)
      .middleware(Authorization),
  )
  .prefix("/user")
{}
