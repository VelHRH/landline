import { CityId } from "#city/schema.js";
import * as Schema from "effect/Schema";
import { Regime } from "./enums.js";
import { EventDate } from "./schema.js";

// The admin-supplied inputs to create an Event. `regime` defaults to the launch
// regime; `reservationDeadline` is optional — when omitted the server derives it
// from `startsAt - regime.leadTime`.
export class CreateEventPayload extends Schema.Class<CreateEventPayload>(
  "CreateEventPayload",
)({
  cityId: CityId,
  date: EventDate,
  regime: Schema.optionalWith(Schema.Enums(Regime), {
    default: () => Regime.SPEED_BLIND_DATING,
  }),
  reservationDeadline: Schema.optional(Schema.DateTimeUtc),
}) {}
