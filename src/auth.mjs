import {randomBytes,randomUUID,createPublicKey,createHmac,verify} from 'node:crypto';
import {getAddressEncoder,isAddress} from '@solana/kit';
import {hash,invariant} from './domain.mjs';
export async function challenge(store,wallet,origin,c){
  invariant(isAddress(wallet),'INVALID_WALLET',400);
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`challenge:${wallet}`]);
  const recent=Number((await c.query("SELECT count(*) FROM challenges WHERE wallet=$1 AND expires_at>now()+interval '4 minutes'",[wallet])).rows[0].count);
  invariant(recent<5,'AUTH_RATE_LIMIT',429);
  const id=randomUUID(),nonce=randomBytes(24).toString('hex'),expires=new Date(Date.now()+300000);
  const message=`Orbit Tasks operator sign-in\nOrigin: ${origin}\nWallet: ${wallet}\nChallenge: ${id}\nNonce: ${nonce}\nExpires: ${expires.toISOString()}\nThis signature authorizes a two-hour session, not a transaction.`;
  await c.query('INSERT INTO challenges(id,wallet,message,expires_at,session_nonce) VALUES($1,$2,$3,$4,$5)',[id,wallet,message,expires,randomBytes(32).toString('hex')]);
  return {id,message,expiresAt:expires.toISOString()};
}
export async function verifyChallenge(c,id,signature,operator,idempotencyKey){
  const row=(await c.query('SELECT * FROM challenges WHERE id=$1 FOR UPDATE',[id])).rows[0];
  invariant(row&&row.session_nonce&&new Date(row.expires_at)>new Date(),'CHALLENGE_INVALID_OR_EXPIRED',401);
  invariant(row.wallet===operator,'OPERATOR_ONLY',403);
  // Repeating the exact accepted request can restore its cookie; a new key is a replay.
  const token=createHmac('sha256',row.session_nonce).update(signature).digest('hex');
  if(row.consumed){invariant(row.verify_key===idempotencyKey&&row.signature_hash===hash(signature),'CHALLENGE_INVALID_OR_EXPIRED',401);const session=(await c.query('SELECT token_hash FROM sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)])).rows[0];invariant(session,'SESSION_EXPIRED_OR_LOGGED_OUT',401);return token;}
  const key=createPublicKey({key:Buffer.concat([Buffer.from('302a300506032b6570032100','hex'),Buffer.from(getAddressEncoder().encode(row.wallet))]),format:'der',type:'spki'});
  const sig=Buffer.from(signature,'base64');
  invariant(sig.length===64&&verify(null,Buffer.from(row.message),key,sig),'INVALID_SIGNATURE',401);
  await c.query('UPDATE challenges SET consumed=true,verify_key=$2,signature_hash=$3 WHERE id=$1',[id,idempotencyKey,hash(signature)]);
  await c.query('INSERT INTO sessions(token_hash,wallet,expires_at) VALUES($1,$2,$3)',[hash(token),row.wallet,new Date(Date.now()+7200000)]);
  return token;
}
export function cookie(token,origin,clear=false){return `orbit_session=${clear?'':token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear?0:7200}${origin.startsWith('https://')?'; Secure':''}`;}
export function tokenFrom(req){return /(?:^|;\s*)orbit_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'')?.[1];}
export async function requireOperator(req,store,config){
  const token=tokenFrom(req);invariant(token&&store.pool,'AUTH_REQUIRED',401);
  const row=(await store.pool.query('SELECT wallet FROM sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)])).rows[0];
  invariant(row?.wallet===config.operator,'OPERATOR_ONLY',403);return row.wallet;
}
