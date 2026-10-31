import {readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));
if(!process.argv.includes('--authorized'))throw new Error('Implantação bloqueada: requer autorização explícita do proprietário e a opção --authorized.');
if(!config.env.staging.durable_objects?.bindings?.length && !config.env.staging.d1_databases?.[0]?.database_id)throw new Error('Configure o armazenamento exclusivo da homologação antes de implantar.');
const result=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--env','staging'],{stdio:'inherit'});process.exit(result.status||0);
