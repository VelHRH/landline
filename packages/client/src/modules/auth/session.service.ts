import { Effect } from "effect";
import type { ApiResult } from "@/lib/api-client";
import { err, ok, runApi } from "@/lib/api-client";
import { translate } from "@/lib/i18n";

// Plain view of the current user for stores/components.
export interface SessionUser {
  readonly id: string;
  readonly email: string;
}

export const toSessionUser = (user: SessionUser): SessionUser => ({
  id: user.id,
  email: user.email,
});

// Resolves the current user from the session cookie. `ok` with null means a
// real answer ("logged out"); `err` means we could not find out (server
// unreachable, decode failure) — callers decide whether that distinction
// matters to them.
export const me = (): Promise<ApiResult<SessionUser | null>> =>
  runApi((client) =>
    client.users.me().pipe(
      Effect.map((user) => ok(toSessionUser(user))),
      // The endpoint's one declared failure: no/expired session cookie.
      Effect.catchTag("UnauthorizedError", () => Effect.succeed(ok(null))),
      Effect.catchAll(() => Effect.succeed(err(translate("errors.serverUnavailable")))),
    ),
  );

export const logout = (): Promise<void> =>
  runApi((client) =>
    client.users.logout().pipe(
      // Even if the request fails the client-side session state is dropped;
      // the guard will send the user back to auth either way.
      Effect.catchAll(() => Effect.void),
    ),
  );
