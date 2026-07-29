import type { Candidate, CompositionPlan, RegimeOverrides } from "#modules/event/domain/composition.js";
import { Regime } from "@landline/domain/event/enums";
import type { EventId } from "@landline/domain/event/schema";
import { Event } from "@landline/domain/event/schema";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

const AgeBracketRow = Schema.Struct({
  minAge: Schema.Int,
  maxAge: Schema.NullOr(Schema.Int),
});

// An Event whose Cutoff has passed and whose Rooms are not built yet, carrying
// the per-event composition-param overrides off its row (`brackets` is JSONB).
export class DueEvent extends Schema.Class<DueEvent>("DueEvent")({
  id: Event.fields.id,
  regime: Schema.Enums(Regime),
  startsAt: Event.fields.startsAt,
  minSize: Schema.NullOr(Schema.Int),
  maxSize: Schema.NullOr(Schema.Int),
  rounds: Schema.NullOr(Schema.Int),
  floor: Schema.NullOr(Schema.Int),
  leadTimeMinutes: Schema.NullOr(Schema.Int),
  brackets: Schema.NullOr(Schema.parseJson(Schema.Array(AgeBracketRow))),
}) implements RegimeOverrides {}

// What one composition pass did, for the worker's log. `claimed` is false when
// another worker had already advanced the Event out of SCHEDULED.
export interface CompositionSummary {
  readonly eventId: EventId;
  readonly claimed: boolean;
  readonly rooms: number;
  readonly placed: number;
  readonly dropped: number;
  readonly cancelled: boolean;
}

export class CompositionRepo extends Context.Tag("CompositionRepo")<
  CompositionRepo,
  {
    readonly findDue: () => Effect.Effect<ReadonlyArray<DueEvent>>;
    // Claims the Event (SCHEDULED -> COMPOSED, guarded so only one caller wins),
    // then applies `plan` to its reservers and writes the result — Rooms,
    // members, Reservation outcomes and drop streaks — in one transaction. A
    // plan with no Rooms cancels the Event instead.
    readonly composeEvent: (
      event: DueEvent,
      plan: (candidates: ReadonlyArray<Candidate>) => CompositionPlan,
    ) => Effect.Effect<CompositionSummary>;
  }
>() {}
