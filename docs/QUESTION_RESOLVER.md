# Question resolver (Naukri apply modals)

Platform-agnostic questionnaire engine used by the Playwright worker when a job application modal asks recruiter-specific questions (CTC, notice period, custom MCQs).

## Architecture

```
[Naukri Apply modal opens]
         │
         ▼
[questionnaire.ts — scrape labels + UI options]
         │
         ▼
[QuestionResolver.resolveQuestion]
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
 Local     Gemini 2.5     Terminal CLI
 cache     (free tier)    (interactive only)
    │         │              │
    └────┬────┴──────────────┘
         ▼
   [Fill input / select option]
         │
         ▼
   [Submit]  — or skip job if unresolved (headless)
```

### Resolution layers

| Order | Layer | When it runs | Persists? |
|-------|--------|----------------|-----------|
| 1a | **Local keyword match** | All `intent_mappings.keywords` appear in question text (case-insensitive) | Pre-seeded in `profile_data.json` |
| 1b | **Fuzzy local match** | `string-similarity` + partial keyword overlap ≥ `FUZZY_MATCH_THRESHOLD` (default `0.8`) | Uses same mappings |
| 2 | **Gemini** | `GEMINI_API_KEY` set and model returns `confidence > 0.85` | Yes — appends to `intent_mappings` |
| 3 | **Human CLI** | `PLAYWRIGHT_HEADLESS=false` and stdin is a TTY | Yes — appends to `intent_mappings` |

If layer 3 is unavailable (headless Docker, cron, CI), the worker **logs a warning, closes the modal, and skips that single job** without crashing the run.

## File map

| Path | Purpose |
|------|---------|
| `worker/profile_data.json` | Profile facts + learned `intent_mappings` |
| `worker/src/automation/QuestionResolver.ts` | Orchestrator |
| `worker/src/automation/utils/geminiClient.ts` | Google Generative AI client |
| `worker/src/automation/QuestionnaireUnresolvedError.ts` | Skip signal for headless |
| `worker/src/automation/questionnaire/handleQuestionnaire.ts` | Shared scrape, resolve, fill, skip |
| `worker/src/automation/fuzzyMatch.ts` | Fuzzy scoring for local layer |
| `worker/src/adapters/naukri/questionnaire.ts` | Naukri wrapper → shared handler |
| `worker/src/adapters/linkedin/questionnaire.ts` | LinkedIn Easy Apply wrapper |
| `worker/src/adapters/indeed/questionnaire.ts` | Indeed Apply wrapper |
| `worker/src/adapters/naukri/apply.ts` | Calls questionnaire before submit |

## Environment variables (`worker/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | Google AI Studio key (free tier) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model id (e.g. `gemini-flash-latest`) |
| `FUZZY_MATCH_THRESHOLD` | `0.8` | Min score (0–1) for fuzzy local match |
| `PROFILE_DATA_PATH` | `./profile_data.json` | Path relative to `worker/` package root |
| `DRY_RUN` | `false` | Log intended answers; do not fill or submit |
| `PLAYWRIGHT_HEADLESS` | `true` | `false` required for terminal CLI fallback |

## `profile_data.json` schema

```json
{
  "profile": {
    "total_experience_years": "3.5",
    "current_ctc_lpa": "8.0",
    "expected_ctc_lpa": "12.0",
    "notice_period_days": "30",
    "current_location": "Surat",
    "willing_to_relocate": "Yes",
    "skills": ["React", "Node.js"]
  },
  "intent_mappings": [
    {
      "intent": "notice_period",
      "keywords": ["notice", "period"],
      "value": "30",
      "expected_ui_options": []
    }
  ]
}
```

- **`profile`**: Passed to Gemini as candidate context.
- **`intent_mappings`**: Local matcher rules. Keywords use **AND** logic (every keyword must appear in the question).
- New Gemini/human answers are appended automatically to reduce repeat API calls.

## Gemini response schema

The model must return raw JSON only:

```json
{ "answer": "30 Days", "confidence": 0.95 }
```

Answers with `confidence <= 0.85` are rejected; the pipeline falls through to CLI or skip.

## Safe testing (dry run)

```env
DRY_RUN=true
PLAYWRIGHT_HEADLESS=false
```

```bash
cd worker && pnpm test:step7
```

Watch the browser: when a questionnaire appears, the worker logs each question and resolved answer (with `source`: `local` | `gemini` | `human`) but does **not** type into fields or click Submit.

## Debugging checklist

1. **No questions detected** — Naukri DOM changed. Inspect the modal in DevTools and extend `NaukriSelectors.questionnaire` in `worker/src/adapters/naukri/selectors.ts`.
2. **Wrong local answer** — Keyword set too broad; split intents or add more specific keywords.
3. **Gemini low confidence** — Enrich `profile` fields; add a manual `intent_mapping` for that question phrasing.
4. **Jobs skipped in headless** — Expected when local + Gemini both fail. Add mappings, enable Gemini, or run once with `PLAYWRIGHT_HEADLESS=false` to teach the cache via CLI.
5. **Worker hangs** — Usually `readline-sync` waiting for input; run headed or pre-populate `intent_mappings`.

## All platforms (full apply)

| Platform | Automation entry | Apply flow |
|----------|------------------|------------|
| Naukri | `NaukriAutomation` | Search → scrape → apply tuples → `runApplyModalSteps` |
| LinkedIn | `LinkedInAutomation` | Search → Easy Apply → `runApplyModalSteps` |
| Indeed | `IndeedAutomation` | Search → Indeed Apply → `runApplyModalSteps` |

Shared modal runner: `worker/src/automation/questionnaire/runApplyModalSteps.ts` (questions + Next/Submit + resume upload when `NAUKRI_RESUME_PATH` is set).

Platform questionnaire configs:

- `worker/src/adapters/naukri/questionnaireConfig.ts`
- `worker/src/adapters/linkedin/questionnaireConfig.ts`
- `worker/src/adapters/indeed/questionnaireConfig.ts`

## Running all 3 platforms at once

1. Set `WORKER_CONCURRENCY=3` in `worker/.env` (already required for parallel jobs).
2. Log in once per platform with `PLAYWRIGHT_HEADLESS=false` (sessions under `worker/sessions/{naukri|linkedin|indeed}/`).
3. Extension: **Start all 3 platforms**, or API: `POST /api/automation/start-all` with `{ "filters": { ... } }`.

Each platform opens its own Playwright browser context. Gemini free tier (~15 RPM) is shared across all three — heavy parallel use may hit rate limits.

## Security

- Never commit `worker/.env` or API keys.
- Rotate keys if exposed in chat or logs.
