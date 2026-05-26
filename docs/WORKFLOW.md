# Cursor development workflow

## Rules

- **Module-by-module** — never one giant “build everything” prompt
- Every prompt should include: **Goal, Requirements, Constraints, Folder structure, Expected output**
- Cycle: **generate → review → refactor → test → continue**
- Invest most effort in **Playwright reliability** (adapters, retries, sessions)

## Build order

1. Extension  
2. Backend API  
3. Playwright  
4. Queue  
5. MongoDB  
6. Dashboard  
7. AI layer  
8. Reports  

## Steps (reference)

| Step | Topic | Package |
|------|--------|---------|
| 1 | Project structure | root |
| 2 | Extension foundation | `extension` |
| 3 | Floating panel | `extension` |
| 4 | Content script | `extension` |
| 5 | Backend foundation | `backend` |
| 6 | Playwright foundation | `worker` |
| 7 | Naukri adapter | `worker` |
| 8 | Queue system | `backend` + `worker` |
| 9 | MongoDB models | `backend` |
| 10 | Policy engine | `backend` |
| 11 | AI match engine | `backend` |
| 12 | Dashboard | `dashboard` |
| 13 | Excel reporting | `backend` |
| 14 | Final orchestration | all |

| 1 | Project structure | done |
| 2 | Extension foundation | done |
| 3 | Floating panel | done |
| 4 | Content script | done |
| 5 | Backend foundation | done |
| 6 | Playwright foundation | done |
| 7 | Naukri adapter (search, scrape, apply) | done — retest multi-job apply after list-return fix |
| 8 | Queue system | **next** |

See **`docs/PROGRESS_REPORT.md`** for full status. Continue with **Step 8** when ready.
