const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png'};
http.createServer((req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1)||'preview.html';const file=path.resolve(__dirname,name);if(!file.startsWith(__dirname+path.sep)||!mime[path.extname(file)]){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]);res.setHeader('X-Robots-Tag','noindex, nofollow');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}
}).listen(48219,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:48219/'));
