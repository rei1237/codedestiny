#!/usr/bin/env node
/**
 * serve-novel.mjs — 노벨 로컬 미리보기 서버 (의존성 없음)
 * ------------------------------------------------------------------
 * public/ 를 정적 서빙한다. Range 요청(206)을 지원해 오디오(BGM) 시킹이 된다.
 * R2 핫링크 403 우회를 위해 codedestiny-novel.html 은 로컬(localhost)에서
 * /codedestinyassets/ 미러를 참조하므로(npm run novel:assets 로 생성), 이 서버로
 * 열면 프로덕션과 동일한 화면·BGM 으로 확인할 수 있다.
 *
 * 사용: npm run novel:serve   (또는 PORT=8080 npm run novel:serve)
 *       npm run novel:preview (에셋 미러 후 서버)
 * → http://127.0.0.1:5173/codedestiny-novel.html
 */
import { createServer } from "node:http";
import { stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const PORT = Number(process.env.PORT) || 5173;
const HOST = "127.0.0.1";
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".mp4": "video/mp4",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8", ".xml": "application/xml; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    if (urlPath === "/") urlPath = "/codedestiny-novel.html";
    const filePath = normalize(join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end("Forbidden"); return; }

    let s;
    try { s = await stat(filePath); } catch { res.writeHead(404).end("Not found"); return; }
    if (s.isDirectory()) { res.writeHead(404).end("Not found"); return; }

    const type = TYPES[extname(filePath).toLowerCase()] || "application/octet-stream";
    const range = req.headers.range;

    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : s.size - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= s.size) end = s.size - 1;
      if (start > end || start >= s.size) { res.writeHead(416, { "Content-Range": `bytes */${s.size}` }).end(); return; }
      res.writeHead(206, {
        "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${s.size}`,
        "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Cache-Control": "no-cache",
      });
      createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, { "Content-Type": type, "Content-Length": s.size, "Accept-Ranges": "bytes", "Cache-Control": "no-cache" });
      createReadStream(filePath).pipe(res);
    }
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ✦ 연이의 운명 노벨 — 로컬 미리보기 서버`);
  console.log(`  →  http://${HOST}:${PORT}/codedestiny-novel.html\n`);
  console.log(`  Ctrl+C 로 종료 · 포트 변경: PORT=8080 npm run novel:serve\n`);
});
