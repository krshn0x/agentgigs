# Agent Gigs: complete implementation handoff

Current user override (2026-11-10): creators can now post custom coding tasks. The creation form defaults to custom title/instructions, 1–5 public examples, and 1–20 private input/expected-output tests. Implement `solve(input: string)` returning JSON. Keep the legacy CSV template. Any wallet may authenticate with a signed challenge; every task mutation requires that task's creator session. The earlier CSV-only and operator-only requirements below are superseded. Private tests stay server-side, are committed before funding, and never enter model prompts. Fixed payout recipients and the global six-runs-per-day free-model cap remain.


## User request and accepted decisions

Build a working Solana x MLH AI-track hackathon product. The user explicitly changed the original plan from extending `solana-platform` to **a new git repository and a new Codex context**. This repository was initialized on `main` for that purpose. Agent Gigs is implemented and deployed; hosted readiness and the devnet program are green. A real AI task and its creator-approved escrow lifecycle remain to be demonstrated. See `OPENCODE_HANDOFF.md`, `TASK_QUEUE.md`, and `DEPLOYMENT.md` for current status. The sections below preserve the accepted design and implementation requirements.

Product: a developer funds a small coding task; a worker AI submits a solution; a reviewer AI predicts whether it passes; isolated execution grades it; the creator confirms the program-enforced payout in their wallet.

Accepted choices:
- React frontend, public hosted app, free service tiers only.
- OpenRouter for actual worker/reviewer calls.
- Operator wallet starts live runs; everyone can inspect completed runs and use the simulation.
- Real Solana **devnet**, native test SOL. No mainnet or real assets.
- Creator wallet confirms settlement. No hosted wallet keys or automatic server signer.
- Live product plus a separate paper-inspired research lab.
- Target approximately six hours for a narrow end-to-end version. Prioritize a real escrow and a working task flow over extra features.

## Research basis and claim boundary

Main paper: Dirk Bergemann, Andrew Koh, Stephen Morris, *Mechanism Design for Alignment and Control*, September 2026 preprint. https://arxiv.org/abs/2609.01595 and https://arxiv.org/html/2609.01595v1 . Focus on Section 5, Example III, Peer discipline. That construction permits unbounded rewards which cost the designer nothing. A small funded escrow is a proposed bounded/costly-payment adaptation, not a consequence established by its theorem.

Supporting experimental background: *AI Sandbagging: Language Models Can Strategically Underperform on Evaluations*, https://arxiv.org/abs/2406.07358 . Its experiments do not validate our proposed payouts.

Do not claim that an ordinary AI-work marketplace or Brier scoring is new. No exhaustive novelty claim has been established. The live app uses a practical, known scoring rule. The separate lab explicitly tests a finite mechanism and reports failure where it fails. Onchain records enforce settlement and preserve commitments; they do not prove generated code, reported outcomes, or an agent's honesty.

## Stack

- React 19, TypeScript, Vite; CSS with a compact responsive Agent Gigs visual design. No Next.js or unnecessary agent framework.
- Node.js 24 LTS for hosting, JavaScript ESM, native HTTP API, Zod runtime validation. Local Node is newer and supports the project.
- Postgres with the `pg` client. Use a free Render Postgres database and free Render Node web service, serving the Vite build and API on one HTTPS origin. Store artifacts in Postgres, not ephemeral disk.
- OpenRouter through native fetch. Initially pinned `qwen/qwen3-coder:free`; during setup on 2026-11-08 OpenRouter reported that slug no longer free, so the pin moved to the only coding-specialized free model then listed: `cohere/north-mini-code:free`, verified with the operator key (HTTP 200, exact slug returned). Validate availability at setup. No paid fallback. Record the actual returned model ID.
- `quickjs-emscripten` WebAssembly in a Node worker thread for the pure JavaScript task; no Docker or paid external code sandbox is required.
- Rust and Anchor **1.1.2**, matching installed `anchor-cli 1.1.2` and `solana-cli 3.1.10`; installed Rust is 1.99.1. These are an existing compatible pairing. Avoid an unrelated toolchain upgrade today.
- Solana Kit 8.x, wallet/RPC plugins, `@solana/react`, Wallet Standard and Phantom-compatible browser signing. Resolve compatible React/plugin peers together and commit npm/Cargo lockfiles. Codama generates the program client from the Anchor IDL.
- Node test runner for server/mechanism logic; LiteSVM for program tests; Surfpool for integration; Playwright for UI. Surfpool is installed.
- Use the official Solana MCP when available; configure it according to the Solana skill if missing, respecting permissions. Do not block local code work on an unavailable connector when official docs suffice.

Useful primary docs:
https://solana.com/docs/frontend
https://www.anchor-lang.com/docs/updates/release-notes/1-1-2
https://github.com/justjake/quickjs-emscripten
https://openrouter.ai/docs/guides/features/structured-outputs
https://openrouter.ai/docs/api/reference/limits
https://render.com/docs/deploy-node-express-app
https://render.com/docs/free

Render free web services sleep after idle and lose local files on restart. Free Render Postgres expires after 30 days. Export demo records before expiry. Do not incur charges or enable upgrades.

## App flow and UI

Use a small organization: `web/` for React, `src/` for the hosted backend, and `programs/task_escrow/` for the Anchor program. Shared payout definitions and tests must keep JS/Rust semantics consistent.

Latest visual direction selected by the user: SpaceX and Cursor. AgentGigs uses an original angular vector mark and wordmark, horizontal navigation, near-black surfaces, warm-white typography at a larger scale, fine dividers, restrained square controls, and an original orbital workflow illustration. Maintain legible mobile task, creation, and research screens. Use the real task, payout, and experiment data. The previous Exponent direction is superseded; preserve AgentGigs' original branding.

Four screens:
1. Dashboard: current network/readiness, task history and completed demo links.
2. Create task: supported template, specification, reward, fixed worker/reviewer public payout addresses, deadline, funding preview.
3. Task detail: stage timeline, source code, reviewer explanation and probability, test results, payout preview, funding/review/settlement explorer links.
4. Research Lab: model assumptions, budget comparison charts, deviation metrics, JSON export. Runs without paid APIs.

Limit initial tasks to repairing a pure JavaScript CSV parser: `solve(input: string): string[][]`. Cover quoted commas, escaped quotes, CRLF, empty cells, ordinary rows. No arbitrary repository execution, npm installs, shell access, or user-defined test runners.

Before funding, generate 20 task-specific fixtures from a random seed; store expected outputs server-side and commit the suite/specification hashes in the task terms. Public examples are separate. Do not expose the private seed/expected outputs to either model before their submission is frozen.

After confirmed funding:
1. Worker gets task specification and public examples; returns bounded-size source code.
2. Reviewer, in a separate model context, gets the specification and submitted source but not hidden outcomes; returns an explanation and probability that every test passes.
3. Creator signs an onchain commitment containing solution hash and review probability before grading starts.
4. Evaluate exactly that immutable source against the committed suite. Publish results and an artifact hash.
5. Creator sees exact recipients, amounts and result, then signs settlement. Reviewer can earn a reward for correctly predicting failure.

Separate calls to the same model are separate roles, not statistically independent entities. There is no claim that agent operators are independently owned in this demo. Recipient wallets are configured public addresses, not keys kept by the server.

## API, auth and persistence

Use wallet-signature login: single-use five-minute challenge bound to the app origin, and two-hour Secure/HttpOnly/SameSite session. Authenticate the configured operator wallet on every write, and check request origin. Public GETs expose only public task/run fields.

Minimum API capabilities:
- Auth challenge/verify/logout.
- Create task draft; list/read public task records; reconcile verified chain state/signatures.
- Start worker/reviewer run; get persisted public run status.
- Evaluate the frozen submission only after confirming the matching onchain review commitment.
- Return settlement preview/instruction data; reconcile observed settlement/refund state.

All mutations need idempotency keys. Store challenges, sessions, task records, run stages, artifacts, model metadata and transaction references in Postgres. Chain state is authoritative for funding and final payment. Do not consider an unverified transaction signature proof of funding.

One live run at a time globally; maximum six live runs daily. Each model stage has a 90-second deadline and at most one malformed-output repair retry; no automatic paid/model fallback. Persist each stage before advancing. Interrupted requests require explicit retry; completed artifacts survive restart. A committed review is never replaced by a new model call. Provider quota/errors show a clear unavailable state. A saved demo may be displayed only as a labeled replay.

Use health/readiness endpoints for database/model configuration and program/network checks without exposing secrets. Log stage, duration, public IDs and sanitized error codes, not API keys or session tokens.

## Code sandbox

Execute candidate code only inside a QuickJS WASM runtime in a separate Node worker, never through host `eval`/`new Function`.
- No module loader, filesystem, network or host-function bindings.
- 16 MB JS heap; bounded stack; interrupt handler; hard wall-clock worker termination.
- Bound input/source/output sizes and dispose all runtime handles.
- Compare serialized candidate outputs to expected values outside the runtime.
- Candidate exceptions, allocation excess and infinite loops are test failures. Failure to initialize the evaluator is an infrastructure error, not a failing AI outcome.

## Onchain escrow

One task PDA stores creator, nonce, fixed worker/reviewer recipients, specification/suite hashes, budget, deadline, immutable review commitment, policy version and terminal status. The account can hold reward lamports while preserving its rent reserve.

Default reward: 0.01 devnet SOL; maximum 0.1. Default expiry: 30 minutes. Fees and account rent are outside reward budget. Use integer lamports and probabilities in basis points.

Instructions:
- `create_task`: fund escrow and freeze terms.
- `record_review`: creator commits solution hash and reviewer probability once.
- `settle_task`: creator attests binary test outcome and report hash; program computes all payouts atomically.
- `cancel_task`: creator refunds before review commitment.
- `refund_expired`: returns unsettled budget to the fixed creator after expiry; cannot also settle.

For funded budget B: reviewer reserve R=floor(B/5), worker reserve W=B-R. Worker receives W iff all tests pass. Reviewer receives floor(R * (1-(p-y)^2)), with y=1 for all-pass and 0 otherwise. Use basis-point integer arithmetic and wide intermediates. Remaining funds refund to creator. No amount/recipient overrides at settlement; payout total plus refund equals B. Preserve rent. Reject unauthorized signers, bad probabilities, invalid transitions, deadline violations and repeated payouts.

Creator outcome attestation is an explicit trust boundary. No hosted signing key is needed. Simulate wallet transactions before signing. Prefer v1 when wallet supports it, v0 for compatible small transactions otherwise; read with maxSupportedTransactionVersion=1. Reconcile uncertain signatures and task PDA state before rebuilding any transaction. Deployment and every real signing action follow host/skill review requirements.

## Research Lab: fixed finite specification

Build a deterministic finite adaptation, separate from the live Brier payout rule:
- Two agents, binary private types t in {0,1}, binary uniform state theta, binary actions a. Agents observe theta.
- Joint type probabilities P(00)=P(11)=0.4; P(01)=P(10)=0.1. Thus each type believes the peer matches with probability 0.8.
- Intrinsic utility u_t(a,theta)=-(a-theta-t)^2. Desired action is a=theta.
- Reports are binary types. Let beta_report be the corresponding distribution over peer types, S=2*beta_report(peer_report)-sum(beta_report^2).
- For a compliant action, raw reward is lambda*S-u_report(a,theta). For noncompliance give zero. The bounded scheme clamps each reward to [0,B/2]. This finite nonnegative replacement is our adaptation, not a theorem from the paper.
- Enumerate budgets {0.25,0.5,1,2,4,8} and multipliers {0,0.5,1,2,4}. These are normalized utility units, not SOL.
- Compare no payments, fixed compliance payments B/2 per agent, and capped peer scoring. Optionally illustrate the paper's unrestricted reference only if signed/unbounded transfers and prohibitive penalties are explicitly labeled as theoretical.
- Exhaustively evaluate report/action deviations against a truthful compliant peer. Report the maximum positive expected utility gain from deviation, truthful compliance incentives, actual expected payment, and welfare. Compare maximum budgets separately from realized spend.
- Add a coordinated-deviation stress test, clearly identified as a full-information upper-bound scenario, not a proven achievable equilibrium. Export all parameters and results.

No solver, Python service, or real model call is needed for this finite enumeration. Do not fabricate a positive outcome: budget constraints or collusion may defeat the mechanism. Keep claims limited to the specified model.

## Delivery order and acceptance

1. Validate external prerequisites: OpenRouter key/free model access, free Render account/database, devnet funding and operator/recipient public addresses. Code can proceed without secrets; provide `.env.example` placeholders, never ask for keys in chat.
2. Build/test the Anchor escrow and generate client (about 90 minutes).
3. Backend, persistence, agents and evaluator (about 75 minutes).
4. React and real wallet workflow (about 75 minutes).
5. Lab and reproducible exports (about 45 minutes).
6. Deployment checks, tests, demo recording and documentation (about 45 minutes).

Environment: DATABASE_URL, OPENROUTER_API_KEY, worker/reviewer model IDs, APP_ORIGIN, OPERATOR_WALLET_ADDRESS, WORKER_PAYOUT_ADDRESS, REVIEWER_PAYOUT_ADDRESS, devnet RPC URL, deployed program ID. Secrets remain server-side. No payment card or paid fallback assumed.

Test coverage:
- Program authority, state/deadline checks, immutable recipients, payout arithmetic/rounding, rent reserve, total budget, success/failure, cancel/expiry and double settlement.
- Idempotency, unauthorized AI runs, replayed/expired auth challenges, model invalid output/timeout/quota failure, restart recovery and uncertain transaction reconciliation.
- Infinite loop, excessive memory, unavailable host APIs and immutable grader expectations.
- Deterministic lab enumeration and bounded reward invariants; analytical no-payment/fixed-payment baseline checks.
- Playwright task creation through commitment/evaluation/settlement using controlled model/RPC fixtures, and public read-only access.
- Real devnet smoke demonstration after approval. Never label mocks as live.

Definition of done: public HTTPS app, actual worker/reviewer responses, genuine funded devnet PDA with correct settlement/refund transaction links, public read-only results, separate deterministic lab, clear evaluator/research assumptions, passing automated tests, README setup, and an honest report of remaining external setup or limitations. Do not turn this into a generic marketplace or claim general AI alignment.
