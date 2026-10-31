import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import assert from 'node:assert/strict';
import {curriculum} from '../src/curriculum.mjs';
const mf=new Miniflare(convertV4MiniflareOptions({modules:true,scriptPath:'dist/durable-worker.mjs',compatibilityDate:'2026-10-30',durableObjects:{PEQUI_CATALOG:{className:'PequizinhoCatalog',useSQLite:true},PEQUI_FAMILIES:{className:'PequizinhoFamily',useSQLite:true}},bindings:{ENVIRONMENT:'staging'}}));
try{
 const origin='https://pequi.test';const password=crypto.randomUUID()+crypto.randomUUID();let cookies=new Map();
 async function api(path,data,expected=200){const res=await mf.dispatchFetch(origin+path,{method:data?'POST':'GET',headers:{...(data?{'Content-Type':'application/json',Origin:origin}:{}),Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')},body:data?JSON.stringify(data):undefined});const body=await res.json();assert.ok(res.status===expected,JSON.stringify({path,status:res.status,body}));for(const cookie of res.headers.getSetCookie()){const [name,...value]=cookie.split(';')[0].split('=');cookies.set(name,value.join('='));}return body;}
 assert.equal((await api('/api/health')).storage,'durable-sqlite-per-family');
 assert.equal((await mf.dispatchFetch(origin+'/')).status,200);
 await api('/api/register',{name:'QA família A',email:'qa-a@example.test',password,consent:true},201);
 const aCookies=new Map(cookies);
 const child=await api('/api/children',{nickname:'Bia',age_band:'7-9',avatar:'pequi'},201);
 await api('/api/child-mode',{});
 for(const lesson of curriculum){const current=await api(`/api/lesson?child=${child.id}&id=${lesson.id}`);for(const [index,c]of lesson.challenges.entries())assert.equal((await api('/api/answer',{child_id:child.id,lesson_id:lesson.id,revision:current.revision,index,answer:c.answer})).correct,true);assert.equal((await api('/api/complete',{child_id:child.id,lesson_id:lesson.id,revision:current.revision})).points,40);}
 assert.equal((await api('/api/dashboard?child='+child.id)).progress.points,320);
 cookies=new Map();await api('/api/register',{name:'QA família B',email:'qa-b@example.test',password,consent:true},201);
 await api('/api/dashboard?child='+child.id,null,404);
 cookies=aCookies;await api('/api/parent/unlock',{password});
 assert.equal((await api('/api/parent/dashboard')).children[0].progress.stars,24);
 await api('/api/account/delete',{confirm:'EXCLUIR'});
 await api('/api/me',null,401);
 cookies=new Map();await api('/api/login',{email:'qa-b@example.test',password});await api('/api/account/delete',{confirm:'EXCLUIR'});
 console.log('Durable SQLite: 8 aulas/32 respostas, 320 pontos, 24 estrelas, cookie de roteamento, isolamento entre instâncias, painel e exclusão: OK.');
}finally{await mf.dispose();}
