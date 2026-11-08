import test from 'node:test';import assert from 'node:assert/strict';
import {generateKeyPairSigner,getBase58Decoder} from '@solana/kit';
import {getTaskEncoder} from '../clients/task-escrow/src/generated/accounts/task.ts';
import {Chain} from '../src/chain.mjs';import {hash} from '../src/domain.mjs';
test('chain validates devnet, program owner/size/discriminator/terms and funding',async()=>{
  const wallets=await Promise.all(Array.from({length:4},()=>generateKeyPairSigner()));
  const config={programId:wallets[3].address,rpcUrl:'https://rpc.fixture.test'},requests=[];
  let genesis='EtWTRABZaYq6iMfeYKouRu166VU2xqa1',owner=config.programId,balance=1000500,corrupt=false,short=false,budget=1000000n;
  const task={creator:wallets[0].address,worker:wallets[1].address,reviewer:wallets[2].address,nonce:'1',budget:'1000000',deadline:1000,suiteHash:'02'.repeat(32),specificationHash:'01'.repeat(32)};
  const encoder=getTaskEncoder();
  const chain=new Chain(config,async(u,o)=>{const {method,params}=JSON.parse(o.body);requests.push({method,params});let result;
    if(method==='getGenesisHash')result=genesis;
    if(method==='getMinimumBalanceForRentExemption')result=500;
    if(method==='getAccountInfo'){
      let bytes=Buffer.from(encoder.encode({creator:task.creator,worker:task.worker,reviewer:task.reviewer,nonce:1n,specificationHash:new Uint8Array(32).fill(1),suiteHash:new Uint8Array(32).fill(2),budget,deadline:1000n,solutionHash:new Uint8Array(32),probabilityBps:0,reviewCommitted:false,reportHash:new Uint8Array(32),allPass:false,status:0,policyVersion:1,bump:255}));
      if(corrupt)bytes[0]^=255;if(short)bytes=bytes.subarray(0,8);
      result=params[0]===config.programId?{value:{executable:true}}:{value:{owner,executable:false,lamports:balance,data:[bytes.toString('base64'),'base64']}};
    }
    return new Response(JSON.stringify({jsonrpc:'2.0',id:1,result}));
  });
  task.pda=await chain.address(task.creator,task.nonce);assert.equal((await chain.read(task)).status,0);
  genesis='mainnet';await assert.rejects(chain.read(task),/DEVNET_REQUIRED/);genesis='EtWTRABZaYq6iMfeYKouRu166VU2xqa1';
  owner=wallets[0].address;await assert.rejects(chain.read(task),/OWNER_MISMATCH/);owner=config.programId;
  corrupt=true;await assert.rejects(chain.read(task),/DISCRIMINATOR/);corrupt=false;
  short=true;await assert.rejects(chain.read(task),/SIZE/);short=false;
  budget=3n;await assert.rejects(chain.read(task),/TERMS_MISMATCH/);budget=1000000n;
  balance=1000000;await assert.rejects(chain.read(task),/UNDERFUNDED/);
});
test('transaction references require confirmed success and matching action/program/PDA, v1 reads',async()=>{
  const config={programId:(await generateKeyPairSigner()).address,rpcUrl:'https://rpc.fixture.test'},pda=(await generateKeyPairSigner()).address;
  let action='create_task',err=null,includePda=true;
  const chain=new Chain(config,async(u,o)=>{const {method,params}=JSON.parse(o.body);assert.equal(method,'getTransaction');assert.equal(params[1].maxSupportedTransactionVersion,1);const data=getBase58Decoder().decode(Buffer.from(hash('global:'+action).slice(0,16),'hex'));return new Response(JSON.stringify({result:{meta:{err},transaction:{message:{accountKeys:[config.programId,includePda?pda:config.programId],instructions:[{programIdIndex:0,accounts:[1],data}]}}}}));});
  const signature='1'.repeat(88);assert.equal(await chain.signature({pda},signature,'create_task'),signature);
  action='settle_task';await assert.rejects(chain.signature({pda},signature,'create_task'),/ACTION_MISMATCH/);action='create_task';err={error:true};await assert.rejects(chain.signature({pda},signature,'create_task'),/NOT_CONFIRMED/);err=null;includePda=false;await assert.rejects(chain.signature({pda},signature,'create_task'),/ACTION_MISMATCH/);
});
