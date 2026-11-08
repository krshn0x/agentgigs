import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {generateKeyPairSigner,createSolanaRpc,createTransactionMessage,setTransactionMessageFeePayerSigner,setTransactionMessageLifetimeUsingBlockhash,appendTransactionMessageInstruction,signTransactionMessageWithSigners,getBase64EncodedWireTransaction} from '@solana/kit';
import {TASK_ESCROW_PROGRAM_ADDRESS as program} from '../clients/task-escrow/src/generated/programs/taskEscrow.ts';
import {findTaskPda} from '../clients/task-escrow/src/generated/pdas/task.ts';
import {getCreateTaskInstructionAsync,getRecordReviewInstruction,getSettleTaskInstruction} from '../clients/task-escrow/src/generated/instructions/index.ts';
import {getTaskDecoder} from '../clients/task-escrow/src/generated/accounts/task.ts';
import {payouts} from '../shared/payout.mjs';
const endpoint='http://127.0.0.1:18899',rpc=createSolanaRpc(endpoint);
async function cheat(method,params){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const body=await response.json();assert.equal(body.error,undefined,JSON.stringify(body.error));return body.result;}
const [creator,worker,reviewer]=await Promise.all(Array.from({length:3},()=>generateKeyPairSigner()));
await cheat('surfnet_setAccount',[creator.address,{lamports:2_000_000_000,owner:'11111111111111111111111111111111'}]);
for(const signer of [worker,reviewer])await cheat('surfnet_setAccount',[signer.address,{lamports:1_000_000,owner:'11111111111111111111111111111111'}]);
const binary=await readFile(new URL('../target/deploy/task_escrow.so',import.meta.url));
await cheat('surfnet_setAccount',[program,{data:binary.toString('hex'),lamports:2_000_000_000,owner:'BPFLoader2111111111111111111111111111111111',executable:true}]);
const nonce=BigInt(Date.now()),[task]=await findTaskPda({creator:creator.address,nonce});
async function send(ix){const {value:life}=await rpc.getLatestBlockhash({commitment:'confirmed'}).send();let m=createTransactionMessage({version:0});m=setTransactionMessageFeePayerSigner(creator,m);m=setTransactionMessageLifetimeUsingBlockhash(life,m);m=appendTransactionMessageInstruction(ix,m);const tx=await signTransactionMessageWithSigners(m);const wire=getBase64EncodedWireTransaction(tx);const sim=await rpc.simulateTransaction(wire,{encoding:'base64',sigVerify:true,commitment:'confirmed'}).send();assert.equal(sim.value.err,null,JSON.stringify(sim.value,(_,v)=>typeof v==='bigint'?v.toString():v));const sig=await rpc.sendTransaction(wire,{encoding:'base64',preflightCommitment:'confirmed'}).send();for(let i=0;i<100;i++){const {value}=await rpc.getSignatureStatuses([sig]).send();if(value[0]?.confirmationStatus==='confirmed'||value[0]?.confirmationStatus==='finalized'){assert.equal(value[0].err,null);return sig;}await new Promise(r=>setTimeout(r,50));}throw new Error('LOCAL_CONFIRMATION_TIMEOUT');}
const budget=10_000_007n;
await send(await getCreateTaskInstructionAsync({creator,worker:worker.address,reviewer:reviewer.address,task,nonce,specificationHash:new Uint8Array(32).fill(1),suiteHash:new Uint8Array(32).fill(2),budget,deadline:BigInt(Math.floor(Date.now()/1000)+1800)}));
await send(getRecordReviewInstruction({creator,task,solutionHash:new Uint8Array(32).fill(3),probabilityBps:8500}));
await send(getSettleTaskInstruction({creator,task,worker:worker.address,reviewer:reviewer.address,allPass:false,reportHash:new Uint8Array(32).fill(4)}));
const {value}=await rpc.getAccountInfo(task,{encoding:'base64',commitment:'confirmed'}).send();const state=getTaskDecoder().decode(Buffer.from(value.data[0],'base64'));assert.equal(state.status,1);assert.equal(state.allPass,false);
const expected=payouts(budget,8500,false);assert.equal((await rpc.getBalance(worker.address).send()).value-1_000_000n,BigInt(expected.worker));assert.equal((await rpc.getBalance(reviewer.address).send()).value-1_000_000n,BigInt(expected.reviewer));
console.log('Offline Surfpool RPC: simulated and signed create → review → failure settlement; recipient amounts match. No devnet transaction sent.');
