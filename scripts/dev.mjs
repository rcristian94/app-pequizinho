import {spawn} from 'node:child_process';
// Aceita o argumento --host usado por ferramentas de preview, traduzindo para --ip do Wrangler.
const args=process.argv.slice(2);
const option=(name)=>{const i=args.indexOf(name);return i>=0?args[i+1]:args.find(a=>a.startsWith(name+'='))?.slice(name.length+1);};
const port=option('--port')||process.env.PORT||'8787';
const ip=option('--host')||option('--hostname')||option('--ip')||'0.0.0.0';
const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','dev','--local','--ip',ip,'--port',port],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code||0));
