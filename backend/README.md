# Backend API (Express)

## Step 5 — Architecture

```
src/
├── index.ts              # Bootstrap (DB, Redis, server)
├── app.ts                # Express app factory
├── config/               # env, MongoDB, Redis
├── middleware/           # logger, errors, auth-ready
├── routes/               # health, extension, automation
├── controllers/
├── services/
├── queue/                # BullMQ producers
├── adapters/             # Platform-specific payloads
└── validators/           # Zod schemas
```

## Run

```powershell
# Requires MongoDB + Redis for full features (optional in dev)
pnpm dev:backend
```

Copy root `.env.example` → `.env` and adjust `MONGODB_URI`, `REDIS_URL`.

### Redis (required for Start Auto Apply / queue)

```powershell
docker run -d --name aiapply-redis -p 6379:6379 redis:7-alpine
```

Without Redis, the API still runs; extension metadata works, but automation returns 503.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health + mongo/redis status |
| POST | `/api/extension/page-metadata` | Extension page context |
| GET | `/api/extension/page-metadata` | Latest cached metadata |
| POST | `/api/automation/start` | Enqueue Playwright job |
| POST | `/api/automation/stop` | Stop session |
| GET | `/api/automation/status` | Running state |

### Start automation

```json
POST /api/automation/start
{
  "platform": "naukri",
  "filters": {
    "role": "React Developer",
    "experience": "3",
    "remote": true,
    "easyApplyOnly": false,
    "fullAuto": true
  }
}
```

## Next

Step 6 — Playwright worker consumes `automation` queue.
