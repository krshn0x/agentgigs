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
      const helper=vm.evalCode(`(function(){const stringify=JSON.stringify,isArray=Array.isArray,keys=Object.keys,isFinite=Number.isFinite;return function(fn,input){let count=0;function encode(v,depth){if(depth>16||++count>8192)throw Error('OUTPUT_LIMIT');if(v===null)return 'null';if(typeof v==='string'||typeof v==='boolean')return stringify(v);if(typeof v==='number'&&isFinite(v))return stringify(v);if(typeof v!=='object')throw Error('INVALID_OUTPUT');let out='';if(isArray(v)){if(v.length>8192)throw Error('OUTPUT_LIMIT');out='[';for(let i=0;i<v.length;i++){if(i)out+=',';out+=encode(v[i],depth+1);if(out.length>32768)throw Error('OUTPUT_LIMIT');}return out+']';}out='{';const names=keys(v);for(let i=0;i<names.length;i++){if(i)out+=',';out+=stringify(names[i])+':'+encode(v[names[i]],depth+1);if(out.length>32768)throw Error('OUTPUT_LIMIT');}return out+'}';}return encode(fn(input),0);}})()`);
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
