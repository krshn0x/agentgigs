// Explicit diagnostic: two real free model calls, without task writes or transactions.
import {readConfig} from '../src/config.mjs';
import {callModel,checkModels} from '../src/model.mjs';
import {createSuite} from '../src/domain.mjs';
import {evaluate} from '../src/evaluator.mjs';
try {
  const config=readConfig();
  const readiness=await checkModels(config);
  console.info(JSON.stringify({event:'model_smoke_readiness',...readiness}));
  if(!readiness.available)process.exitCode=1;
  else {
    const worker=await callModel('worker',{},config);
    const reviewer=await callModel('reviewer',{source:worker.source},config);
    const report=await evaluate(worker.source,createSuite().fixtures);
    console.info(JSON.stringify({event:'model_smoke_complete',workerModel:worker.metadata.returnedModel,reviewerModel:reviewer.metadata.returnedModel,allPass:report.allPass,probabilityBps:reviewer.probabilityBps,note:'Diagnostic only: no escrow task, commitment, or payout.'}));
  }
} catch(error){console.info(JSON.stringify({event:'model_smoke_failed',code:error.code??'SMOKE_INFRASTRUCTURE_ERROR'}));process.exitCode=1;}
