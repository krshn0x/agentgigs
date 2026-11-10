import {createHash,randomBytes} from 'node:crypto';
import {z} from 'zod';
const jsonValue=z.json().refine(v=>JSON.stringify(v).length<=8192,'Expected output must be at most 8192 characters');
export const customTaskSchema=z.object({title:z.string().trim().min(3).max(120),instructions:z.string().trim().min(20).max(6000),examples:z.array(z.object({input:z.string().max(8192),output:jsonValue}).strict()).min(1).max(5),tests:z.array(z.object({input:z.string().max(8192),expected:jsonValue}).strict()).min(1).max(20)}).strict();
export const canonicalJson=value=>JSON.stringify(value===null||typeof value!=='object'?value:Array.isArray(value)?value.map(v=>JSON.parse(canonicalJson(v))):Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(canonicalJson(value[k]))])));
export function customDefinition(value){const c=customTaskSchema.parse(value);return {title:c.title,specification:c.instructions+'\nImplement function solve(input: string). Return a JSON-compatible value. No imports, exports, filesystem, network, or host APIs. Outputs are compared as JSON; object key order is ignored. Arrays preserve order.',examples:c.examples,fixtures:c.tests,suiteHash:hash(c.tests),taskType:'custom',outputFormat:'json',testCount:c.tests.length};}

export const hash = value => createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
export const SPEC = 'Implement function solve(input: string): string[][] for valid CSV. Support quoted commas, doubled quote escapes, CRLF and LF row separators, empty cells, and newlines inside quoted cells. A final row separator does not create an extra row. Empty input returns [[""]]. No imports or exports. Return arrays of strings only. Do not mutate global JSON or host APIs.';
export const examples=[{input:'a,b\nc,d',output:[['a','b'],['c','d']]},{input:'"a,b","c""d"\r\n,',output:[['a,b','c"d'],['','']]}];
export function createSuite(seed=randomBytes(32).toString('hex')) {
  let counter=0;
  const next = n => parseInt(hash(`${seed}:${counter++}`).slice(0,8),16)%n;
  const words=['','alpha','x,y','say "hi"','line\nbreak','Ω','space here','0'];
  const fixtures=[];
  for(let k=0;k<20;k++) {
    const expected=Array.from({length:1+next(4)},()=>Array.from({length:1+next(4)},()=>words[next(words.length)]+(next(3)===0?next(100):'')));
    const delimiter=next(2)?'\n':'\r\n';
    const input=expected.map(row=>row.map(cell=>cell===''||/[",\r\n]/.test(cell)||next(2)?`"${cell.replaceAll('"','""')}"`:cell).join(',')).join(delimiter)+(next(2)?delimiter:'');
    fixtures.push({input,expected});
  }
  return {seed,fixtures,suiteHash:hash(fixtures)};
}
export function publicTask(task) {
  const {seed,fixtures,...safe}=task;
  return safe;
}
export class AppError extends Error {constructor(code,status=400){super(code);this.code=code;this.status=status;}}
export const invariant=(condition,code,status=409)=>{if(!condition)throw new AppError(code,status);};
