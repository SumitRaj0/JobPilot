# Extension (Plasmo)

## Step 2 — Foundation

- **Popup** (`popup.tsx`) — tab/platform status, ping content script
- **Background** (`background.ts`) — message router, automation flag, page metadata cache
- **Content script** (`contents/job-sites.tsx`) — injects on Naukri / LinkedIn / Indeed
- **Platform** (`lib/platform/detectPlatform.ts`) — hostname → platform
- **Messaging** (`lib/messaging/`) — typed `chrome.runtime` / `tabs` messages

## Step 3 — Floating panel

- **FloatingPanel** — draggable UI, filter form, Start/Stop (wired to background)
- **FilterForm** — role, experience, salary, date posted, remote, easy apply, full auto
- **Persistence** — `chrome.storage.local` for filters, position, collapsed state
- **CSS** — `aiapply-` Tailwind prefix + component classes (no host page bleed)

## Commands

```powershell
# From repo root
pnpm --filter @aiapply/shared build
pnpm dev:extension
```

Load unpacked extension from `extension/build/chrome-mv3-dev` (Plasmo dev output path).

## Step 4 — Content script

- `lib/platform/adapters/*` — per-site metadata + page type
- `lib/platform/registry.ts` — adapter registry
- `lib/content/*` — injection, URL watcher, metadata publisher, message bridge
- `background/` — API sync to `POST /api/extension/page-metadata`
- Popup **Sync from page** ↔ content ↔ background ↔ backend

```powershell
# Terminal A
pnpm dev:backend

# Terminal B
pnpm dev:extension
```

Copy `extension/.env.example` → `extension/.env` if you change API URL.

## Next

Step 5 — full Express backend architecture.
