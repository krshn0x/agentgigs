# Render deployment — 2026-11-08

Public app: https://orbit-tasks-wcsa.onrender.com

The app and its Postgres database are deployed. Public inspection, the labeled handwritten fixture, and the finite research lab are available. Live AI execution and devnet escrow transactions are still unavailable pending model credentials, public wallet addresses, and program deployment.

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
| Deploy | `dep-dbo5513l550s738oen30`, Live |
| Deployed commit | `b0c1657` (devnet genesis fix + Cursor-inspired UI restyle) |
| Env sync | `PROGRAM_ID=E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i`, operator `DsDDDEA5Q9mnJSj2HB51Pc1UCEDrmGGbCc2CdaQYJmmJ`, worker `9LUb9YsQDy5hSiAGBrpzr3bGp1c2hWXwVMRGGR7GC7Jv`, reviewer `8gkcBaMWVP4rYWEauS2N7S9mzkFq1QQRfymigpPvxfVx` (all public values) |
| Hosted readiness | database, network, wallets **available**; models pending `OPENROUTER_API_KEY` |
| Postgres `orbit-tasks-db` | available; free-tier expiry 2026-12-08 |

## Next configuration

Use the service's [Render environment settings](https://dashboard.render.com/web/srv-dbo3h9rrjlhs73aaqkh0/env) to supply `OPENROUTER_API_KEY`. The three public wallet settings and the actual deployed `PROGRAM_ID` are already configured (verified at 15:45 UTC). The database URL is already bound internally; it does not need to be copied into chat. Keep secrets out of the repository and all `VITE_` variables.

An empty `APP_ORIGIN` uses Render's assigned HTTPS origin through `RENDER_EXTERNAL_URL`. An explicit value is needed only to override it, such as for a custom domain. See [Render's default environment variables](https://render.com/docs/environment-variables).

The service is configured with automatic application deploys off. Future source changes need a deliberate deploy of the intended commit. Blueprint configuration updates can still sync resource settings; keep both plans free. Export public task artifacts before the free database expires.
