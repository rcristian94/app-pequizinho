import {curriculum, normalize, streakFor, validateLesson} from './curriculum.mjs';
const enc = new TextEncoder();
const hash = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const random = () => crypto.randomUUID()+crypto.randomUUID();
export async function passwordHash(password,salt) {
 const key=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);
 return [...new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:enc.encode(salt),iterations:100000,hash:'SHA-256'},key,256))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function equal(a,b) { if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0; }
class AppError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new AppError(status,message);};
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Araguaina'}).format(new Date());
const rows=async(db,sql,...params)=>(await db.prepare(sql).bind(...params).all()).results;
const first=async(db,sql,...params)=>db.prepare(sql).bind(...params).first();
const run=async(db,sql,...params)=>db.prepare(sql).bind(...params).run();
function safeParent(p){return {id:p.id,name:p.name,email:p.email,role:p.role};}
async function body(request){const text=await request.text();if(text.length>50000)fail(413,'Conteúdo muito grande.');try{return JSON.parse(text);}catch{fail(400,'Dados inválidos.');}}
async function limit(db,key,max=15){
 const window=Math.floor(Date.now()/600000);
 await run(db,'INSERT INTO auth_limits(key,window,count) VALUES(?,?,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window',key,window);
 const record=await first(db,'SELECT count FROM auth_limits WHERE key=?',key);if(record.count>max)fail(429,'Muitas tentativas. Aguarde alguns minutos.');
}
async function newSession(db,parentId){
 const token=random();const now=Date.now();await db.batch([
 db.prepare('DELETE FROM sessions WHERE expires<?').bind(now),
 db.prepare('INSERT INTO sessions(token_hash,parent_id,expires,adult_until) VALUES(?,?,?,?)').bind(await hash(token),parentId,now+7*86400000,now+15*60000)]);
 return `pq_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`;
}
async function session(request,db,adult=false){
 const cookie=request.headers.get('cookie')||'';const token=cookie.match(/(?:^|;\s*)pq_session=([^;]+)/)?.[1];if(!token)fail(401,'Entre com a conta do responsável.');
 const record=await first(db,'SELECT p.*,s.token_hash,s.adult_until FROM sessions s JOIN parents p ON p.id=s.parent_id WHERE s.token_hash=? AND s.expires>?',await hash(token),Date.now());
 if(!record)fail(401,'Sua sessão expirou. Entre novamente.');if(adult&&record.adult_until<Date.now())fail(403,'Confirme a senha do responsável para continuar.');return record;
}
async function ownChild(db,parent,id){const child=await first(db,'SELECT * FROM children WHERE id=? AND parent_id=?',id,parent.id);if(!child)fail(404,'Perfil não encontrado.');return child;}
async function catalog(db){return rows(db,'SELECT id,unit_id,unit_title,title,description,sort_order,published,revision FROM lessons WHERE published=1 ORDER BY sort_order');}
async function progress(db,childId){
 const completed=await rows(db,'SELECT lesson_id,points,stars,completed_day FROM progress WHERE child_id=?',childId);
 const activity=await rows(db,'SELECT lesson_id,study_day FROM study_activity WHERE child_id=?',childId);
 const day=today();return {completed,activity,points:completed.reduce((s,p)=>s+p.points,0),stars:completed.reduce((s,p)=>s+p.stars,0),streak:streakFor(activity.map(p=>p.study_day),day),today:activity.filter(p=>p.study_day===day).length};
}
async function unlocked(db,child,lesson){
 const prev=await first(db,'SELECT id FROM lessons WHERE published=1 AND sort_order<? ORDER BY sort_order DESC LIMIT 1',lesson.sort_order);
 if(prev&&!await first(db,'SELECT 1 FROM progress WHERE child_id=? AND lesson_id=?',child.id,prev.id))fail(403,'Conclua a aventura anterior para abrir esta aula.');
}
async function api(request,env){
 const db=env.DB;if(!db)fail(503,'Banco de dados ainda não configurado.');const url=new URL(request.url),path=url.pathname,method=request.method;
 if(!['GET','HEAD'].includes(method)){
  if(request.headers.get('origin')!==url.origin)fail(403,'Origem da solicitação inválida.');
  if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'Use JSON.');
 }
 if(path==='/api/health')return json({ok:true,app:'Pequizinho',environment:env.ENVIRONMENT||'local',billingEnabled:false});
 if(path==='/api/register'&&method==='POST'){
  const b=await body(request);await limit(db,'register:'+await hash(request.headers.get('CF-Connecting-IP')||'local'),5);
  if(typeof b.email!=='string'||!/^\S+@\S+\.\S+$/.test(b.email)||b.email.length>254||typeof b.name!=='string'||!b.name.trim()||b.name.length>80||typeof b.password!=='string'||b.password.length<12||b.password.length>128||b.consent!==true)fail(400,'Informe nome, e-mail, senha de 12 a 128 caracteres e autorização do responsável.');
  const email=b.email.trim().toLowerCase();if(await first(db,'SELECT id FROM parents WHERE email=?',email))fail(409,'Não foi possível cadastrar. Tente entrar com sua conta.');
  const id=crypto.randomUUID(),salt=random(),digest=await passwordHash(b.password,salt);
  await db.batch([db.prepare('INSERT INTO parents(id,email,name,password_hash,salt,consent_at) VALUES(?,?,?,?,?,?)').bind(id,email,b.name.trim(),digest,salt,new Date().toISOString()),db.prepare('INSERT INTO subscriptions(parent_id) VALUES(?)').bind(id)]);
  return json({parent:{id,name:b.name.trim(),email,role:'parent'}},201,{'Set-Cookie':await newSession(db,id)});
 }
 if(path==='/api/login'&&method==='POST'){
  const b=await body(request);const email=String(b.email||'').trim().toLowerCase();await limit(db,'login:'+await hash(email));await limit(db,'login-ip:'+await hash(request.headers.get('CF-Connecting-IP')||'local'),40);
  if(typeof b.password!=='string'||b.password.length>128)fail(400,'Senha inválida.');
  const p=await first(db,'SELECT * FROM parents WHERE email=?',email);const digest=await passwordHash(b.password,p?.salt||'nonexistent-account-salt');
  if(!p||!equal(digest,p.password_hash))fail(401,'E-mail ou senha incorretos.');
  return json({parent:safeParent(p)},200,{'Set-Cookie':await newSession(db,p.id)});
 }
 const p=await session(request,db);
 if(path==='/api/logout'&&method==='POST'){await run(db,'DELETE FROM sessions WHERE token_hash=?',p.token_hash);return json({ok:true},200,{'Set-Cookie':'pq_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});}
 if(path==='/api/me')return json({parent:safeParent(p),children:await rows(db,'SELECT * FROM children WHERE parent_id=? ORDER BY created_at',p.id),adult:p.adult_until>Date.now()});
 if(path==='/api/parent/unlock'&&method==='POST'){
  const b=await body(request);await limit(db,'unlock:'+p.id,10);if(typeof b.password!=='string'||b.password.length>128||!equal(await passwordHash(b.password,p.salt),p.password_hash))fail(401,'Senha incorreta.');
  await run(db,'UPDATE sessions SET adult_until=? WHERE token_hash=?',Date.now()+15*60000,p.token_hash);return json({ok:true});
 }
 if(path==='/api/child-mode'&&method==='POST'){await run(db,'UPDATE sessions SET adult_until=0 WHERE token_hash=?',p.token_hash);return json({ok:true});}
 if(path==='/api/children'&&method==='POST'){
  await session(request,db,true);const b=await body(request);if(typeof b.nickname!=='string'||!b.nickname.trim()||b.nickname.length>30||!['4-6','7-9','10-12'].includes(b.age_band))fail(400,'Informe apelido (até 30 letras) e faixa etária.');
  if((await first(db,'SELECT COUNT(*) AS n FROM children WHERE parent_id=?',p.id)).n>=5)fail(400,'Limite de cinco perfis por família.');
  const id=crypto.randomUUID();await run(db,'INSERT INTO children(id,parent_id,nickname,age_band,avatar) VALUES(?,?,?,?,?)',id,p.id,b.nickname.trim(),b.age_band,['pequi','bird','cat','dog'].includes(b.avatar)?b.avatar:'pequi');return json({id},201);
 }
 if(path==='/api/parent/dashboard'){
  await session(request,db,true);const kids=await rows(db,'SELECT * FROM children WHERE parent_id=?',p.id);
  for(const child of kids)child.progress=await progress(db,child.id);
  return json({children:kids,subscription:await first(db,'SELECT status,price_cents,currency,billing_enabled FROM subscriptions WHERE parent_id=?',p.id),catalog:await catalog(db)});
 }
 if(path==='/api/subscription/sandbox'&&method==='POST'){
  await session(request,db,true);return json({status:'sandbox',price_cents:990,billing_enabled:false,message:'Simulação concluída. Nenhuma cobrança foi criada.'});
 }
 if(path==='/api/children/delete'&&method==='POST'){
  await session(request,db,true);const b=await body(request);await ownChild(db,p,b.id);await run(db,'DELETE FROM children WHERE id=? AND parent_id=?',b.id,p.id);return json({ok:true});
 }
 if(path==='/api/account/export'){
  await session(request,db,true);const children=await rows(db,'SELECT * FROM children WHERE parent_id=?',p.id);for(const child of children)child.progress=await progress(db,child.id);return json({parent:safeParent(p),children});
 }
 if(path==='/api/account/delete'&&method==='POST'){
  await session(request,db,true);const b=await body(request);if(b.confirm!=='EXCLUIR')fail(400,'Confirme a exclusão.');await run(db,'DELETE FROM parents WHERE id=?',p.id);return json({ok:true},200,{'Set-Cookie':'pq_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
 }
 if(path==='/api/dashboard'){
  const child=await ownChild(db,p,url.searchParams.get('child'));return json({child,progress:await progress(db,child.id),lessons:await catalog(db)});
 }
 if(path==='/api/lesson'){
  const child=await ownChild(db,p,url.searchParams.get('child'));const lesson=await first(db,'SELECT * FROM lessons WHERE id=? AND published=1',url.searchParams.get('id'));if(!lesson)fail(404,'Aula não encontrada.');await unlocked(db,child,lesson);
  const content=JSON.parse(lesson.content);const solved=await rows(db,'SELECT challenge_index FROM answers WHERE child_id=? AND lesson_id=? AND revision=? AND correct=1',child.id,lesson.id,lesson.revision);
  return json({...lesson,content:undefined,challenges:content.map(({answer,...c})=>c),solved:solved.map(a=>a.challenge_index)});
 }
 if(path==='/api/answer'&&method==='POST'){
  const b=await body(request);const child=await ownChild(db,p,b.child_id);const lesson=await first(db,'SELECT * FROM lessons WHERE id=? AND published=1',b.lesson_id);if(!lesson)fail(404,'Aula não encontrada.');await unlocked(db,child,lesson);
  if(b.revision!==lesson.revision)fail(409,'Esta aula foi atualizada. Abra novamente.');const content=JSON.parse(lesson.content);const c=content[b.index];if(!Number.isInteger(b.index)||!c||typeof b.answer!=='string'||b.answer.length>150)fail(400,'Resposta inválida.');
  // Pronúncia é prática aproximada de reconhecimento de palavras, não uma nota fonética.
  const correct=normalize(b.answer)===normalize(c.answer);
  await run(db,'INSERT INTO answers(child_id,lesson_id,revision,challenge_index,attempts,correct) VALUES(?,?,?,?,1,?) ON CONFLICT(child_id,lesson_id,revision,challenge_index) DO UPDATE SET attempts=attempts+1,correct=MAX(correct,excluded.correct)',child.id,lesson.id,lesson.revision,b.index,correct?1:0);
  return json({correct,message:correct?'Muito bem! Você conseguiu!':'Quase lá! Ouça e tente de novo.'});
 }
 if(path==='/api/complete'&&method==='POST'){
  const b=await body(request);const child=await ownChild(db,p,b.child_id);const lesson=await first(db,'SELECT * FROM lessons WHERE id=? AND published=1',b.lesson_id);if(!lesson)fail(404,'Aula não encontrada.');await unlocked(db,child,lesson);
  if(b.revision!==lesson.revision)fail(409,'Esta aula foi atualizada. Abra novamente.');
  const {n,attempts}=await first(db,'SELECT COUNT(*) AS n,SUM(attempts) AS attempts FROM answers WHERE child_id=? AND lesson_id=? AND revision=? AND correct=1',child.id,lesson.id,lesson.revision);
  const total=JSON.parse(lesson.content).length;if(n!==total)fail(400,'Complete todos os exercícios antes de concluir.');
  const points=total*10,stars=attempts<=total?3:attempts<=total*2?2:1;
  const [saved]=await db.batch([
   db.prepare('INSERT INTO progress(child_id,lesson_id,points,stars,completed_day) VALUES(?,?,?,?,?) ON CONFLICT(child_id,lesson_id) DO NOTHING').bind(child.id,lesson.id,points,stars,today()),
   db.prepare('INSERT OR IGNORE INTO study_activity(child_id,lesson_id,study_day) VALUES(?,?,?)').bind(child.id,lesson.id,today())]);
  const stored=await first(db,'SELECT stars FROM progress WHERE child_id=? AND lesson_id=?',child.id,lesson.id);
  return json({awarded:!!saved.meta.changes,points:saved.meta.changes?points:0,stars:stored.stars,progress:await progress(db,child.id)});
 }
 if(path.startsWith('/api/admin')){
  await session(request,db,true);if(p.role!=='admin')fail(403,'Acesso exclusivo da administração.');
  if(path==='/api/admin/lessons'&&method==='GET'){const lessons=await rows(db,'SELECT * FROM lessons ORDER BY sort_order');return json({lessons:lessons.map(l=>({...l,content:undefined,challenges:JSON.parse(l.content)}))});}
  if(path==='/api/admin/lessons'&&method==='POST'){
   const b=await body(request);try{validateLesson(b);}catch(e){fail(400,e.message);}const old=await first(db,'SELECT revision FROM lessons WHERE id=?',b.id);
   if(old&&b.revision!==old.revision)fail(409,'Outra edição foi salva. Recarregue a aula.');
   if(await first(db,'SELECT id FROM lessons WHERE sort_order=? AND id<>?',b.sort_order,b.id))fail(409,'Já existe uma aula com esta ordem.');
   await db.batch([
    db.prepare('INSERT INTO lessons(id,unit_id,unit_title,title,description,sort_order,published,content) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET unit_id=excluded.unit_id,unit_title=excluded.unit_title,title=excluded.title,description=excluded.description,sort_order=excluded.sort_order,published=excluded.published,content=excluded.content,revision=revision+1,updated_at=CURRENT_TIMESTAMP').bind(b.id,b.unit_id,b.unit_title,b.title.trim(),b.description.trim(),b.sort_order,b.published?1:0,JSON.stringify(b.challenges)),
    db.prepare('INSERT INTO admin_audit(parent_id,action,lesson_id) VALUES(?,?,?)').bind(p.id,old?'lesson.update':'lesson.create',b.id)]);return json({ok:true});
  }
 }
 fail(404,'Recurso não encontrado.');
}
export async function seed(db){for(const l of curriculum)await run(db,'INSERT OR IGNORE INTO lessons(id,unit_id,unit_title,title,description,sort_order,published,content) VALUES(?,?,?,?,?,?,?,?)',l.id,l.unit_id,l.unit_title,l.title,l.description,l.sort_order,l.published,JSON.stringify(l.challenges));}
export default {async fetch(request,env,ctx){
 let response;try{
  const path=new URL(request.url).pathname;
  if(path.startsWith('/api/'))response=await api(request,env);
  else response=await env.ASSETS.fetch(request);
 }catch(error){response=json({error:error.status?error.message:'Ocorreu um erro. Tente novamente.'},error.status||500);}
 const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('X-Frame-Options','DENY');headers.set('Referrer-Policy','same-origin');headers.set('Permissions-Policy','camera=(), geolocation=(), microphone=(self)');
 headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
 if(env.ENVIRONMENT!=='production')headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(response.body,{status:response.status,headers});
}};
