# Folder structure reference

## Root

```
package.json          # Workspace scripts
pnpm-workspace.yaml   # Package globs
tsconfig.base.json    # Shared TS options
.env.example          # Environment template
```

## extension/

```
extension/
├── package.json        # Plasmo manifest hooks
├── tsconfig.json
├── popup.tsx           # (Step 2) Extension popup
├── contents/           # (Step 4) Content scripts per site
├── components/         # (Step 3) Floating panel, UI
├── lib/                # Platform detector, messaging
└── src/                # Shared extension utilities
```

## backend/

```
backend/src/
├── index.ts            # Express bootstrap
├── config/             # env, db, redis
├── routes/             # REST routers
├── controllers/        # Request handlers
├── services/           # Business logic
├── middleware/         # auth, errors, logging
├── models/             # Mongoose schemas (Step 9)
├── queue/              # BullMQ producers (Step 8)
├── adapters/           # API-side platform helpers
├── policy/             # Policy engine (Step 10)
└── ai/                 # OpenAI match (Step 11)
```

## worker/

```
worker/src/
├── index.ts            # Worker bootstrap
├── browser/            # BrowserManager, sessions (Step 6)
├── adapters/
│   ├── base.ts         # IPlatformAdapter interface
│   ├── naukri/         # (Step 7)
│   ├── linkedin/
│   └── indeed/
├── queue/              # BullMQ consumers (Step 8)
├── utils/              # retry, delays, screenshots
└── logging/            # Structured automation logs
```

## dashboard/

```
dashboard/src/
├── app/                # Next.js App Router pages
├── components/         # Tables, charts, filters
└── lib/                # API client, hooks
```

## shared/

```
shared/src/
├── types/              # Platform, JobFilters, JobCard, etc.
└── constants/          # Hosts, queue names
```
