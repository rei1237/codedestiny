#!/usr/bin/env node
/**
 * 사전 키 사용처 진단.
 *
 * public/i18n/en.json 의 각 키가 실제 코드/마크업에서 참조되는지 분류한다.
 *   static  : 소스에 키 문자열이 그대로 등장 (셸 data-cd-trans 포함)
 *   dynamic : `'<접두어>.' + var` 로 런타임 조립되는 구간에 속함
 *   orphan  : 어디서도 도달할 수 없음 → 삭제 후보
 *
 * 🔴 상대 키 주의: 엔진들은 `destinyFlowerText('flowers.' + i)` 처럼 **모듈
 * 네임스페이스에 상대적인** 키를 쓴다. 절대 키로 복원하지 않으면 멀쩡한 키가
 * 대량 orphan 으로 오판된다(초기 측정에서 1,933건 오탐). 그래서 파일별
 * deriveNamespace() 로 접두어를 붙여 절대 키를 만든 뒤 대조한다.
 *
 * 반대 방향(코드가 요구하는데 사전에 없는 키)은 scripts/i18n-extract-ko.mjs 가 본다.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative } from "node:path";
import { walkSourceFiles, flatten, deriveNamespace } from "./lib/i18n-source-scan.mjs";

const rootDir = process.cwd();
const base = JSON.parse(readFileSync(resolve(rootDir, "public/i18n/en.json"), "utf8"));

const literalKeys = new Set();
const dynamicPrefixes = new Set();

const KEY_LITERAL_RE = /['"`]([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)['"`]/g;
const RELATIVE_LITERAL_RE = /['"`]([A-Za-z_][A-Za-z0-9_.]*)['"`]/g;
// 🔴 `'famousSaju.periods.p' + i` 처럼 리터럴이 **세그먼트 중간에서 끊기는** 조립이 흔하다.
// 마지막 불완전 세그먼트를 잘라 낸 부분을 접두어로 본다. 이걸 안 하면 144개
// famousSaju.periods 키가 통째로 orphan 으로 오판된다.
const DYNAMIC_PREFIX_RE = /['"`]([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]*)+)['"`]\s*\+/g;
const TRANS_ATTR_RE = /data-cd-trans(?:-attr)?=["']([^"']+)["']/g;

let fileCount = 0;
const files = [
  ...walkSourceFiles(rootDir, { extensions: [".js", ".mjs", ".ts", ".tsx", ".jsx"] }),
  resolve(rootDir, "index.html"),
];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  fileCount += 1;
  const ns = deriveNamespace(source, relative(rootDir, file));

  for (const m of source.matchAll(KEY_LITERAL_RE)) {
    literalKeys.add(m[1]);
    if (ns) literalKeys.add(`${ns}.${m[1]}`);
  }
  // 네임스페이스가 있는 파일은 점 없는 단일 세그먼트 키도 유효하다 (_sajuEngineText("title"))
  if (ns) {
    for (const m of source.matchAll(RELATIVE_LITERAL_RE)) literalKeys.add(`${ns}.${m[1]}`);
  }
  for (const m of source.matchAll(DYNAMIC_PREFIX_RE)) {
    // 마지막 세그먼트는 조립 중일 수 있으므로 잘라 낸다: "a.b.p" → "a.b"
    const prefix = m[1].slice(0, m[1].lastIndexOf("."));
    if (!prefix) continue;
    dynamicPrefixes.add(prefix);
    if (ns) dynamicPrefixes.add(`${ns}.${prefix}`);
  }
  for (const m of source.matchAll(TRANS_ATTR_RE)) {
    for (const part of m[1].split(",")) {
      const spec = part.trim();
      literalKeys.add(spec.includes(":") ? spec.slice(spec.indexOf(":") + 1).trim() : spec);
    }
  }
}

const flat = flatten(base);
const keys = Object.keys(flat).filter((k) => typeof flat[k] === "string" && !k.startsWith("_"));

const buckets = { static: [], dynamic: [], orphan: [] };
for (const key of keys) {
  if (literalKeys.has(key)) { buckets.static.push(key); continue; }
  // 배열 인덱스 키(a.b.0)와 잎 키(a.b.title)는 부모가 참조되면 살아있다
  const parent = key.slice(0, key.lastIndexOf("."));
  if (parent && literalKeys.has(parent)) { buckets.static.push(key); continue; }
  let reachable = false;
  for (const prefix of dynamicPrefixes) {
    if (key === prefix || key.startsWith(`${prefix}.`)) { reachable = true; break; }
  }
  (reachable ? buckets.dynamic : buckets.orphan).push(key);
}

const pct = (n) => `${((n / keys.length) * 100).toFixed(1)}%`;
console.log(`[key-usage] 스캔 파일         : ${fileCount}`);
console.log(`[key-usage] 사전 키(문자열)   : ${keys.length}`);
console.log(`[key-usage]   static 참조     : ${buckets.static.length} (${pct(buckets.static.length)})`);
console.log(`[key-usage]   dynamic 참조    : ${buckets.dynamic.length} (${pct(buckets.dynamic.length)})`);
console.log(`[key-usage]   orphan(미도달)  : ${buckets.orphan.length} (${pct(buckets.orphan.length)})`);

if (buckets.orphan.length) {
  const nsCount = {};
  for (const key of buckets.orphan) {
    const ns = key.split(".").slice(0, 2).join(".");
    nsCount[ns] = (nsCount[ns] || 0) + 1;
  }
  console.log("[key-usage] orphan 상위 네임스페이스:");
  Object.entries(nsCount).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([ns, n]) => console.log(`[key-usage]    ${String(n).padStart(5)}  ${ns}`));
}

mkdirSync(resolve(rootDir, "reports"), { recursive: true });
writeFileSync(
  resolve(rootDir, "reports", "i18n-key-usage.json"),
  `${JSON.stringify({
    totals: { keys: keys.length, static: buckets.static.length, dynamic: buckets.dynamic.length, orphan: buckets.orphan.length },
    orphan: buckets.orphan,
    dynamic: buckets.dynamic,
  }, null, 2)}\n`,
  "utf8",
);
console.log("[key-usage] 기록: reports/i18n-key-usage.json");
