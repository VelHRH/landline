import type { CitySummary } from "@landline/domain/city/schema";
import type { Gender } from "@landline/domain/user/enums";
import { Effect } from "effect";
import type { ApiResult } from "@/lib/api-client";
import { err, ok, runApi } from "@/lib/api-client";
import { translate } from "@/lib/i18n";

export interface ProfileData {
  readonly email: string;
  readonly dateOfBirth: string;
  readonly gender: Gender;
  readonly interestedIn: ReadonlyArray<Gender>;
  readonly city: CitySummary;
}

export const loadProfile = (): Promise<ApiResult<ProfileData | null>> =>
  runApi((client) =>
    client.users.me().pipe(
      Effect.map((user) =>
        ok({
          email: user.email,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          interestedIn: user.interestedIn,
          city: user.city,
        }),
      ),
      Effect.catchTag("UnauthorizedError", () => Effect.succeed(ok(null))),
      Effect.catchAll(() => Effect.succeed(err(translate("errors.serverUnavailable")))),
    ),
  );
