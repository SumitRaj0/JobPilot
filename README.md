# AI Job Apply Agent

Monorepo for an AI-assisted job application agent: browser extension, Express API, Playwright workers, MongoDB, BullMQ, Next.js dashboard, and OpenAI matching.

## Structure

```
AiApply/
├── extension/     # Plasmo + React + Tailwind (Chrome extension)
├── backend/       # Express + MongoDB + queue producers + policy/AI
├── worker/        # Playwright + BullMQ consumers + platform adapters
├── dashboard/     # Next.js admin UI
├── shared/        # Shared types and constants
└── docs/          # Architecture and workflow
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) 9+
- MongoDB and Redis (local or Docker)
- OpenAI API key (for AI match step)

## Setup

```powershell
# Use the pnpm version pinned in package.json (Node 20 compatible).
# Do NOT run: npm install -g pnpm  (installs pnpm 11+, requires Node 22.13+)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# Or, without corepack:
# npm install -g pnpm@9.15.0

# Install all workspace dependencies
pnpm install
```

```bash
# Copy env and build shared (bash)
cp .env.example .env
pnpm --filter @aiapply/shared build
```

```powershell
# Windows equivalents
Copy-Item .env.example .env
pnpm --filter @aiapply/shared build
```

```bash
# Remaining setup

# Install Playwright browsers (worker)
pnpm --filter @aiapply/worker exec playwright install chromium
```

### Full automation (Redis + worker)

Mock backend queue does **not** feed the worker. For real runs:

1. Start Redis (Docker Desktop running, then `docker run -d --name aiapply-redis -p 6379:6379 redis:7-alpine`)
2. `DEV_MOCK_QUEUE=false` in `.env` (or remove it)
3. `pnpm dev:backend` → `[Redis] Connected`
4. `pnpm dev:worker` → consumes `automation` queue
5. Extension **Start Auto Apply** → Chromium opens via Playwright
```

## Load the extension in Chrome (required)

`pnpm dev:extension` **only builds** the extension. It does **not** install it in your browser.

1. Run `pnpm dev:extension` and leave the terminal open.
2. Open **Chrome** → `chrome://extensions`
3. Enable **Developer mode** (top right).
4. Click **Load unpacked**.
5. Choose folder: `D:\MyProjects\AiApply\extension\build\chrome-mv3-dev`  
   (must contain `manifest.json` at the root — **do not** pick the `static` subfolder)
6. You should see **DEV | AI Job Apply Agent** in the list (enabled).
7. Open or **refresh** (F5) a tab on `naukri.com`, `linkedin.com`, or `indeed.com`.
8. Panel appears **bottom-right** (or a small round **AI** button if minimized).

**Popup check:** click the extension icon in the toolbar → should show **Site supported: Yes** on Naukri.

## Development

```bash
# Terminal 1 — extension (Plasmo hot reload)
pnpm dev:extension

# Terminal 2 — API
pnpm dev:backend

# Terminal 3 — Playwright worker
pnpm dev:worker

# Terminal 4 — dashboard
pnpm dev:dashboard
```

Ensure MongoDB and Redis are running before starting backend/worker.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all packages |
| `pnpm build` | Build all packages |
| `pnpm dev:extension` | Extension dev server |
| `pnpm dev:backend` | API on port 3001 (default) |
| `pnpm dev:worker` | Queue consumer |
| `pnpm dev:dashboard` | Next.js on port 3000 |

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Cursor workflow (steps 1–14)](./docs/WORKFLOW.md)

## License

Private — all rights reserved.
