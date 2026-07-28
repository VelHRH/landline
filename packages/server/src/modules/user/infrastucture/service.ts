import { AuthResult } from "#modules/user/domain/dto/auth-result.js";
import { SessionsRepo, UsersRepo } from "#modules/user/domain/repo.js";
import { AuthService, SESSION_TTL } from "#modules/user/domain/service.js";
import type { CredentialsPayload, SignUpPayload } from "@landline/domain/user/credentials";
import { InvalidCredentialsError, UnauthorizedError } from "@landline/domain/user/errors";
import { User, type UserId } from "@landline/domain/user/schema";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { SessionsRepoLive, UsersRepoLive } from "./repository.js";

const KEY_LENGTH = 64;

// Session tokens are 256-bit random values, so a fast unsalted hash is enough
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// Stored as "<salt>:<derived key>", both hex-encoded.
const hashPassword = (password: string) =>
  Effect.async<string>((resume) => {
    const salt = randomBytes(16);
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        resume(Effect.die(error));
      } else {
        resume(
          Effect.succeed(
            `${salt.toString("hex")}:${derivedKey.toString("hex")}`,
          ),
        );
      }
    });
  });

const verifyPassword = (password: string, storedHash: string) =>
  Effect.async<boolean>((resume) => {
    const [saltHex, keyHex] = storedHash.split(":");
    if (saltHex === undefined || keyHex === undefined) {
      return resume(Effect.succeed(false));
    }
    scrypt(
      password,
      Buffer.from(saltHex, "hex"),
      KEY_LENGTH,
      (error, derivedKey) => {
        if (error) {
          resume(Effect.die(error));
        } else {
          resume(
            Effect.succeed(
              timingSafeEqual(Buffer.from(keyHex, "hex"), derivedKey),
            ),
          );
        }
      },
    );
  });

export const AuthServiceLive = Layer.effect(AuthService)(
  Effect.gen(function*() {
    const usersRepo = yield* UsersRepo;
    const sessionsRepo = yield* SessionsRepo;

    // TODO: maybe move to JWT in the future
    const startSession = (user: User) =>
      Effect.gen(function*() {
        const token = randomBytes(32).toString("base64url");
        const now = yield* DateTime.now;
        yield* sessionsRepo.create({
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: DateTime.addDuration(now, SESSION_TTL),
        });
        return new AuthResult({ token, user });
      });

    const signUp = (payload: SignUpPayload) =>
      Effect.gen(function*() {
        const passwordHash = yield* hashPassword(
          Redacted.value(payload.password),
        );
        const user = yield* usersRepo.create({
          email: payload.email,
          passwordHash: Redacted.make(passwordHash),
          dateOfBirth: payload.dateOfBirth,
          gender: payload.gender,
          interestedIn: payload.interestedIn,
          cityId: payload.cityId,
        });
        return yield* startSession(user);
      });

    const login = (payload: CredentialsPayload) =>
      Effect.gen(function*() {
        const found = yield* usersRepo.findByEmail(payload.email);
        if (Option.isNone(found)) {
          return yield* new InvalidCredentialsError();
        }
        const isValid = yield* verifyPassword(
          Redacted.value(payload.password),
          Redacted.value(found.value.passwordHash),
        );
        if (!isValid) {
          return yield* new InvalidCredentialsError();
        }
        const { passwordHash: _, ...user } = found.value;
        return yield* startSession(new User(user));
      });

    const identify = (token: Redacted.Redacted<string>) =>
      sessionsRepo.findUser(hashToken(Redacted.value(token))).pipe(
        Effect.flatMap(
          Option.match({
            onNone: () => new UnauthorizedError(),
            onSome: Effect.succeed,
          }),
        ),
      );

    const logout = (userId: UserId) => sessionsRepo.deleteAllForUser(userId);

    return {
      signUp,
      login,
      identify,
      logout,
    };
  }),
).pipe(Layer.provide([UsersRepoLive, SessionsRepoLive]));
