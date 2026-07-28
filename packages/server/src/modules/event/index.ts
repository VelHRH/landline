import * as Layer from "effect/Layer";
import { EventsGroupLive } from "./api/live.js";
import { EventsServiceLive } from "./infrastucture/service.js";

export const EventsModuleLive = EventsGroupLive.pipe(
  Layer.provide(EventsServiceLive),
);
