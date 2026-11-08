import {z} from 'zod';
export function readConfig(env=process.env) {
  const config={port:Number(env.PORT||3000),origin:env.APP_ORIGIN||env.RENDER_EXTERNAL_URL||'http://localhost:3000',databaseUrl:env.DATABASE_URL||'',openrouterKey:env.OPENROUTER_API_KEY||'',workerModel:env.WORKER_MODEL||'nvidia/nemotron-3.5-lightning:free',reviewerModel:env.REVIEWER_MODEL||'nvidia/nemotron-3.5-lightning:free',operator:env.OPERATOR_WALLET_ADDRESS||'',worker:env.WORKER_PAYOUT_ADDRESS||'',reviewer:env.REVIEWER_PAYOUT_ADDRESS||'',rpcUrl:env.SOLANA_RPC_URL||'https://api.devnet.solana.com',programId:env.PROGRAM_ID||''};
  z.url().parse(config.origin);z.url().parse(config.rpcUrl);
  if(new URL(config.origin).origin!==config.origin)throw new Error('APP_ORIGIN must be an origin with no trailing slash');
  if(!config.workerModel.endsWith(':free')||!config.reviewerModel.endsWith(':free'))throw new Error('Only pinned :free models are allowed');
  return Object.freeze(config);
}
