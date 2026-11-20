# Iris

Iris is a class-assignment prototype experienced as a text-message conversation inside a simulated phone. Its AI agent calls a mobile carrier for the user, who makes retention-offer decisions and approves the final action.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The first typed request uses Replit AI Integrations for OpenAI; its server-only configuration is provisioned by Replit. Iris stores no messages and does not use a database.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- The small OpenAI model does not accept `temperature: 0`; use strict structured output and non-reasoning extraction rather than sending an unsupported parameter.
- Waiting reduces the device balance as normal payments are made; forfeited promo credits must not be subtracted from the device payoff or represented as additional cash savings.

## Product

A single messaging conversation, not a step-by-step wizard: choose a goal, attach a fictional sample bill, confirm or edit its facts, set an offer rule, authorize the simulated call, and approve its final action.

Only the first free-text request uses live AI through a stateless backend endpoint, with a six-second keyword fallback. No database, login, saved messages, or real calls. Bill extraction, reminders, and carrier conversations remain prewritten simulations. Keep the disclosure visible throughout. Confirm the goal and current carrier before proceeding, explicitly resolve mismatched bills, and require final approval for cancellation or PIN issuance.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
