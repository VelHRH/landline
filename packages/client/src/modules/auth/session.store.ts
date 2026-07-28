import { defineStore } from "pinia";
import * as auth from "./auth.service";
import type { SignUpInput } from "./auth.service";
import * as session from "./session.service";
import type { SessionUser } from "./session.service";

// Session state as plain data; all Effect stays behind the module's services.
export const useSessionStore = defineStore("session", {
  state: () => ({
    user: null as SessionUser | null,
    // false until the first `me` resolution — the router guard awaits this
    // once so a reload restores the session before any redirect decision.
    resolved: false,
  }),
  actions: {
    async resolve() {
      if (!this.resolved) {
        const result = await session.me();
        // An unreachable server is treated as logged out for guard purposes;
        // screens that need the distinction read the result themselves.
        this.user = result.ok ? result.data : null;
        this.resolved = true;
      }
      return this.user;
    },
    async signUp(input: SignUpInput) {
      const result = await auth.signUp(input);
      if (result.ok) {
        this.user = result.data;
      }
      return result;
    },
    async login(email: string, password: string) {
      const result = await auth.login(email, password);
      if (result.ok) {
        this.user = result.data;
      }
      return result;
    },
    async logout() {
      await session.logout();
      this.user = null;
    },
  },
});
