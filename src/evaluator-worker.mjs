import {parentPort,workerData} from 'node:worker_threads';
import {getQuickJS} from 'quickjs-emscripten';
// Host comparisons happen in evaluator.mjs. The candidate never receives expectations.
try {
  const QuickJS=await getQuickJS();
  parentPort.postMessage({ready:true});
  const outputs=[];
  for(const input of workerData.inputs) {
    const rt=QuickJS.newRuntime(); rt.setMemoryLimit(16*1024*1024); rt.setMaxStackSize(256*1024);
    const end=Date.now()+100; rt.setInterruptHandler(()=>Date.now()>end);
    const vm=rt.newContext();
    try {
      // Keep this trusted closure handle in the worker, never on the candidate's global object.
      const helper=vm.evalCode(`(function(){const stringifyCell=JSON.stringify;const isArray=Array.isArray;return function(fn,input){const data=fn(input);if(!isArray(data)||data.length>8192)return undefined;let encoded='[';for(let r=0;r<data.length;r++){const row=data[r];if(!isArray(row)||row.length>8192)return undefined;if(r)encoded+=',';encoded+='[';for(let c=0;c<row.length;c++){const cell=row[c];if(typeof cell!=='string')return undefined;if(c)encoded+=',';encoded+=stringifyCell(cell);if(encoded.length>32768)return undefined;}encoded+=']';}return encoded+']';}})()`);
      if(helper.error){helper.error.dispose();throw new Error('HELPER_INITIALIZATION');}
      try {
        // Source is its own script, so top-level return/closing-brace injection cannot bypass validation.
        const loaded=vm.evalCode(workerData.source);
        if(loaded.error){loaded.error.dispose();outputs.push({error:'CANDIDATE_EXCEPTION_OR_LIMIT'});continue;}
        loaded.value.dispose();
        const fn=vm.evalCode('typeof solve === "function" ? solve : undefined');
        if(fn.error){fn.error.dispose();outputs.push({error:'CANDIDATE_EXCEPTION_OR_LIMIT'});continue;}
        const arg=vm.newString(input);
        try {
          const result=vm.callFunction(helper.value,vm.undefined,fn.value,arg);
          if(result.error){result.error.dispose();outputs.push({error:'CANDIDATE_EXCEPTION_OR_LIMIT'});}
          else{const value=vm.dump(result.value);result.value.dispose();outputs.push(typeof value==='string'&&value.length<=32768?{value}:{error:'INVALID_OR_LARGE_OUTPUT'});}
        }finally{arg.dispose();fn.value.dispose();}
      }finally{helper.value.dispose();}
    } finally {vm.dispose();rt.dispose();}
  }
  parentPort.postMessage({outputs});
} catch {parentPort.postMessage({infrastructureError:'EVALUATOR_INITIALIZATION_OR_RUNTIME'});}
