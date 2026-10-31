import {readFile,writeFile,mkdir,readdir,stat} from 'node:fs/promises';
import path from 'node:path';
await mkdir('dist',{recursive:true});
const files={};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.ttf':'font/ttf','.json':'application/json','.webmanifest':'application/manifest+json'};
async function walk(dir){for(const name of await readdir(dir)){const file=path.join(dir,name);if((await stat(file)).isDirectory())await walk(file);else{const key='/'+path.relative('public',file).replaceAll('\\','/');files[key]={type:mime[path.extname(file)]||'application/octet-stream',data:(await readFile(file)).toString('base64')};}}}
await walk('public');
const curriculum=await readFile('src/curriculum.mjs','utf8');
const worker=(await readFile('src/worker.mjs','utf8')).replace(/^import[^\n]+\n/,'').replace('export default {async fetch','const worker = {async fetch');
const source=curriculum.replaceAll('export ','')+'\n'+worker.replace('export async function','async function')+`\nconst FILES=${JSON.stringify(files)};
const embedded={async fetch(request){const pathname=new URL(request.url).pathname;const file=FILES[pathname==='/'?'/index.html':pathname]||(!pathname.split('/').pop().includes('.')?FILES['/index.html']:null);if(!file)return new Response('Arquivo não encontrado',{status:404});const raw=atob(file.data);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'Content-Type':file.type,'Cache-Control':/\\.(html|js|css)$/.test(pathname)||pathname==='/'?'no-cache':'public, max-age=3600'}});}};
export default {fetch(request,env,ctx){return worker.fetch(request,{...env,ASSETS:env.ASSETS||embedded},ctx)}};
`;
await writeFile('dist/worker.mjs',source);
console.log(`Build: ${Object.keys(files).length} assets, ${(Buffer.byteLength(source)/1024).toFixed(1)} KiB. Nenhum serviço de IA ou pagamento incluído.`);
