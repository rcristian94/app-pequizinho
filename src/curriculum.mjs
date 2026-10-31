// Modelo de cursos/unidades/aulas/desafios adaptado de sanidhyy/duolingo-clone (MIT).
const select = (question, word, options, picture, type='SELECT') => ({type, question, word, options, answer:word, picture});
const write = (question, word, picture) => ({type:'WRITE',question,word,answer:word,picture});
const speak = (word,picture) => ({type:'SPEAK',question:'Ouça e fale em inglês. Vamos tentar?',word,answer:word,picture});
const lesson = (id,unit_id,unit_title,title,description,sort_order,challenges) => ({id,unit_id,unit_title,title,description,sort_order,published:1,revision:1,challenges});
export const curriculum = [
 lesson('ola-cerrado','boas-vindas','Primeiros passos','Hello, Cerrado!','Seu primeiro olá para o mundo.',1,[
  select('Como dizemos “olá” em inglês?','Hello',['Hello','Goodbye','Thank you'],'wave'),
  select('Ouça e encontre “tchau”.','Goodbye',['Please','Goodbye','Hello'],'wave','LISTEN'),
  write('Complete com a palavra em inglês para “olá”.','Hello','wave'),speak('Hello','wave')]),
 lesson('palavras-magicas','boas-vindas','Primeiros passos','Palavras mágicas','Gentileza também fala inglês.',2,[
  select('Como dizemos “por favor”?','Please',['Please','Hello','Blue'],'heart'),
  select('Ouça: qual é a palavra?','Thank you',['Goodbye','Thank you','Please'],'heart','LISTEN'),
  write('Escreva “por favor” em inglês.','Please','heart'),speak('Thank you','heart')]),
 lesson('cores-cerrado','cores','As cores do Cerrado','Um Cerrado de cores','Do verde do pequi ao azul do céu.',3,[
  select('Qual é a cor do nosso Pequizinho?','Green',['Blue','Green','Red'],'green'),
  select('Ouça e escolha a cor.','Yellow',['Yellow','Blue','Green'],'yellow','LISTEN'),
  write('Como se escreve “azul” em inglês?','Blue','blue'),speak('Green','green')]),
 lesson('mais-cores','cores','As cores do Cerrado','Pinte uma aventura','Novas cores, novas descobertas.',4,[
  select('Como dizemos “laranja”?','Orange',['Purple','Orange','Red'],'orange'),
  select('Ouça e escolha.','Red',['Blue','Red','Yellow'],'red','LISTEN'),
  write('Escreva “amarelo” em inglês.','Yellow','yellow'),speak('Blue','blue')]),
 lesson('bichos','animais','Amigos da natureza','Bichos e amigos','Quem mora nesta aventura?',5,[
  select('Qual palavra significa “pássaro”?','Bird',['Dog','Bird','Cat'],'bird'),
  select('Ouça o nome deste amigo.','Dog',['Cat','Bird','Dog'],'dog','LISTEN'),
  write('Escreva “gato” em inglês.','Cat','cat'),speak('Bird','bird')]),
 lesson('frutas','comida','Piquenique no Cerrado','Hora do piquenique','Aprenda palavras de dar água na boca.',6,[
  select('Qual é a palavra para “maçã”?','Apple',['Banana','Apple','Water'],'apple'),
  select('Ouça e escolha.','Water',['Water','Apple','Banana'],'water','LISTEN'),
  write('Como se escreve “banana” em inglês?','Banana','banana'),speak('Apple','apple')]),
 lesson('contar','numeros','Passinhos e números','Vamos contar?','Um, dois, três... aventura!',7,[
  select('Como dizemos “um”?','One',['Three','One','Two'],'one'),
  select('Ouça e escolha.','Two',['One','Three','Two'],'two','LISTEN'),
  write('Escreva “três” em inglês.','Three','three'),speak('One','one')]),
 lesson('minha-familia','familia','Meu pequeno mundo','Minha família','Palavras para quem cuida da gente.',8,[
  select('Qual palavra significa “mãe”?','Mother',['Father','Mother','Family'],'family'),
  select('Ouça e escolha.','Father',['Family','Mother','Father'],'family','LISTEN'),
  write('Escreva “família” em inglês.','Family','family'),speak('Family','family')])
];
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim().replace(/\s+/g,' ');
export function streakFor(days, today) {
 const set = new Set(days); let cursor = new Date(today+'T12:00:00Z');
 if (!set.has(today)) cursor.setUTCDate(cursor.getUTCDate()-1);
 let count=0; while(set.has(cursor.toISOString().slice(0,10))) {count++;cursor.setUTCDate(cursor.getUTCDate()-1);} return count;
}
export function validateLesson(data) {
 if (!data || typeof data !== 'object') throw new Error('Aula inválida.');
 for(const key of ['id','unit_id']) if(!/^[a-z0-9-]{1,70}$/.test(data[key]||'')) throw new Error('Identificador inválido.');
 for(const key of ['unit_title','title','description']) if(typeof data[key]!=='string'||!data[key].trim()||data[key].length>240) throw new Error('Preencha título, unidade e descrição (até 240 caracteres).');
 if(!Number.isInteger(data.sort_order)||data.sort_order<1||data.sort_order>10000) throw new Error('Ordem inválida.');
 if(!Array.isArray(data.challenges)||data.challenges.length<1||data.challenges.length>30) throw new Error('Use de 1 a 30 exercícios.');
 for(const c of data.challenges) {
  if(!['SELECT','LISTEN','WRITE','SPEAK'].includes(c.type)||typeof c.question!=='string'||c.question.length>300||!c.question.trim()||typeof c.answer!=='string'||!c.answer.trim()||c.answer.length>100||typeof c.word!=='string'||c.word.length>100) throw new Error('Exercício inválido.');
  if(c.options && (!Array.isArray(c.options)||c.options.length>6||c.options.some(o=>typeof o!=='string'||o.length>100))) throw new Error('Opções inválidas.');
  if(['SELECT','LISTEN'].includes(c.type)&&(!c.options||c.options.length<2||!c.options.includes(c.answer)||new Set(c.options).size!==c.options.length)) throw new Error('Inclua a resposta correta nas opções sem repetições.');
  if(c.picture && !/^[a-z0-9-]{1,30}$/.test(c.picture)) throw new Error('Imagem inválida.');
  if(c.audio && !/^\/audio\/[a-z0-9-]+\.mp3$/.test(c.audio)) throw new Error('Use áudio local em /audio/nome.mp3.');
 }
 return data;
}
