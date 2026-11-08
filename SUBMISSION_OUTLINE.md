# Orbit Tasks submission preparation

This is an outline for the team to complete in its own words. It contains no claimed live results. Judges should be able to distinguish the local fixture, controlled tests, actual model responses, and confirmed devnet transactions.

## Problem and intended user

- Initial user: a developer or technical team funding a small coding task.
- Friction: a plausible AI answer or confident review is insufficient evidence for a payout.
- Narrow test: repairing one pure JavaScript CSV parser with a predefined specification.
- Explain why a worker submission, a prediction committed before grading, execution evidence, and fixed payout terms help the user decide whether to settle.

## Product walkthrough

- Fund a bounded devnet escrow with immutable recipients and task commitments.
- Have an AI worker submit source and a separate reviewer call predict whether every hidden test passes.
- Commit the source hash and probability before evaluating the frozen submission.
- Inspect the report and confirm the creator-attested, program-computed settlement.
- Show public inspection of the same task record.

## What is implemented

- React frontend with wallet authentication and explicit simulation/review dialogs.
- Postgres persistence, idempotent writes, run limits, and explicit recovery.
- OpenRouter integration restricted to the pinned free model; real calls still need configured credentials and a completed live run.
- QuickJS evaluation in a separate worker with limits and private expectations.
- Anchor escrow source and generated client, checked with local program/RPC tests.
- Independent finite research lab with 42 configurations and reproducible JSON export.

## Evidence still to add

- [x] Public app URL: https://orbit-tasks-wcsa.onrender.com (fixture and lab available; live task setup pending).
- [x] Source repository: https://github.com/krshn0x/orbit-tasks (private); deployed code commit `c6b7dcb`. Decide how judges will access source before submission.
- [ ] Confirmed devnet deployment and three task transaction links.
- [ ] Actual worker/reviewer model identifiers and observed evaluation result.
- [ ] Exact payout amounts from the live task.
- [ ] Video showing the genuine flow and public inspection.
- [ ] Team-authored explanation of who built each component and what was built during the event.

## Research and limitations to explain

- Practical Brier scoring and the paper-inspired finite experiment are different mechanisms.
- Separate calls to the same model are separate roles, not independent operators.
- The creator attests the outcome; the program enforces arithmetic and recipients, not code correctness or honesty.
- At B=2 and λ=1, the finite capped peer scheme has a positive deviation gain of 0.056. Describe that failure directly.
- Scope is a hackathon prototype with devnet tokens and one supported coding template. Avoid claims of general alignment, proven truthfulness, an audit, or a verified world first.
