import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createSuite,SPEC,examples,hash} from '../src/domain.mjs';
import {evaluate} from '../src/evaluator.mjs';
import {payouts} from '../shared/payout.mjs';
const source=await readFile(new URL('../tests/fixtures/solve.txt',import.meta.url),'utf8'),suite=createSuite('orbit-labeled-fixture-v1');
const report=await evaluate(source,suite.fixtures);
const terms={specification:SPEC,examples,policyVersion:1};
const fixture={id:'fixture',kind:'fixture',title:'Repair a CSV parser',stage:'evaluated',...terms,budget:'10000000',deadline:1794124800,createdAt:'2026-11-08T00:00:00.000Z',source,solutionHash:hash(source),suiteHash:suite.suiteHash,specificationHash:hash(terms),workerMetadata:{returnedModel:'Handwritten fixture · no AI call'},review:{probabilityBps:8500,explanation:'Handwritten fixture review: this state machine handles quoted delimiters and doubled quote escapes. This is not a live model prediction.',metadata:{returnedModel:'Handwritten fixture'}},report,payout:payouts('10000000',8500,report.allPass),signatures:{}};
await mkdir(new URL('../fixtures/',import.meta.url),{recursive:true});await writeFile(new URL('../fixtures/public-task.json',import.meta.url),JSON.stringify(fixture,null,2)+'\n');console.log(`Labeled fixture: ${report.tests.filter(t=>t.pass).length}/20 local tests passed. No model or chain calls.`);
