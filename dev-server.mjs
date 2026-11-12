// Servidor local para probar la web con la tienda:  node dev-server.mjs  →  http://localhost:3000
// Sirve dist/ y las funciones de api/ igual que Vercel. Usa tus claves de TEST de Stripe:
//   STRIPE_SECRET_KEY=sk_test_xxx node dev-server.mjs
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/api/')) {
    try {
      const mod = await import(`./api/${path.basename(url.pathname)}.js`);
      const handler = mod[req.method];
      if (!handler) { res.writeHead(405); return res.end(); }
      const chunks = []; for await (const c of req) chunks.push(c);
      const request = new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) });
      const r = await handler(request);
      res.writeHead(r.status, Object.fromEntries(r.headers)); return res.end(Buffer.from(await r.arrayBuffer()));
    } catch (e) { console.error(e); res.writeHead(500); return res.end('Error'); }
  }
  let p = path.join('dist', decodeURIComponent(url.pathname));
  if (p.endsWith('/')) p += 'index.html';
  try { const data = await readFile(p); res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404, { 'content-type': 'text/html' }); res.end('<h1>404</h1>'); }
}).listen(PORT, () => console.log(`Padel Bularas en http://localhost:${PORT}`));
