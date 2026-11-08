import {stat} from 'node:fs/promises';
import {isAddress} from '@solana/kit';
import {readConfig} from '../src/config.mjs';
import {Store} from '../src/store.mjs';
import {Chain} from '../src/chain.mjs';
import {checkModels} from '../src/model.mjs';
import {AppError} from '../src/domain.mjs';

// Read-only: never signs, runs inference, migrates data, or prints configuration values.
async function check(fn,fallback){
  try{return await fn();}catch(error){return {available:false,code:error instanceof AppError?error.code:fallback};}
}
async function main(){
  let config;
  try{config=readConfig();}catch{console.log(JSON.stringify({available:false,code:'INVALID_CONFIGURATION'},null,2));process.exitCode=1;return;}
  const required={DATABASE_URL:config.databaseUrl,OPENROUTER_API_KEY:config.openrouterKey,OPERATOR_WALLET_ADDRESS:config.operator,WORKER_PAYOUT_ADDRESS:config.worker,REVIEWER_PAYOUT_ADDRESS:config.reviewer,PROGRAM_ID:config.programId};
  const missing=Object.entries(required).filter(([,value])=>!value).map(([key])=>key);
  const walletValues=[config.operator,config.worker,config.reviewer];
  const validWallets=walletValues.every(isAddress)&&new Set(walletValues).size===3;
  const store=new Store(config.databaseUrl),chain=new Chain(config);
  try{
    const [build,database,models,network]=await Promise.all([
      check(async()=>({available:(await stat(new URL('../dist/index.html',import.meta.url))).isFile()}),'BUILD_REQUIRED'),
      check(async()=>{
        if(!store.pool)return {available:false,code:'DATABASE_NOT_CONFIGURED'};
        const result=await store.pool.query("SELECT to_regclass('public.tasks') IS NOT NULL AND to_regclass('public.sessions') IS NOT NULL AND to_regclass('public.challenges') IS NOT NULL AND to_regclass('public.idempotency') IS NOT NULL AND to_regclass('public.live_attempts') IS NOT NULL AS ready");
        return {available:result.rows[0].ready,code:result.rows[0].ready?'DATABASE_SCHEMA_READY':'DATABASE_MIGRATION_REQUIRED'};
      },'DATABASE_UNAVAILABLE'),
      check(()=>checkModels(config),'MODEL_CHECK_UNAVAILABLE'),
      check(()=>chain.readiness(),'DEVNET_UNAVAILABLE')
    ]);
    const wallets=!validWallets?{available:false,code:'DISTINCT_PUBLIC_WALLETS_REQUIRED'}:!network.available?{available:false,code:'DEVNET_PROGRAM_REQUIRED'}:await check(()=>chain.recipients(),'WALLET_CHECK_UNAVAILABLE');
    const checks={configuration:{available:missing.length===0,missing},build,database,models,network,wallets};
    const available=Object.values(checks).every(value=>value.available);
    console.log(JSON.stringify({available,checkedAt:new Date().toISOString(),checks},null,2));
    if(!available)process.exitCode=1;
  }finally{await store.close();}
}
await main();
