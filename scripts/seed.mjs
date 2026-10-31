import {writeFile} from 'node:fs/promises';
import {curriculum} from '../src/curriculum.mjs';
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const sql=curriculum.map(l=>`INSERT OR IGNORE INTO lessons(id,unit_id,unit_title,title,description,sort_order,published,content) VALUES(${[l.id,l.unit_id,l.unit_title,l.title,l.description,l.sort_order,l.published,JSON.stringify(l.challenges)].map(q).join(',')});`).join('\n');
await writeFile('migrations/0002_seed.sql',sql+'\n');console.log(`${curriculum.length} aulas, ${curriculum.reduce((s,l)=>s+l.challenges.length,0)} exercícios.`);
