import assert from 'node:assert/strict';
import {curriculum} from '../src/curriculum.mjs';
if(!process.argv[2])throw new Error('Informe a URL da prévia local.');
const origin=new URL(process.argv[2]).origin;
const cookies=new Map();const password=crypto.randomUUID()+crypto.randomUUID();
async function api(path,data){const r=await fetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:data?JSON.stringify(data):undefined});const b=await r.json();assert.ok(r.ok,JSON.stringify({path,status:r.status,body:b}));for(const cookie of r.headers.getSetCookie()){const [name,...value]=cookie.split(';')[0].split('=');cookies.set(name,value.join('='));}return b;}
assert.equal((await api('/api/health')).ok,true);
await api('/api/register',{name:'Teste descartável',email:`qa-${crypto.randomUUID()}@example.test`,password,consent:true});
const child=await api('/api/children',{nickname:'Explorador de teste',age_band:'7-9',avatar:'pequi'});
await api('/api/child-mode',{});
for(const lesson of curriculum){const current=await api(`/api/lesson?child=${child.id}&id=${lesson.id}`);for(const [index,c]of lesson.challenges.entries())await api('/api/answer',{child_id:child.id,lesson_id:lesson.id,revision:current.revision,index,answer:c.answer});const result=await api('/api/complete',{child_id:child.id,lesson_id:lesson.id,revision:current.revision});assert.equal(result.points,40);}
const dashboard=await api('/api/dashboard?child='+child.id);assert.equal(dashboard.progress.points,320);assert.equal(dashboard.progress.stars,24);assert.equal(dashboard.progress.completed.length,8);
await api('/api/parent/unlock',{password});assert.equal((await api('/api/parent/dashboard')).children.length,1);
assert.equal((await api('/api/subscription/sandbox',{})).billing_enabled,false);
await api('/api/account/delete',{confirm:'EXCLUIR'});
console.log('Smoke no runtime Wrangler: cadastro, perfil, 8 aulas, 32 respostas, 320 pontos, 24 estrelas, painel, sandbox e exclusão: OK.');
