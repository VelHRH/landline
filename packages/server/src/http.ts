import { HttpLayerRouter, HttpServerResponse } from "@effect/platform";
import { Api } from "@landline/domain/api";
import { Layer } from "effect";
import { ChatModuleLive, ChatWsModuleLive } from "./modules/chat/index.js";
import { CitiesModuleLive } from "./modules/city/index.js";
import { EventsModuleLive } from "./modules/event/index.js";
import { ReservationsModuleLive } from "./modules/reservation/index.js";
import { RoomsModuleLive } from "./modules/room/index.js";
import { AuthorizationModuleLive, UsersModuleLive } from "./modules/user/index.js";

const ApiLive = HttpLayerRouter.addHttpApi(Api).pipe(
  Layer.provide([
    RoomsModuleLive,
    UsersModuleLive,
    ChatModuleLive,
    CitiesModuleLive,
    EventsModuleLive,
    ReservationsModuleLive,
  ]),
  Layer.provide(AuthorizationModuleLive),
);

const HealthRouter = HttpLayerRouter.use((router) => router.add("GET", "/health", HttpServerResponse.text("OK")));

export const AllRoutes = Layer.mergeAll(ApiLive, HealthRouter, ChatWsModuleLive).pipe(
  Layer.provide(
    HttpLayerRouter.cors({
      allowedOrigins: ["*"],
      allowedMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization", "B3", "traceparent"],
      credentials: true,
    }),
  ),
);
