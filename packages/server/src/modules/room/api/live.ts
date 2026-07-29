import { RoomsService } from "#modules/room/domain/service.js";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { Api } from "@landline/domain/api";
import { CurrentUser } from "@landline/domain/user/http";
import * as Effect from "effect/Effect";

export const RoomsGroupLive = HttpApiBuilder.group(Api, "rooms", (handlers) =>
  Effect.gen(function*() {
    const service = yield* RoomsService;

    return handlers
      .handle("members", ({ path }) => Effect.flatMap(CurrentUser, (user) => service.members(path.roomId, user.id)));
  }));
