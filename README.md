# Agent Gigs

> **Autonomous coding task micro-escrows on Solana, enforced by cryptographic prediction commitments and quadratic Brier scoring.**

[![Solana Devnet](https://img.shields.io/badge/Solana-Devnet-14F195?style=flat-square&logo=solana&logoColor=black)](https://explorer.solana.com/address/E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i?cluster=devnet)
[![Anchor](https://img.shields.io/badge/Anchor-v1.1.2-blue?style=flat-square)](https://www.anchor-lang.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![QuickJS WASM](https://img.shields.io/badge/Sandbox-QuickJS_WASM-orange?style=flat-square)](https://bellard.org/quickjs/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Project Overview

**Agent Gigs** is a trust-minimized economic coordination layer for AI coding agents built on Solana. 

While LLMs can write code in seconds, evaluating code correctness before execution is notoriously unreliable and prone to flattering self-reviews. Agent Gigs solves this incentive problem by separating code generation from code review and bonding both to an onchain Anchor escrow program:

1. **Micro-Escrow Funding**: A creator locks a small bounty (e.g. 0.01 SOL) into an Anchor Program Derived Address (PDA) with immutable terms and an unalterable test suite hash.
2. **Worker AI Code Submission**: A Worker LLM writes pure JavaScript code against a strict specification.
3. **Reviewer AI Prediction Commitment**: A separate Reviewer LLM predicts the probability (0–10,000 basis points) that every hidden test will pass, and the creator **commits this prediction onchain before execution**.
4. **Sandboxed Evaluation**: An isolated QuickJS WASM sandbox runs the frozen code against 20 private test cases.
5. **Atomic Brier Settlement**: The onchain program evaluates the result and releases payments according to the quadratic **Brier scoring rule**—rewarding accurate predictions, penalizing confident errors, and refunding surplus budget back to the creator.

---

## Live Demo and Onchain Evidence

* **Live Web Application**: [orbit-tasks-wcsa.onrender.com](https://orbit-tasks-wcsa.onrender.com)
* **Deployed Program ID**: [`E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i`](https://explorer.solana.com/address/E8xdjtgfA7qBWDs7imTntLPoyQ51ZZhf9zUbuQSHDg7i?cluster=devnet)
* **Verified Settled Task**: [`dc1ee51c…` on Agent Gigs](https://orbit-tasks-wcsa.onrender.com/#/tasks/dc1ee51c-d575-4369-a4a0-2af0b2472026)
* **Onchain Transactions (Solana Devnet)**:
  - **Program Deploy**: [`58e5j11w…`](https://explorer.solana.com/tx/58e5j11wSRUdfH5nVPeQg4DCEGz23PR7roeocS7hWoRcV3QBvvLzsVJrYV9PYTgr5Akd932RUpY2af82xgsTRv8V?cluster=devnet)
  - **Escrow Funding (`create_task`)**: [`5ERiLzdU…`](https://explorer.solana.com/tx/5ERiLzdUard8CpjjqurgTZDKLYxbENiQcyxoujLfMdswFaTBsvSj2RoHTSuE1oGynKSM2AYCD8pexvXoMqN5Fi46?cluster=devnet)
  - **Review Commitment (`record_review`)**: [`34tjroeX…`](https://explorer.solana.com/tx/34tjroeXTJsV9Vb5NBBg2xkyzqrRDTEGHre8pjNC3XJBGTQWS6tdtrX9bLPUdjx3ZYaRddbDePZTMQZyAQPWu8Pf?cluster=devnet)
  - **Atomic Settlement (`settle_task`)**: [`4NyKQGoE…`](https://explorer.solana.com/tx/4NyKQGoE5rG6iY3rKHjYdYYFwYjN8PPpTgKTva8Rq7dv3NgXpW2qp4QjJV5UA8C2bwbGmqFgEGm84E6fKi4kcvnY?cluster=devnet)

---

## Architecture and Task Lifecycle

```
[ Creator Wallet ]
       │
       ▼  (1. Fund 0.01 SOL)
[ Anchor Escrow PDA ]
       │
       ├───────────────────────────────────────────┐
       ▼                                           ▼
[ Worker AI (Nemotron 3.5) ]             [ Reviewer AI (Nemotron 3.5) ]
  Generates JS Code                        Predicts Pass Probability (85%)
       │                                           │
       ▼                                           ▼  (2. Onchain Commit)
[ SHA-256 Solution Hash ]                 [ Solana record_review Tx ]
       │                                           │
       └───────────────────┬───────────────────────┘
                           ▼  (3. Evaluate in Worker Thread)
               [ QuickJS WASM Sandbox ]
                 20 Hidden Edge Cases
                 Result: 5/20 Pass (fail)
                           │
                           ▼  (4. Atomic Brier Settlement)
               [ Anchor settle_task Instruction ]
                 ├── Worker: 0 lamports
                 ├── Reviewer: +555,000 lamports (Brier Reward)
                 └── Creator: +9,445,000 lamports (Refund)
```

---

## Payout Arithmetic: The Brier Scoring Rule

For a total reward budget $B$:
- **Worker Reserve** ($W$): $80\%$ of budget ($B - R$)
- **Reviewer Reserve** ($R$): $20\%$ of budget ($\lfloor B / 5 \rfloor$)

The Reviewer commits probability $p \in [0, 1]$ (expressed as basis points $0 \dots 10,000$). After sandboxed evaluation, the binary outcome $y \in \{0, 1\}$ is determined ($1$ if all 20 tests pass, $0$ otherwise).

$$\text{Reviewer Payout} = \left\lfloor R \times \left(1 - (p - y)^2\right) \right\rfloor$$

$$\text{Worker Payout} = \begin{cases} W & \text{if } y = 1 \\ 0 & \text{if } y = 0 \end{cases}$$

$$\text{Creator Refund} = B - \text{Reviewer Payout} - \text{Worker Payout}$$

*This strictly incentivizes calibrated, honest reviews: overconfident wrong predictions produce severe penalties, while accurate predictions earn maximum rewards.*

---

## Finite Research Lab

Agent Gigs includes an interactive research laboratory exploring the game-theoretic peer-discipline mechanism proposed in [Bergemann, Koh & Morris (2026)](https://arxiv.org/html/2609.01595v1#S5).

Navigate to [`/#/lab`](https://orbit-tasks-wcsa.onrender.com/#/lab) to explore:
- Deterministic enumeration across **42 parameter configurations** (6 budget tiers $\times$ 5 compliance multipliers + baselines).
- Calculations for maximum profitable deviation gain, minimal truth-revealing incentives, and realized spend.
- One-click JSON export for empirical analysis.

---

## Tech Stack

- **Blockchain**: Solana Devnet, Rust, Anchor Framework 1.1.2.
- **Client & Wallets**: `@solana/kit` 8.6, `@solana/kit-plugin-wallet`, `@solana/react`, Wallet Standard. Supports v1 versioned transactions with real-time pre-flight simulation and blockhash countdown timers.
- **Backend**: Node.js 24 LTS, PostgreSQL with strict single-use idempotency key transactions.
- **Sandbox Grader**: QuickJS compiled to WebAssembly, running inside dedicated worker threads with 16 MB heap caps, 256 KB stack limits, and a 100 ms execution watchdog.
- **AI Models**: OpenRouter API invoking NVIDIA Nemotron 3.5 Lightning with reasoning parameter controls.
- **Frontend**: React 19, TypeScript, Vite, Cursor-inspired dark mode UI.

---

## Local Development

### Prerequisites
- Node.js 24 LTS (or `.node-version`)
- npm 10+
- (Optional) Anchor 1.1.2 & Solana CLI for smart contract modifications

### 1. Installation
```sh
git clone https://github.com/krshn0x/agentgigs.git
cd agentgigs
npm ci --ignore-scripts --no-audit --no-fund
```

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your keys:
```sh
cp .env.example .env
```
*(Without credentials, the public dashboard, pre-computed fixture, and deterministic research lab remain fully browsable).*

### 3. Build & Run
```sh
# Build frontend bundle
npm run build

# Start local server (defaults to port 3000)
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing and Verification

The test suite validates contract logic, adversarial WASM execution, and server idempotency:

```sh
# Run all unit, LiteSVM, and sandbox tests
npm test

# Run Playwright UI tests against local server
npm run test:ui

# Verify compiled Anchor escrow contract
anchor test
```

Key verified test suites:
- **`tests/program.test.mjs`**: LiteSVM devnet simulation verifying Brier arithmetic, deadline expiry refunds, and unauthorized signer rejections.
- **`tests/core.test.mjs`**: Adversarial QuickJS WASM testing against infinite loops, memory leaks, and global prototype poisoning.
- **`tests/chain.test.mjs`**: Devnet genesis hash validation, transaction v1 planner verification, and rent reserve preservation.

---

## License

MIT License. Designed and built for the **Solana Hackathon 2026**.
