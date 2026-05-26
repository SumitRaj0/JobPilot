# Step 7 — Naukri test checklist

Use this to confirm search → scrape → apply before moving to Step 8.

## Prerequisites

- [ ] `worker/assets/Sumit-Raj-Resume.pdf` exists
- [ ] `worker/sessions/naukri/dev-user/storageState.json` exists (log in once in Playwright if missing)
- [ ] `worker/.env`: `NAUKRI_RESUME_PATH` points to the PDF above
- [ ] Redis running (`docker start aiapply-redis` or Memurai)

## Method A — Full stack (extension, same as production)

**Terminal 1**

```powershell
pnpm dev:backend
```

Expect: `[Redis] Connected`, `listening on http://localhost:3001`

**Terminal 2**

```powershell
pnpm dev:worker
```

Expect: `Listening on queue "automation"`

**Chrome**

1. Load extension: `extension/build/chrome-mv3-dev`
2. Open https://www.naukri.com and stay logged in
3. Panel settings:
   - Role: `React Developer`
   - Experience: `2`
   - Date: Past 24 hours
   - Remote only: ON
   - Easy Apply only: ON
   - **Full Auto: ON** (for apply test) or OFF (scrape-only test)
4. Click **Start Auto Apply**
5. **Do not close** the Playwright window until the terminal says the job completed

### Pass criteria (Full Auto ON)

| Log line | Required |
|----------|----------|
| `Saved session found` | Yes |
| `Scraping job cards { visible: N, parsed: N }` | N ≥ 1 |
| `Scraped jobs { total: N }` | N ≥ 1 |
| `Opening job page` | Yes (per job) |
| `Submit clicked` or `Applied` | At least once |
| `Applied X of Y jobs` | X ≥ 1 |
| `Returning to search results` | Between jobs (after fix) |

### Pass criteria (Full Auto OFF — scrape only)

| Log line | Required |
|----------|----------|
| `Scraped jobs { total: N }` | N ≥ 1 |
| `fullAuto disabled` | Yes |
| `applied: 0` | OK |

---

## Method B — Worker-only script (no extension)

Stops confusion from extension/Indeed jobs in queue.

1. **Stop** `pnpm dev:worker` (Ctrl+C) so only one browser runs
2. Run:

```powershell
pnpm --filter @aiapply/worker test:step7
```

3. Watch Chromium; script prints `=== RESULT ===` JSON and exit code 0 = pass

Optional env overrides:

```powershell
$env:TEST_FULL_AUTO="true"
$env:TEST_EASY_APPLY="true"
pnpm --filter @aiapply/worker test:step7
```

---

## Method C — API trigger (backend + worker running)

```powershell
$body = @{
  platform = "naukri"
  filters = @{
    role = "React Developer"
    experience = "2"
    remote = $true
    datePosted = "1"
    easyApplyOnly = $true
    fullAuto = $true
    salary = ""
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Method POST -Uri "http://localhost:3001/api/automation/start" `
  -Body $body -ContentType "application/json"
```

Watch **worker** terminal for the same pass criteria as Method A.

---

## Verify on Naukri (human confirmation)

1. Log in to Naukri in your normal browser
2. **My Naukri** → **Applied jobs** (or similar)
3. Confirm the job title from the log (e.g. *E Learning Developer*) appears as applied

---

## Common failures

| Symptom | Fix |
|---------|-----|
| `Login required` | Log in once in Playwright window; rerun |
| `parsed: 0` | Loosen filters (uncheck Easy Apply / remote) |
| `No apply button` | Job may be company-site only; try more listings |
| `scrollIntoViewIfNeeded` timeout | Update worker (list-return fix); restart worker |
| `applied: 0`, Full Auto ON | Turn Full Auto ON in panel; check resume path |
| Indeed job in log | You were on Indeed tab — use **Naukri** tab |

---

## After a good run

Record in your notes:

- Date/time
- `applied` / `failed` counts
- Screenshot path if any failure under `worker/screenshots/`

Then proceed to **Step 8** (`docs/WORKFLOW.md`).
