# BringWhat: Cloudflare Workers migration plan

Decisions (final): D1 is the only database. Postgres, MySQL, SQLite-on-disk, Express and Docker are removed outright, with no shims. The Worker serves the Vite `dist/` as static assets (SPA fallback). KV caches AI suggestions and rate-limits `/api/suggest`. Package manager is pnpm. Never upload `node_modules`.

## Workstreams (disjoint file ownership)

### A. Infra and build fix (files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `wrangler.jsonc`, `.gitignore`, `tsconfig.json`)
1. Root cause of the failing Docker build: pnpm (unpinned) exits 1 with ERR_PNPM_IGNORED_BUILDS for `esbuild` (and `better-sqlite3`). Fix permanently:
   - Add `"packageManager": "pnpm@12.4.1"` to `package.json`.
   - `pnpm-workspace.yaml` currently holds an auto-generated stub (`allowBuilds: better-sqlite3: set this to true or false`). Replace it with `allowBuilds:\n  esbuild: true`. `better-sqlite3` is being removed.
2. Remove dependencies: `express`, `better-sqlite3`, `pg`, `mysql2`, `@google/genai`, `@types/node` (only if `tsc` still passes; otherwise keep).
3. Add dependencies: `hono` (prod), `wrangler` and `@cloudflare/workers-types` (dev).
4. Scripts: keep `dev` (vite), `build` (`tsc && vite build`), `preview`. Replace `start` with `"dev:worker": "wrangler dev"`, `"deploy": "pnpm build && wrangler deploy"`, `"typecheck": "tsc --noEmit"`.
5. `wrangler.jsonc`:
   - `name: "bringwhat"`, `main: "src/worker.ts"`, `compatibility_date: "2026-10-01"`.
   - `assets: { directory: "./dist", binding: "ASSETS", not_found_handling: "single-page-application", run_worker_first: ["/api/*", "/health"] }`.
   - `d1_databases: [{ binding: "DB", database_name: "bringwhat", database_id: "REPLACE_WITH_D1_ID", migrations_dir: "migrations" }]`.
   - `kv_namespaces: [{ binding: "CACHE", id: "REPLACE_WITH_KV_ID" }]`.
   - `vars: { AI_PROVIDER: "gemini" }`. `API_KEY` is a secret (`wrangler secret put API_KEY`).
6. `.gitignore`: ensure `node_modules/`, `dist/`, `.wrangler/`, `.dev.vars`, `.env` are ignored. Verify the deploy would upload only `dist/` and `src/`.
7. `tsconfig.json`: include `src/**/*.ts`; make Worker types resolve (`@cloudflare/workers-types`) without breaking the frontend compile. If node and workers types conflict, split into `tsconfig.json` (frontend, DOM) and `tsconfig.worker.json` (src/), with root `tsc` building both via project references or a script that runs both with `--noEmit`.
8. Run `pnpm install` (updates the lockfile) then `pnpm install --frozen-lockfile` must exit 0.

### B. Worker, schema and API (files: `src/worker.ts`, `src/**`, `migrations/0001_init.sql`; deletes `server.js` AFTER the port is complete)
1. `migrations/0001_init.sql`: tables `events(id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, date TEXT, time TEXT, hostName TEXT, createdAt INTEGER)` and `items(id TEXT PRIMARY KEY, eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE, guestName TEXT, itemName TEXT, category TEXT, createdAt INTEGER)` plus indexes `idx_items_eventId`, `idx_events_createdAt`, `idx_items_createdAt`. Keep camelCase column names so the frontend is unchanged.
2. `src/worker.ts`: Hono app, `Bindings = { DB: D1Database; CACHE: KVNamespace; ASSETS: Fetcher; API_KEY?: string; AI_PROVIDER?: string; AI_BASE_URL?: string; AI_MODEL?: string }`. Port every route in `server.js` with identical request and response JSON shapes and status codes:
   - `GET /health`: `SELECT 1` on D1; `{status:'healthy', database:'d1', timestamp}` or 503 `{status:'unhealthy', error, database:'d1'}`.
   - `POST /api/events`, `GET /api/events/:id` (404 `{error:'Event not found'}`), `GET /api/events/:id/items` (ORDER BY createdAt ASC), `POST /api/items`.
   - IDs via `crypto.randomUUID()`. Timestamps `Date.now()`.
   - Add input validation on POST bodies (required `title` for events; required `eventId`, `itemName` for items; reasonable max lengths; 400 `{error}` on failure). Items must reference an existing event (404 otherwise).
   - Use `env.DB.prepare(sql).bind(...).run()/first()/all()`. No string-concatenated SQL.
   - `POST /api/suggest`: keep the prompt, the fallback suggestions, the OpenAI-compatible path (plain `fetch`) and the Gemini path. Replace the `@google/genai` SDK with a plain `fetch` to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` (key via `x-goog-api-key` header; `generationConfig.responseMimeType: "application/json"` plus `responseSchema`). KV: cache the result under `suggest:<sha256 of JSON of event title, description, hostName, item names>` with `expirationTtl: 3600`; rate-limit with key `rl:<CF-Connecting-IP>:<minute>` allowing 10 per minute, returning 429 `{error}`. Escape or truncate user text in the prompt (max 500 chars per field).
   - Anything else falls through to `c.env.ASSETS.fetch(c.req.raw)`.
   - Export `default app`.
3. Do not log secrets. Do not print `API_KEY`.
4. When all of the above is written, delete `server.js` with `git rm`.

### C. CI/CD and docs cleanup (files: `.github/workflows/*`, `Dockerfile`, `.dockerignore`, `docker-compose*.yml`, `.env.example`, `README.md`, `CHANGELOG.md`; `metadata.json` untouched)
1. `git rm` `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-compose.local.yml`, `docker-compose.mysql.yml`, `docker-compose.postgres.yml`, `.github/workflows/docker-image.yml`, `.github/workflows/sec-scan.yml`.
2. Add `.github/workflows/deploy.yml`:
   - Job `check` on pull_request and push to main: checkout, `pnpm/action-setup`, Node 20, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm build`. No secrets required, so Dependabot and Renovate PRs pass.
   - Job `deploy` runs only on push to `main` after `check`: `pnpm exec wrangler d1 migrations apply bringwhat --remote` then `pnpm exec wrangler deploy`, using `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets.
   - Pin third-party actions to major versions consistent with the repo (`actions/checkout@v6`).
3. `.env.example` becomes a `.dev.vars.example` note: rename to `.dev.vars.example` containing `API_KEY=`, `AI_PROVIDER=gemini`, `AI_BASE_URL=`, `AI_MODEL=`.
4. README: replace Docker and DB setup sections with Cloudflare setup (`wrangler d1 create bringwhat`, `wrangler kv namespace create CACHE`, paste IDs into `wrangler.jsonc`, `wrangler secret put API_KEY`, `pnpm deploy`, local dev with `wrangler dev` and `.dev.vars`). Add a CHANGELOG entry (Unreleased) noting the breaking change: Docker and Postgres/MySQL removed.

## Verification (done by the coordinator after all workstreams finish)
- `pnpm install --frozen-lockfile` exits 0.
- `pnpm typecheck` and `pnpm build` pass.
- `wrangler dev --local` with local D1: `wrangler d1 migrations apply bringwhat --local`, then curl create event, get event, add item, list items, health, suggest (no key gives fallback).
- `wrangler deploy --dry-run` reports a small file count (no `node_modules`).
- `git status` shows no secrets or `.env` files.
