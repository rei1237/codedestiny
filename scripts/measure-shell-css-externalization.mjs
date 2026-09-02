/**
 * N3(셸 인라인 CSS 외부화)의 실제 이득을 잰다.
 *
 * 왜 이 스크립트가 필요했나 — 조사 문서가 "셸은 no-store 라 매 방문 재전송" 을 근거로 삼았고,
 * 2026-09-02 에 그게 `no-cache` 로 바뀐 것을 확인했지만, **라이브에는 ETag·Last-Modified 가
 * 아예 없어서** 조건부 요청이 성립하지 않는다. 헤더 값만 읽고 결론 내면 두 번 다 틀린다.
 * 그래서 배포본을 실제로 받아 재고, 압축 후 바이트로만 말한다.
 *
 * 재는 것:
 *   1) 라이브 셸의 검증자 유무 — 없으면 재방문이 곧 전량 재전송이다.
 *   2) 인라인 <style> 을 <link> 로 바꿨을 때의 압축 후 전송 바이트 (첫 방문 / 재방문).
 *   3) 배포 사이 CSS 안정성 — 해시 파일이 얼마나 자주 깨지는지(git 이력).
 *
 * 사용: node scripts/measure-shell-css-externalization.mjs [url]
 *       기본값 https://code-destiny.com/
 */
import { execFileSync } from "node:child_process";
import { brotliCompressSync, constants } from "node:zlib";

const url = process.argv[2] || "https://code-destiny.com/";

/** Cloudflare 엣지의 동적 압축은 최고 품질이 아니다. 두 값을 함께 찍어 과대평가를 막는다. */
const QUALITIES = [5, 11];
const br = (text, quality) =>
  brotliCompressSync(Buffer.from(text, "utf8"), {
    params: { [constants.BROTLI_PARAM_QUALITY]: quality },
  }).length;

const kb = (n) => `${(n / 1024).toFixed(1)}KB`;

/**
 * 진짜 마크업인 <style> 만 고른다.
 * 🔴 <script> 구간을 먼저 잘라낸다 — JS 문자열 안의 "<style>" 을 세면 부풀려진다
 *    (조사 문서가 정규식 전역 매칭으로 816KB 를 1,432KB 로 오독한 것이 그 경우다).
 */
function styleBlocks(html) {
  const scriptRanges = [];
  for (const m of html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)) {
    scriptRanges.push([m.index, m.index + m[0].length]);
  }
  const inScript = (i) => scriptRanges.some(([a, b]) => i >= a && i < b);

  const blocks = [];
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    if (inScript(m.index)) continue;
    blocks.push({ start: m.index, end: m.index + m[0].length, css: m[1] });
  }
  return blocks;
}

/** 각 <style> 을 같은 자리의 <link> 로 바꾼 HTML. 캐스케이드 순서는 그대로 보존된다. */
function externalized(html, blocks) {
  let out = "";
  let cursor = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    out += html.slice(cursor, blocks[i].start);
    out += `<link rel="stylesheet" href="/css/shell/${String(i).padStart(4, "0")}0123456789abcdef01234567.css">`;
    cursor = blocks[i].end;
  }
  return out + html.slice(cursor);
}

console.log(`[measure:shell-css] ${url}`);

const res = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 measure-shell-css" } });
const html = await res.text();
const etag = res.headers.get("etag");
const lastModified = res.headers.get("last-modified");
const validator = etag || lastModified;

console.log(`\n[1] 캐시 정책 — HTTP ${res.status}`);
console.log(`    cache-control : ${res.headers.get("cache-control")}`);
console.log(`    etag          : ${etag ?? "(없음)"}`);
console.log(`    last-modified : ${lastModified ?? "(없음)"}`);
console.log(`    cf-cache-status: ${res.headers.get("cf-cache-status")}`);
if (validator) {
  const probe = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 measure-shell-css",
      ...(etag ? { "if-none-match": etag } : {}),
      ...(lastModified ? { "if-modified-since": lastModified } : {}),
    },
  });
  console.log(`    → 조건부 재요청: ${probe.status} (304 면 재방문 본문 0바이트)`);
} else {
  console.log("    🔴 검증자가 없다 — 조건부 요청이 불가능하므로 `no-cache` 여도 재방문은 전량 재전송이다.");
  // 여기서 멈추면 다음 세션이 원인을 처음부터 다시 찾는다(실제로 세 번 그랬다).
  // 원인 신호를 같은 자리에서 함께 찍는다 — 판정은 2026-09-02 에 이미 끝났다.
  console.log(`    transfer-encoding: ${res.headers.get("transfer-encoding") ?? "(없음)"}`);
  console.log(`    content-length   : ${res.headers.get("content-length") ?? "(없음)"}`);
  const jsdHits = (html.match(/\/cdn-cgi\/challenge-platform\//g) || []).length;
  console.log(`    challenge-platform 주입: ${jsdHits}건 (소스 index.html 은 0건)`);
  if (jsdHits > 0) {
    console.log("    🔴 원인 확정 — Cloudflare JavaScript Detections 가 HTML 본문을 재작성 중이다.");
    console.log("       본문을 다시 쓰면서 content-length 와 etag 가 함께 사라지므로 검증자 소실은 정상 귀결이다.");
    console.log("       🔴 _headers 로도 코드로도 못 고친다 — 대시보드 토글이 유일한 레버이고, 사용자는 봇 보호를 유지하기로 했다.");
    console.log("       근거·기각된 가설 4종: docs/handoff/app-optimization-remaining-2026-09-02.md §2");
  } else {
    console.log("    ⚠️ JSD 주입이 안 보인다 — 2026-09-02 확정 원인과 다른 상황이다. 위 §2 의 대조표를 다시 돌릴 것.");
  }
}

const blocks = styleBlocks(html);
const cssBytes = blocks.reduce((sum, b) => sum + Buffer.byteLength(b.css, "utf8"), 0);
const htmlAfter = externalized(html, blocks);

console.log(`\n[2] 인라인 CSS 규모 (압축 전)`);
console.log(`    셸 HTML       : ${kb(Buffer.byteLength(html, "utf8"))}`);
console.log(`    <style> 블록  : ${blocks.length}개 · ${kb(cssBytes)} (셸의 ${((cssBytes / Buffer.byteLength(html, "utf8")) * 100).toFixed(1)}%)`);

/**
 * 🔴 번들 경계는 캐스케이드가 정한다 — <style> 사이에 <link rel=stylesheet> 가 끼면
 * 그 지점을 넘겨 합치는 순간 우선순위가 뒤집힌다. 낀 링크에서 끊어 연속 구간만 묶는다.
 */
const linkPositions = [...html.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi)].map((m) => m.index);
const firstStyle = blocks[0].start;
const lastStyle = blocks.at(-1).end;
const interleaved = linkPositions.filter((i) => i > firstStyle && i < lastStyle);
console.log(`\n[3] 번들 경계`);
console.log(`    <style> 구간(${firstStyle}..${lastStyle}) 안에 낀 <link rel=stylesheet>: ${interleaved.length}개`);
console.log(`    → 전량 1개 번들은 불가. 낀 링크에서 끊어 연속 구간별로 묶는다.`);

/** 히어로 첫 페인트 잠금 블록은 인라인 존치가 강제다(verify-hero-firstpaint-lock.mjs). */
const isHeroLock = (b) => /id=["'][^"']*hero-firstpaint-lock/i.test(html.slice(b.start, b.start + 200));

/** 낀 링크 · 히어로 잠금 블록에서 끊어 연속 구간을 만든다. */
function groupBlocks() {
  const groups = [];
  let current = [];
  for (const b of blocks) {
    const boundary =
      isHeroLock(b) ||
      (current.length > 0 && interleaved.some((i) => i > current.at(-1).end && i < b.start));
    if (boundary && current.length > 0) {
      groups.push(current);
      current = [];
    }
    if (isHeroLock(b)) continue; // 인라인 존치
    current.push(b);
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** 각 그룹을 그룹 첫 블록 자리의 <link> 하나로 치환한 HTML 을 만든다. */
function applyGroups(groups) {
  const replacements = groups.map((g) => ({ start: g[0].start, end: g.at(-1).end, group: g }));
  let out = "";
  let cursor = 0;
  for (const r of replacements) {
    out += html.slice(cursor, r.start);
    out += `<link rel="stylesheet" href="/css/shell/0123456789abcdef01234567.css">`;
    // 그룹 내부의 마크업(블록 사이에 낀 요소)은 보존한다.
    for (let i = 0; i < r.group.length - 1; i += 1) {
      out += html.slice(r.group[i].end, r.group[i + 1].start);
    }
    cursor = r.end;
  }
  return out + html.slice(cursor);
}

const groups = groupBlocks();
console.log(`    연속 구간: ${groups.length}개 (블록 ${groups.reduce((s, g) => s + g.length, 0)}개 이동, 히어로 잠금 ${blocks.filter(isHeroLock).length}개 인라인 존치)`);

/** 변형별 전송량. 첫 방문 = HTML + 새 CSS 파일 전부, 재방문 = HTML 만(CSS 는 immutable 캐시 히트). */
const variants = [
  { name: `A. 블록별 ${blocks.length}개 파일 (순진안)`, files: blocks.map((b) => b.css), html: htmlAfter },
  {
    name: `B. 연속 구간별 ${groups.length}개 파일 (캐스케이드 보존 · 추천)`,
    files: groups.map((g) => g.map((b) => b.css).join("\n")),
    html: applyGroups(groups),
  },
];

console.log(`\n[4] 전송 바이트 (brotli)`);
for (const q of QUALITIES) {
  const now = br(html, q);
  console.log(`    q=${q} — 현재 (전부 인라인): ${kb(now)}`);
  for (const v of variants) {
    const after = br(v.html, q);
    const cssTransfer = v.files.reduce((sum, css) => sum + br(css, q), 0);
    const firstVisit = after + cssTransfer;
    console.log(`      ${v.name}`);
    console.log(`        첫 방문  : ${kb(firstVisit)}  (HTML ${kb(after)} + CSS ${kb(cssTransfer)} × ${v.files.length}개)  현재 대비 ${firstVisit >= now ? "+" : ""}${kb(firstVisit - now)}`);
    console.log(`        재방문   : ${kb(after)}  현재 대비 ${kb(after - now)}`);
  }
}

console.log(`\n[5] 배포 사이 CSS 안정성 — 해시 파일이 얼마나 자주 깨지나`);
const commits = execFileSync("git", ["log", "--format=%H %ad", "--date=short", "-n", "40", "origin/main", "--", "index.html"], {
  encoding: "utf8",
}).trim().split("\n").filter(Boolean);

if (commits.length < 2) {
  console.log("    index.html 커밋 이력이 2개 미만이라 건너뛴다.");
} else {
  /**
   * 🔴 캐시 히트는 바이트가 아니라 **파일 단위**로 결정된다 — 묶음 안 한 줄만 바뀌어도
   *    그 파일 전체가 다시 내려간다. 바이트 비율만 보면 절감을 과대평가한다.
   *    (소스 index.html 기준이라 dist 의 묶음 경계와 완전히 같지는 않다 — 근사치다.)
   */
  const versions = commits.map((line) => {
    const [sha, date] = line.split(" ");
    const text = execFileSync("git", ["show", `${sha}:index.html`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const bs = styleBlocks(text);
    const links = [...text.matchAll(/<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi)].map((m) => m.index);
    const gs = [];
    let cur = [];
    for (const b of bs) {
      if (cur.length > 0 && links.some((i) => i > cur.at(-1).end && i < b.start)) {
        gs.push(cur);
        cur = [];
      }
      cur.push(b);
    }
    if (cur.length > 0) gs.push(cur);
    return {
      sha: sha.slice(0, 9),
      date,
      bytes: new Map(bs.map((b) => [b.css, Buffer.byteLength(b.css, "utf8")])),
      groups: gs.map((g) => g.map((b) => b.css).join("\n")),
    };
  });

  const pairs = [];
  for (let i = 0; i < versions.length - 1; i += 1) {
    const newer = versions[i];
    const older = versions[i + 1];
    let total = 0;
    let changed = 0;
    for (const [css, size] of newer.bytes) {
      total += size;
      if (!older.bytes.has(css)) changed += size;
    }
    const oldGroups = new Set(older.groups);
    const staleGroups = newer.groups.filter((g) => !oldGroups.has(g)).length;
    if (total > 0) {
      pairs.push({
        ...newer,
        bytePct: (changed / total) * 100,
        changed,
        total,
        staleGroups,
        groupCount: newer.groups.length,
      });
    }
  }

  const avgByte = pairs.reduce((s, c) => s + c.bytePct, 0) / pairs.length;
  const avgGroupPct = pairs.reduce((s, c) => s + (c.staleGroups / c.groupCount) * 100, 0) / pairs.length;
  const cleanDeploys = pairs.filter((c) => c.staleGroups === 0).length;
  console.log(`    index.html 을 바꾼 최근 커밋 ${versions.length}개 · 연속 쌍 ${pairs.length}건 (묶음 ${pairs[0].groupCount}개 기준)`);
  console.log(`    바뀐 <style> 바이트 : 평균 ${avgByte.toFixed(1)}% · 중앙값 ${median(pairs.map((c) => c.bytePct)).toFixed(1)}%`);
  console.log(`    🔴 무효화된 묶음    : 평균 ${avgGroupPct.toFixed(1)}% · 중앙값 ${median(pairs.map((c) => (c.staleGroups / c.groupCount) * 100)).toFixed(1)}%  ← 실제 재전송 단위`);
  console.log(`    CSS 를 하나도 안 건드린 배포: ${cleanDeploys}/${pairs.length}건 (이때만 재방문 절감이 100% 산다)`);
  for (const c of pairs.slice(0, 8)) {
    console.log(`      ${c.date} ${c.sha}  바이트 ${c.bytePct.toFixed(1)}%  묶음 ${c.staleGroups}/${c.groupCount}`);
  }
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
