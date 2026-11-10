# Render deployment — 2026-11-08

Public app: https://orbit-tasks-wcsa.onrender.com

The Agent Gigs app and its Postgres database are deployed. Hosted readiness is fully green for database, devnet program/network, free models, and all three public wallets. The devnet escrow program is deployed. A real AI task and creator-approved escrow lifecycle remain to be demonstrated.

| Resource | Verified state |
| --- | --- |
| Web service | `orbit-tasks`, Free, Singapore |
| Deployed source | `c6b7dcba248b6c1f911f81be9d08d2e60712340e` |
| Render deployment | `dep-dbo3habrjlhs73aaqle0`, Live |
| Service ID | `srv-dbo3h9rrjlhs73aaqkh0` |
| Database | `orbit-tasks-db`, provisioned through the free Blueprint configuration; connected successfully |
| Database ID | `dpg-dbo3gurrjlhs73aapl7g-a` |
| Blueprint ID | `exs-dbo3fn8u01pc73e613cg` |
| Workspace billing | Hobby; no card on file when checked before deployment |
| Source | Private repository https://github.com/krshn0x/orbit-tasks |

## Verification

- Render reported the deployment Live on the expected code commit.
- External HTTPS GETs to `/health`, `/api/readiness`, `/api/tasks`, `/api/fixture`, and `/api/lab` each returned 200.
- Readiness reported the database available. Tasks returned an empty real list; no task was fabricated.
- The fixture returned its explicit `fixture` label and 20 local passing test results. The lab returned 42 configurations.
- Safari rendered the public homepage over HTTPS, showing database readiness and missing live settings accurately.
- Both existing public browser checks passed against the hosted URL: overview/fixture/lab JSON export, and mobile overflow/access checks across all four screens. These made no authenticated write or onchain transaction.
- Three configuration tests passed for the assigned Render origin, explicit custom-domain override, and invalid-origin rejection.

Run the hosted public checks with:

```sh
PLAYWRIGHT_BASE_URL=https://orbit-tasks-wcsa.onrender.com npm run test:ui -- --grep 'public overview|mobile pages'
```

## Recovery and restyle deploy — 2026-11-08 (15:45 UTC)

The public site stopped responding around 14:00 UTC (TLS fine, no HTTP response; platform status green). The instance recovered after a suspend→resume cycle via the Render API, and a fresh deploy then shipped the reviewed `main` work:

| Resource | Value |
| --- | --- |
| Deploy | `dep-dbo5513l550s738oen30`, Live (earlier), superseded by `dep-dbo58u1srm7s73b0cn70` (16:23 UTC) |
| Deployed commit | `b0c1657` (devnet genesis fix + Cursor-inspired UI restyle) |
| Deploy | `dep-dbo58u1srm7s73b0cn70`, Live (16:23 UTC) |
| Env | `OPENROUTER_API_KEY` set privately; worker/reviewer pinned to `cohere/north-mini-code:free` (validated live; `qwen/qwen3-coder:free` exited the free catalog) |
| Hosted readiness | **Fully available**: database, network, models (`FREE_MODEL_CATALOG_VERIFIED`), wallets — first fully green check |
| Postgres `orbit-tasks-db` | available; free-tier expiry 2026-12-08 |

## Next configuration

No additional service configuration is currently listed as pending. The next step is the live task sequence in `TASK_QUEUE.md`; each transaction must be reviewed and approved by the creator in their wallet.

The `OPENROUTER_API_KEY`, three public wallet settings, and deployed `PROGRAM_ID` are configured privately in Render and readiness checks passed. The database URL is bound internally; it does not need to be copied into chat. Keep secrets out of the repository and all `VITE_` variables.

An empty `APP_ORIGIN` uses Render's assigned HTTPS origin through `RENDER_EXTERNAL_URL`. An explicit value is needed only to override it, such as for a custom domain. See [Render's default environment variables](https://render.com/docs/environment-variables).

The service is configured with automatic application deploys off. Future source changes need a deliberate deploy of the intended commit. Blueprint configuration updates can still sync resource settings; keep both plans free. Export public task artifacts before the free database expires.

## AgentGigs identity and verified free model release

- Live release: `1083acda886fcab1fd3c6cf55332231f2c786bb4`, Render `dep-dbo81o7f3r2c73ae6c6g` (Deploy succeeded, 50.5 seconds).
- Custom SVG logo/favicon and SpaceX/Cursor-inspired interface verified on the public HTTPS page.
- Both runtime model IDs are `nvidia/nemotron-3.5-lightning:free`. An explicit hosted worker/reviewer probe succeeded and generated source passed all 20 independent diagnostic fixtures (reviewer prediction 7800 basis points). No escrow commitment or settlement was created by this probe.
- Gemma free probe returned HTTP 429 and was not selected. Normal build command restored; diagnostic inference does not run automatically.
- Post-release readiness is green for database, models, network/program, and wallets. Production builds and all three local browser checks passed.

## Product workspace refinement — 2026-11-10

- Published commit `a74ddf55fc3f7525190c80c82c2fe2bafc699161` through Render deploy `dep-dbphdkmgekts739veimg`; Render reported Deploy succeeded / Live in 46.9 seconds.
- Verified the published creation page in Safari: structured public/private test editors, step headings, reward summary, and creator wallet controls.
- Build passed. All four browser checks passed; the wallet and workspace checks also passed after final keyboard-focus refinements.
- The Render service display name is now `agentgigs`, but its existing public hostname remains `orbit-tasks-wcsa.onrender.com`. Renaming the service did not change this hostname.
