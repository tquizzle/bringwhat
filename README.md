# BringWhat 🥘

**BringWhat** is a simple, mobile-first web application designed to coordinate potlucks and parties. It allows hosts to create events and share a link via iMessage (or any platform), enabling guests to sign up for items without creating an account.

![BringWhat](https://github.com/tquizzle/bringwhat/blob/main/public/screenshot.png)

## 🚀 Features

*   **Zero Friction**: No login or account creation required for guests.
*   **Mobile First**: Designed to feel native on mobile browsers.
*   **AI Powered**: Uses Google Gemini to suggest missing party items based on the event description and current list.
*   **Self-Hostable**: Simple Docker setup with SQLite backend.
*   **Persistent**: Data is saved to a local SQLite database file.

## 🛠 Architecture

The application follows a **Monolithic** architecture optimized for portability and ease of self-hosting.

### Frontend
*   **Framework**: React 18 with TypeScript.
*   **Build Tool**: Vite for fast bundling.
*   **Styling**: Tailwind CSS for utility-first, responsive design.
*   **State**: Local React state management (Context not required for this complexity).

### Backend
*   **Runtime**: Node.js 20.
*   **Server**: Express.js.
*   **Database**: SQLite (default), MySQL, or PostgreSQL.
    *   *Flexible*: Choose the database that fits your infrastructure. SQLite for simple files, MySQL/Postgres for robust production setups.
*   **API**: RESTful endpoints for creating events and items.

### Docker Strategy
*   **Single-Stage Build**: The Dockerfile uses a single-stage process (`FROM node:20`) to ensure build tools are available and environment consistency.
*   **Volume Mapping**: The container expects a volume mounted at `/app/data` to persist the SQLite database file (`bringwhat.db`).

## 🐳 Running with Docker

### Option A: Pre-built Image (Docker Hub)
The easiest way to run BringWhat is using the official image: `tquinnelly/bringwhat:latest`.

**Run with SQLite (Quick Start)**:
```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name bringwhat \
  tquinnelly/bringwhat:latest
```

### Option B: Docker Compose (Recommended)
Clone the repo and use one of the provided compose files.

**SQLite (Default)**:
```bash
docker compose up -d
```

**MySQL**:
```bash
docker compose -f docker-compose.mysql.yml up -d
```

**PostgreSQL**:
```bash
docker compose -f docker-compose.postgres.yml up -d
```

3.  **Access the app**:
    Open your browser to `http://localhost:3000`.

### AI Configuration (Optional)
This app supports **Google Gemini** (default) or **OpenAI-compatible** providers (like Ollama, LocalAI).

*   `API_KEY`: Your API Key (Gemini or OpenAI).
*   `AI_PROVIDER`: `gemini` (default) or `openai`.
*   `AI_BASE_URL`: Base URL for OpenAI compatible APIs.
    *   *Example for Ollama*: `http://localhost:11434/v1`
*   `AI_MODEL`: Specific model to use (e.g., `gpt-4o`, `llama3`).

### Configuration (Environment Variables)

You can set these in your `docker-compose.yml` or a `.env` file:

*   `API_KEY`: (Optional) Your Google Gemini/OpenAI API Key. Required if you want the "Party Assistant" AI suggestions to work.
*   `PORT`: Port to listen on (Internal container port, default 3000).

### Database Options
*   `DB_TYPE`: `sqlite`, `mysql`, or `postgres`.
*   `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME`: Required if using MySQL or Postgres.
*   `DATABASE_URL`: Connection string alternative for Postgres/MySQL.

## 🔄 Updating & Rebuilding

If you make changes to the code, you need to rebuild the Docker image to see them. Run:

```bash
docker-compose up --build -d
```

This will:
1.  Stop the current container.
2.  Rebuild the image with your new code.
3.  Start the new container (keeping your database intact).

## 💻 Local Development

If you want to modify the code:

1.  **Install Dependencies**:
    ```bash
    pnpm install
    # or
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    *   This starts Vite for the frontend.
    *   *Note*: The frontend proxy in `vite.config.ts` points to `localhost:3000`. You need to run the backend separately for API calls to work.

3.  **Start Backend (in a separate terminal)**:
    ```bash
    npm run start
    ```

## 📂 Project Structure

```
├── components/                 # Reusable UI components (Buttons, Inputs, Modals)
├── services/                   # API integration (Storage, Gemini AI)
├── public/                     # Static assets (Favicons, Logos)
├── data/                       # SQLite database storage
├── types.ts                    # TypeScript interfaces
├── App.tsx                     # Main application logic & Routing
├── index.tsx                   # Entry point
├── index.css                   # Global styles
├── server.js                   # Node.js + Express + Backend Logic
├── Dockerfile                  # Production container definition
├── docker-compose.yml          # SQLite orchestration config (Default)
├── docker-compose.mysql.yml    # MySQL orchestration config
├── docker-compose.postgres.yml # PostgreSQL orchestration config
├── vite.config.ts              # Vite configuration
└── tailwind.config.js          # Tailwind configuration
```

## 🔒 Data Persistence

### SQLite
Data is stored in the `./data/bringwhat.db` file on your host machine (mapped to `/app/data` in the container).
*   **Backup**: Simply copy/snapshot this file.
*   **Restore**: Replace this file (while the container is stopped).

### MySQL / PostgreSQL
Data is stored in a Docker **named volume** (`mysql_data` or `postgres_data`) managed by Docker.
*   **Persistence**: Data survives container restarts and removals.
*   **Backup**: Use standard `mysqldump` or `pg_dump` tools against the running database container.