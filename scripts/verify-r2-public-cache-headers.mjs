#!/usr/bin/env node

import https from "node:https";

const DEFAULT_URLS = Object.freeze([
  "https://assets.code-destiny.com/DestinyCafe/%EC%9A%B4%EB%AA%85%EC%9D%98%20%EC%B0%BB%EC%A7%91.webp",
  "https://assets.code-destiny.com/%EC%9D%B8%EC%83%9D%20%EC%B4%9D%EB%9E%8C.webp",
  "https://music.code-destiny.com/DestinyCafe/Moonlit%20Tea%20House.mp3",
  "https://music.code-destiny.com/DestinyWar/White%20Lion.mp3",
]);

const urls = unique([
  ...readListEnv("R2_CACHE_HEADER_URLS"),
  ...process.argv.slice(2).filter((arg) => /^https:\/\//i.test(arg)),
]);
const targets = urls.length ? urls : DEFAULT_URLS;
const failures = [];

for (const url of targets) {
  const head = await request(url, "HEAD").catch((error) => ({ error }));
  const range = await request(url, "GET", { Range: "bytes=0-0" }).catch((error) => ({ error }));
  const cacheControl = String(head.headers?.["cache-control"] || range.headers?.["cache-control"] || "");
  const contentType = String(head.headers?.["content-type"] || range.headers?.["content-type"] || "");
  const contentRange = String(range.headers?.["content-range"] || "");
  const acceptRanges = String(head.headers?.["accept-ranges"] || range.headers?.["accept-ranges"] || "");
  const isAudio = /\.(mp3|m4a|ogg|wav)(?:[?#]|$)/i.test(url);
  const isImage = /\.(avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url);
  const expectedMaxAge = isAudio ? 2592000 : isImage ? 86400 : 86400;
  const maxAge = readMaxAge(cacheControl);

  const result = {
    url,
    headStatus: head.status || 0,
    rangeStatus: range.status || 0,
    cacheControl,
    contentType,
    acceptRanges,
    contentRange,
  };
  console.log(JSON.stringify(result));

  if (head.error) failures.push({ url, reason: `HEAD failed: ${head.error.message}` });
  if (range.error) failures.push({ url, reason: `range GET failed: ${range.error.message}` });
  if (!head.error && (head.status < 200 || head.status >= 400)) failures.push({ url, reason: `HEAD status ${head.status}` });
  if (!range.error && range.status !== 206) failures.push({ url, reason: `range status ${range.status}` });
  if (!cacheControl) failures.push({ url, reason: "missing cache-control" });
  if (/\b(?:no-store|private)\b/i.test(cacheControl)) failures.push({ url, reason: `non-public cache-control: ${cacheControl}` });
  if (maxAge < expectedMaxAge) failures.push({ url, reason: `max-age ${maxAge} < ${expectedMaxAge}` });
  if (isAudio && !/^audio\//i.test(contentType)) failures.push({ url, reason: `unexpected audio content-type: ${contentType}` });
  if (isImage && !/^image\//i.test(contentType)) failures.push({ url, reason: `unexpected image content-type: ${contentType}` });
  if (!acceptRanges && !contentRange) failures.push({ url, reason: "missing byte-range support" });
}

if (failures.length) {
  console.error("R2 public cache header verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure.url}: ${failure.reason}`);
  }
  process.exit(1);
}

console.log("R2 public cache header verification OK");

function readListEnv(name) {
  return String(process.env[name] || "")
    .split(/[,\n]/u)
    .map((value) => value.trim())
    .filter(Boolean);
}

function unique(values) {
  return Array.from(new Set(values));
}

function readMaxAge(cacheControl) {
  const match = String(cacheControl || "").match(/\bmax-age=(\d+)/i);
  return match ? Number(match[1]) || 0 : 0;
}

function request(url, method, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method, headers }, (res) => {
      res.resume();
      res.on("end", () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
        });
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error("request timeout")));
    req.on("error", reject);
    req.end();
  });
}
