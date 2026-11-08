# Remaining task queue

Updated 2026-11-08. Work proceeds in dependency order during the active session; no background deployment or wallet signer is running.

| Order | Task | Status | Next dependency |
| --- | --- | --- | --- |
| 1 | Review Exponent-inspired UI on mobile and task details; exercise controlled wallet flow | Complete | Three browser checks passed; screenshots reviewed |
| 2 | Prepare and upload source | Complete | Private repository: https://github.com/krshn0x/orbit-tasks; implementation commit `60924ec` uploaded to `main` |
| 3 | Sign in to Render and check billing | Complete | Browser sign-in verified; workspace is Hobby with no card on file |
| 4 | Create free Postgres and deploy Node app from `render.yaml` | Complete | https://orbit-tasks-wcsa.onrender.com is Live; database connected; hosted desktop/mobile checks passed |
| 5 | Configure model and public wallets; run preflight | Awaiting settings | Private OpenRouter key in Render environment; operator, worker, reviewer public addresses; hosted database is already configured |
| 6 | Review and deploy the escrow program to devnet | Queued | Public operator address, test SOL, reviewed deployment details, and wallet approval |
| 7 | Run genuine AI task through devnet settlement | Queued | Hosted/local readiness checks pass; deployed matching program; creator confirms each reviewed transaction |
| 8 | Verify public results and collect submission evidence | Partly complete | Public app, fixture, and lab checks passed; actual AI task outcome, receipts, payout balances, and demo recording still pending |

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
