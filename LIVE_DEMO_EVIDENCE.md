# AgentGigs live demo evidence

## Real task

- Task: https://orbit-tasks-wcsa.onrender.com/#/tasks/dc1ee51c-d575-4369-a4a0-2af0b2472026
- Cluster: Solana devnet. Budget: 10,000,000 lamports (0.01 devnet SOL).
- Escrow: `G6Vmai58KhgdriuGCz8mto1obaZV2zfT1BCkdzv3A571`.
- Funding: `5ERiLzdUard8CpjjqurgTZDKLYxbENiQcyxoujLfMdswFaTBsvSj2RoHTSuE1oGynKSM2AYCD8pexvXoMqN5Fi46`.
- Review commitment: `34tjroeXTJsV9Vb5NBBg2xkyzqrRDTEGHre8pjNC3XJBGTQWS6tdtrX9bLPUdjx3ZYaRddbDePZTMQZyAQPWu8Pf`.
- Worker request: `gen-1794146876-J37AAUcawRQx4U74wwfA`.
- Reviewer request: `gen-1794146884-68qyPGZpwXuinuG4EcLY`.
- Both roles: `nvidia/nemotron-3.5-lightning:free`, provider Nvidia. Reported API cost: 0 for both calls.
- Committed prediction: 8500 basis points (85%).
- Source SHA-256: `acdd9e6f0ef33b82e69602bd97d7ef80b82bff6ba72341893d2893bcb1eef8d2`.
- Suite SHA-256: `261377801b7dee36a1996b103ffc0578bfded47d59b162c56700fc3b1ad88d8e`.
- Grader report SHA-256: `8ab093a6bb290909c2cac1143b1066e6e7246fd3b9affc410e3bf0f681a411da`.
- Actual result: 5/20 tests passed; 15 output mismatches; `allPass:false`. This is a genuine unsuccessful AI submission, not a fixture or a successful parser claim.

## Settlement verified on devnet

Settlement transaction: [`4NyKQGoE5rG6iY3rKHjYdYYFwYjN8PPpTgKTva8Rq7dv3NgXpW2qp4QjJV5UA8C2bwbGmqFgEGm84E6fKi4kcvnY`](https://explorer.solana.com/tx/4NyKQGoE5rG6iY3rKHjYdYYFwYjN8PPpTgKTva8Rq7dv3NgXpW2qp4QjJV5UA8C2bwbGmqFgEGm84E6fKi4kcvnY?cluster=devnet)
Attestation matches: `true`. Status: `settled`.

Observed distribution matches the Anchor Brier scoring arithmetic to the exact lamport:
- Worker: 0 lamports (unsuccessful parser, 5/20 tests passed).
- Reviewer: +555,000 lamports (from 2,000,000 to 2,555,000).
- Creator refund: +9,445,000 lamports (net +9,440,000 lamports after 5,000 lamport network fee, from 7,948,666,070 to 7,958,106,070).
- Escrow PDA: 1,986,280 lamports (exactly the rent-exempt reserve preserved).

Public balances verified after settlement on devnet RPC:

| Account | Before (Lamports) | After (Lamports) | Delta |
| --- | ---: | ---: | ---: |
| Creator `DsDDDEA5Q9mnJSj2HB51Pc1UCEDrmGGbCc2CdaQYJmmJ` | 7,948,666,070 | 7,958,106,070 | +9,440,000 (refund minus fee) |
| Worker `9LUb9YsQDy5hSiAGBrpzr3bGp1c2hWXwVMRGGR7GC7Jv` | 2,000,000 | 2,000,000 | 0 |
| Reviewer `8gkcBaMWVP4rYWEauS2N7S9mzkFq1QQRfymigpPvxfVx` | 2,000,000 | 2,555,000 | +555,000 (Brier reward) |
| Escrow PDA `G6Vmai58KhgdriuGCz8mto1obaZV2zfT1BCkdzv3A571` | 11,986,280 | 1,986,280 | -10,000,000 (payout released) |

## Leftovers / Next steps

1. **Submit on MLH**: Submit the project form at `https://www.mlh.com/events/solana-hackathon/submissions/new`.
2. **Reclaim Expired Task Escrow**: Refund expired task `396d7422-8bc8-443e-9e74-0e7110556edc` (reclaims 0.01 SOL back to creator).
3. **Walkthrough / Demo Video**: Record a 2–3 minute walkthrough video showing the settled task, code inspection, and research lab.
