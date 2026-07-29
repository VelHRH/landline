import type { CompositionSummary } from "#modules/event/domain/composition-repo.js";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";

export class CompositionService extends Context.Tag("CompositionService")<
  CompositionService,
  {
    // One reconciliation pass: composes every Event whose Cutoff has passed and
    // that is still SCHEDULED. Idempotent — a pass over nothing due is a no-op,
    // and an already-composed Event is skipped (ADR-0007).
    readonly composeDue: () => Effect.Effect<ReadonlyArray<CompositionSummary>>;
  }
>() {}
