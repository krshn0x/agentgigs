# Remaining task queue

Updated 2026-11-08. Work proceeds in dependency order during the active session; no background deployment or wallet signer is running.

| Order | Task | Status | Next dependency |
| --- | --- | --- | --- |
| 1 | Review Exponent-inspired UI on mobile and task details; exercise controlled wallet flow | Complete | Three browser checks passed; screenshots reviewed |
| 2 | Prepare and upload source | Complete | Private repository: https://github.com/krshn0x/orbit-tasks; implementation commit `60924ec` uploaded to `main` |
| 3 | Sign in to Render and check billing | Complete | Browser sign-in verified; workspace is Hobby with no card on file |
| 4 | Create free Postgres and deploy Node app from `render.yaml` | In progress | Repository connection confirmed; Render recognized the database and web service in the Blueprint |
| 5 | Configure model and public wallets; run preflight | Awaiting settings | Private OpenRouter key and database URL in `.env`; operator, worker, reviewer public addresses |
| 6 | Review and deploy the escrow program to devnet | Queued | Public operator address, test SOL, reviewed deployment details, and wallet approval |
| 7 | Run genuine AI task through devnet settlement | Queued | Hosted/local readiness checks pass; deployed matching program; creator confirms each reviewed transaction |
| 8 | Verify public results and collect submission evidence | Queued | Actual task outcome, receipts, payout balances, public app/task links, and demo recording |

## Available now

- Local preview: http://localhost:3000
- Readiness command: `npm run preflight`
- Detailed sequence: `LAUNCH_CHECKLIST.md`
- Team-authored submission structure: `SUBMISSION_OUTLINE.md`

## Pending handoffs

1. Render sign-in and repository connection are complete. The workspace is Hobby with no card on file. Initial hosting can serve the labeled public fixture and lab while live credentials remain unset.
2. Provide the three distinct public wallet addresses. Keep keys and seed phrases in the user's wallet.
3. Configure private service credentials directly in the ignored `.env` or the Render environment settings. No credentials belong in this file or the repository.
