# Orbit Tasks launch and demo checklist

## Current evidence

- Source uploaded to the private repository https://github.com/krshn0x/orbit-tasks (`main`, implementation commit `60924ec`). The ongoing dependency order is recorded in `TASK_QUEUE.md`.

- Local application, escrow source, evaluator, and finite research lab are implemented.
- Exponent-inspired frontend production build passes. All three browser checks pass after the visual update: public fixture/lab, mobile overflow and access checks, and controlled wallet/RPC flow.
- The public example is handwritten and locally evaluated. It has no AI request or onchain payment.
- Public HTTPS hosting and database connectivity are verified at https://orbit-tasks-wcsa.onrender.com. Hosted public desktop/mobile checks passed; see `DEPLOYMENT.md`.
- Live model calls and devnet deployment/settlement remain unverified.

## Configure locally

An ignored `.env` has been created from `.env.example`. Fill it privately; never commit it or paste secrets into chat.

| Setting | Needed value |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for the selected environment |
| `OPENROUTER_API_KEY` | Private key with access to the pinned free model |
| `OPERATOR_WALLET_ADDRESS` | Public creator wallet that signs in and funds tasks |
| `WORKER_PAYOUT_ADDRESS` | Distinct public worker recipient |
| `REVIEWER_PAYOUT_ADDRESS` | Distinct public reviewer recipient |
| `PROGRAM_ID` | Address of the deployed escrow build, verified on devnet |
| `APP_ORIGIN` | `http://localhost:3000` locally; exact Render HTTPS origin when hosted |

Keep the model IDs at `cohere/north-mini-code:free`, the verified free coding model (validated live on 2026-11-08). Both recipient wallets must be ordinary, empty-data system accounts with the current rent-exempt balance. The creator needs devnet SOL for the reward, fees, rent, and program deployment. Wallets retain their own signing keys.

After supplying the database URL, run `npm run db:migrate`. Then run `npm run build` and `npm run preflight`.

`preflight` only reads configuration, build availability, database schema, model-key/catalog readiness, devnet program state, and recipient balances. It prints status codes and missing setting names, never secret values. It makes no inference call and signs no transaction. A nonzero exit means live prerequisites remain incomplete. Restart `npm start` after changing `.env` so the app reads the new settings.

## Source and Render deployment

1. Use the prepared private `krshn0x/orbit-tasks` repository on `main`. Keep `.env`, `target/`, `keys/`, `.data/`, build keypairs, and test artifacts excluded from future commits.
2. Connect Render and grant it access to that repository. The existing `render.yaml` defines one free Node service and one free Postgres instance in Singapore.
3. Confirm the account cannot charge overages, then review the Blueprint before creating resources. Do not select paid upgrades.
4. Supply the private environment settings in Render. Use the database's internal connection string through the Blueprint binding. Set `APP_ORIGIN` to the resulting exact HTTPS origin. Startup runs the schema migration automatically.
5. Verify `/health`, `/api/readiness`, the public fixture, all four screens, and the research JSON download. Open the app in a fresh browser session to confirm public inspection works without operator authentication.
6. Keep an export of public task records before the free database expires: `node --env-file-if-exists=.env scripts/export-public.mjs`. Use the appropriate database URL privately.

Render's [free-service limits](https://render.com/docs/free) and [Blueprint reference](https://render.com/docs/blueprint-spec) were checked on 2026-11-08. The Blueprint is prepared; it is not a deployment record.

## Program deployment

The source program address is `E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i`. Verify the intended build, authority, devnet cluster, estimated deployment fees, and public creator address before requesting approval to sign. Source ID, generated IDL, and tested binary must match. A different ID requires rebuilding and regenerating the client.

The last locally tested binary hash is recorded in `VERIFICATION.md`. Never upload a build keypair or put a signer on Render. Once deployment is confirmed, record the deployment signature and program explorer link, set `PROGRAM_ID`, restart the app, and rerun preflight.

## Live demonstration sequence

Record only after every readiness check passes. Allow enough time for the two model calls and wallet confirmations before the task expires; use the one-hour option for recording.

1. Show the devnet label and ready services. Connect the operator wallet and sign in.
2. Create a CSV parser task using a 0.01 devnet SOL reward. Show the frozen specification/suite commitments and fixed public recipients.
3. Simulate funding. Review the recipients, reward, network fee, rent, cluster, and creator fee payer. The user confirms in their wallet. Show the verified funding receipt.
4. Start the worker and reviewer. Show the actual returned model IDs, frozen source, explanation, and probability. Do not reveal hidden expectations.
5. Simulate the review commitment, review its source hash and probability, and have the user confirm in the wallet. Show its receipt before evaluation.
6. Evaluate the frozen submission. Show the actual pass count and report hash, including failures if they occur.
7. Review the computed worker/reviewer/refund amounts. Simulate settlement and have the user confirm the outcome attestation in the wallet. Show the settlement receipt and independently inspect recipient balance changes.
8. Open the public task link in a fresh session. Finish with the Research Lab, changing budget/multiplier and showing the negative incentive result and JSON export. Explain that this is a separate finite simulation.

If a transaction is uncertain, reconcile it before building another. If a provider fails, show the unavailable state and use an explicit retry; do not replace the recording with the handwritten fixture while calling it live.

## Evidence to collect

- Public HTTPS application and task URLs.
- Source repository URL and commit hash.
- Devnet program and funding, review-commitment, and settlement transaction URLs.
- Actual worker/reviewer model IDs, evaluator report hash, and final payout breakdown.
- Demo video URL and a public-record JSON export excluding hidden expectations and authentication data.
