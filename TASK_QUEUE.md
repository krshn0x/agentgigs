# Remaining task queue

Updated 2026-11-08. Work proceeds in dependency order during the active session; no background deployment or wallet signer is running.

| Order | Task | Status | Next dependency |
| --- | --- | --- | --- |
| 1 | Review Exponent-inspired UI on mobile and task details; exercise controlled wallet flow | Complete | Three browser checks passed; screenshots reviewed |
| 2 | Prepare and upload source | Complete | Private repository: https://github.com/krshn0x/orbit-tasks; implementation commit `60924ec` uploaded to `main` |
| 3 | Sign in to Render and check billing | Complete | Browser sign-in verified; workspace is Hobby with no card on file |
| 4 | Create free Postgres and deploy Node app from `render.yaml` | Complete | https://orbit-tasks-wcsa.onrender.com is Live; database connected; hosted desktop/mobile checks passed |
| 5 | Configure model and public wallets; run preflight | Complete | 15:55 UTC 2026-11-08: hosted readiness fully available — database, devnet network + program, models (`cohere/north-mini-code:free`, `FREE_MODEL_CATALOG_VERIFIED`), and all three wallets |
| 6 (deployment) | Devnet program deployed | Complete | Program `E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i` deployed by operator wallet; deploy signature `58e5j11wSRUdfH5nVPeQg4DCEGz23PR7roeocS7hWoRcV3QBvvLzsVJrYV9PYTgr5Akd932RUpY2af82xgsTRv8V` |
| 7 | Run genuine AI task through devnet settlement | Creator action required | Existing funded task `396d7422-8bc8-443e-9e74-0e7110556edc` failed inference and expired. Refund 0.01 devnet SOL through the wallet, then fund a fresh task. Hosted worker/reviewer diagnostic now succeeds. |
| 8 | Verify public results and collect submission evidence | Partly complete | Public app, fixture, and lab checks passed; real devnet program deployment done; actual AI task outcome, receipts, payout balances, and demo recording still pending |

## Available now

- Public app: https://orbit-tasks-wcsa.onrender.com
- Hosting evidence and service identifiers: `DEPLOYMENT.md`
- Local preview: http://localhost:3000
- Readiness command: `npm run preflight`
- Detailed sequence: `LAUNCH_CHECKLIST.md`
- Team-authored submission structure: `SUBMISSION_OUTLINE.md`

## Pending handoffs

1. The creator must connect and sign in with the configured operator wallet, review the expired-task refund simulation, and approve it in the wallet.
2. Create and fund a fresh task, then approve its review commitment and settlement individually after simulation and inspection.
3. Model preference: user requested free DeepSeek or GLM. Current OpenRouter catalog has neither at zero pricing. Keep free-only routing; model choice is pending. OpenCode free offerings are limited to OpenCode clients.

## Model recovery evidence — 2026-11-08

- Deployed code `88a9538`, Render deploy `dep-dbo7s6bbc2fs73fjik90`, Live.
- Explicit hosted diagnostic made real worker/reviewer calls to `cohere/north-mini-code:free`; both returned valid schemas. Independent grader returned `allPass:false`, reviewer prediction 9900 basis points. This is a diagnostic, without escrow commitment or payout.
- Retired Qwen defaults removed from config, template, and Blueprint. Provider rejection status is now classified without exposing provider bodies or credentials. Expired tasks show refund guidance and no AI retry control.
- Ten provider/config tests passed; production build passed. Normal Render build command restored after the one-time diagnostic.
