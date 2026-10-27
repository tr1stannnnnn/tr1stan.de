import test,{before,after,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Miniflare} from 'miniflare';
import worker from '../src/index.mjs';
import * as old from '../../game/rules.mjs';
import * as current from '../../game/pf3/rules.mjs';
const secrets={SIGNING_KEY:'pf3-isolated-signing-only-000000000000000',PSEUDONYM_KEY:'pf3-isolated-player-only-111111111111111',RATE_KEY:'pf3-isolated-rate-only-222222222222222'};
let mf,DB,env,now,ip;
const player=()=>crypto.randomUUID();
async function request(path,{body,method=body?'POST':'GET',target=env,address}={}) {
 const r=await worker.fetch(new Request('https://isolated.invalid'+path,{method,headers:{Origin:'https://tr1stan.de','CF-Connecting-IP':address||`203.0.113.${ip++}`,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),target);
 return{status:r.status,data:await r.json()};
}
async function start(version='pf-3',mode='normal',id=player()) {
 const r=await request('/api/run/start',{body:{version,mode,playerId:id}});assert.equal(r.status,200);return{...r.data,playerId:id};
}
const score=(run,gates=10)=>({token:run.token,playerId:run.playerId,alias:'Isolated_Test',score:gates*10,gates,fragments:0,bonusPoints:0,activeMs:100000});
before(async()=>{
 mf=new Miniflare({modules:true,script:await readFile(new URL('../.test-build/index.js',import.meta.url),'utf8'),compatibilityDate:'2026-06-11',d1Databases:{DB:'pf3-isolated-versions'},bindings:{}});
 DB=await mf.getD1Database('DB');
 for(const file of['0001_initial.sql','0002_escape_pf2.sql','0003_pf3.sql']){const sql=(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8')).replace(/^--.*$/gm,'');await DB.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>DB.prepare(s)));}
 env={DB,ENABLED:'true',ENVIRONMENT:'production',PF3_STARTS:'true',LEGACY_STARTS:'true',ACTIVE_RULESET:'pf-3',...secrets};
});
beforeEach(t=>{now=Date.parse('2026-10-27T12:00:00Z');ip=1;t.mock.method(Date,'now',()=>now);return DB.batch(['runs_v2','scores_v2','runs_v3','scores_v3','rate_buckets'].map(table=>DB.prepare(`DELETE FROM ${table}`)));});
after(()=>mf.dispose());
test('New tokens have independent prefix, seed and version; legacy API default remains pf-2',async()=>{
 const a=await start('pf-2','daily'),b=await start('pf-3','daily');
 assert(a.token.startsWith('pf2.'));assert(b.token.startsWith('pf3.'));
 assert.equal(a.seed,old.dailySeed(a.day));assert.equal(b.seed,current.dailySeed(b.day));assert.notEqual(a.seed,b.seed);
 assert.equal((await request('/api/leaderboard?mode=alltime')).data.version,'pf-2');
 assert.equal((await request('/api/leaderboard?mode=alltime&version=pf-3')).data.version,'pf-3');
 assert.equal((await request('/api/leaderboard?mode=alltime&version=pf-3&version=pf-2')).status,400);
 assert.equal((await request('/api/leaderboard?mode=alltime&version=__proto__')).status,400);
});
test('Issued pf-2 runs remain valid after legacy starts are disabled, including retry after expiry',async()=>{
 const run=await start('pf-2');now+=120000;env.LEGACY_STARTS='false';
 try {
  const target={...env,LEGACY_STARTS:'false'},payload=score(run),r=await request('/api/score',{body:payload,target});
  assert.equal(r.status,200);assert.equal(r.data.version,'pf-2');
  assert.equal((await request('/api/run/start',{body:{version:'pf-2',mode:'normal',playerId:player()},target})).status,409);
  now=run.expiresAt+1;const retry=await request('/api/score',{body:payload,target});assert.deepEqual(retry,r);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v2').first()).n,1);
  assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v3').first()).n,0);
 }finally{env.LEGACY_STARTS='true';}
});
test('pf-3 starts can be held without breaking pf-2 or already issued pf-3 score receipts',async()=>{
 const run=await start();const target={...env,PF3_STARTS:'false'};
 assert.equal((await request('/api/run/start',{body:{version:'pf-3',mode:'normal',playerId:player()},target})).status,503);
 assert.equal((await request('/api/run/start',{body:{version:'pf-2',mode:'normal',playerId:player()},target})).status,200);
 now+=120000;assert.equal((await request('/api/score',{body:score(run),target})).status,200);
});
test('Same browser Normal/Daily and pf-2/pf-3 bests stay separated; no copy or overwrite',async()=>{
 const id=player(),runs=[];for(const version of['pf-2','pf-3'])for(const mode of['normal','daily'])runs.push(await start(version,mode,id));
 now+=120000;for(const run of runs)assert.equal((await request('/api/score',{body:score(run)})).status,200);
 assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v2').first()).n,2);
 assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v3').first()).n,2);
 for(const version of['pf-2','pf-3'])for(const mode of['alltime','daily']){const r=await request(`/api/leaderboard?mode=${mode}&version=${version}`);assert.equal(r.data.version,version);assert.equal(r.data.entries.length,1);}
});
test('Version-specific active time is enforced independently; pf-3 boundary19980 has matching components',async()=>{
 const a=await start('pf-2'),b=await start();now+=1000000;
 const gates=100,fast=current.minimumActiveMs(gates);
 assert(fast<old.minimumActiveMs(gates));
 const newer={...score(b,gates),activeMs:fast},older={...score(a,gates),activeMs:fast};
 assert.equal((await request('/api/score',{body:older})).status,422);
 assert.equal((await request('/api/score',{body:newer})).status,200);
 const max=await start();const elapsed=current.minimumActiveMs(1000);now+=elapsed+2000;
 const payload={...score(max,1000),score:19980,fragments:1000,bonusPoints:9980,activeMs:elapsed};
 assert.equal((await request('/api/score',{body:{...payload,score:19981}})).status,400);
 assert.equal((await request('/api/score',{body:{...payload,bonusPoints:9978}})).status,422);
 assert.equal((await request('/api/score',{body:payload})).status,200);
});
test('Tampered version/prefix/seed and wrong player cannot move a run into another namespace',async()=>{
 const run=await start();now+=120000;
 const payload=score(run);
 assert.equal((await request('/api/score',{body:{...payload,token:run.token.replace('pf3.','pf2.')}})).status,401);
 assert.equal((await request('/api/score',{body:{...payload,playerId:player()}})).status,403);
 assert.equal((await DB.prepare('SELECT COUNT(*) AS n FROM scores_v3').first()).n,0);
});
test('Atomic rate counters are shared across versions and cannot be doubled by version switching',async()=>{
 const address='198.51.100.88';
 for(let i=0;i<10;i++)assert.equal((await request('/api/run/start',{address,body:{version:i%2?'pf-3':'pf-2',mode:'normal',playerId:player()}})).status,200);
 assert.equal((await request('/api/run/start',{address,body:{version:'pf-3',mode:'normal',playerId:player()}})).status,429);
 assert.equal((await DB.prepare('SELECT (SELECT COUNT(*) FROM runs_v2)+(SELECT COUNT(*) FROM runs_v3) AS n').first()).n,10);
});
