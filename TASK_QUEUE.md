# Remaining task queue

Updated 2026-11-08. Work proceeds in dependency order during the active session; no background deployment or wallet signer is running.

| Order | Task | Status | Next dependency |
| --- | --- | --- | --- |
| 1 | Review Exponent-inspired UI on mobile and task details; exercise controlled wallet flow | Complete | Three browser checks passed; screenshots reviewed |
| 2 | Prepare and upload source | Complete | Private repository: https://github.com/krshn0x/orbit-tasks; implementation commit `60924ec` uploaded to `main` |
| 3 | Sign in to Render and check billing | Complete | Browser sign-in verified; workspace is Hobby with no card on file |
| 4 | Create free Postgres and deploy Node app from `render.yaml` | Complete | https://orbit-tasks-wcsa.onrender.com is Live; database connected; hosted desktop/mobile checks passed |
| 5 | Configure model and public wallets; run preflight | Partly complete | Hosted wallets, `PROGRAM_ID`, and database verified green at 15:45 UTC after env sync; only `OPENROUTER_API_KEY` remains, added privately in Render env settings |
| 6 (deployment) | Devnet program deployed | Complete | Program `E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i` deployed by operator wallet; deploy signature `58e5j11wSRUdfH5nVPeQg4DCEGz23PR7roeocS7hWoRcV3QBvvLzsVJrYV9PYTgr5Akd932RUpY2af82xgsTRv8V` |
| 7 | Run genuine AI task through devnet settlement | Queued | Only remaining setting is `OPENROUTER_API_KEY` in Render env; deployed program, wallets, database and hosted readiness are green; creator confirms each reviewed transaction |
| 8 | Verify public results and collect submission evidence | Partly complete | Public app, fixture, and lab checks passed; real devnet program deployment done; actual AI task outcome, receipts, payout balances, and demo recording still pending |

## Available now

- Public app: https://orbit-tasks-wcsa.onrender.com
- Hosting evidence and service identifiers: `DEPLOYMENT.md`
- Local preview: http://localhost:3000
- Readiness command: `npm run preflight`
- Detailed sequence: `LAUNCH_CHECKLIST.md`
- Team-authored submission structure: `SUBMISSION_OUTLINE.md`

## Pending handoffs

1. Hosting and database setup are complete. The workspace is Hobby with no card on file. The public app serves the labeled fixture and lab while live credentials remain unset.
2. Provide the three distinct public wallet addresses. Keep keys and seed phrases in the user's wallet.
3. Configure private service credentials directly in the ignored `.env` or the Render environment settings. No credentials belong in this file or the repository.
