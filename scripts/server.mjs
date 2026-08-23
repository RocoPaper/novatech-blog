import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const port=Number(process.env.PORT||3000);
try { await stat(path.join(dist,'index.html')); } catch { await new Promise((resolve,reject)=>{ const child=spawn(process.execPath,['scripts/build.mjs'],{cwd:root,stdio:'inherit'}); child.on('exit',code=>code===0?resolve():reject(new Error('Build failed'))); }); }
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.xml':'application/xml; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8'};
const server=http.createServer(async(req,res)=>{ try { const requestPath=decodeURIComponent(new URL(req.url,'http://localhost').pathname); let target=path.join(dist,requestPath); if(requestPath.endsWith('/')) target=path.join(target,'index.html'); else if(!path.extname(target)){ try { const s=await stat(target); if(s.isDirectory()) target=path.join(target,'index.html'); } catch { target=path.join(target,'index.html'); } } if(!path.resolve(target).startsWith(path.resolve(dist))) throw new Error('Forbidden'); const body=await readFile(target); res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'}); res.end(body); } catch { const body=await readFile(path.join(dist,'404.html')); res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'}); res.end(body); } });
server.listen(port,()=>console.log(`Novatech is available at http://localhost:${port}`));
