import { HttpClient, HttpClientRequest, HttpServer } from "@effect/platform";
import { expect, layer } from "@effect/vitest";
import { CredentialsPayload } from "@landline/domain/user/credentials";
import { Gender, Role } from "@landline/domain/user/enums";
import { Effect, Redacted } from "effect";
import { makeApiClient, seedCity, signUpPayload, TestServerLive } from "./harness.js";

const password = Redacted.make("correct-horse-battery");

const credentials = (email: string, raw?: string) =>
  new CredentialsPayload({
    email,
    password: raw === undefined ? password : Redacted.make(raw),
  });

layer(TestServerLive, { excludeTestServices: true })("auth", (it) => {
  it.effect("signup → me → logout → login covers the whole session lifecycle", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const email = "lifecycle@example.com";

      const signedUp = yield* client.users.signUp({
        payload: signUpPayload(email, cityId),
        headers: {},
      });
      expect(signedUp.user.email).toBe(email);
      // Web clients (no x-client header) get the session via cookie only.
      expect(signedUp.token).toBeUndefined();

      const me = yield* client.users.me();
      expect(me.id).toBe(signedUp.user.id);
      expect(me.email).toBe(email);

      yield* client.users.logout();

      const afterLogout = yield* client.users.me().pipe(Effect.flip);
      expect(afterLogout._tag).toBe("UnauthorizedError");

      const loggedIn = yield* client.users.login({
        payload: credentials(email),
        headers: {},
      });
      expect(loggedIn.user.id).toBe(signedUp.user.id);

      const meAgain = yield* client.users.me();
      expect(meAgain.id).toBe(signedUp.user.id);
    }));

  it.effect("signup persists the profile, readable through /me", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const email = "profile@example.com";

      yield* client.users.signUp({
        payload: signUpPayload(email, cityId, { interestedIn: [Gender.MALE, Gender.NONBINARY] }),
        headers: {},
      });

      const me = yield* client.users.me();
      expect(me.role).toBe(Role.USER);
      expect(me.gender).toBe(Gender.FEMALE);
      expect(me.interestedIn).toEqual([Gender.MALE, Gender.NONBINARY]);
      expect(me.cityId).toBe(cityId);
      expect(me.city).toEqual({ name: "Testville", country: "Testland" });
      expect(me.dateOfBirth).toBe("1995-06-15");
    }));

  it.effect("signup with an empty interestedIn is rejected", () =>
    Effect.gen(function*() {
      const cityId = yield* seedCity;
      const baseUrl = yield* HttpServer.addressFormattedWith(Effect.succeed);
      const http = yield* HttpClient.HttpClient;

      const response = yield* http.execute(
        HttpClientRequest.post(`${baseUrl}/api/user/signup`).pipe(
          HttpClientRequest.bodyUnsafeJson({
            email: "empty-interest@example.com",
            password: "correct-horse-battery",
            dateOfBirth: "1995-06-15",
            gender: Gender.FEMALE,
            interestedIn: [],
            cityId,
          }),
        ),
      );

      expect(response.status).toBe(400);
    }));

  it.effect("signup with an already used email fails with EmailAlreadyInUseError", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const email = "taken@example.com";

      yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });

      const rejection = yield* client.users
        .signUp({ payload: signUpPayload(email, cityId), headers: {} })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("EmailAlreadyInUseError");
      if (rejection._tag === "EmailAlreadyInUseError") {
        expect(rejection.email).toBe(email);
      }
    }));

  it.effect("login with a wrong password fails with InvalidCredentialsError", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;
      const cityId = yield* seedCity;
      const email = "wrong-password@example.com";

      yield* client.users.signUp({ payload: signUpPayload(email, cityId), headers: {} });

      const rejection = yield* client.users
        .login({ payload: credentials(email, "not-the-password"), headers: {} })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("InvalidCredentialsError");
    }));

  it.effect("login with an unknown email fails with InvalidCredentialsError", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;

      const rejection = yield* client.users
        .login({ payload: credentials("nobody@example.com"), headers: {} })
        .pipe(Effect.flip);

      expect(rejection._tag).toBe("InvalidCredentialsError");
    }));

  it.effect("guarded endpoint without a session fails with UnauthorizedError", () =>
    Effect.gen(function*() {
      const client = yield* makeApiClient;

      const rejection = yield* client.users.me().pipe(Effect.flip);

      expect(rejection._tag).toBe("UnauthorizedError");
    }));
});
