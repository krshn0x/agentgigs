import {createHash,randomBytes} from 'node:crypto';
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
