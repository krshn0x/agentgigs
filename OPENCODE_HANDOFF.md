# OpenCode handoff: Orbit Tasks

## Start here

Continue the existing project. The implementation and public hosting are already working. Read this file, `AGENTS.md`, `TASK_QUEUE.md`, `DEPLOYMENT.md`, and then `PROJECT_PLAN.md` before changing code. The plan records accepted product decisions; the queue and deployment record describe current progress.

The user requested this handoff so they can also build in OpenCode. A separate Git worktree is prepared at `/Users/krishna/orbit-tasks-opencode` on branch `opencode/work`. The original checkout is `/Users/krishna/orbit-tasks` on `main`. Both share Git history and the private `origin` repository. Work in the OpenCode checkout. Do not edit the original checkout concurrently.

First action in the new OpenCode session: read the handoff, summarize current status and the next queued task, then wait for the user's next instruction. Do not start an unsolicited redesign or deployment during handoff acknowledgement.

## Current result

- Public app: https://orbit-tasks-wcsa.onrender.com
- Private repository: https://github.com/krshn0x/orbit-tasks
- Last deployed code commit: `c6b7dcba248b6c1f911f81be9d08d2e60712340e`.
- Deployment evidence/docs commit before this handoff: `f1474e4`.
- React app, Node API, Postgres persistence, wallet workflow, evaluator, Anchor escrow source, generated client, and finite research lab are implemented.
- Render free web service and free Postgres are deployed in Singapore. Database readiness is verified. The workspace had no card on file when deployed.
- Public desktop/mobile browser checks passed against the actual HTTPS site. All four screens are available. The bundled task is explicitly a handwritten local fixture with 20 passing evaluator cases; it has no AI call or onchain funding/payment.
- No live OpenRouter response or devnet program deployment/funding/settlement has occurred. Do not describe those milestones as complete.

## Product and design decisions

A developer funds one small coding task. A worker AI submits source; a reviewer AI predicts whether every hidden test will pass; the creator commits that prediction before grading; isolated execution produces evidence; the creator reviews and signs the computed devnet payout.

The only supported task is a pure JavaScript CSV parser, `solve(input: string): string[][]`. Keep the narrow flow working. The frontend direction selected by the user is Exponent-inspired: near-black surfaces, restrained warm gold, refined typography, fine dividers, and legible metrics/tables. Orbit retains its own branding and data.

The public app is inspectable by everyone. Only the configured operator wallet can authenticate and advance live tasks. The creator confirms all real wallet signing. All service tiers and model routing must stay free. Use Solana devnet; never switch to mainnet or configure a hosted wallet signer.

## Architecture map

| Area | Files |
| --- | --- |
| UI and style | `web/App.tsx`, `web/Lab.tsx`, `web/style.css` |
| Browser wallet signing/simulation/recovery | `web/wallet.ts` |
| HTTP API and origin checks | `src/server.mjs`, `src/auth.mjs`, `src/config.mjs` |
| Task stages and model calls | `src/service.mjs`, `src/model.mjs` |
| Postgres schema and persistence | `src/store.mjs`, `src/schema.sql` |
| Chain verification | `src/chain.mjs` |
| Isolated grader | `src/evaluator.mjs`, `src/evaluator-worker.mjs` |
| Shared payout and finite simulation | `shared/payout.mjs`, `shared/lab.mjs` |
| Escrow program | `programs/task_escrow/src/lib.rs` |
| Generated client and IDL | `clients/task-escrow/src/generated/`, `idl/task_escrow.json` |
| Hosting and readiness | `render.yaml`, `scripts/preflight.mjs` |

Stack: Node 24.22.1, React 19, TypeScript/Vite, native Node HTTP, Postgres/pg, Zod, QuickJS WASM, Solana Kit 8, Wallet Standard, Anchor 1.1.2. Toolchain versions were deliberately pinned; avoid unrelated upgrades.

## Commands

Dependencies and a frontend build are prepared in the OpenCode worktree during handoff. Its ignored local `.env` is initialized from the empty example, using `PORT=3001` and `APP_ORIGIN=http://localhost:3001` to avoid the original preview on port 3000. No service credentials or signing keys are copied.

```sh
npm start
# Open http://localhost:3001

npm run build
npm run preflight
```

Preflight is read-only. It intentionally exits nonzero until live settings are configured. Hosted Postgres is already bound internally on Render; local database configuration is separate.

Existing checks, when needed for a change:

```sh
npm test
npm run test:ui
PLAYWRIGHT_BASE_URL=https://orbit-tasks-wcsa.onrender.com npm run test:ui -- --grep 'public overview|mobile pages'
```

The local browser suite defaults to port 3000 and can reuse the original preview. For the OpenCode preview on port 3001, set `PLAYWRIGHT_BASE_URL=http://localhost:3001`. Controlled wallet/API/RPC tests are fixtures; never call them live transaction evidence. See `VERIFICATION.md` for program, Postgres, model, grader, and Surfpool checks already completed.

## Next queued tasks

1. Obtain three distinct **public** Solana addresses: operator/creator, worker recipient, reviewer recipient. They have been requested but not supplied.
2. Have the user enter `OPENROUTER_API_KEY` privately in Render's environment settings. Both model IDs remain pinned to `qwen/qwen3-coder:free`, with no paid fallback. Do not request the key in chat or print environment values.
3. Verify the intended compiled program and creator address, obtain devnet test SOL, prepare a concrete deployment review with estimated fees, then request the required signing approval. The source program address `E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i` is a build address, not deployment evidence.
4. Set the actual deployed `PROGRAM_ID` and public wallet settings. Both payout wallets must be ordinary system accounts with the current rent-exempt balance. Confirm readiness.
5. Run one genuine task: fund → worker/reviewer → commit → evaluate → settle. Simulate and show the exact recipients, amounts, fee payer, cluster, fees, and rent before each user-approved signature. Reconcile uncertain signatures before building another transaction.
6. Collect real task/transaction links, payout evidence, and a demo video. The public app checks are complete; live-task evidence is pending.

Render environment page: https://dashboard.render.com/web/srv-dbo3h9rrjlhs73aaqkh0/env

Automatic application deployment is off. Pushes do not update the public app automatically. Review the intended commit before a manual deploy. Keep the Blueprint plans free; export public records before the free database expires.

## Boundaries to preserve

- Never copy data, secrets, or history from `/Users/krishna/solana-platform`; it is a predecessor, not this project.
- Keep `.env`, `target/`, `keys/`, runtime data, generated build keypairs, and auth/private grader data out of Git and handoff messages. The handoff contains project context only.
- Do not weaken origin/auth/idempotency checks, single-run locks, daily limits, immutable artifacts, or wallet review to make a demo pass.
- The creator attests the outcome. Onchain commitments/payouts do not prove code correctness or honesty.
- Separate calls to one model are separate roles, not independent operators.
- Practical Brier scoring and the paper-inspired finite research lab are distinct. The lab enumerates 42 configurations; B=2, λ=1 yields positive deviation gain 0.056, a negative incentive result. Do not claim a theorem, general AI alignment, audited safety, or verified novelty.
- Use the local Solana skill and references specified in `AGENTS.md` when working on chain, wallet, or program code. Do not sign/send without the required transaction review and user approval.

## Sharing changes back

Commit changes on `opencode/work` and report the commit IDs. Bring reviewed changes into `main` with a deliberate merge or cherry-pick after checking both worktrees' status. Avoid force-pushing or resetting either worktree. Update the task queue and deployment record when milestones actually change.
