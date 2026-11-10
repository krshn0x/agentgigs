import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {z} from 'zod';
import {readConfig} from './config.mjs';
import {Store} from './store.mjs';
import {Chain} from './chain.mjs';
import {TaskService} from './service.mjs';
import {challenge,verifyChallenge,requireWalletSession,tokenFrom,cookie} from './auth.mjs';
import {hash,invariant,publicTask,AppError,customTaskSchema} from './domain.mjs';
import {checkModels} from './model.mjs';
import {runLab} from '../shared/lab.mjs';

const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
const draftSchema=z.object({budget:z.number().int().min(1).max(100_000_000).default(10_000_000),expiryMinutes:z.number().int().min(5).max(1440).default(30),custom:customTaskSchema.optional()}).strict();
async function readBody(req){let body='';for await(const chunk of req){body+=chunk;invariant(Buffer.byteLength(body)<=40000,'REQUEST_TOO_LARGE',413);}try{return JSON.parse(body||'{}');}catch{throw new AppError('INVALID_JSON',400);}}
export function createApp({config,store,chain,service}){
  let modelStatus,modelCheckedAt=0;
  async function readiness(){
    const db=store.pool?await store.pool.query('SELECT 1').then(()=>({available:true})).catch(()=>({available:false,code:'DATABASE_UNAVAILABLE'})):{available:false,code:'DATABASE_NOT_CONFIGURED'};
    const network=await chain.readiness().catch(e=>({available:false,code:e.code??'DEVNET_UNAVAILABLE'}));
    if(Date.now()-modelCheckedAt>60000){modelStatus=await checkModels(config).catch(e=>({available:false,code:e.code??'MODEL_UNAVAILABLE'}));modelCheckedAt=Date.now();}
    const wallets=network.available?await chain.recipients().catch(e=>({available:false,code:e.code??'WALLETS_UNAVAILABLE'})):{available:false,code:'WALLETS_OR_PROGRAM_NOT_READY'};
    return {available:db.available&&network.available&&modelStatus.available&&wallets.available,database:db,network,models:modelStatus,wallets,mode:'devnet',operator:config.operator,worker:config.worker,reviewer:config.reviewer,programId:config.programId};
  }
  return http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
    // QuickJS WASM runs server-side. Browser has no inline scripts.
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' https: wss:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
    try {
      const url=new URL(req.url,config.origin),path=url.pathname,method=req.method;
      if(path==='/health')return send(200,{ok:true});
      if(method==='GET'&&path==='/api/readiness')return send(200,await readiness());
      if(method==='GET'&&path==='/api/config')return send(200,{operator:config.operator,worker:config.worker,reviewer:config.reviewer,programId:config.programId,network:'devnet'});
      if(method==='GET'&&path==='/api/lab')return send(200,runLab());
      if(method==='GET'&&path==='/api/fixture')return send(200,JSON.parse(await readFile(new URL('../fixtures/public-task.json',import.meta.url),'utf8')));
      if(method==='GET'&&path==='/api/session'){let wallet=null;try{wallet=await requireWalletSession(req,store,config);}catch{}return send(200,{wallet});}
      if(method==='GET'&&path==='/api/tasks')return send(200,{tasks:(await store.list()).map(publicTask)});
      const match=/^\/api\/tasks\/([0-9a-f-]{36})(?:\/(reconcile|run|evaluate|settlement))?$/.exec(path);
      if(method==='GET'&&match&&!match[2])return send(200,publicTask(await store.get(match[1])));
      if(method==='GET'&&match&&match[2]==='settlement')return send(200,await service.preview(match[1]));
      if(path.startsWith('/api/')&&method==='POST'){
        invariant(req.headers.origin===config.origin,'ORIGIN_REJECTED',403);
        invariant(req.headers['content-type']?.split(';')[0]==='application/json','JSON_REQUIRED',415);
        const body=await readBody(req),key=req.headers['idempotency-key'];
        invariant(typeof key==='string'&&/^[A-Za-z0-9_-]{16,100}$/.test(key),'IDEMPOTENCY_KEY_REQUIRED',400);
        const fingerprint=hash({path,body});
        if(path==='/api/auth/challenge'){
          const input=z.object({wallet:z.string().max(44)}).strict().parse(body);

          // The database is the cross-process single-use source of truth.
          const out=await store.idempotent(`auth:${key}`,fingerprint,async c=>({body:await challenge(store,input.wallet,config.origin,c),status:200}));return send(out.status,out.body);
        }
        if(path==='/api/auth/verify'){
          const input=z.object({id:z.uuid(),signature:z.string().max(100)}).strict().parse(body);
          const token=await store.transaction(c=>verifyChallenge(c,input.id,input.signature,null,key));res.setHeader('Set-Cookie',cookie(token,config.origin));return send(200,{wallet:(await store.pool.query('SELECT wallet FROM challenges WHERE id=$1',[input.id])).rows[0].wallet});
        }
        const wallet=await requireWalletSession(req,store,config);
        let lock,launchTask;
        try {
          const out=await store.idempotent(`${wallet}:${key}`,fingerprint,async c=>{
            if(path==='/api/auth/logout'){await c.query('DELETE FROM sessions WHERE token_hash=$1',[hash(tokenFrom(req))]);return {body:{ok:true},status:200};}
            if(path==='/api/tasks')return {body:await service.draft(draftSchema.parse(body),c,wallet),status:201};
            invariant(match,'ROUTE_NOT_FOUND',404);const [,id,action]=match;invariant((await store.get(id,c)).creator===wallet,'TASK_CREATOR_ONLY',403);
            if(action==='reconcile'){const input=z.object({signature:z.string().max(90).optional(),action:z.enum(['create_task','record_review','settle_task','cancel_task','refund_expired']).optional()}).strict().parse(body);return {body:await service.reconcile(id,input.signature,input.action,c),status:200};}
            z.object({}).strict().parse(body);
            if(action==='run'){lock=await store.acquireRunner();launchTask=await service.reserveRun(id,c);return {body:publicTask(launchTask),status:202};}
            if(action==='evaluate')return {body:await service.grade(id,c),status:200};
            throw new AppError('ROUTE_NOT_FOUND',404);
          });
          if(launchTask){service.launch(launchTask,lock);lock=null;}
          if(path==='/api/auth/logout')res.setHeader('Set-Cookie',cookie('',config.origin,true));
          return send(out.status,out.body);
        }finally{if(lock)await lock.release();}
      }
      if(path.startsWith('/api/'))throw new AppError('ROUTE_NOT_FOUND',404);
      invariant(method==='GET'||method==='HEAD','METHOD_NOT_ALLOWED',405);
      const root=resolve(fileURLToPath(new URL('../dist',import.meta.url)));
      let file=resolve(root,'.'+decodeURIComponent(path));invariant(file===root||file.startsWith(root+'/'),'INVALID_PATH',400);
      try{if(!(await stat(file)).isFile())file=resolve(root,'index.html');}catch{file=resolve(root,'index.html');}
      const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':extname(file)==='.html'?'no-cache':'public, max-age=3600'});res.end(method==='HEAD'?undefined:data);
    }catch(error){const known=error instanceof AppError;const validation=error instanceof z.ZodError;const status=known?error.status:validation?400:503;send(status,{error:known?error.code:validation?'INVALID_INPUT':'SERVICE_UNAVAILABLE',...(validation?{details:error.issues.slice(0,5).map(i=>`${i.path.join('.')}: ${i.message}`)}:{})});if(!known&&!validation)console.error(JSON.stringify({event:'request_error',code:'SERVICE_UNAVAILABLE'}));}
  });
}
export async function start(){
  const config=readConfig(),store=new Store(config.databaseUrl),chain=new Chain(config),service=new TaskService(store,chain,config);
  if(store.pool){await store.migrate();await store.recover();}
  const server=createApp({config,store,chain,service});server.listen(config.port,'0.0.0.0',()=>console.info(`Agent Gigs http://localhost:${config.port}`));
  const shutdown=()=>server.close(async()=>{await Promise.allSettled([...service.jobs]);await store.close();process.exit(0);});process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await start();
