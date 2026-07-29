import { CompositionService } from "#modules/event/domain/composition-service.js";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schedule from "effect/Schedule";
import { CompositionServiceLive } from "./composition-service.js";

// Poll granularity, not precision: the Cutoff is minutes ahead of the Event's
// start, so a minute of slack costs nothing (ADR-0007).
const POLL_INTERVAL = "60 seconds";

// The app's first background scheduler: a recurring fiber that reads due Events
// out of the database and advances them, rather than an in-memory timer armed
// per Event. It survives restarts because all the state it needs is the Event
// row, and a failed cycle is logged and retried on the next tick.
export const CompositionWorkerLive = Layer.scopedDiscard(
  Effect.gen(function*() {
    const service = yield* CompositionService;

    const cycle = service.composeDue().pipe(
      Effect.flatMap(
        Effect.forEach(
          (summary) =>
            summary.claimed
              ? Effect.logInfo(
                `Composed event ${summary.eventId}: ${summary.rooms} room(s), `
                  + `${summary.placed} placed, ${summary.dropped} dropped`
                  + (summary.cancelled ? " — cancelled, no viable room" : ""),
              )
              : Effect.void,
          { discard: true },
        ),
      ),
      Effect.catchAllCause((cause) => Effect.logError("Room composition cycle failed", cause)),
    );

    yield* Effect.forkScoped(Effect.repeat(cycle, Schedule.spaced(POLL_INTERVAL)));
  }),
).pipe(Layer.provide(CompositionServiceLive));
