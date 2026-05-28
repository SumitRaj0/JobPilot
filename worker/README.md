# Playwright Worker (Step 6)

## Architecture

```
BullMQ (automation queue)
    → automation.worker.ts
    → runAutomation.ts
    → BrowserManager (persistent sessions)
    → Platform adapter (naukri | linkedin | indeed)
```

## Setup

```powershell
pnpm --filter @aiapply/shared build
pnpm --filter @aiapply/worker exec playwright install chromium
```

## Run (requires Redis)

```powershell
# Terminal 1 — Redis (Docker Desktop must be running)
docker run -d --name aiapply-redis -p 6379:6379 redis:7-alpine

# Terminal 2 — API (use real queue, not only mock)
pnpm dev:backend

# Terminal 3 — Worker
pnpm dev:worker
```

Set backend `DEV_MOCK_QUEUE=false` in `.env` when testing full queue → worker flow.

## Features

- **BrowserManager** — Chromium, per-user `storageState` under `sessions/`
- **Adapters** — Naukri / LinkedIn / Indeed (full search + apply when **Full Auto** is on)
- **Question resolver** — local + fuzzy + Gemini + CLI; see `docs/QUESTION_RESOLVER.md`
- **retry** / **humanDelay** / **screenshots** on failure

## Platform adapters (Naukri, LinkedIn, Indeed)

Each platform has `session`, `filters`, `scraper`, `apply`, and questionnaire config:

- `adapters/naukri/` — Naukri Easy Apply + chatbot questions
- `adapters/linkedin/` — LinkedIn Easy Apply multi-step modal
- `adapters/indeed/` — Indeed Apply / IAS screening questions
- **Login** — uses saved `storageState`; waits for manual login if needed
- **Filters** — role URL, remote, experience, date posted, easy apply
- **Scrape** — job cards with easy apply / external detection
- **Apply** — when `fullAuto` is true (set resume path, max apps per run)

```env
PLAYWRIGHT_HEADLESS=false   # first run: log in to Naukri manually
NAUKRI_RESUME_PATH=./assets/Sumit-Raj-Resume.pdf
MAX_APPLICATIONS_PER_RUN=5
```

## Next

Step 8 — BullMQ worker hardening + progress events.
