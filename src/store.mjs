import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {invariant,AppError} from './domain.mjs';
export class Store {
  constructor(url) {this.pool=url?new pg.Pool({connectionString:url,max:6,connectionTimeoutMillis:5000}):null;}
  async migrate(){invariant(this.pool,'DATABASE_NOT_CONFIGURED',503);await this.pool.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));}
  async transaction(fn) {invariant(this.pool,'DATABASE_NOT_CONFIGURED',503);const c=await this.pool.connect();try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  async list(){if(!this.pool)return [];return (await this.pool.query('SELECT data FROM tasks ORDER BY created_at DESC LIMIT 100')).rows.map(r=>r.data);}
  async get(id,c=this.pool){invariant(c,'DATABASE_NOT_CONFIGURED',503);const r=await c.query('SELECT data FROM tasks WHERE id=$1',[id]);invariant(r.rows.length,'TASK_NOT_FOUND',404);return r.rows[0].data;}
  async put(task,c=this.pool){await c.query('INSERT INTO tasks(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=excluded.data',[task.id,task]);return task;}
  async update(id,fn){return this.transaction(async c=>{await c.query('SELECT id FROM tasks WHERE id=$1 FOR UPDATE',[id]);const t=await this.get(id,c);await fn(t,c);return this.put(t,c);});}
  async idempotent(key,fingerprint,fn){return this.transaction(async c=>{
    await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[key]);
    const prior=(await c.query('SELECT * FROM idempotency WHERE key=$1',[key])).rows[0];
    if(prior){invariant(prior.fingerprint===fingerprint,'IDEMPOTENCY_KEY_REUSED');return {body:prior.response,status:prior.status};}
    const result=await fn(c);await c.query('INSERT INTO idempotency(key,fingerprint,response,status) VALUES($1,$2,$3,$4)',[key,fingerprint,result.body,result.status??200]);return result;
  });}
  async acquireRunner(){invariant(this.pool,'DATABASE_NOT_CONFIGURED',503);const c=await this.pool.connect();const locked=(await c.query('SELECT pg_try_advisory_lock(8719915) AS locked')).rows[0].locked;if(!locked){c.release();throw new AppError('LIVE_RUN_ALREADY_ACTIVE',409);}return {client:c,release:async()=>{try{await c.query('SELECT pg_advisory_unlock(8719915)');}finally{c.release();}}};}
  async recover(){const lock=await this.acquireRunner();try{await this.pool.query(`UPDATE tasks SET data=jsonb_set(jsonb_set(data,'{stage}','"interrupted"'),'{error}','"INTERRUPTED_EXPLICIT_RETRY_REQUIRED"') WHERE data->>'stage' IN ('worker_running','reviewer_running','evaluating')`);}finally{await lock.release();}}
  async close(){await this.pool?.end();}
}
