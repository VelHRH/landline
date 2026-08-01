# Landline

Anonymous, event-based dating — a weekly, city-scoped chat night where people
talk in short anonymous rounds and reveal photos only by mutual consent. This
file is the operating manual for working in the repo. For the product spec see
[`MVP.md`](./MVP.md); for domain vocabulary see [`CONTEXT.md`](./CONTEXT.md).

## Where things live

Four docs, four jobs — keep each to its own:

- **`CONTEXT.md`** — the glossary / ubiquitous language. What a *word* means. No implementation.
- **`MVP.md`** — the product spec. What we're *building*.
- **`docs/adr/`** — Architecture Decision Records. *Why* we chose X over Y. Indexed in [`docs/adr/README.md`](./docs/adr/README.md).
- **`AGENTS.md`** (this file) — the stack and *how* to work here. Rules and pointers, not rationale.

## Stack & direction

TypeScript throughout, running on **Effect** (v3) and **Node 22**, in a **pnpm
workspace** (`pnpm@10`, `only-allow pnpm`). Three packages:

- **`@landline/domain`** — the shared contract: the Effect `HttpApi` definition,
  Schemas with branded IDs, DTOs, tagged errors, and the WebSocket protocol.
  No node-only dependencies (`tsconfig` compiles with `"types": []`); only
  `effect` and `@effect/platform`. Single source of truth for both other packages.
- **`@landline/server`** — backend. Effect + `@effect/platform-node` +
  `@effect/sql-pg` (Postgres). NodeNext ESM, compiled by `tsc` then babel.
  Effect is used throughout.
- **`@landline/client`** — Vue 3 + Vite + Pinia + Tailwind v4. Derives its typed
  API client from `@landline/domain` (ADR-0001). Effect is **confined** to
  `*.service.ts` files and `lib/` (see Conventions).

**Direction:** a native mobile client (Swift for iOS, Kotlin for Android) is
planned. Being native, it can't derive the contract in-process like the web
client — it will consume the API through the **OpenAPI export** of the same
`HttpApi`. This is why `@landline/domain` stays a strict, node-free contract
package and why ADR-0001 deliberately keeps the OpenAPI path open. Don't
"simplify" either away.

## Commands

Run from the repo root:

- `pnpm build` — build all packages (`-r`)
- `pnpm check` — type-check all packages
- `pnpm test` — run all package tests
- `pnpm lint` — lint all packages. **Note:** the all-package form can OOM; prefer
  `pnpm --filter <pkg> lint` (e.g. `pnpm --filter @landline/server lint`). CI runs a Lint job, so lint before pushing.
- `pnpm dev` — run server + client in parallel; `pnpm dev:server` / `pnpm dev:client` individually.

## Conventions

Standing rules to apply to all new code. The *why* is in the linked ADR.

- **Feature modules.** Group code by feature, not by layer — `modules/<feature>/`
  on both client and server. A module owns its views, stores, and services.
  ([ADR-0002](./docs/adr/0002-client-feature-modules-layout.md))
- **Effect confinement (client).** On the client, Effect appears only in
  `*.service.ts` and shared `lib/` infra (`effect-runner.ts`, `api-client.ts`).
  Exactly one `ManagedRuntime`. Components and stores work with plain data and
  Promises; one-shot HTTP goes through `runApi` returning `ApiResult<A>`.
  ([ADR-0001](./docs/adr/0001-client-derives-api-client-from-shared-domain-package.md),
  [ADR-0002](./docs/adr/0002-client-feature-modules-layout.md))
- **Absolute imports — no `..`.** Parent-relative paths are banned repo-wide.
  `@/` in client code, `#` subpath imports in server/domain. Same-directory
  `./sibling` is fine. ([ADR-0003](./docs/adr/0003-absolute-imports-no-parent-relative.md))
- **Fixed value sets are string enums**, not string-literal unions
  (`enum AuthMode { Login = "login" }`). Discriminated shapes carrying different
  payloads (e.g. `ApiResult`, tagged errors) stay unions.
  ([ADR-0004](./docs/adr/0004-string-enums-for-fixed-value-sets.md))
- **File naming (TS packages).** kebab-case files; Vue SFCs are PascalCase. A
  component with companion files gets its own folder; no barrel `index.ts` on
  the client (server/domain keep their module `index.ts`). Native packages are
  out of scope. ([ADR-0005](./docs/adr/0005-file-naming-kebab-case-pascalcase-vue.md))
- **Scheduled/background work is DB-driven and idempotent.** Time-triggered work
  (e.g. composing rooms at an Event's cutoff) runs as a reconciliation worker —
  a recurring fiber that reads due state from the DB and advances it via an
  atomic status transition — not an in-memory per-item timer. Survives restarts;
  poll granularity is a detail. ([ADR-0007](./docs/adr/0007-event-reservation-model.md))

## Decisions

All architecture decisions are logged in [`docs/adr/README.md`](./docs/adr/README.md).
Add an ADR when a choice is hard to reverse, surprising without context, and the
result of a real trade-off. The Conventions above are the subset of ADRs that
produce a standing rule; the index is the complete record.

**When you add an ADR, keep these files in sync in the same change:** add its row
to the index, and — only if it produces a standing rule — add a terse linked line
to Conventions above. The full checklist is in
[`docs/adr/README.md`](./docs/adr/README.md#adding-an-adr).
