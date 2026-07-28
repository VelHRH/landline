import { HttpApi } from "@effect/platform";
import { ChatsGroup } from "./chat/http.js";
import { CitiesGroup } from "./city/http.js";
import { EventsGroup } from "./event/http.js";
import { RoomsGroup } from "./room/http.js";
import { UsersGroup } from "./user/http.js";

export class Api extends HttpApi.make("Api")
  .add(RoomsGroup)
  .add(UsersGroup)
  .add(ChatsGroup)
  .add(CitiesGroup)
  .add(EventsGroup)
  .prefix("/api")
{}
