# AI Job Apply Agent — Progress Report

*Last updated: May 2026 (development session)*

## Executive summary

The project is a **pnpm monorepo** that connects a **Chrome extension** (filters + Start/Stop) to an **Express API** and a **Playwright worker** (BullMQ + Redis). **Steps 1–7 are largely complete** for Naukri. **Steps 8–14** (queue hardening, MongoDB, policy, AI, dashboard, Excel, orchestration) are **not started**.

Your latest Naukri run **successfully applied to 1 job** (`E Learning Developer || Storyline`). The remaining failures were a **navigation bug** (worker stayed on the job page and could not find the next list card) — **fixed** by returning to the search URL after each apply.

---

## What works today (tested path)

| Layer | Status | Notes |
|--------|--------|--------|
| Monorepo + shared types | Done | `extension`, `backend`, `worker`, `dashboard`, `shared` |
| Extension UI | Done | Floating panel, filters, storage, Plasmo content script on Naukri/LinkedIn/Indeed |
| Extension → API | Done | `POST /api/automation/start`, `stop`, page metadata sync |
| Backend API | Done | Express, Zod, BullMQ producer, Redis (or dev mock queue) |
| Worker queue | Done | Consumes `automation` queue, concurrency 1 |
| Playwright browser | Done | Session save/restore per user + platform |
| **Naukri — search** | Done | URL filters + optional UI filter clicks |
| **Naukri — scrape** | Done | In-browser DOM scrape, 3 jobs typical on strict filters |
| **Naukri — apply** | **Partial** | Job-page apply + submit works; multi-job loop fixed in code (retest) |
| LinkedIn / Indeed adapters | Stub | Search page only, no scrape/apply |
| Dashboard | Scaffold | Not wired to live runs |
| MongoDB persistence | Not done | No job/application records yet |
| AI matching | Not done | — |
| Excel reports | Not done | — |

---

## Build steps (from `docs/WORKFLOW.md`)

| Step | Topic | Status |
|------|--------|--------|
| 1 | Project structure | **Done** |
| 2 | Extension foundation | **Done** |
| 3 | Floating panel | **Done** |
| 4 | Content script + metadata | **Done** |
| 5 | Backend foundation | **Done** |
| 6 | Playwright foundation | **Done** |
| 7 | Naukri adapter | **Done** (apply loop stability just improved) |
| 8 | Queue system (progress, retries) | **Next** |
| 9 | MongoDB models | Pending |
| 10 | Policy engine | Pending |
| 11 | AI match engine | Pending |
| 12 | Dashboard | Pending |
| 13 | Excel reporting | Pending |
| 14 | Final orchestration | Pending |

---

## Naukri worker — technical milestones (this session)

1. **Session** — Skip homepage login when `storageState.json` exists; verify login on search results page.
2. **Scrape** — `page.evaluate` in-browser parsing; optional fields (salary) don’t fail whole card; Easy Apply filter fallback when Naukri UI already filtered.
3. **Apply** — Open **job listing URL** → click Apply → Submit; Playwright `getByRole` + DOM fallbacks.
4. **Dev UX** — `PLAYWRIGHT_KEEP_OPEN` + delay before closing browser; clearer log messages.
5. **Multi-job** — After each apply, **navigate back** to saved search list URL (fixes `scrollIntoViewIfNeeded` timeout on job 2+).

---

## How to run (your stack)

```powershell
# Terminal 1 — Redis (Docker/Memurai) then:
pnpm dev:backend    # DEV_MOCK_QUEUE=false, Redis connected

# Terminal 2
pnpm dev:worker     # PLAYWRIGHT_HEADLESS=false, PLAYWRIGHT_KEEP_OPEN=true

# Chrome — load extension from extension/build/chrome-mv3-dev
# Open naukri.com → set filters → Start Auto Apply
```

**Worker `.env` (important):**

- `NAUKRI_RESUME_PATH` → must point to a real PDF (e.g. `worker/assets/Sumit-Raj-Resume.pdf`)
- `PLAYWRIGHT_HEADLESS=false` — see the browser
- `PLAYWRIGHT_KEEP_OPEN=true` — window stays ~12s after run
- `MAX_APPLICATIONS_PER_RUN=5` — cap per queue job

**Extension panel (Naukri test):**

- **Role** — required (e.g. `React Developer`)
- **Remote only** — optional
- **Easy Apply only** — optional (recommended)
- **Full Auto** — **ON** to apply; **OFF** = scrape only

---

## Latest run interpretation (your log)

```
Scraped jobs { total: 3 }
Opening job page → Submit clicked → Applied (1 job)
Apply failed — scrollIntoViewIfNeeded timeout (job 2 — still on job page)
Job finished: applied: 1, failed: 2
```

**Not a loop** — one queue job, three apply attempts. **1 real apply succeeded.** Failures were from not returning to the list between jobs (now fixed).

---

## Known limitations

- Only **3 jobs** visible with your strict filters (remote + experience + 1 day + WFH + Easy Apply) — not a code bug.
- Some jobs are **company-site apply** or **login to apply** — skipped or fail.
- **Indeed/LinkedIn** — no auto-apply yet.
- **No DB** — extension/API don’t show history of applications yet (Step 9+).
- Selectors may break when Naukri changes UI — screenshots saved under `worker/screenshots/` on failures.

---

## Recommended next steps (development order)

1. **Retest Naukri** — one run with Full Auto; expect `Applied 2 of 3` or similar after list-return fix.
2. **Step 8** — Job progress in Redis/API, cancel, failure retry.
3. **Step 9** — Persist applications in MongoDB; extension status from API.
4. **Steps 10–11** — Policy + AI match before apply.
5. **Step 12** — Dashboard for runs and results.

---

## Key paths

| Path | Purpose |
|------|---------|
| `extension/build/chrome-mv3-dev` | Load unpacked extension |
| `worker/src/adapters/naukri/` | Session, filters, scrape, apply |
| `worker/sessions/naukri/dev-user/` | Saved login cookies |
| `worker/screenshots/` | Failure screenshots |
| `backend/src/routes/automation.routes.ts` | Start/stop API |
| `docs/WORKFLOW.md` | Step-by-step build order |

---

## Files touched heavily (Naukri / worker)

- `worker/src/adapters/naukri/session.ts`
- `worker/src/adapters/naukri/scraper.ts` + `scrapeInBrowser.ts`
- `worker/src/adapters/naukri/apply.ts` + `applyInBrowser.ts`
- `worker/src/adapters/naukri/NaukriAutomation.ts`
- `worker/src/automation/runAutomation.ts`
- `worker/src/config/env.ts`
