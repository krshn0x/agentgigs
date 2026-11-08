# Local verification — 2026-11-08

Frontend follow-up: after the Exponent-inspired redesign, the three existing Playwright checks passed again, including 390 px mobile overflow/access checks and the controlled wallet/API/RPC flow. Refreshed screenshots are in `artifacts/`. The production build also passed after the style update. These remain local checks, not live model or devnet evidence.

Launch preparation follow-up: the Node 24 Postgres integration file passed all 6 tests (one parent plus 5 subtests), including the added read-only preflight check against a migrated real database and assertions that connection credentials never appear in its output. A missing-configuration preflight correctly exits nonzero and names the six missing settings. The ignored `.env` is prepared with empty credential/address placeholders.

The implementation is in `/Users/krishna/orbit-tasks`. The predecessor repository was not used as the implementation target or copied for credentials/data/history.

| Check | Result |
| --- | --- |
| Anchor 1.1.2 SBF build | Passed; generated IDL and Codama client retained |
| Rust unit tests | 2 passed, including exhaustive payout conservation/rounding |
| Node 24.22.1 test suite | 29 passed, including 4 Postgres subtests; no skipped tests |
| Final provider-readiness checks | 6 provider tests passed after adding key authentication and quota checks |
| React/TypeScript/Vite production build | Passed |
| Playwright on installed Chrome | 3 passed: public/fixture/lab export, responsive pages, complete controlled wallet signing flow |
| Offline Surfpool RPC | Passed: simulation, signing, funding, review commitment, failure settlement, recipient balance assertions |
| Whitespace checks | Passed |

The compiled SBF artifact tested on LiteSVM and offline Surfpool has SHA-256 `cc39687e7762762c2c22d862c64bae9772a2581eb3eaf59a30fa7e6bbe6de475`. Rebuilds may change the artifact hash. Build artifacts and generated build keypairs under `target/` are ignored and are not source deliverables.

Tests cover immutable recipients, unauthorized signers, budget and probability bounds, deadline transitions, repeated payout rejection, preservation of rent, recipient rent prerequisites, integer payout agreement, origin/auth checks, expired/replayed challenges, retry-safe login cookies, concurrent idempotency, global run locking, daily limits, persisted artifacts, and explicit restart recovery. Model fixtures cover malformed output repair, quota/network errors, deadline abortion, strict schemas, bounded response sizes, private-suite exclusion, authenticated key readiness, and free-only pricing.

QuickJS tests exercise correct CSV output, infinite loops, memory exhaustion, absent host APIs, source/input limits, unchanged expectations, malicious `toJSON` hooks, and attempted source escape from the trusted invocation. Candidate scripts and the trusted serializer are evaluated separately; the serializer’s runtime handle is not exposed on the candidate global object.

Browser RPC HTTP/WebSocket traffic and the wallet are fully controlled test fixtures. Postgres is a real disposable local cluster. The CSV fixture is handwritten code with a handwritten review and a genuine local sandbox report. None of these tests is a live OpenRouter response or a devnet payment.

The finite lab exports 42 configurations. For example, capped peer scoring at B=2, λ=1 has maximum deviation gain 0.056, expected payment 1.68, intrinsic welfare −1, and coordinated full-information stress gain 0.32 (floating-point tolerance applies). This configuration fails truthful compliance. These are exact finite-enumeration results for the specified toy model, not empirical AI results or an equilibrium theorem.

Public HTTPS deployment is verified at https://orbit-tasks-wcsa.onrender.com, with Postgres connected. Hosted readiness is fully green for database, devnet program/network, free models, and all three public wallets. The escrow program is deployed on devnet. A real AI task, task-funding transaction, review commitment, and settlement remain unrecorded; creator wallet approvals and public result evidence are the next steps. See `TASK_QUEUE.md` and `DEPLOYMENT.md` for current details. The workspace was Hobby with no card on file at deployment.

Known limits: creator-attested outcomes, hidden server-held grader expectations, dependence on RPC/provider availability, no account-close/rent-reclaim instruction, no security audit, and expiring free Render Postgres. The public fixture and lab remain usable without external setup. Browser screenshots are local in `artifacts/` and can be regenerated with `npm run test:ui`.
