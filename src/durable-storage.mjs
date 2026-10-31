import {DurableObject} from 'cloudflare:workers';
import core,{seed} from './worker.mjs';
import {familySchema,catalogSchema} from './durable-schema.mjs';

function localDatabase(storage){
 return {prepare(sql){let params=[];const statement={sql,params,
  bind(...values){params=values;statement.params=values;return statement;},
  async first(){return storage.sql.exec(sql,...params).toArray()[0]||null;},
  async all(){return {results:storage.sql.exec(sql,...params).toArray()};},
  runSync(){storage.sql.exec(sql,...params).toArray();const info=storage.sql.exec('SELECT changes() AS changes,last_insert_rowid() AS last_row_id').one();return {meta:info};},
  async run(){return statement.runSync();}};return statement;},
  async batch(statements){return storage.transactionSync(()=>statements.map(s=>s.runSync()));}};
}
function initialize(storage,schema){
 storage.sql.exec('CREATE TABLE IF NOT EXISTS _pequi_schema(version INTEGER PRIMARY KEY)');
 if(storage.sql.exec('SELECT version FROM _pequi_schema WHERE version=1').toArray().length)return;
 storage.transactionSync(()=>{
  for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))storage.sql.exec(statement);
  storage.sql.exec('INSERT INTO _pequi_schema(version) VALUES(1)');
 });
}
const shared=sql=>/\b(?:FROM|INTO|UPDATE|JOIN)\s+(?:lessons|admin_audit)\b/i.test(sql);
function routedDatabase(storage,catalog){
 const local=localDatabase(storage);
 return {prepare(sql){
  if(!shared(sql))return local.prepare(sql);
  let params=[];const statement={sql,params,shared:true,bind(...values){params=values;statement.params=values;return statement;},
   first:()=>catalog.query({sql,params,mode:'first'}),all:()=>catalog.query({sql,params,mode:'all'}),run:()=>catalog.query({sql,params,mode:'run'})};return statement;
 },async batch(statements){
  if(statements.every(s=>s.shared))return catalog.batch(statements.map(s=>({sql:s.sql,params:s.params})));
  if(statements.some(s=>s.shared))throw new Error('Transação entre bancos diferentes não suportada.');
  return local.batch(statements);
 }};
}
// O catálogo é a unidade de coordenação do conteúdo compartilhado, sem dados infantis.
export class PequizinhoCatalog extends DurableObject {
 constructor(ctx,env){super(ctx,env);this.db=localDatabase(ctx.storage);ctx.blockConcurrencyWhile(async()=>{initialize(ctx.storage,catalogSchema);if(!ctx.storage.sql.exec('SELECT version FROM _pequi_schema WHERE version=2').toArray().length){await seed(this.db);ctx.storage.sql.exec('INSERT INTO _pequi_schema(version) VALUES(2)');}});}
 async query({sql,params,mode}){const s=this.db.prepare(sql).bind(...params);return mode==='first'?s.first():mode==='all'?s.all():s.run();}
 async batch(statements){return this.db.batch(statements.map(s=>this.db.prepare(s.sql).bind(...s.params)));}
}
// Uma instância por família: sessões, responsáveis, crianças e progresso permanecem juntos.
export class PequizinhoFamily extends DurableObject {
 constructor(ctx,env){super(ctx,env);ctx.blockConcurrencyWhile(async()=>initialize(ctx.storage,familySchema));this.db=routedDatabase(ctx.storage,env.PEQUI_CATALOG.getByName('curriculum-v1'));}
 async handle(input){
  const request=new Request(input.url,{method:input.method,headers:input.headers,...(input.body?{body:input.body}:{})});
  const response=await core.fetch(request,{...this.env,DB:this.db},this.ctx);
  return {status:response.status,headers:[...response.headers],body:await response.text()};
 }
}
async function familyRoute(email){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const routeCookie=value=>`pq_family=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${value?604800:0}`;
export async function durableFetch(request,env,ctx,assets){
 const url=new URL(request.url);
 if(!url.pathname.startsWith('/api/'))return core.fetch(request,{...env,ASSETS:assets||env.ASSETS},ctx);
 if(url.pathname==='/api/health')return Response.json({ok:true,app:'Pequizinho',environment:env.ENVIRONMENT,storage:'durable-sqlite-per-family',billingEnabled:false},{headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
 let route=request.headers.get('cookie')?.match(/(?:^|;\s*)pq_family=([a-f0-9]{64})(?:;|$)/)?.[1];
 let text='';if(!['GET','HEAD'].includes(request.method)){
  if(Number(request.headers.get('content-length'))>50000)return Response.json({error:'Conteúdo muito grande.'},{status:413});
  text=await request.text();if(text.length>50000)return Response.json({error:'Conteúdo muito grande.'},{status:413});
 }
 const auth=['/api/register','/api/login'].includes(url.pathname);
 if(auth){let data;try{data=JSON.parse(text);}catch{}if(!data||typeof data.email!=='string'||data.email.length>254)return Response.json({error:'Informe um e-mail válido.'},{status:400});route=await familyRoute(data.email.trim().toLowerCase());}
 if(!route)return Response.json({error:'Entre com a conta do responsável.'},{status:401,headers:{'Cache-Control':'no-store'}});
 const output=await env.PEQUI_FAMILIES.getByName(route).handle({url:request.url,method:request.method,headers:[...request.headers],body:text});
 const response=new Response(output.body,{status:output.status,headers:output.headers});
 if(auth&&response.ok)response.headers.append('Set-Cookie',routeCookie(route));
 if(url.pathname==='/api/logout'||url.pathname==='/api/account/delete')if(response.ok)response.headers.append('Set-Cookie',routeCookie(''));
 return response;
}
export default {fetch:durableFetch};
