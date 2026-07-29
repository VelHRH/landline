import { CompositionRepo } from "#modules/event/domain/composition-repo.js";
import { CompositionService } from "#modules/event/domain/composition-service.js";
import { compose, resolveRegimeConfig } from "#modules/event/domain/composition.js";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { CompositionRepoLive } from "./composition-repository.js";

export const CompositionServiceLive = Layer.effect(
  CompositionService,
  Effect.gen(function*() {
    const repo = yield* CompositionRepo;

    const composeDue = () =>
      Effect.flatMap(
        repo.findDue(),
        Effect.forEach((event) =>
          repo.composeEvent(
            event,
            (candidates) => compose(candidates, resolveRegimeConfig(event.regime, event)),
          )
        ),
      );

    return { composeDue };
  }),
).pipe(Layer.provide(CompositionRepoLive));
