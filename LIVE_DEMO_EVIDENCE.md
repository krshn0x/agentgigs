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

## Settlement review

Simulation passed in Chrome: 7,868 compute units, transaction v1. Expected distribution: worker 0; reviewer 555,000; creator refund 9,445,000 lamports. Estimated fee 5,000 lamports, paid by creator. No additional rent; existing escrow rent remains in the account.

Settlement is awaiting explicit creator approval and wallet signing. Do not describe it as completed until the chain receipt and balance changes have been verified.

Public balances before settlement, confirmed RPC slot 520046807:

| Account | Lamports |
| --- | ---: |
| Creator `DsDDDEA5Q9mnJSj2HB51Pc1UCEDrmGGbCc2CdaQYJmmJ` | 7,948,666,070 |
| Worker `9LUb9YsQDy5hSiAGBrpzr3bGp1c2hWXwVMRGGR7GC7Jv` | 2,000,000 |
| Reviewer `8gkcBaMWVP4rYWEauS2N7S9mzkFq1QQRfymigpPvxfVx` | 2,000,000 |
| Escrow | 11,986,280 |

## Still pending

- Approve and verify this settlement.
- Refund expired task `396d7422-8bc8-443e-9e74-0e7110556edc` through a separate simulated, creator-approved transaction.
- Capture final screenshots and a short walkthrough recording after verified settlement.
