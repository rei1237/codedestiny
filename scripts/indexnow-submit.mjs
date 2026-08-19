#!/usr/bin/env node
/**
 * IndexNow 델타 제출 — 배포 후 바뀐 URL 만 Bing·Naver·Yandex 등에 알린다.
 * (Google 은 IndexNow 를 받지 않는다. 기대치를 정확히 할 것.)
 *
 * 사용:
 *   node scripts/indexnow-submit.mjs --dry-run   # 무엇을 보낼지만 출력. 외부 호출 없음
 *   node scripts/indexnow-submit.mjs             # 실제 POST
 *
 * 🔴 제출 목록은 **sitemap.xml 을 파싱해서** 만든다. lib/seo-site-urls.ts 의
 *    getAllSitemapUrls() 를 쓰면 안 된다 — 그건 실제 배포되는 사이트맵과 별개인 병렬 목록이라
 *    (2026-08-16 실측: sitemap.xml 429 URL vs seo-site-urls 경로 문자열 95개) 사이트맵이 일부러
 *    제외한 noindex URL 을 검색엔진에 제출하게 된다. 색인 품질을 고치려다 정반대가 된다.
 *
 * 🔴 델타(= lastmod 가 오늘인 URL)만 보낸다. 전량 제출을 반복하면 Bing·Naver 가 스팸으로
 *    취급해 신호 자체가 죽는다. 이게 가능한 건 config/sitemap-lastmod.json 원장(#723) 덕분이다 —
 *    그 전에는 429개 중 315개가 매 빌드 오늘 날짜였으므로 "델타" 가 사실상 전량이었다.
 *
 * 🔴 키는 여기에 복제하지 않는다. lib/indexnow.ts 를 **파일로 읽어** 뽑고, 키 파일과 일치하는지
 *    확인한다. 복제하면 키 회전 시 한쪽만 바뀌어 조용히 403 이 난다.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const dryRun = process.argv.includes("--dry-run");

/** IndexNow 는 요청당 10,000 URL 까지 받는다. */
const BATCH_SIZE = 10_000;

function readIndexNowContract() {
  const sourcePath = resolve(rootDir, "lib/indexnow.ts");
  if (!existsSync(sourcePath)) {
    throw new Error("[indexnow] lib/indexnow.ts 가 없습니다 — 키·호스트 정본을 읽을 수 없습니다.");
  }
  const source = readFileSync(sourcePath, "utf8");

  const pick = (name) => {
    const match = new RegExp(`${name}\\s*=\\s*"([^"]+)"`).exec(source);
    if (!match) {
      throw new Error(`[indexnow] lib/indexnow.ts 에서 ${name} 을 찾지 못했습니다 — 파일 구조가 바뀌었다면 이 파서를 함께 고치세요.`);
    }
    return match[1];
  };

  const host = pick("INDEXNOW_HOST");
  const key = pick("INDEXNOW_KEY");
  const endpointMatch = /INDEXNOW_ENDPOINT\s*=\s*"([^"]+)"/.exec(source);
  if (!endpointMatch) {
    throw new Error("[indexnow] lib/indexnow.ts 에서 INDEXNOW_ENDPOINT 를 찾지 못했습니다.");
  }

  // 🔴 키 파일이 실제로 서빙돼야 IndexNow 가 소유권을 확인한다. 이름과 내용이 모두 키여야 한다.
  const keyFileRel = `public/${key}.txt`;
  const keyFilePath = resolve(rootDir, keyFileRel);
  if (!existsSync(keyFilePath)) {
    throw new Error(`[indexnow] 키 파일 ${keyFileRel} 이 없습니다 — 이게 없으면 전량 403 입니다.`);
  }
  const keyFileBody = readFileSync(keyFilePath, "utf8").trim();
  if (keyFileBody !== key) {
    throw new Error(`[indexnow] ${keyFileRel} 의 내용이 INDEXNOW_KEY 와 다릅니다 (파일 "${keyFileBody}").`);
  }

  return { host, key, endpoint: endpointMatch[1], keyLocation: `https://${host}/${key}.txt` };
}

/** sitemap.xml 에서 (loc, lastmod) 쌍을 뽑는다. */
function readSitemapEntries() {
  const sitemapPath = resolve(rootDir, "sitemap.xml");
  if (!existsSync(sitemapPath)) {
    throw new Error("[indexnow] sitemap.xml 이 없습니다 — npm run sitemap:generate 가 먼저 돌아야 합니다.");
  }
  const xml = readFileSync(sitemapPath, "utf8");
  const entries = [];
  const entryRe = /<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>/g;
  let match;
  while ((match = entryRe.exec(xml)) !== null) {
    entries.push({ loc: match[1].trim(), lastmod: match[2].trim() });
  }
  if (entries.length === 0) {
    throw new Error("[indexnow] sitemap.xml 에서 URL 을 하나도 읽지 못했습니다.");
  }
  return entries;
}

async function main() {
  // 🔴 스테이징 릴리스에서는 절대 제출하지 않는다. 제출 목록은 sitemap.xml 에서 나오므로
  //    스테이징에서 돌면 **프로덕션 URL** 을 아직 배포되지도 않은 변경 기준으로 알리게 된다.
  //    워크플로가 이 스텝을 스테이징 잡에 넣지 않는 것이 1차 방어이고, 이것이 2차 방어다 —
  //    잡을 하나 더 만들 때 실수로 복사해 오는 것을 여기서 끝낸다.
  const deployTarget = String(process.env.CD_DEPLOY_TARGET || "").trim().toLowerCase();
  if (deployTarget && deployTarget !== "production") {
    console.error(`[indexnow] CD_DEPLOY_TARGET=${deployTarget} 에서는 제출하지 않습니다. 프로덕션 릴리스에서만 돕니다.`);
    process.exit(1);
  }

  const contract = readIndexNowContract();
  const entries = readSitemapEntries();

  // generate-sitemap.mjs 의 `today` 와 같은 규칙(UTC)이어야 델타가 맞는다.
  const today = new Date().toISOString().slice(0, 10);
  const changed = entries.filter((entry) => entry.lastmod === today).map((entry) => entry.loc);

  const extra = String(process.env.INDEXNOW_EXTRA_URLS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const urls = [...new Set([...changed, ...extra])];

  console.log(`[indexnow] sitemap ${entries.length} URL · lastmod=${today} 델타 ${changed.length}건${extra.length ? ` · 추가 ${extra.length}건` : ""}`);

  if (urls.length === 0) {
    // 아무것도 안 바뀐 배포다. 실패가 아니다.
    console.log("[indexnow] 제출할 변경이 없습니다. 건너뜁니다.");
    return;
  }

  if (dryRun) {
    console.log(`[indexnow] --dry-run: 외부 호출 없이 종료합니다. 보낼 대상 ${urls.length}건`);
    for (const url of urls.slice(0, 20)) console.log(`  ${url}`);
    if (urls.length > 20) console.log(`  … 외 ${urls.length - 20}건`);
    console.log(`[indexnow] endpoint=${contract.endpoint} host=${contract.host} keyLocation=${contract.keyLocation}`);
    return;
  }

  for (let index = 0; index < urls.length; index += BATCH_SIZE) {
    const chunk = urls.slice(index, index + BATCH_SIZE);
    const response = await fetch(contract.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: contract.host,
        key: contract.key,
        keyLocation: contract.keyLocation,
        urlList: chunk,
      }),
    });
    const body = await response.text().catch(() => "");
    const batchNo = Math.floor(index / BATCH_SIZE) + 1;
    console.log(`[indexnow] batch ${batchNo}: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`);
    if (!response.ok) process.exit(1);
  }

  console.log(`[indexnow] OK — ${urls.length}건 제출 완료.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
