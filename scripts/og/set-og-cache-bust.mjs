/**
 * OG 카드 참조 URL 에 캐시버스터(content hash) 쿼리를 심는다.
 *
 *   node scripts/og/set-og-cache-bust.mjs <10자리 해시>
 *   (해시는 npm run og:render 출력 마지막 줄에 찍힌다)
 *
 * 왜 필요한가:
 *   og:image URL 을 고정 파일명(code-destiny-og-vvip.png)으로 두면 배포 후에도
 *   Cloudflare 엣지가 예전 요청 때 캐시해 둔 옛 바이트를 새 _headers 규칙과
 *   무관하게 원래 TTL(최대 48h)까지 계속 서빙한다 — 오리진 파일은 최신인데
 *   카카오·브라우저가 받는 응답은 구버전인 상태가 여기서 생긴다.
 *   URL 에 콘텐츠 해시를 쿼리로 붙이면 Cloudflare·카카오 둘 다에게
 *   "한 번도 본 적 없는 완전히 새 URL" 이 되어 캐시가 원천적으로 존재할 수 없다.
 *
 * 카카오 디버거 초기화와의 관계:
 *   카카오는 og:image URL 이 아니라 "공유된 페이지 URL" 을 키로 스크랩 결과를
 *   캐시한다. 이 스크립트로 페이지 HTML 의 og:image 값 자체가 바뀌므로,
 *   디버거에서 캐시를 한 번 초기화하면 카카오가 이 새 URL 을 재조회해
 *   반드시 신선한 바이트를 받는다.
 */
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..", "..");

const hash = process.argv[2];
if (!hash || !/^[0-9a-f]{6,16}$/.test(hash)) {
  console.error("사용법: node scripts/og/set-og-cache-bust.mjs <og:render 가 출력한 해시>");
  process.exit(1);
}

// code-destiny-og-vvip.png 또는 이미 ?v=... 가 붙은 형태를 전부 새 해시로 통일한다.
const PATTERN = /code-destiny-og-vvip\.png(?:\?v=[0-9a-f]+)?/g;
const REPLACEMENT = `code-destiny-og-vvip.png?v=${hash}`;

const TARGETS = [
  "index.html",
  "public/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
  "public/static/index.html",
  "lib/seo/siteSeo.ts",
  "app/page.js",
  "app/kkul-kkul-unse/page.js",
  "app/guides/[slug]/page.js",
];

let totalHits = 0;
for (const rel of TARGETS) {
  const abs = path.join(ROOT, rel);
  const before = await fs.readFile(abs, "utf8");
  const hits = before.match(PATTERN)?.length ?? 0;
  const after = before.replace(PATTERN, REPLACEMENT);
  if (after !== before) await fs.writeFile(abs, after, "utf8");
  console.log(`${rel.padEnd(34)} x${hits}`);
  totalHits += hits;
}

console.log(`\n총 ${totalHits}곳 -> ?v=${hash} 로 갱신`);
if (totalHits === 0) {
  console.error("경고: 참조를 하나도 못 찾았다 — 정규식/경로를 확인할 것.");
  process.exit(1);
}
