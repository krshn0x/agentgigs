export function payouts(budget, probabilityBps, allPass) {
  const b = BigInt(budget);
  if (b < 1n || b > 100_000_000n || !Number.isInteger(probabilityBps) || probabilityBps < 0 || probabilityBps > 10_000 || typeof allPass !== 'boolean') throw new Error('INVALID_PAYOUT_TERMS');
  const r = b / 5n, d = BigInt(allPass ? 10_000 - probabilityBps : probabilityBps);
  const reviewer = r * (100_000_000n - d*d) / 100_000_000n;
  const worker = allPass ? b-r : 0n;
  return {worker:worker.toString(), reviewer:reviewer.toString(), refund:(b-worker-reviewer).toString()};
}
