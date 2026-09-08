const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname);
const types = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.md': 'text/plain; charset=utf-8', '.json': 'application/json' };
http.createServer((req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    const target = path.resolve(root, '.' + (name === '/' ? '/mockup.html' : name));
    if (!target.startsWith(root + path.sep) || !types[path.extname(target)]) { res.writeHead(403); res.end(); return; }
    fs.readFile(target, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': types[path.extname(target)], 'Cache-Control': 'no-cache', 'X-Robots-Tag': 'noindex, nofollow' });
      res.end(data);
    });
  } catch { res.writeHead(400); res.end(); }
}).listen(4187, '127.0.0.1', () => console.log('Past-life mockup: http://127.0.0.1:4187'));
