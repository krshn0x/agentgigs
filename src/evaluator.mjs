import {Worker} from 'node:worker_threads';
import {hash,AppError} from './domain.mjs';
export async function evaluate(source, fixtures) {
  if(typeof source!=='string'||Buffer.byteLength(source)>24000||fixtures.length!==20||fixtures.some(f=>f.input.length>8192)) throw new AppError('EVALUATOR_INPUT_LIMIT');
  const raw=await new Promise((resolve,reject)=>{
    let ready=false,done=false;
    const worker=new Worker(new URL('./evaluator-worker.mjs',import.meta.url),{workerData:{source,inputs:fixtures.map(f=>f.input)},resourceLimits:{maxOldGenerationSizeMb:96}});
    const finish=(err,value)=>{if(done)return;done=true;clearTimeout(timer);void worker.terminate();err?reject(err):resolve(value);};
    const timer=setTimeout(()=>ready?finish(null,fixtures.map(()=>({error:'WORKER_WALL_TIMEOUT'}))):finish(new AppError('EVALUATOR_UNAVAILABLE',503)),4000);
    worker.on('message',msg=>{if(msg.ready)ready=true;if(msg.infrastructureError)finish(new AppError('EVALUATOR_UNAVAILABLE',503));if(msg.outputs)finish(null,msg.outputs);});
    worker.on('error',()=>finish(new AppError('EVALUATOR_UNAVAILABLE',503)));
    worker.on('exit',()=>{if(!done)finish(new AppError('EVALUATOR_UNAVAILABLE',503));});
  });
  const tests=raw.map((out,i)=>{let pass=false;try{const parsed=JSON.parse(out.value);pass=Array.isArray(parsed)&&parsed.every(row=>Array.isArray(row)&&row.every(c=>typeof c==='string'))&&JSON.stringify(parsed)===JSON.stringify(fixtures[i].expected);}catch{}return {index:i+1,pass,error:out.error??(pass?undefined:'OUTPUT_MISMATCH')};});
  const report={version:1,solutionHash:hash(source),suiteHash:hash(fixtures),allPass:tests.every(t=>t.pass),tests};
  return {...report,reportHash:hash(report)};
}
