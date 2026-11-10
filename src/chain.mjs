import {getTaskDecoder,getTaskSize} from '../clients/task-escrow/src/generated/accounts/task.ts';
import {getAddressEncoder,getProgramDerivedAddress,getU64Encoder,getBase58Encoder,isAddress} from '@solana/kit';
import {hash,invariant,AppError} from './domain.mjs';
const DEVNET_GENESIS='EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG';
const hex = bytes=>Buffer.from(bytes).toString('hex');
export class Chain {
  constructor(config,fetcher=fetch){this.config=config;this.fetcher=fetcher;}
  async rpc(method,params=[]) {
    let response;try{response=await this.fetcher(this.config.rpcUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});}catch{throw new AppError('DEVNET_RPC_UNAVAILABLE',503);}
    invariant(response.ok,'DEVNET_RPC_UNAVAILABLE',503);const body=await response.json();invariant(!body.error,'DEVNET_RPC_ERROR',503);return body.result;
  }
  async readiness() {
    invariant(isAddress(this.config.programId),'PROGRAM_NOT_CONFIGURED',503);
    invariant(await this.rpc('getGenesisHash')===DEVNET_GENESIS,'DEVNET_REQUIRED',503);
    const result=await this.rpc('getAccountInfo',[this.config.programId,{encoding:'base64',commitment:'confirmed'}]);
    invariant(result?.value?.executable===true,'PROGRAM_NOT_DEPLOYED',503);return {available:true,network:'devnet',programId:this.config.programId};
  }
  async address(creator,nonce) {return (await getProgramDerivedAddress({programAddress:this.config.programId,seeds:[new TextEncoder().encode('task'),getAddressEncoder().encode(creator),getU64Encoder().encode(BigInt(nonce))]}))[0];}
  async recipients(){
    invariant([this.config.worker,this.config.reviewer].every(isAddress)&&new Set([this.config.worker,this.config.reviewer]).size===2,'DISTINCT_WALLETS_REQUIRED',503);
    const rent=await this.rpc('getMinimumBalanceForRentExemption',[0]);
    const {value}=await this.rpc('getMultipleAccounts',[[this.config.worker,this.config.reviewer],{encoding:'base64',commitment:'confirmed'}]);
    invariant(value?.length===2&&value.every(v=>v&&v.owner==='11111111111111111111111111111111'&&!v.executable&&v.data?.[0]===''&&BigInt(v.lamports)>=BigInt(rent)),'PAYOUT_WALLETS_NEED_RENT_EXEMPT_DEVNET_BALANCE',503);
    return {available:true};
  }
  async read(task) {
    await this.readiness();
    invariant(task.pda===await this.address(task.creator,task.nonce),'PDA_MISMATCH');
    const {value}=await this.rpc('getAccountInfo',[task.pda,{encoding:'base64',commitment:'confirmed'}]);
    if(!value)return null;
    invariant(value.owner===this.config.programId&&!value.executable,'ACCOUNT_OWNER_MISMATCH');
    const bytes=Buffer.from(value.data[0],'base64');invariant(bytes.length===getTaskSize(),'ACCOUNT_SIZE_MISMATCH');
    // Codama validates the Anchor discriminator in addition to our explicit check.
    const discriminator=Buffer.from(hash('account:Task').slice(0,16),'hex');
    invariant(bytes.subarray(0,8).equals(discriminator),'ACCOUNT_DISCRIMINATOR_MISMATCH');
    const state=getTaskDecoder().decode(bytes);
    invariant(state.creator===task.creator&&state.worker===task.worker&&state.reviewer===task.reviewer&&state.nonce.toString()===task.nonce&&state.budget.toString()===task.budget&&Number(state.deadline)===task.deadline&&hex(state.specificationHash)===task.specificationHash&&hex(state.suiteHash)===task.suiteHash&&state.policyVersion===1,'CHAIN_TERMS_MISMATCH');
    invariant([0,1,2,3].includes(state.status)&&state.probabilityBps<=10000,'INVALID_CHAIN_STATE');
    if(state.status===0){const rent=await this.rpc('getMinimumBalanceForRentExemption',[bytes.length]);invariant(BigInt(value.lamports)>=BigInt(rent)+BigInt(task.budget),'ESCROW_UNDERFUNDED');}
    return {status:state.status,reviewCommitted:state.reviewCommitted,probabilityBps:state.probabilityBps,solutionHash:hex(state.solutionHash),reportHash:hex(state.reportHash),allPass:state.allPass};
  }
  async signature(task,signature,action){
    invariant(typeof signature==='string'&&/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(signature),'INVALID_TRANSACTION_SIGNATURE',400);
    const tx=await this.rpc('getTransaction',[signature,{encoding:'json',commitment:'confirmed',maxSupportedTransactionVersion:1}]);
    invariant(tx&&tx.meta?.err===null,'TRANSACTION_NOT_CONFIRMED');
    const message=tx.transaction.message;
    const keys=[...message.accountKeys,...(tx.meta.loadedAddresses?.writable??[]),...(tx.meta.loadedAddresses?.readonly??[])].map(k=>typeof k==='string'?k:k.pubkey);
    const discriminator=Buffer.from(hash(`global:${action}`).slice(0,16),'hex');
    const matching=message.instructions.some(ix=>{
      if(keys[ix.programIdIndex]!==this.config.programId||!ix.accounts?.some(i=>keys[i]===task.pda))return false;
      try{return Buffer.from(getBase58Encoder().encode(ix.data)).subarray(0,8).equals(discriminator);}catch{return false;}
    });
    invariant(matching,'TRANSACTION_ACTION_MISMATCH');return signature;
  }
}
