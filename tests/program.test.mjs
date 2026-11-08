import test from 'node:test';import assert from 'node:assert/strict';
import {LiteSVM,FailedTransactionMetadata} from 'litesvm';
import {address,generateKeyPairSigner,lamports,createTransactionMessage,setTransactionMessageFeePayerSigner,appendTransactionMessageInstruction,signTransactionMessageWithSigners} from '@solana/kit';
import {getCreateTaskInstructionAsync,getRecordReviewInstruction,getSettleTaskInstruction,getCancelTaskInstruction,getRefundExpiredInstruction} from '../clients/task-escrow/src/generated/instructions/index.ts';
import {findTaskPda} from '../clients/task-escrow/src/generated/pdas/task.ts';
import {getTaskDecoder} from '../clients/task-escrow/src/generated/accounts/task.ts';
import {TASK_ESCROW_PROGRAM_ADDRESS as PROGRAM} from '../clients/task-escrow/src/generated/programs/taskEscrow.ts';
import {payouts} from '../shared/payout.mjs';
async function setup(budget=10_000_007n){
  const svm=new LiteSVM(),creator=await generateKeyPairSigner(),worker=await generateKeyPairSigner(),reviewer=await generateKeyPairSigner(),stranger=await generateKeyPairSigner();
  svm.addProgramFromFile(PROGRAM,new URL('../target/deploy/task_escrow.so',import.meta.url).pathname);
  for(const signer of [creator,worker,reviewer,stranger])svm.airdrop(signer.address,lamports(2_000_000_000n));
  const clock=svm.getClock();clock.unixTimestamp=1000n;svm.setClock(clock);
  const nonce=123n,[task]=await findTaskPda({creator:creator.address,nonce});
  const terms={creator,worker:worker.address,reviewer:reviewer.address,task,nonce,budget,deadline:2800n,specificationHash:new Uint8Array(32).fill(1),suiteHash:new Uint8Array(32).fill(2)};
  async function send(ix,signer=creator){svm.expireBlockhash();let m=createTransactionMessage({version:0});m=setTransactionMessageFeePayerSigner(signer,m);m=svm.setTransactionMessageLifetimeUsingLatestBlockhash(m);m=appendTransactionMessageInstruction(ix,m);return svm.sendTransaction(await signTransactionMessageWithSigners(m));}
  const good=r=>{assert.ok(!(r instanceof FailedTransactionMetadata),r instanceof FailedTransactionMetadata?JSON.stringify(r.logs()):'');return r;};
  const bad=r=>{assert.ok(r instanceof FailedTransactionMetadata,'Expected program rejection');return r;};
  const state=()=>getTaskDecoder().decode(svm.getAccount(task).data);
  const record=(p=8500,who=creator)=>getRecordReviewInstruction({creator:who,task,probabilityBps:p,solutionHash:new Uint8Array(32).fill(3)});
  const settle=(pass=true,who=creator,recipients={})=>getSettleTaskInstruction({creator:who,task,worker:worker.address,reviewer:reviewer.address,...recipients,allPass:pass,reportHash:new Uint8Array(32).fill(4)});
  const create=async(overrides={})=>send(await getCreateTaskInstructionAsync({...terms,...overrides}));
  return {svm,creator,worker,reviewer,stranger,task,terms,send,good,bad,state,record,settle,create};
}
test('LiteSVM success/failure payouts match JS including rounding; rent is preserved',async()=>{
  for(const pass of [true,false])for(const p of [0,1,5000,9999,10000]){
    const h=await setup();h.good(await h.create());const reserve=h.svm.getBalance(h.task)-h.terms.budget;
    assert.equal(h.state().reviewCommitted,false);assert.equal(h.state().policyVersion,1);
    h.good(await h.send(h.record(p)));const beforeW=h.svm.getBalance(h.worker.address),beforeR=h.svm.getBalance(h.reviewer.address),beforeC=h.svm.getBalance(h.creator.address);
    h.good(await h.send(h.settle(pass)));const amounts=payouts(h.terms.budget,p,pass);
    assert.equal(h.svm.getBalance(h.worker.address)-beforeW,BigInt(amounts.worker));assert.equal(h.svm.getBalance(h.reviewer.address)-beforeR,BigInt(amounts.reviewer));assert.equal(h.svm.getBalance(h.task),reserve);assert.equal(h.state().status,1);assert.equal(h.state().allPass,pass);
    // Only the network fee is additional to the budget.
    assert.ok(h.svm.getBalance(h.creator.address)<=beforeC+BigInt(amounts.refund));
    h.bad(await h.send(h.settle(pass)));h.bad(await h.send(getCancelTaskInstruction({creator:h.creator,task:h.task})));
  }
});
test('LiteSVM rejects unauthorized creators and mutable recipient substitution',async()=>{const h=await setup();h.good(await h.create());h.bad(await h.send(h.record(5000,h.stranger),h.stranger));h.good(await h.send(h.record()));h.bad(await h.send(h.settle(true,h.stranger),h.stranger));h.bad(await h.send(h.settle(true,h.creator,{worker:h.stranger.address})));h.bad(await h.send(h.settle(true,h.creator,{reviewer:h.creator.address})));assert.equal(h.state().status,0);});
test('LiteSVM enforces a single review, valid probability, and review before settlement',async()=>{const h=await setup();h.good(await h.create());h.bad(await h.send(h.settle()));h.bad(await h.send(h.record(10001)));h.good(await h.send(h.record(5000)));h.bad(await h.send(h.record(9000)));assert.equal(h.state().probabilityBps,5000);h.bad(await h.send(getCancelTaskInstruction({creator:h.creator,task:h.task})));});
test('LiteSVM cancellation refunds budget once and preserves rent',async()=>{const h=await setup();h.good(await h.create());const rent=h.svm.getBalance(h.task)-h.terms.budget;h.good(await h.send(getCancelTaskInstruction({creator:h.creator,task:h.task})));assert.equal(h.state().status,2);assert.equal(h.svm.getBalance(h.task),rent);h.bad(await h.send(h.record()));h.bad(await h.send(getCancelTaskInstruction({creator:h.creator,task:h.task})));});
test('LiteSVM expiry rejects settlement/review and permits exactly one refund',async()=>{for(const review of [false,true]){const h=await setup();h.good(await h.create());if(review)h.good(await h.send(h.record()));const refund=getRefundExpiredInstruction({creator:h.creator,task:h.task});h.bad(await h.send(refund));const clock=h.svm.getClock();clock.unixTimestamp=2800n;h.svm.setClock(clock);h.bad(await h.send(h.record()));h.bad(await h.send(h.settle()));h.bad(await h.send(getCancelTaskInstruction({creator:h.creator,task:h.task})));h.good(await h.send(refund));assert.equal(h.state().status,3);h.bad(await h.send(refund));}});
test('LiteSVM rejects zero/oversized budgets, invalid deadlines and duplicate recipients',async()=>{for(const terms of [{budget:0n},{budget:100000001n},{deadline:1000n},{deadline:90000n}]){const h=await setup();h.bad(await h.create(terms));}const h=await setup();h.bad(await h.create({worker:h.creator.address}));h.bad(await h.create({worker:h.reviewer.address}));});
test('LiteSVM rejects payout wallets without an existing rent-exempt balance',async()=>{const h=await setup(),empty=await generateKeyPairSigner();h.bad(await h.create({worker:empty.address}));h.bad(await h.create({reviewer:empty.address}));});
