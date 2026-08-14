/**
 * 배포 산출물(dist/js)의 자바스크립트를 minify 한다.
 *
 * 왜 dist 인가 — 소스(js/)도 미러(public/js/)도 아닌 이유:
 * 이 저장소의 검증기 23개가 `public/js/**` 를 **소스로 읽어** 함수명·주석·문자열 패턴을 단언한다
 * (verify-entry-fanout, verify-profile-*, verify-checkout-auth-recovery 등). 미러를 minify 하면
 * 그 가드가 전부 깨지고, 결제·인증 경로를 지키던 단언을 minify 출력에 맞춰 다시 쓰는 일이 된다.
 * 반면 dist/js 를 읽는 곳은 verify-adsense-readiness 한 곳뿐이고 그 검사는 postbuild 단계에서
 * 이 스크립트보다 **앞서** 끝난다(scripts/run-postbuild.mjs 의 steps 순서). 그래서 배포되는
 * 바이트만 줄이고 소스·미러·가드는 그대로 둔다.
 *
 * 🔴 run-postbuild.mjs 의 steps 에서 이 항목을 verify-adsense-readiness 앞으로 옮기지 말 것.
 *    그 검증기는 dist/js/saju-engine-tarot-sukuyo-quantum.js 의 한국어 문구를 정규식으로 본다.
 *
 * 무엇이 줄어드는가(홈 셸이 실제로 받는 번들, 2026-08-14 실측):
 *   destiny-profile.js        579KB -> 289KB
 *   core/index-inline-runtime  375KB -> 261KB
 *   mobile-interaction-patch   104KB ->  62KB
 *   core/access-store.js        51KB ->  25KB
 * 전송량(brotli)보다 **파싱·실행 시간**을 줄이는 것이 목적이다 — 데스크톱 TBT 가 그 비용이다.
 *
 * URL 은 바뀌지 않는다. `?v=` 캐시 키는 소스 js/** 내용 해시에서 나오고(sync:public), 이 단계는
 * 그보다 뒤라 키에 영향을 주지 않는다. 파일 경로가 그대로이므로 셸의 참조도 그대로 맞는다.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { transformSync } from "esbuild";

const distJsDir = resolve(process.cwd(), "dist", "js");

function collectJsFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectJsFiles(full));
    else if (entry.name.endsWith(".js")) files.push(full);
  }
  return files;
}

const files = collectJsFiles(distJsDir);
if (files.length === 0) {
  console.log("[minify-dist-js] dist/js 없음 — 건너뜀");
  process.exit(0);
}

let beforeBytes = 0;
let afterBytes = 0;
let minified = 0;
const failures = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  beforeBytes += Buffer.byteLength(source);

  let output;
  try {
    output = transformSync(source, { minify: true, legalComments: "none" }).code;
  } catch (error) {
    // 파싱 실패는 배포를 막지 않는다 — 그 파일만 원본 그대로 남기고 보고한다.
    // (minify 는 최적화이지 정확성 요건이 아니다. 다만 조용히 넘기면 회귀를 못 보므로 반드시 찍는다.)
    failures.push(`${file.slice(distJsDir.length + 1)} :: ${String(error && error.message).split("\n")[0]}`);
    afterBytes += Buffer.byteLength(source);
    continue;
  }

  // minify 결과가 더 크면(이미 minify 된 벤더 번들 등) 원본을 유지한다.
  if (Buffer.byteLength(output) >= Buffer.byteLength(source)) {
    afterBytes += Buffer.byteLength(source);
    continue;
  }

  writeFileSync(file, output, "utf8");
  afterBytes += Buffer.byteLength(output);
  minified += 1;
}

const savedKb = Math.round((beforeBytes - afterBytes) / 1024);
const savedPct = beforeBytes > 0 ? (((beforeBytes - afterBytes) / beforeBytes) * 100).toFixed(1) : "0.0";
console.log(
  `[minify-dist-js] ${minified}/${files.length}개 파일 minify — ` +
    `${Math.round(beforeBytes / 1024)}KB -> ${Math.round(afterBytes / 1024)}KB (${savedKb}KB, ${savedPct}% 감소)`
);

if (failures.length > 0) {
  console.warn(`[minify-dist-js] 파싱 실패 ${failures.length}건(원본 유지):`);
  for (const failure of failures) console.warn(`  - ${failure}`);
}
