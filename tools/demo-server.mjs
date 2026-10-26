import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const base = path.join(root, name.startsWith('/data/') ? 'work/demo/public' : 'public');
    const file = path.resolve(base, '.' + name);
    if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': (types[path.extname(file)] || 'application/octet-stream') + (path.extname(file) === '.png' ? '' : '; charset=utf-8'), 'Cache-Control': 'no-store' }); res.end(body);
  } catch { res.writeHead(404).end('No encontrado'); }
}).listen(4173, '127.0.0.1', () => console.log('Demo: http://localhost:4173'));
