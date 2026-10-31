import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {curriculum,normalize} from '../src/curriculum.mjs';
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'dist/worker.mjs',compatibilityDate:'2026-10-30',d1Databases:['DB'],bindings:{ENVIRONMENT:'local-test'}}));
try{
 const db=await mf.getD1Database('DB');
 for(const name of ['0001_initial.sql','0002_seed.sql','0003_study_days.sql']){
  const source=await readFile('migrations/'+name,'utf8');
  for(const statement of source.split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 const origin='https://pequi.test';let cookie='';const password=crypto.randomUUID()+crypto.randomUUID();
 async function api(path,data){const r=await mf.dispatchFetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:cookie},body:data?JSON.stringify(data):undefined});const b=await r.json();assert.ok(r.ok,JSON.stringify({path,status:r.status,body:b}));if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return b;}
 assert.equal((await mf.dispatchFetch(origin+'/')).status,200);
 assert.equal((await mf.dispatchFetch(origin+'/brand.webp')).headers.get('content-type'),'image/webp');
 assert.equal((await mf.dispatchFetch(origin+'/audio/hello.mp3')).status,200);
 await api('/api/register',{name:'QA descartável',email:'qa@example.test',password,consent:true});
 const child=await api('/api/children',{nickname:'Explorador QA',age_band:'7-9',avatar:'pequi'});
 await api('/api/child-mode',{});
 for(const lesson of curriculum){const current=await api(`/api/lesson?child=${child.id}&id=${lesson.id}`);for(const [index,c]of lesson.challenges.entries()){const answer=await api('/api/answer',{child_id:child.id,lesson_id:lesson.id,revision:current.revision,index,answer:c.answer});assert.equal(answer.correct,true);}assert.equal((await api('/api/complete',{child_id:child.id,lesson_id:lesson.id,revision:current.revision})).points,40);}
 const progress=await api('/api/dashboard?child='+child.id);assert.equal(progress.progress.points,320);assert.equal(progress.progress.stars,24);
 await api('/api/parent/unlock',{password});assert.equal((await api('/api/parent/dashboard')).children.length,1);assert.equal((await api('/api/subscription/sandbox',{})).billing_enabled,false);
 const parent=await db.prepare('SELECT id FROM parents WHERE email=?').bind('qa@example.test').first();
 await db.prepare("UPDATE parents SET role='admin' WHERE id=?").bind(parent.id).run();
 const admin=await api('/api/admin/lessons');assert.equal(admin.lessons.length,8);
 await api('/api/admin/lessons',{...admin.lessons[0],title:'Hello, Cerrado! — QA'});
 await api('/api/account/delete',{confirm:'EXCLUIR'});
 const remaining=await db.prepare('SELECT COUNT(*) AS n FROM children').first();assert.equal(remaining.n,0);
 console.log('Runtime Workers + D1 (Miniflare): cadastro, cookie, 8 aulas/32 respostas, 320 pontos, 24 estrelas, painel, administração, sandbox e exclusão: OK.');
}finally{await mf.dispose();}
