# Orbit Tasks

A focused coding-task demo: fund a CSV repair task, inspect an AI worker’s source and an AI reviewer’s prediction, freeze that review on Solana devnet, grade the frozen source in QuickJS, then confirm program-enforced payouts in the creator’s browser wallet.

**Current status:** deployed at https://orbit-tasks-wcsa.onrender.com with a connected Postgres database. Public fixture and research pages pass the hosted desktop/mobile checks. Live OpenRouter calls and devnet deployment/funding/settlement remain pending. The bundled example is explicitly a handwritten local fixture. See [deployment evidence](DEPLOYMENT.md).

## Run locally

To continue in OpenCode, read [the handoff](OPENCODE_HANDOFF.md). A separate local worktree at `/Users/krishna/orbit-tasks-opencode` uses branch `opencode/work` and preview port 3001.

Use Node 24 LTS (pinned in `.node-version`). Local verification also passed on Node 26.9.0.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm start
```

Open <http://localhost:3000>. Without environment variables, the public dashboard, labeled fixture, and deterministic research lab work; live writes are unavailable. There is no in-memory fallback pretending to persist live artifacts.

Copy `.env.example` to `.env` in your editor and configure it privately. Do not paste API keys, database passwords, private keys, or seed phrases into chat. The backend reads `.env`; only variables beginning with `VITE_` can enter the browser build. Do not put any secret in a `VITE_` variable.

For Vite hot reload, set `APP_ORIGIN=http://localhost:5173` for the API process, run `npm run dev`, and run `npm run web:dev` separately. Production serves built assets and API from one origin.

## External setup still required

Use [the task queue](TASK_QUEUE.md) for current progress and [the launch checklist](LAUNCH_CHECKLIST.md) for deployment and the real-demo sequence. An ignored local `.env` template is prepared. Run `npm run preflight` after configuring it to check readiness without signing transactions or running inference; it reports missing setting names and sanitized status codes. See [the submission outline](SUBMISSION_OUTLINE.md) for the evidence still to collect.

1. **Public addresses:** three distinct operator/creator, worker payout, and reviewer payout addresses. The operator is the only wallet allowed to sign in and start AI runs. Payout recipients are fixed at funding. Both recipients must already be plain system wallets with at least the zero-data-account rent-exempt balance (typically about 0.000891 devnet SOL). Keep that balance until settlement; emptying a recipient can make a small payout fail rent checks. Funding simulation and backend readiness validate this prerequisite.
2. **OpenRouter:** configure `OPENROUTER_API_KEY` privately. Both roles pinned to `cohere/north-mini-code:free` (verified free on 2026-11-08; `qwen/qwen3-coder:free` left the free catalog). Readiness authenticates the key, checks any reported free daily quota, and requires zero prompt/completion pricing in the current model catalog. Calls prohibit paid routing and provider fallback. Free quota availability remains provider-controlled.
3. **Devnet program:** review the compiled source and deploy with your own wallet approval. The current source program address is `E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i`; this is a build address, not a claimed deployment. Set `PROGRAM_ID` to the address of this deployed build. A different program ID requires updating the source and Anchor config, rebuilding, and regenerating the client. No signing key belongs in Render or this repository. Build output under `target/` is ignored and must never be uploaded as a source archive.
4. **Creator funding:** obtain devnet test SOL for reward, account rent, and fees. Default reward is 0.01 SOL; program maximum is 0.1 SOL. Native devnet SOL has no real value. Deployment fees also require test SOL; their amount must be reviewed before deployment signing.
5. **Render environment:** hosting and database setup are complete. Add the remaining private model key and public wallet/program settings in the service's environment page. The workspace had no card on file at deployment, and both Blueprint plans are free. Keep chargeable overages and paid upgrades disabled. HTTPS sessions use Secure/HttpOnly/SameSite=Strict cookies.

`render.yaml` defines the deployed Node service and database; [DEPLOYMENT.md](DEPLOYMENT.md) records the observed result. Schema migration runs at startup. A free Render service can sleep and its local files are ephemeral; all live records are in Postgres. Free Postgres expires after 30 days: export public artifacts before expiry. See [Render’s free service limits](https://render.com/docs/free) and [Blueprint fields](https://render.com/docs/blueprint-spec).

On Render, an unset or empty `APP_ORIGIN` uses Render's assigned `RENDER_EXTERNAL_URL` automatically. Set an explicit `APP_ORIGIN` for a custom domain. Missing model/wallet settings leave the public fixture and lab available while live controls remain unavailable.

## Program and client

Pinned toolchain: Anchor 1.1.2 / Solana CLI 3.1.10. The Rust lockfile is committed. The generated Kit client and Anchor IDL are committed, so the hosted build does not need Rust, Anchor, or a program keypair.

```sh
NO_DNA=1 anchor build
npm run client:generate
NO_DNA=1 cargo test --locked -p task-escrow
```

`create_task` funds a PDA derived from `task`, creator, and a random u64 nonce. Terms include fixed recipients, specification/suite hashes, budget, expiry, and policy version. `record_review` accepts a single creator-signed solution hash and probability in basis points. `settle_task` accepts the creator’s binary outcome attestation and report hash, then computes payments atomically. `cancel_task` refunds before commitment; `refund_expired` refunds once after expiry. These instructions preserve rent; there is no account-close instruction in v1.

For budget B, reviewer reserve R = floor(B/5), worker reserve W = B − R. Worker receives W only for all-pass. Reviewer receives floor(R × [1 − (p − y)²]); unused budget refunds to the creator. Rust uses wide integer intermediates. JS previews use BigInt and match compiled-program tests.

The browser uses Kit 8.6, Wallet Standard, `@solana/kit-plugin-wallet`, and `@solana/react`. It prefers transaction v1 when advertised by the wallet and otherwise uses v0. Each transaction is simulated before its review dialog. The dialog shows recipients, amounts, creator/fee payer, fees, rent, cluster, and outcome attestation. Only the user confirms signing in the wallet. Uncertain signatures persist in browser storage and must be reconciled against signature status and PDA state before rebuilding.

**Trust boundary:** the creator attests the outcome. The program enforces arithmetic, fixed recipients, and transitions; it does not execute JavaScript or prove honesty. RPC consistency, the hosted evaluator, and the deployed program/upgrade authority remain part of the trust model. This prototype has not received a security audit.

## API and agent execution

- Public: `GET /api/tasks`, `/api/tasks/:id`, `/api/fixture`, `/api/lab`, `/api/config`, `/api/readiness`, `/health`.
- Wallet auth: `POST /api/auth/challenge`, `/verify`, `/logout`; `GET /api/session`.
- Operator: `POST /api/tasks`, `/api/tasks/:id/reconcile`, `/run`, `/evaluate`.
- Settlement preview: `GET /api/tasks/:id/settlement`.

Every mutation requires JSON, the exact configured Origin, and a 16–100 character `Idempotency-Key`. Login challenges expire after five minutes; valid signatures create two-hour sessions. A fresh key cannot reuse a consumed challenge. An exact successful verification retry can recover its cookie without storing the raw session token. Database transactions serialize duplicate requests. Public task serialization removes the hidden seed and expected outputs.

One globally locked AI run executes at a time, with six attempts per UTC day (explicit retries count). Each role uses a separate model call/context with a 90-second overall deadline, one malformed-output repair at most, and no automatic quota/network retry. Actual returned model IDs and provider metadata are saved. Worker source and successful review are frozen; a reviewer failure can retry without replacing the worker source. On restart, interrupted stages require explicit retry. Catalog presence does not guarantee free provider quota.

The model receives only the specification/public examples; the reviewer additionally receives the frozen source. The suite seed and expectations never enter prompts. OpenRouter and its provider receive the task prompt/source. The browser sends public wallet/transaction data to the configured devnet RPC. The backend never has a wallet signing key.

## Evaluator

Only `solve(input: string): string[][]` for valid CSV is supported. Twenty task-specific fixtures are generated before funding, and their hash is committed. Empty cells, quotes, quoted delimiters, doubled quotes, LF/CRLF, and quoted newlines are covered. A trailing row separator does not add a row; empty input returns `[[""]]`.

Candidate source executes in a QuickJS WASM runtime in a separate Node worker. Each case gets a fresh context/runtime, 16 MB heap, 256 KB stack, and a 100 ms interrupt budget. The parent terminates the worker after four seconds. Inputs, source, and outputs are bounded; no modules, host callbacks, filesystem, process, or network bindings are installed. Serialization is captured before source execution; output comparison happens in the parent. Runtime initialization failures are infrastructure errors. Candidate exceptions and resource exhaustion fail tests. This is a narrow language-runtime sandbox, not arbitrary repository/container execution.

## Separate research lab

The live payout rule is ordinary Brier scoring. The lab is a deterministic finite adaptation of the peer-discipline idea in [Bergemann, Koh & Morris, Section 5](https://arxiv.org/html/2609.01595v1#S5). That paper’s unrestricted/costless reward setting does not establish results for this capped, costly-payment adaptation. [AI Sandbagging](https://arxiv.org/abs/2406.07358) is experimental background, not validation of these payments.

Two agents, binary private types and state, correlated types P(00)=P(11)=0.4, and P(01)=P(10)=0.1. Agents observe the uniform state θ. Intrinsic utility is −(a−θ−t)² and desired action a=θ. Compliance pays clamp(λS−u_report,0,B/2); noncompliance pays zero. The browser exhaustively enumerates reports/actions against a truthful compliant peer for all 6 budgets × 5 multipliers, with no-payment and fixed-payment baselines (42 result rows total).

Outputs include maximum profitable deviation gain, minimum truthful-report action incentive, realized expected payment, intrinsic welfare at truthful compliance, and a coordinated full-information upper-bound stress test. Welfare is not an equilibrium prediction or designer value. Maximum budget is separate from realized spend. JSON exports include all assumptions, parameters, and per-type/state results. Some configurations fail to induce truthful compliance. No novelty, general alignment, independence, or achievable coordinated-equilibrium claim is made.

## Verification

```sh
npm run build
npm test
npm run test:ui
```

The Node suite includes compiled-program LiteSVM tests, real ephemeral Postgres tests, QuickJS adversarial code, provider fixtures, chain-response validation, integer payouts, and lab baselines. Postgres tests create a disposable loopback cluster on 15439 and HTTP on 15440; they stop it afterward. This needs OS permissions for shared memory/loopback sockets. `embedded-postgres` is a dev dependency only; its native distribution is large. Install scripts are skipped; the test explicitly rehydrates its required symlinks. Chrome must be installed for Playwright (or configure the browser channel). UI tests intercept all wallet/RPC calls in the controlled flow: their signatures are not devnet results.

Optional offline RPC integration:

```sh
NO_DNA=1 surfpool start --offline --no-deploy --airdrop-amount 0 --ci --port 18899 --ws-port 18900
node scripts/test-surfpool.mjs
```

This injects the compiled binary into an offline local validator and signs only disposable local test transactions. Never point it at devnet/mainnet. Local screenshots are in `artifacts/`; regenerate the labeled local example with `node scripts/create-fixture.mjs`. Export public task history with `node --env-file-if-exists=.env scripts/export-public.mjs` after configuring `DATABASE_URL`; exports exclude grader expectations and auth records.

Passing tests are not an audit, and mocked AI/wallet/RPC runs are not live demonstrations.
