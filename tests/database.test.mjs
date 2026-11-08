import test from 'node:test';import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {fileURLToPath} from 'node:url';
import {mkdtemp,readFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {generateKeyPairSync,sign} from 'node:crypto';
import EmbeddedPostgres from 'embedded-postgres';import {getAddressDecoder,generateKeyPairSigner} from '@solana/kit';
import {Store} from '../src/store.mjs';import {TaskService} from '../src/service.mjs';import {createApp} from '../src/server.mjs';import {hash} from '../src/domain.mjs';
const source=await readFile(new URL('./fixtures/solve.txt',import.meta.url),'utf8');
test('real Postgres auth, idempotency, pipeline, quotas and recovery',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'orbit-postgres-'));
  const pg=new EmbeddedPostgres({databaseDir:directory,port:15439,user:'orbit_test',password:'local-test-only',persistent:false,autoRehydrateSymlinks:true,onLog:()=>{},onError:()=>{},initdbFlags:['--locale=C']});
  let store,server;
  try {
    await pg.initialise();await pg.start();
    store=new Store('postgresql://orbit_test:local-test-only@127.0.0.1:15439/postgres');await store.migrate();
    await t.test('read-only preflight recognizes the migrated schema without printing credentials',async()=>{
      const env={...process.env,DATABASE_URL:'postgresql://orbit_test:local-test-only@127.0.0.1:15439/postgres',OPENROUTER_API_KEY:'',OPERATOR_WALLET_ADDRESS:'',WORKER_PAYOUT_ADDRESS:'',REVIEWER_PAYOUT_ADDRESS:'',PROGRAM_ID:'',APP_ORIGIN:'http://localhost:3000',WORKER_MODEL:'qwen/qwen3-coder:free',REVIEWER_MODEL:'qwen/qwen3-coder:free'};
      const result=await promisify(execFile)(process.execPath,[fileURLToPath(new URL('../scripts/preflight.mjs',import.meta.url))],{env}).catch(error=>error);
      assert.equal(result.code,1);const report=JSON.parse(result.stdout);assert.equal(report.available,false);assert.equal(report.checks.database.available,true);assert.ok(report.checks.configuration.missing.includes('OPENROUTER_API_KEY'));assert.ok(!result.stdout.includes('local-test-only'));assert.ok(!result.stdout.includes('postgresql://'));
    });
    const keys=generateKeyPairSync('ed25519'),operator=getAddressDecoder().decode(keys.publicKey.export({type:'spki',format:'der'}).subarray(-32));
    const config={origin:'http://localhost:15440',operator,worker:(await generateKeyPairSigner()).address,reviewer:(await generateKeyPairSigner()).address,programId:(await generateKeyPairSigner()).address,openrouterKey:'',workerModel:'qwen/qwen3-coder:free',reviewerModel:'qwen/qwen3-coder:free'};
    const states=new Map();let modelCalls=[];
    const chain={address:async()=> (await generateKeyPairSigner()).address,read:async task=>states.get(task.id)??null,signature:async()=>{throw new Error('Unverified signatures rejected');},readiness:async()=>({available:false,code:'TEST_CHAIN_FIXTURE'})};
    const service=new TaskService(store,chain,config,{model:async role=>{modelCalls.push(role);return role==='worker'?{source,metadata:{returnedModel:'TEST_FIXTURE'}}:{probabilityBps:8500,explanation:'TEST FIXTURE REVIEW',metadata:{returnedModel:'TEST_FIXTURE'}};},modelCheck:async()=>({available:true})});
    server=createApp({config,store,chain,service});await new Promise(r=>server.listen(15440,'127.0.0.1',r));
    let cookie='';let n=0;
    async function request(path,body,key,options={}){const response=await fetch(config.origin+'/api'+path,{method:body===undefined?'GET':'POST',headers:{Origin:config.origin,'Content-Type':'application/json','Idempotency-Key':key??`integration-key-${++n}`,Cookie:cookie,...options.headers},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')};}
    async function login(){const ch=await request('/auth/challenge',{wallet:operator});assert.equal(ch.status,200);const sig=sign(null,Buffer.from(ch.body.message),keys.privateKey).toString('base64');const key=`verify-request-${++n}`;const auth=await request('/auth/verify',{id:ch.body.id,signature:sig},key);assert.equal(auth.status,200);cookie=auth.cookie.split(';')[0];const retry=await request('/auth/verify',{id:ch.body.id,signature:sig},key);assert.equal(retry.status,200);assert.equal(retry.cookie,auth.cookie);return {challenge:ch.body,signature:sig};}
    await t.test('public reads work, writes require auth and origin, challenge is single-use',async()=>{
      assert.equal((await request('/tasks',{})).status,401);assert.equal((await request('/tasks',{},undefined,{headers:{Origin:'https://evil.test'}})).status,403);
      const credentials=await login();assert.match(cookie,/orbit_session=/);
      assert.equal((await request('/auth/verify',{id:credentials.challenge.id,signature:credentials.signature})).status,401);
      const expired=await request('/auth/challenge',{wallet:operator});await store.pool.query("UPDATE challenges SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.body.id]);
      assert.equal((await request('/auth/verify',{id:expired.body.id,signature:sign(null,Buffer.from(expired.body.message),keys.privateKey).toString('base64')})).status,401);
      const ch=await request('/auth/challenge',{wallet:operator});assert.equal((await request('/auth/verify',{id:ch.body.id,signature:Buffer.alloc(64).toString('base64')})).status,401);
      assert.equal((await request('/auth/challenge',{wallet:config.worker})).status,403);
    });
    let task;
    await t.test('concurrent idempotent drafts persist once; keys cannot change input',async()=>{
      const key='same-create-key-12345',body={budget:10000007,expiryMinutes:30};
      const responses=await Promise.all([request('/tasks',body,key),request('/tasks',body,key)]);assert.equal(responses[0].status,201);assert.deepEqual(responses[0].body,responses[1].body);task=responses[0].body;assert.equal((await store.list()).length,1);assert.equal(task.fixtures,undefined);assert.equal(task.seed,undefined);
      assert.equal((await request('/tasks',{...body,budget:100},key)).status,409);
    });
    await t.test('unfunded run rejected; verified state advances actual sandbox fixture pipeline',async()=>{
      assert.equal((await request(`/tasks/${task.id}/run`,{})).status,409);
      states.set(task.id,{status:0,reviewCommitted:false});const funded=await request(`/tasks/${task.id}/reconcile`,{});assert.equal(funded.body.stage,'funded');
      assert.equal((await request(`/tasks/${task.id}/run`,{})).status,202);await Promise.all([...service.jobs]);
      let saved=await store.get(task.id);assert.equal(saved.stage,'review_ready');assert.deepEqual(modelCalls,['worker','reviewer']);
      assert.equal((await request(`/tasks/${task.id}/evaluate`,{})).status,409);
      states.set(task.id,{status:0,reviewCommitted:true,solutionHash:hash(source),probabilityBps:8000});assert.equal((await request(`/tasks/${task.id}/evaluate`,{})).status,409);
      states.set(task.id,{status:0,reviewCommitted:true,solutionHash:hash(source),probabilityBps:8500});
      const graded=await request(`/tasks/${task.id}/evaluate`,{});assert.equal(graded.status,200);assert.equal(graded.body.report.allPass,true);assert.equal(graded.body.fixtures,undefined);
      const preview=await request(`/tasks/${task.id}/settlement`);assert.equal(preview.status,200);assert.equal(BigInt(preview.body.worker)+BigInt(preview.body.reviewer)+BigInt(preview.body.refund),10000007n);
      assert.equal((await request(`/tasks/${task.id}/run`,{})).status,409);
      states.set(task.id,{...states.get(task.id),status:1,reportHash:graded.body.report.reportHash,allPass:true});const settled=await request(`/tasks/${task.id}/reconcile`,{});assert.equal(settled.body.stage,'settled');assert.equal(settled.body.attestationMatches,true);
      cookie='';const publicRead=await request(`/tasks/${task.id}`);assert.equal(publicRead.status,200);assert.ok(!JSON.stringify(publicRead.body).includes('fixtures'));assert.equal((await request(`/tasks/${task.id}/run`,{})).status,401);await login();
    });
    await t.test('global lock, six daily attempts and restart recovery preserve frozen artifacts',async()=>{
      const lock=await store.acquireRunner();await assert.rejects(store.acquireRunner(),/LIVE_RUN_ALREADY_ACTIVE/);await lock.release();
      const other=(await request('/tasks',{budget:10,expiryMinutes:30})).body;states.set(other.id,{status:0,reviewCommitted:false});await request(`/tasks/${other.id}/reconcile`,{});
      await store.pool.query('INSERT INTO live_attempts(task_id) SELECT $1 FROM generate_series(1,6)',[other.id]);assert.equal((await request(`/tasks/${other.id}/run`,{})).status,429);
      await store.pool.query('DELETE FROM live_attempts');
      await store.update(other.id,t=>{t.source=source;t.solutionHash=hash(source);t.stage='reviewer_running';});await store.recover();assert.equal((await store.get(other.id)).stage,'interrupted');
      modelCalls=[];assert.equal((await request(`/tasks/${other.id}/run`,{})).status,202);await Promise.all([...service.jobs]);assert.deepEqual(modelCalls,['reviewer']);assert.equal((await store.get(other.id)).source,source);
      const reloaded=new Store('postgresql://orbit_test:local-test-only@127.0.0.1:15439/postgres');try{assert.ok((await reloaded.get(task.id)).report.allPass);}finally{await reloaded.close();}
    });
  }finally{if(server)await new Promise(r=>server.close(r));await store?.close();await pg.stop();}
});
