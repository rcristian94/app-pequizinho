import {readFile,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
// As referências entre família e catálogo são validadas pela API. O catálogo vive em outro SQLite.
const initial=await readFile('migrations/0001_initial.sql','utf8');
const study=await readFile('migrations/0003_study_days.sql','utf8');
const familySchema=(initial+'\n'+study).replaceAll(' REFERENCES lessons(id) ON DELETE CASCADE','');
const catalogSchema=initial.split(';').filter(s=>/CREATE TABLE IF NOT EXISTS (lessons|admin_audit)\b/.test(s)).join(';')+';';
await writeFile('src/durable-schema.mjs',`// Gerado por scripts/build-durable.mjs; não editar manualmente.\nexport const familySchema=${JSON.stringify(familySchema)};\nexport const catalogSchema=${JSON.stringify(catalogSchema)};\n`);
// A versão D1 continua disponível; reutilizamos apenas o servidor de assets incorporados.
const embeddedSource=await readFile('dist/worker.mjs','utf8');
const embedded=embeddedSource.slice(embeddedSource.indexOf('const FILES='),embeddedSource.indexOf('export default {fetch(request,env,ctx)'));
await writeFile('dist/durable-entry.mjs',`import {durableFetch} from '../src/durable-storage.mjs';\nexport {PequizinhoFamily,PequizinhoCatalog} from '../src/durable-storage.mjs';\n${embedded}\nexport default {fetch(request,env,ctx){return durableFetch(request,env,ctx,env.ASSETS||embedded)}};\n`);
await build({entryPoints:['dist/durable-entry.mjs'],bundle:true,format:'esm',platform:'browser',external:['cloudflare:workers'],outfile:'dist/durable-worker.mjs'});
console.log('Worker SQLite por família empacotado, sem D1 remoto ou serviços pagos.');
