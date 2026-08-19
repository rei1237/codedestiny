/**
 * 배포 산출물(dist/**\/*.html)에서 **부팅에 필요 없는 인라인 <script> 블록을 다음 태스크로 넘긴다.**
 *
 * 왜 — TBT 는 태스크당 50ms 초과분만 센다. 800ms 짜리 태스크 하나는 750ms 를 물지만, 같은 일을
 * 50ms 짜리 16개로 나누면 0ms 다. 즉 **일을 줄이지 않고 쪼개기만 해도** 점수가 오른다.
 * 홈 셸은 파싱 도중 인라인 블록들이 연달아 실행돼 문서 자체가 롱태스크 1위였다
 * (2026-08-15 프로덕션 실측: 문서 귀속 롱태스크 1,639ms · bootup 7,293ms).
 *
 * 근거(2026-08-15, 로컬 dist·모바일 5회 중앙값): 남은 인라인 21블록(58KB)을 **전부** 비우면
 * TBT 1,288 → 815ms 였다. 다만 그때 LCP 는 4,657 → 6,311ms 로 무너진다 — 히어로 문구 교체와
 * 부트 게이트 해제가 그 안에 있기 때문이다. 그래서 처방은 "전부 미루기"가 아니라
 * **부팅·첫 페인트에 관여하지 않는 블록만 골라 미루기** 다.
 *
 * 왜 소스가 아니라 dist 인가 — externalize-dist-inline-scripts.mjs 머리말과 같은 이유다.
 * 셸을 문자열로 읽는 verify 가 61개(그중 함수 본문을 중괄호로 잘라 쓰는 것 19개)라, 소스에서
 * 블록을 setTimeout 으로 감싸면 성능과 무관하게 그 가드들이 깨진다.
 *
 * 🔴 run-postbuild.mjs 의 steps 에서 **externalize 뒤 · minify-dist-js 앞**에 둔다.
 *    - 뒤여야 하는 이유: 8KB 이상 블록은 이미 외부로 빠져 있어야 여기서 다룰 대상이 확정된다.
 *    - 앞이어야 하는 이유: 우리가 감싼 코드도 minify 를 타야 한다.
 *
 * 🔴 허용목록은 fail-closed 다 (CLAUDE.md 원칙 10 — 손으로 쓴 대상 목록은 가드가 아니다).
 *    ① 목록의 항목이 dist 에서 **하나도 안 잡히면 에러로 죽는다.** 셸이 바뀌어 대상이 사라졌는데
 *       조용히 통과하면, 이 단계는 아무것도 안 하면서 한 일이 있는 척하게 된다.
 *    ② 잡힌 블록이 **최상위 단일 IIFE 가 아니면 에러로 죽는다.** IIFE 가 아닌 블록을 감싸면
 *       최상위 var/function 선언이 함수 스코프에 갇혀 전역이 조용히 사라진다.
 *    ③ 부팅 필수 시그니처에 걸리면 목록에 있어도 거부한다(이중 안전장치).
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const ROOT = process.cwd();
const DIST = resolve(ROOT, "dist");

/**
 * 미룰 블록. key 는 <script> 의 data-marker/data-cd-marker/id, sig 는 본문 안의 고유 문자열이다.
 * 🔴 청크 파일명(해시)으로 키를 잡지 말 것 — 소스가 한 글자만 바뀌어도 해시가 돌아 목록이 죽는다.
 *
 * 전부 "이미 파싱된 요소에 이벤트 리스너를 다는 일"만 하며, window 전역을 밖에서 읽는 곳이 없음을
 * 확인했다(2026-08-15, dist/js 전수 + 인라인 블록 전수 검색).
 */
const DEFERRABLE = [
  /* 2026-08-19 제거: "cd-service-index-search-v20260723"
     전체 서비스 검색 엔진이 인라인에서 외부 파일 js/core/home-service-finder.js 로 나갔다
     (운명의 문 디스커버와 엔진·데이터를 합치면서 8KB 를 넘겼기 때문). 외부 defer 스크립트는
     애초에 문서 파싱 태스크에 실리지 않으므로 이 단계가 미룰 대상이 아니다. */
  { key: "cd-home-renaissance-js-v20260723", why: "탑바 드롭다운 토글 — 클릭 리스너뿐" },
  { key: "cookie-request-policy-v20260704", why: "쿠키 동의 배너 배선 — window.cdSyncConsent 는 이 블록 안에서만 호출" },
  { key: "cd-mobile-footer-accordion-v20260723", why: "푸터 아코디언 — 첫 화면 밖" },
  { sig: "__cdCosmicSoulDirectTapBound", why: "코스믹 소울 직행 탭 바인딩 — 리스너뿐" },
  { sig: "__cdVedicAiDirectClickGuard", why: "베다 AI 직행 클릭 가드 — 리스너뿐" },
  { sig: "shouldRunVersionProbe", why: "배포 버전 프로브 — 네트워크 호출, 첫 페인트와 무관" },
  { sig: "estimateA4Pages", why: "A4 쪽수 추정 — getComputedStyle 를 쓰는 강제 레이아웃 소스" },
];

/**
 * 🔴 이 시그니처가 본문에 있으면 목록에 있어도 미루지 않는다.
 * 미루면 무엇이 깨지는지는 docs/handoff/mobile-home-perf.md §5 N1 에 있다.
 */
const NEVER_DEFER = [
  { sig: "cd-boot-gate", why: "부트 게이트 해제 — 미루면 베일이 늦게 걷혀 LCP 가 무너진다" },
  { sig: "cd-boot-progress", why: "부팅 준비 신호 등록부 — 게이트가 이것을 기다린다" },
  { sig: "fortuneThemeModeStateV1", why: "첫 페인트 전 테마 확정 — 미루면 연이→네오 크로스페이드가 보인다" },
  { sig: "__cdBodyScrollLockReady", why: "스크롤 락 인프라 — 다른 코드가 이 API 를 부른다" },
  // 🔴 "location.assign" 처럼 뭉툭한 시그니처를 쓰지 말 것 — 클릭 핸들러 안의 이동까지 잡아
  //    실제로 안전한 블록(베다 AI 직행 가드)을 부팅 필수로 오인했다(2026-08-15 실측).
  { sig: "sukuyo-compatibility-ai-entry-redirect", why: "숙요 진입 리다이렉트 — 이동 타이밍이 바뀐다" },
];

if (!existsSync(DIST)) {
  console.log("[split-dist-boot-tasks] dist 없음 — 건너뜀");
  process.exit(0);
}

function collectHtml(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "js" || entry.name === "_next") continue;
      out.push(...collectHtml(full));
    } else if (entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

/** src·비 JS type 이 붙은 것은 건드리지 않는다 (externalize 와 같은 판정). */
function isPlainInline(attrs) {
  if (/\ssrc\s*=/i.test(attrs)) return false;
  const type = /\stype\s*=\s*"([^"]*)"/i.exec(attrs);
  if (type && !/^(text\/javascript|application\/javascript)$/i.test(type[1].trim())) return false;
  return true;
}

/** 선행 주석·공백을 걷어낸 코드 본체. 소스 블록은 대부분 설명 주석으로 시작한다. */
function stripLeadingComments(code) {
  let s = code;
  for (;;) {
    const before = s;
    s = s.replace(/^\s+/, "");
    if (s.startsWith("/*")) {
      const end = s.indexOf("*/");
      if (end === -1) break;
      s = s.slice(end + 2);
    } else if (s.startsWith("//")) {
      const nl = s.indexOf("\n");
      if (nl === -1) return "";
      s = s.slice(nl + 1);
    }
    if (s === before) break;
  }
  return s;
}

/**
 * 최상위 단일 IIFE 인가. 감싸도 스코프가 안 바뀌는 유일한 형태다.
 * 여는 쪽만 보면 `(function(){})(); var x = 1;` 같은 블록을 통과시키므로 닫는 쪽도 함께 본다.
 */
function isSingleTopLevelIife(code) {
  const body = stripLeadingComments(code).trim();
  const opensIife = /^[!;]?\s*\(\s*function\s*\*?\s*[\w$]*\s*\(/.test(body) || /^\(\s*\(\s*\)\s*=>/.test(body);
  if (!opensIife) return false;
  // 마지막 의미 있는 문자가 호출 종료여야 한다: `})()` · `})();` · `}())` 등
  const tail = body.replace(/\s+$/, "").replace(/;+$/, "").replace(/\s+$/, "");
  return /\)\s*$/.test(tail) && /\}\s*\)?\s*\([^()]*\)\s*\)?\s*$/.test(tail);
}

function attrKey(attrs) {
  const m = /\s(?:data-marker|data-cd-marker|id)\s*=\s*"([^"]+)"/i.exec(attrs);
  return m ? m[1] : null;
}

const OPEN_RE = /<script(\s[^>]*)?>/gi;
const matched = new Map(DEFERRABLE.map((rule) => [rule.key || rule.sig, 0]));
const errors = [];
const pending = [];
let wrapped = 0;
let wrappedBytes = 0;

for (const file of collectHtml(DIST)) {
  const original = readFileSync(file, "utf8");
  const rel = relative(DIST, file).replace(/\\/g, "/");

  let out = "";
  let cursor = 0;
  let changed = false;
  OPEN_RE.lastIndex = 0;

  let m;
  while ((m = OPEN_RE.exec(original)) !== null) {
    const attrs = m[1] || "";
    const bodyStart = m.index + m[0].length;
    const close = original.toLowerCase().indexOf("</script>", bodyStart);
    if (close === -1) break;
    OPEN_RE.lastIndex = close + "</script>".length;
    if (!isPlainInline(attrs)) continue;

    const body = original.slice(bodyStart, close);
    const key = attrKey(attrs);
    const rule = DEFERRABLE.find((r) => (r.key ? r.key === key : body.includes(r.sig)));
    if (!rule) continue;

    const ruleId = rule.key || rule.sig;
    const blocker = NEVER_DEFER.find((n) => body.includes(n.sig));
    if (blocker) {
      errors.push(`${rel}: "${ruleId}" 가 부팅 필수 시그니처 "${blocker.sig}" 를 담고 있다 — ${blocker.why}`);
      continue;
    }
    if (!isSingleTopLevelIife(body)) {
      errors.push(`${rel}: "${ruleId}" 는 최상위 단일 IIFE 가 아니다 — 감싸면 최상위 선언이 전역에서 사라진다`);
      continue;
    }

    matched.set(ruleId, (matched.get(ruleId) || 0) + 1);
    out += original.slice(cursor, bodyStart);
    out += `\nsetTimeout(function(){${body}\n},0);\n`;
    cursor = close;
    changed = true;
    wrapped += 1;
    wrappedBytes += Buffer.byteLength(body);
  }

  out += original.slice(cursor);
  // 🔴 여기서 바로 쓰지 않는다. 한 파일이라도 실패하면 dist 를 손대지 않고 죽어야 한다 —
  //    쓰고 나서 죽으면 다음 실행이 "자기가 감싼 결과"를 다시 보고 IIFE 판정에 실패한다(실제로 그랬다).
  if (changed) pending.push([file, out]);
}

const unmatched = [...matched].filter(([, n]) => n === 0).map(([id]) => id);
if (unmatched.length > 0) {
  errors.push(
    `허용목록 항목이 dist 어디에도 없다: ${unmatched.join(", ")}\n` +
      "    🔴 가장 흔한 원인은 블록이 사라진 게 아니라 **8KB 를 넘긴 것**이다. " +
      "externalize-dist-inline-scripts 의 MIN_BYTES(8KB) 를 넘으면 그 블록은 외부 청크로 빠지고, " +
      "그때 data-marker 를 포함한 속성이 전부 버려져 여기서 키를 잃는다. " +
      "소스 블록에 몇 줄 더한 직후라면 그 크기를 먼저 재 볼 것 — 주석을 줄여 8KB 아래로 되돌리거나, " +
      "정말 커져야 하는 블록이면 이 목록에서 빼고 그 사실을 기록해라. 조용히 통과시키지 않는다.",
  );
}

if (errors.length > 0) {
  console.error("[split-dist-boot-tasks] 실패 — dist 는 손대지 않았다:");
  // 같은 사유가 셸 사본 수만큼 반복되므로 사유별로 접어서 낸다.
  const byReason = new Map();
  for (const e of errors) {
    const [where, ...rest] = e.split(": ");
    const reason = rest.join(": ");
    if (!byReason.has(reason)) byReason.set(reason, []);
    byReason.get(reason).push(where);
  }
  for (const [reason, wheres] of byReason) {
    console.error(`  - ${reason}`);
    console.error(`    (${wheres.length}개 셸: ${wheres.slice(0, 3).join(", ")}${wheres.length > 3 ? " …" : ""})`);
  }
  process.exit(1);
}

for (const [file, out] of pending) writeFileSync(file, out, "utf8");

console.log(
  `[split-dist-boot-tasks] HTML ${pending.length}개에서 인라인 ${wrapped}블록(${Math.round(wrappedBytes / 1024)}KB)을 ` +
    "setTimeout(0) 으로 이월 — 부팅 필수 블록은 그대로 동기 실행",
);
