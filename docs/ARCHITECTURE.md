# Architecture

## Overview

AI Job Apply Agent is a **pnpm monorepo** with clear boundaries between user-facing UI, API orchestration, browser automation, and shared contracts.

```
Extension (Plasmo)  →  Backend API (Express)  →  Queue (BullMQ)
                              ↓                        ↓
                         MongoDB              Worker (Playwright)
                              ↓                        ↓
                         Dashboard (Next.js)    Platform Adapters
                              ↓
                         Excel Reports
```

## Packages

| Package | Role |
|---------|------|
| `extension` | Injects floating panel on job sites; sends filters & metadata to API |
| `backend` | REST API, auth-ready middleware, queue producers, policy/AI services |
| `worker` | BullMQ consumers; Playwright adapters (Naukri, LinkedIn, Indeed) |
| `dashboard` | Next.js UI for applications, stats, reports |
| `shared` | Types, constants, platform hosts — single source of truth |

## Adapter pattern (platforms)

Each job site gets a **Playwright adapter** in `worker/src/adapters/<platform>/`:

- Implements a common interface (login, search, filter, scrape, apply)
- Owns selectors and site-specific quirks
- Uses shared `BrowserManager`, retry, screenshot utilities

Backend may expose **API adapters** for extension ↔ server contracts; automation logic stays in the worker.

## Data flow

1. User sets filters in extension → `POST /automation/start`
2. Backend enqueues jobs → BullMQ + Redis
3. Worker picks job → adapter runs Playwright flow
4. Optional: AI match score + policy engine → apply or skip
5. Results persisted → MongoDB; dashboard & Excel read from DB/API

## Build order (recommended)

1. Extension foundation + floating panel + content script
2. Backend API skeleton
3. Playwright foundation + Naukri adapter (highest effort)
4. Queue + MongoDB models
5. Policy engine + AI match
6. Dashboard + Excel reporting
7. Final orchestration

## Infrastructure (local dev)

- **MongoDB** — applications, users, filters, logs
- **Redis** — BullMQ
- **Playwright** — install browsers in worker package

See [WORKFLOW.md](./WORKFLOW.md) for Cursor step-by-step prompts.
