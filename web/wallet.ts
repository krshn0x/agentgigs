import {address,createClient,compileTransaction,getBase64EncodedWireTransaction,getBase64Decoder,getSignatureFromTransaction,estimateAndSetResourceLimitsFactory,estimateResourceLimitsFactory,setTransactionMessageLifetimeUsingBlockhash,signTransactionMessageWithSigners,sendAndConfirmTransactionFactory,assertIsSendableTransaction,assertIsTransactionWithBlockhashLifetime,type Instruction} from '@solana/kit';
import {walletSigner} from '@solana/kit-plugin-wallet';
import {solanaRpc,rpcTransactionPlanner} from '@solana/kit-plugin-rpc';
import {getCreateTaskInstructionAsync,getRecordReviewInstruction,getSettleTaskInstruction,getCancelTaskInstruction,getRefundExpiredInstruction} from '../clients/task-escrow/src/generated/instructions/index.ts';
import {getTaskSize} from '../clients/task-escrow/src/generated/accounts/task.ts';
export const client=createClient().use(walletSigner({chain:'solana:devnet'})).use(solanaRpc({rpcUrl:import.meta.env.VITE_SOLANA_RPC_URL||'https://api.devnet.solana.com',transactionConfig:{version:1}}));
export type AppClient=typeof client;
const bytes=(hex:string)=>Uint8Array.from(hex.match(/.{2}/g)!.map(x=>parseInt(x,16)));
export async function prepare(task:any,action:string,programId:string){
  const connected=client.wallet.getState().connected;
  if(!connected?.signer||connected.account.address!==task.creator)throw new Error('Connect the task creator wallet.');
  if(await client.rpc.getGenesisHash().send()!=='EtWTRABZaYq6iMfeYKouRu166VU2xqa1')throw new Error('Devnet is required.');
  const program=await client.rpc.getAccountInfo(address(programId),{encoding:'base64',commitment:'confirmed'}).send();
  if(!program.value?.executable)throw new Error('Escrow program is not deployed.');
  const version=connected.supportedTransactionVersions.has(1)?1:0;
  if(!connected.supportedTransactionVersions.has(version))throw new Error('This wallet must support v0 or v1 transactions.');
  const creator=connected.signer,taskAddress=address(task.pda),config={programAddress:address(programId)};
  let ix:Instruction;
  if(action==='create_task')ix=await getCreateTaskInstructionAsync({creator,task:taskAddress,worker:address(task.worker),reviewer:address(task.reviewer),nonce:BigInt(task.nonce),specificationHash:bytes(task.specificationHash),suiteHash:bytes(task.suiteHash),budget:BigInt(task.budget),deadline:BigInt(task.deadline)},config);
  else if(action==='record_review')ix=getRecordReviewInstruction({creator,task:taskAddress,solutionHash:bytes(task.solutionHash),probabilityBps:task.review.probabilityBps},config);
  else if(action==='settle_task')ix=getSettleTaskInstruction({creator,task:taskAddress,worker:address(task.worker),reviewer:address(task.reviewer),allPass:task.report.allPass,reportHash:bytes(task.report.reportHash)},config);
  else if(action==='cancel_task')ix=getCancelTaskInstruction({creator,task:taskAddress},config);
  else if(action==='refund_expired')ix=getRefundExpiredInstruction({creator,task:taskAddress},config);
  else throw new Error('Unknown action');
  const planner=version===1?client:client.use(rpcTransactionPlanner({version:0}));
  const planned=await planner.planTransaction([ix]);
  const {value:blockhash}=await client.rpc.getLatestBlockhash({commitment:'confirmed'}).send();
  const estimate=estimateAndSetResourceLimitsFactory(estimateResourceLimitsFactory({rpc:client.rpc}));
  const message=await estimate(setTransactionMessageLifetimeUsingBlockhash(blockhash,planned));
  const unsigned=compileTransaction(message);
  const simulation=await client.rpc.simulateTransaction(getBase64EncodedWireTransaction(unsigned),{encoding:'base64',sigVerify:false,commitment:'confirmed'}).send();
  if(simulation.value.err)throw new Error('Simulation failed. Reconcile state and check balance or expiry.');
  const {value:fee}=await client.rpc.getFeeForMessage(getBase64Decoder().decode(unsigned.messageBytes) as any,{commitment:'confirmed'}).send();
  const rent=action==='create_task'?await client.rpc.getMinimumBalanceForRentExemption(BigInt(getTaskSize())).send():0n;
  return {task,action,message,version,fee:String(fee??0n),rent:String(rent),simulation:{success:true,units:String(simulation.value.unitsConsumed??0)},preparedAt:Date.now()};
}
export type Prepared=Awaited<ReturnType<typeof prepare>>;
export async function signAndSend(prepared:Prepared){
  if(Date.now()-prepared.preparedAt>45000)throw new Error('Preview expired. Simulate again before signing.');
  const tx=await signTransactionMessageWithSigners(prepared.message);
  assertIsSendableTransaction(tx);assertIsTransactionWithBlockhashLifetime(tx);
  const signature=getSignatureFromTransaction(tx);
  const pending={signature,action:prepared.action,taskId:prepared.task.id,lastValidBlockHeight:String(tx.lifetimeConstraint.lastValidBlockHeight)};
  localStorage.setItem(`orbit-pending:${prepared.task.id}`,JSON.stringify(pending));
  try{await sendAndConfirmTransactionFactory({rpc:client.rpc,rpcSubscriptions:client.rpcSubscriptions})(tx,{commitment:'confirmed'});}catch{throw new Error(`Transaction status is uncertain. Reconcile ${signature} before creating another transaction.`);}
  return pending;
}
export async function pendingStatus(taskId:string){
  const text=localStorage.getItem(`orbit-pending:${taskId}`);if(!text)return null;
  const pending=JSON.parse(text);const {value}=await client.rpc.getSignatureStatuses([pending.signature],{searchTransactionHistory:true}).send();
  if(value[0]?.err){localStorage.removeItem(`orbit-pending:${taskId}`);throw new Error('Previous transaction failed onchain. You can simulate a new transaction.');}
  if(['confirmed','finalized'].includes(value[0]?.confirmationStatus??''))return {...pending,confirmed:true};
  const height=await client.rpc.getBlockHeight({commitment:'confirmed'}).send();
  return {...pending,confirmed:false,expired:height>BigInt(pending.lastValidBlockHeight)};
}
