import * as Layer from "effect/Layer";
import { CitiesGroupLive } from "./api/live.js";
import { CitiesServiceLive } from "./infrastucture/service.js";

export const CitiesModuleLive = CitiesGroupLive.pipe(
  Layer.provide(CitiesServiceLive),
);
