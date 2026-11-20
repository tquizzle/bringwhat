# BringWhat

**BringWhat** is a simple, mobile-first web application designed to coordinate potlucks and parties. It allows hosts to create events and share a link via iMessage (or any platform), enabling guests to sign up for items without creating an account.

![BringWhat](https://github.com/tquizzle/bringwhat/blob/main/public/screenshot.png)

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Cloudflare Setup](#cloudflare-setup)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [AI Configuration](#ai-configuration)
- [API and Health Monitoring](#api-and-health-monitoring)
- [Project Structure](#project-structure)
- [Data Persistence](#data-persistence)
- [Changelog](#changelog)
- [License](#license)

> [!NOTE]
> BringWhat now runs on Cloudflare Workers with D1 and KV. Docker, Express, and the Postgres/MySQL/SQLite backends were removed. See [CHANGELOG.md](CHANGELOG.md) for the breaking changes.

## Features

*   **Zero Friction**: No login or account creation required for guests.
*   **Mobile First**: Designed to feel native on mobile browsers.
*   **AI Powered**: Uses Google Gemini or OpenAI-compatible providers (Ollama, LocalAI) to suggest missing party items based on the event description and current list.
*   **Serverless**: Runs on Cloudflare Workers with a D1 (SQLite) database.
*   **Fast**: Indexed D1 queries, KV-cached AI suggestions, and optimized frontend builds.

## Architecture

### Frontend
*   **Framework**: React 18 with TypeScript.
*   **Build Tool**: Vite. The production build is served as static assets by the Worker.
*   **Styling**: Tailwind CSS for utility-first, responsive design.
*   **State**: Local React state management.

### Backend
*   **Runtime**: Cloudflare Workers, using [Hono](https://hono.dev) for routing.
*   **Database**: Cloudflare D1 (SQLite). Migrations live in `migrations/`.
*   **Cache and rate limiting**: Cloudflare KV (`CACHE` binding). AI suggestions are cached for one hour and `/api/suggest` allows 10 requests per minute per client IP.
*   **Static assets**: The Worker serves `dist/` with SPA fallback. Requests under `/api/*` and `/health` run in the Worker first.

## Cloudflare Setup

Prerequisites: a Cloudflare account, Node.js 22, and pnpm.

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Create the D1 database** and copy the returned `database_id`:
    ```bash
    pnpm exec wrangler d1 create bringwhat
    ```

3.  **Create the KV namespace** and copy the returned `id`:
    ```bash
    pnpm exec wrangler kv namespace create CACHE
    ```

4.  **Paste the IDs** into `wrangler.jsonc`, replacing `REPLACE_WITH_D1_ID` and `REPLACE_WITH_KV_ID`.

5.  **Set the AI key as a secret** (optional; only needed for AI suggestions):
    ```bash
    pnpm exec wrangler secret put API_KEY
    ```

## Local Development

1.  **Create local secrets**: copy the example file and fill in values as needed.
    ```bash
    cp .dev.vars.example .dev.vars
    ```
    `.dev.vars` is git-ignored. Never commit it.

2.  **Apply migrations to the local D1 database**:
    ```bash
    pnpm exec wrangler d1 migrations apply bringwhat --local
    ```

3.  **Build the frontend and start the Worker** (serves the app and API together):
    ```bash
    pnpm build
    pnpm dev:worker
    ```
    Open the URL printed by Wrangler (default `http://localhost:8787`).

Other scripts:

*   `pnpm dev`: Vite dev server for the frontend only. API calls need the Worker running separately, and the proxy target in `vite.config.ts` must point at it.
*   `pnpm typecheck`: TypeScript check with no emit.
*   `pnpm build`: Typecheck and produce `dist/`.

## Deployment

Deployment is automated by `.github/workflows/deploy.yml`:

*   **Pull requests and pushes to `main`**: install with the frozen lockfile, run `pnpm typecheck` and `pnpm build`. No secrets are required.
*   **Pushes to `main`** (after the check job passes): apply D1 migrations with `wrangler d1 migrations apply bringwhat --remote`, then run `wrangler deploy`.

The workflow needs these repository secrets:

*   `CLOUDFLARE_API_TOKEN`: API token with Workers, D1, and KV edit permissions.
*   `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID.

To deploy manually from your machine:

```bash
pnpm run deploy
```

`pnpm run deploy` runs `pnpm build` and then `wrangler deploy`. The `run` prefix is needed because `deploy` is also a built-in pnpm command. Only the built `dist/` and `src/` are uploaded. Never upload `node_modules`.

## AI Configuration (Optional)

This app supports **Google Gemini** (default) or **OpenAI-compatible** providers (like Ollama, LocalAI).

*   `API_KEY`: Your Gemini or OpenAI-compatible API key. Set with `wrangler secret put API_KEY` in production, or in `.dev.vars` locally.
*   `AI_PROVIDER`: `gemini` (default) or `openai`. Set in `wrangler.jsonc` under `vars`.
*   `AI_BASE_URL`: Base URL for OpenAI-compatible APIs.
    *   *Example for Ollama*: `http://localhost:11434/v1`
*   `AI_MODEL`: Specific model to use (e.g., `gpt-4o`, `llama3`).

Without `API_KEY`, `/api/suggest` returns fallback suggestions.

## API and Health Monitoring

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Database connectivity check |
| `POST` | `/api/events` | Create an event |
| `GET` | `/api/events/:id` | Get an event |
| `GET` | `/api/events/:id/items` | List items for an event |
| `POST` | `/api/items` | Add an item to an event |
| `POST` | `/api/suggest` | AI item suggestions (cached and rate-limited) |

Health check:

```bash
curl https://<your-worker>.workers.dev/health
```

Response:
```json
{
  "status": "healthy",
  "database": "d1",
  "timestamp": "2026-10-16T12:00:00.000Z"
}
```

If D1 is unreachable, the endpoint returns HTTP 503 with `"status": "unhealthy"`. Use it with uptime monitors such as Uptime Robot.

## Project Structure

```
├── components/          # Reusable UI components (Buttons, Inputs, Modals, ErrorBoundary)
├── services/            # Frontend API integration (events, items, AI suggestions)
├── migrations/          # D1 SQL migrations
├── public/              # Static assets (favicons, logos)
├── src/worker.ts        # Hono Worker: API routes, AI proxy, static asset fallback
├── types.ts             # TypeScript interfaces
├── App.tsx              # Main application logic & routing
├── index.tsx            # Entry point with error boundary
├── index.css            # Global styles
├── wrangler.jsonc       # Worker, D1, KV, and asset configuration
├── .dev.vars.example    # Template for local secrets (copy to .dev.vars)
├── vite.config.ts       # Vite configuration
└── tailwind.config.js   # Tailwind configuration
```

## Data Persistence

*   **D1**: Events and items are stored in the `bringwhat` D1 database. Data survives deployments; schema changes ship as numbered files in `migrations/`.
*   **KV**: Holds only disposable data (AI suggestion cache and rate-limit counters).
*   **Backup**: Export from D1 with `pnpm exec wrangler d1 export bringwhat --remote --output backup.sql`.

---

## Changelog

For a detailed history of changes, improvements, and security updates, see [CHANGELOG.md](CHANGELOG.md).

---

## License

Apache License 2.0 - See [LICENSE](LICENSE) file for details.
