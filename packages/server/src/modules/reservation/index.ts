import * as Layer from "effect/Layer";
import { ReservationsGroupLive } from "./api/live.js";
import { ReservationsServiceLive } from "./infrastucture/service.js";

export const ReservationsModuleLive = ReservationsGroupLive.pipe(
  Layer.provide(ReservationsServiceLive),
);
