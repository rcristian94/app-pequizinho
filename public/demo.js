// Demonstração explícita, somente em memória. Não autentica nem modifica a API real.
const lessons=await fetch('/demo-lessons.json').then(r=>r.json());
const parent={id:'demo-family',name:'Família de demonstração',email:'demo@example.test',role:'admin'};
const children=[{id:'demo-child',nickname:'Sofia',age_band:'7-9',avatar:'pequi',daily_goal:1,parent_id:parent.id}];
const completed=[],solved=new Map();
const metadata=l=>({...l,challenges:undefined});
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Araguaina'}).format(new Date());
const progress=()=>({completed,activity:completed.map(p=>({lesson_id:p.lesson_id,study_day:p.completed_day})),points:completed.reduce((n,p)=>n+p.points,0),stars:completed.reduce((n,p)=>n+p.stars,0),streak:completed.length?1:0,today:completed.length});
export async function demoApi(path,b){
 const url=new URL(path,'https://demo.test');
 if(url.pathname==='/api/me')return {parent,children,adult:true};
 if(url.pathname==='/api/dashboard')return {child:children[0],progress:progress(),lessons:lessons.filter(l=>l.published).map(metadata)};
 if(url.pathname==='/api/child-mode'||url.pathname==='/api/logout')return {ok:true};
 if(url.pathname==='/api/lesson'){const l=lessons.find(l=>l.id===url.searchParams.get('id'));return {...l,challenges:l.challenges.map(({answer,...c})=>c),solved:[]};}
 if(url.pathname==='/api/answer'){const l=lessons.find(l=>l.id===b.lesson_id);const clean=s=>String(s).toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();const correct=clean(b.answer)===clean(l.challenges[b.index].answer);if(correct){const set=solved.get(l.id)||new Set();set.add(b.index);solved.set(l.id,set);}return {correct,message:correct?'Muito bem! Você conseguiu!':'Quase lá! Ouça e tente de novo.'};}
 if(url.pathname==='/api/complete'){const l=lessons.find(l=>l.id===b.lesson_id);const awarded=!completed.some(p=>p.lesson_id===l.id);if(awarded)completed.push({lesson_id:l.id,points:l.challenges.length*10,stars:3,completed_day:day()});return {awarded,points:awarded?l.challenges.length*10:0,stars:3,progress:progress()};}
 if(url.pathname==='/api/parent/dashboard')return {children:children.map(c=>({...c,progress:progress()})),catalog:lessons.map(metadata),subscription:{status:'sandbox',price_cents:990,billing_enabled:0}};
 if(url.pathname==='/api/subscription/sandbox')return {message:'Demonstração: nenhuma assinatura ou cobrança foi criada.'};
 if(url.pathname==='/api/admin/lessons'&&!b)return {lessons};
 if(url.pathname==='/api/admin/lessons'&&b){const i=lessons.findIndex(l=>l.id===b.id);if(i<0)lessons.push({...b,revision:1});else lessons[i]={...b,revision:(lessons[i].revision||1)+1};return {ok:true};}
 if(url.pathname==='/api/account/export')return {parent,children,progress:progress(),demo:true};
 throw new Error('Na demonstração, cadastros e exclusões estão desativados. Volte à versão completa para usar uma conta.');
}
