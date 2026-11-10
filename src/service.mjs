import {randomUUID,randomBytes} from 'node:crypto';
import {isAddress} from '@solana/kit';
import {SPEC,examples,createSuite,hash,publicTask,invariant,AppError,customDefinition} from './domain.mjs';
import {callModel,checkModels} from './model.mjs';
import {evaluate} from './evaluator.mjs';
import {payouts} from '../shared/payout.mjs';
export class TaskService {
  constructor(store,chain,config,options={}){Object.assign(this,{store,chain,config});this.model=options.model??callModel;this.grader=options.grader??evaluate;this.modelCheck=options.modelCheck??checkModels;this.jobs=new Set();}
  async draft(input,c,creator=this.config.operator){
    const {config}=this;
    invariant([creator,config.worker,config.reviewer,config.programId].every(isAddress),'WALLETS_OR_PROGRAM_NOT_CONFIGURED',503);
    invariant(new Set([creator,config.worker,config.reviewer]).size===3,'RECIPIENTS_MUST_BE_DISTINCT',503);
    const custom=input.custom?customDefinition(input.custom):null;const suite=custom??createSuite();const nonce=BigInt('0x'+randomBytes(8).toString('hex')).toString();
    const terms={specification:custom?.specification??SPEC,examples:custom?.examples??examples,policyVersion:1,...(custom?{taskType:'custom',outputFormat:'json',testCount:custom.testCount}:{})};
    const task={id:randomUUID(),title:custom?.title??'Repair a CSV parser',...terms,specificationHash:hash(terms),suiteHash:suite.suiteHash,seed:suite.seed,fixtures:suite.fixtures,creator,worker:config.worker,reviewer:config.reviewer,nonce,budget:String(input.budget),deadline:Math.floor(Date.now()/1000)+input.expiryMinutes*60,createdAt:new Date().toISOString(),stage:'draft',network:'devnet',signatures:{},kind:'live'};
    task.pda=await this.chain.address(task.creator,nonce);
    await this.store.put(task,c);return publicTask(task);
  }
  async reconcile(id,signature,action,c){
    await c.query('SELECT id FROM tasks WHERE id=$1 FOR UPDATE',[id]);
    const task=await this.store.get(id,c), state=await this.chain.read(task);
    invariant(state,'ESCROW_NOT_FOUND');
    if(signature){invariant(['create_task','record_review','settle_task','cancel_task','refund_expired'].includes(action),'INVALID_CHAIN_ACTION',400);await this.chain.signature(task,signature,action);task.signatures[action]=signature;}
    task.chain=state;task.reconciledAt=new Date().toISOString();
    if(state.reviewCommitted){
      const matches=task.source&&hash(task.source)===state.solutionHash&&task.review?.probabilityBps===state.probabilityBps;
      task.commitmentMatches=Boolean(matches);
      if(!matches)task.stage='commitment_mismatch';
      else if(!task.report)task.stage='committed';
    } else if(task.stage==='draft')task.stage='funded';
    if(state.status!==0){
      task.stage=['','settled','cancelled','refunded'][state.status];
      if(state.status===1)task.attestationMatches=Boolean(task.report&&state.reportHash===task.report.reportHash&&state.allPass===task.report.allPass&&task.commitmentMatches);
    }
    await this.store.put(task,c);return publicTask(task);
  }
  async reserveRun(id,c){
    await c.query('SELECT id FROM tasks WHERE id=$1 FOR UPDATE',[id]);
    const task=await this.store.get(id,c);
    invariant(['funded','unavailable','interrupted','worker_done'].includes(task.stage),'RUN_STAGE_INVALID');
    const state=await this.chain.read(task);
    invariant(state?.status===0&&!state.reviewCommitted,'TASK_NOT_FUNDED_OR_REVIEW_ALREADY_COMMITTED');
    invariant(task.deadline>Math.floor(Date.now()/1000),'TASK_EXPIRED');
    const count=Number((await c.query("SELECT count(*) FROM live_attempts WHERE created_at >= date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'")).rows[0].count);
    invariant(count<6,'DAILY_RUN_LIMIT',429);
    const models=await this.modelCheck(this.config);invariant(models.available,models.code,503);
    await c.query('INSERT INTO live_attempts(task_id) VALUES($1)',[id]);
    task.stage=task.source?'reviewer_running':'worker_running';delete task.error;
    await this.store.put(task,c);return task;
  }
  launch(task,lock){
    const job=this.execute(task).catch(()=>{}).finally(async()=>{await lock.release();this.jobs.delete(job);});this.jobs.add(job);
  }
  async execute(task){
    try {
      if(!task.source){
        const started=Date.now();console.info(JSON.stringify({event:'stage_start',stage:'worker',taskId:task.id}));
        const worker=await this.model('worker',task,this.config);
        task=await this.store.update(task.id,t=>{invariant(!t.chain?.reviewCommitted&&!t.source,'SUBMISSION_ALREADY_FROZEN');t.source=worker.source;t.solutionHash=hash(worker.source);t.workerMetadata=worker.metadata;t.stage='worker_done';});
        console.info(JSON.stringify({event:'stage_complete',stage:'worker',taskId:task.id,durationMs:Date.now()-started}));
      }
      await this.store.update(task.id,t=>{t.stage='reviewer_running';});
      const started=Date.now();console.info(JSON.stringify({event:'stage_start',stage:'reviewer',taskId:task.id}));
      const review=await this.model('reviewer',task,this.config);
      await this.store.update(task.id,t=>{invariant(!t.chain?.reviewCommitted&&!t.review,'REVIEW_ALREADY_FROZEN');t.review=review;t.stage='review_ready';});
      console.info(JSON.stringify({event:'stage_complete',stage:'reviewer',taskId:task.id,durationMs:Date.now()-started}));
      console.info(JSON.stringify({event:'run_complete',taskId:task.id}));
    } catch(error){
      const code=error instanceof AppError?error.code:'RUN_INFRASTRUCTURE_ERROR';
      await this.store.update(task.id,t=>{t.stage='unavailable';t.error=code;});
      console.info(JSON.stringify({event:'run_unavailable',taskId:task.id,code}));
    }
  }
  async grade(id,c){
    await c.query('SELECT id FROM tasks WHERE id=$1 FOR UPDATE',[id]);
    const task=await this.store.get(id,c);
    if(task.report)return publicTask(task);
    const state=await this.chain.read(task);
    invariant(state?.status===0&&state.reviewCommitted,'ONCHAIN_REVIEW_REQUIRED');
    invariant(task.deadline>Math.floor(Date.now()/1000),'TASK_EXPIRED');
    invariant(task.source&&task.review&&hash(task.source)===state.solutionHash&&task.review.probabilityBps===state.probabilityBps,'COMMITMENT_MISMATCH');
    invariant(hash(task.fixtures)===task.suiteHash,'SUITE_COMMITMENT_MISMATCH');
    task.chain=state;task.commitmentMatches=true;task.stage='evaluating';
    task.report=await this.grader(task.source,task.fixtures,{outputFormat:task.outputFormat});task.stage='evaluated';
    task.payout=payouts(task.budget,task.review.probabilityBps,task.report.allPass);
    await this.store.put(task,c);return publicTask(task);
  }
  async preview(id){const t=await this.store.get(id);invariant(t.report&&t.review,'EVALUATION_REQUIRED');const state=await this.chain.read(t);invariant(state?.status===0&&state.reviewCommitted&&state.solutionHash===t.solutionHash&&state.probabilityBps===t.review.probabilityBps,'CHAIN_REVIEW_MISMATCH');return {network:'devnet',creator:t.creator,worker:t.worker,reviewer:t.reviewer,pda:t.pda,budget:t.budget,...payouts(t.budget,t.review.probabilityBps,t.report.allPass),allPass:t.report.allPass,reportHash:t.report.reportHash,trustBoundary:'Creator attests the outcome. The program enforces amounts and recipients, not evaluator correctness.'};}
}
