#!/usr/bin/env node
/**
 * 히어로 첫 페인트 잠금 가드 — 홈 히어로가 "작게 그렸다가 뒤늦게 커지는" 상태로 되돌아가는 것을 막는다.
 *
 * 왜 필요한가 (2026-08-20 실측):
 *   index.html 은 2.7MB 단일 셸이라 브라우저가 **파싱하면서 그린다.** 히어로 마크업은 12,2xx행에
 *   있는데 그 확정 레이아웃(<style id="cd-mobile-home-authoritative-v20260723"> 의 "① Hero")은
 *   13,5xx행에 있었다. 그 사이 1,400행이 파싱되는 동안 브라우저는
 *   cd-mobile-flower-readable-v20260704 의 `min-height:206px` 로 히어로를 그리고 그 아래
 *   섹션들을 배치했다가, 확정 블록이 도착하면 히어로가 652px 로 커지며 아래를 통째로 446px
 *   밀어냈다 — **layout-shift 0.5433** (390x844 · CPU 4x · dist/ 로컬 서빙).
 *   같은 자리에서 신뢰 배지줄(.moon-hero__trust)을 14,1xx행 인라인 스크립트가 만들어 붙이며
 *   94px 을 한 번 더 밀었다 — 0.0258.
 *
 *   고친 방식은 이 레포의 선례(index.html 9647행 주석)와 같다: **최종값을 처음부터 준다.**
 *   히어로 마크업 직전에 확정 규칙과 글자 그대로 같은 블록을 두고, 배지줄은 마크업으로 옮겼다.
 *   결과: 홈·/saju/basic 모바일·데스크탑 모두 CLS 0.0000 (3회 반복, 같은 조건).
 *
 * 🔴 2026-09-05 — 원본이 하나가 아니다:
 *   2026-09-01 에 <style id="cd-home-fold-compact-v20260901"> 이 정본보다 **뒤에** 추가되면서
 *   모바일 폴드 상단의 실제 승자가 그쪽으로 넘어갔다(인증바 2열 접기 · 히어로 여백/제목 축소 ·
 *   하단 탭바 높이 변수). 잠금은 정본만 복제하고 있었으므로 첫 페인트가 다시 옛 값으로 그려졌다 —
 *   **layout-shift 0.2924 + 0.0203** (393x851 · CPU 4x · 4G · 워크트리 로컬 서빙, 2026-09-05).
 *   fold 규칙까지 잠금에 복제해 0.0883 로 떨어뜨렸고, 이 가드도 두 원본을 함께 본다.
 *
 * 무엇을 강제하는가:
 *   ① 잠금 블록이 존재하고, **히어로 마크업보다 앞**에 있다
 *   ② 잠금의 첫 미디어 조건이 정본과 같고, 잠금이 쓰는 모든 미디어 조건이 원본에도 있다
 *   ③ 정방향 — 잠금이 선언한 모든 규칙이 원본(정본 ∪ fold)에 **(미디어, 선택자) 단위로 글자 그대로** 있다
 *   ④ 역방향 — 원본의 모바일 미디어에서 히어로 영역을 건드리는 규칙은 **전부** 잠금에도 있다
 *      (③ 만 있으면 원본에 새 규칙을 넣고 잠금에 안 넣는 회귀가 그대로 통과한다 = fail-open)
 *   ⑤ 원본 최상위의 커스텀 속성 선언이 잠금에도 있다 (--cd-mobile-nav-h 가 늦게 와 탭바를 72px 키웠다)
 *   ⑥ 신뢰 배지줄이 마크업으로 .moon-hero__copy 안에 있고, 링크 3개의 앵커가 스크립트 폴백과 같다
 *
 * fail-closed: 블록·마크업·원본 중 무엇이든 못 찾으면 "검사할 게 없다"가 아니라 실패다.
 *   ④⑤ 는 대조 대상 건수가 0이어도 실패시킨다 — 손으로 쓴 목록이 아니라 원본에서 전수 발견하므로,
 *   0건은 "위반이 없다"가 아니라 "선택자 규약이 바뀌어 가드가 눈이 멀었다"는 뜻이다.
 *
 * 실행: npm run verify:hero-firstpaint-lock
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ENTRY = resolve(root, "index.html");

const LOCK_ID = "cd-hero-firstpaint-lock-v20260820";
const CANON_ID = "cd-mobile-home-authoritative-v20260723";
const FOLD_ID = "cd-home-fold-compact-v20260901";
/** 문서 순서대로 — 뒤에 오는 것이 캐스케이드에서 이긴다. 잠금은 이 둘을 합친 결과를 복제한다. */
const SOURCE_IDS = [CANON_ID, FOLD_ID];

const HERO_MARKUP = 'class="normal-logo moon-hero';
/** ④ 가 볼 미디어 — 원본의 조건 문자열에서 찾는다(잠금에서 찾으면 잠금을 지웠을 때 같이 눈이 먼다). */
const MOBILE_MEDIA_MARK = "max-width: 768px";
/** ④ 의 범위 — 폴드 상단 히어로 영역. #authQuickLinks 는 header.logo-area **안**에 있어
    2열로 접히는 순간 히어로를 76px 끌어올린다(index.html 의 auth-quick-links 마크업 참고). */
const HERO_SCOPES = ["header.logo-area", "#authQuickLinks"];
/* 3번 배지는 2026-08-30 에 #honeyMembershipMini(가격표) → #cdWhyUs(차별점 설명)로 옮겼다.
   섹션·라우트는 그대로 두고 첫 방문 동선만 바꾼 것이다 — 이용권 진입은 하단 내비 /points 와
   #honeyMembershipMini 섹션 자체가 계속 맡는다. */
const TRUST_TARGETS = ["cdFortunePick", "cdServiceIndex", "cdWhyUs"];

const failures = [];
const fail = (msg) => failures.push(msg);

const raw = readFileSync(ENTRY, "utf8");

/**
 * HTML 주석을 같은 길이의 공백으로 덮는다 — 오프셋은 그대로 두고 내용만 지운다.
 * 🔴 이게 없으면 주석 안에 적힌 `<style id="...">` 를 진짜 태그로 오인해 가드가 통과한다
 *    (2026-08-20 이 가드 작성 중 실제로 fail-open 났다).
 */
const html = raw.replace(/<!--[\s\S]*?-->/g, (m) => " ".repeat(m.length));

/** <style id="..."> ... </style> 본문과 시작 오프셋을 돌려준다. 못 찾으면 null. */
function styleBlock(id) {
  const open = html.indexOf(`<style id="${id}"`);
  if (open === -1) return null;
  const bodyStart = html.indexOf(">", open) + 1;
  const close = html.indexOf("</style>", bodyStart);
  if (bodyStart === 0 || close === -1) return null;
  return { at: open, body: html.slice(bodyStart, close) };
}

/**
 * CSS 를 `{ media, selector, decls }` 목록으로 자른다. @media 한 겹을 인식해 안으로 들어간다.
 * 🔴 미디어를 키에 포함해야 하는 이유: 정본에는 같은 선택자가 모바일 블록과
 *    `@media (prefers-reduced-motion: reduce)` 양쪽에 있을 수 있다. 미디어를 무시하고 대조하면
 *    엉뚱한 짝과 비교해 통과하거나, 잠금에 복제하면 안 되는 규칙을 복제하라고 요구하게 된다.
 */
function parse(css) {
  const s = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const brace = s.indexOf("{", i);
    if (brace === -1) break;
    const head = s.slice(i, brace).replace(/\s+/g, " ").trim();
    let depth = 1;
    let j = brace + 1;
    while (j < s.length && depth > 0) {
      if (s[j] === "{") depth += 1;
      else if (s[j] === "}") depth -= 1;
      j += 1;
    }
    const inner = s.slice(brace + 1, j - 1);
    if (head.startsWith("@")) {
      const media = head.replace(/^@media\s*/, "");
      for (const r of parse(inner)) out.push({ media: r.media ?? media, selector: r.selector, decls: r.decls });
    } else if (head) {
      const decls = inner
        .split(";")
        .map((d) => d.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .sort()
        .join("; ");
      out.push({ media: null, selector: head, decls });
    }
    i = j;
  }
  return out;
}

const key = (r) => `${r.media}||${r.selector}`;
const where = (r) => (r.media === null ? "최상위" : `@media ${r.media}`);

const lock = styleBlock(LOCK_ID);
const heroAt = html.indexOf(HERO_MARKUP);

if (!lock) fail(`잠금 블록 <style id="${LOCK_ID}"> 이 index.html 에 없다. 히어로 첫 페인트가 다시 206px 로 그려진다.`);
if (heroAt === -1) fail(`히어로 마크업(${HERO_MARKUP}) 을 못 찾았다. 선택자가 바뀌었다면 이 가드도 함께 고쳐야 한다.`);

const sources = [];
for (const id of SOURCE_IDS) {
  const block = styleBlock(id);
  if (!block) {
    fail(`원본 블록 <style id="${id}"> 이 index.html 에 없다. 대조 대상이 사라졌다.`);
    continue;
  }
  sources.push({ id, block, rules: parse(block.body) });
}

if (lock && heroAt !== -1 && lock.at > heroAt) {
  fail(`잠금 블록이 히어로 마크업보다 뒤에 있다(style@${lock.at} > hero@${heroAt}). 앞에 있어야 첫 페인트에 적용된다.`);
}

if (lock && sources.length === SOURCE_IDS.length) {
  for (const s of sources) {
    if (s.block.at < lock.at) {
      fail(`원본 ${s.id} 이 잠금보다 앞에 있다(@${s.block.at} < @${lock.at}). 잠금은 늦게 오는 규칙을 앞당기는 장치라 문서 순서가 뒤집히면 의미가 없다.`);
    }
  }

  const lockRules = parse(lock.body);
  if (lockRules.length === 0) fail("잠금 블록에서 CSS 규칙을 하나도 못 읽었다(내용이 비었거나 파싱 실패).");

  /** 뒤 원본이 이긴다 — 문서 순서대로 덮어써 "최종 계산값"을 만든다. */
  const srcMap = new Map();
  for (const s of sources) for (const r of s.rules) srcMap.set(key(r), { ...r, from: s.id });

  // ② 미디어 조건
  const firstMedia = (rs) => rs.find((r) => r.media !== null)?.media ?? null;
  const lockMedia = firstMedia(lockRules);
  const canonMedia = firstMedia(sources[0].rules);
  if (!lockMedia || !canonMedia) {
    fail("잠금·정본 중 한쪽에서 @media 조건을 못 읽었다.");
  } else if (lockMedia !== canonMedia) {
    fail(`첫 미디어 조건이 다르다.\n  잠금: ${lockMedia}\n  정본: ${canonMedia}`);
  }
  const srcMedias = new Set([...srcMap.values()].map((r) => r.media));
  for (const m of new Set(lockRules.map((r) => r.media))) {
    if (!srcMedias.has(m)) {
      fail(`잠금이 원본에 없는 미디어 조건을 쓴다 — ${m === null ? "최상위" : `@media ${m}`}\n  조건이 한 글자라도 다르면 첫 페인트와 최종이 갈린다.`);
    }
  }

  // ③ 정방향 — 잠금이 선언한 것은 전부 원본에 그대로 있어야 한다
  for (const r of lockRules) {
    const s = srcMap.get(key(r));
    if (!s) {
      fail(
        `원본에 없는 규칙을 잠금이 들고 있다 — ${where(r)} ${r.selector}\n` +
          `  ${SOURCE_IDS.join(" · ")} 어디에도 같은 (미디어, 선택자) 가 없다.`,
      );
      continue;
    }
    if (s.decls !== r.decls) {
      fail(
        `선언이 갈렸다 — ${where(r)} ${r.selector}\n  잠금: ${r.decls}\n  원본(${s.from}): ${s.decls}\n` +
          "  한쪽만 고치면 첫 페인트와 최종이 달라져 레이아웃 점프가 되살아난다.",
      );
    }
  }

  // ④ 역방향 — 원본의 모바일 히어로 규칙은 전부 잠금에 복제돼 있어야 한다
  const lockMap = new Map(lockRules.map((r) => [key(r), r.decls]));
  const mustMirror = [...srcMap.values()].filter(
    (r) => r.media !== null && r.media.includes(MOBILE_MEDIA_MARK) && HERO_SCOPES.some((sc) => r.selector.includes(sc)),
  );
  if (mustMirror.length === 0) {
    fail(
      `원본에서 복제 대상 히어로 규칙을 하나도 못 찾았다(찾은 범위: ${HERO_SCOPES.join(" · ")} / ${MOBILE_MEDIA_MARK}).\n` +
        "  위반이 없다는 뜻이 아니라 선택자 규약이 바뀌어 이 가드가 눈이 멀었다는 뜻이다 — 범위를 다시 맞춰라.",
    );
  }
  for (const r of mustMirror) {
    if (!lockMap.has(key(r))) {
      fail(
        `원본(${r.from})의 히어로 규칙이 잠금에 없다 — ${where(r)} ${r.selector}\n  ${r.decls}\n` +
          "  첫 페인트에는 이 규칙이 빠진 채로 그려졌다가 원본이 도착하며 히어로가 점프한다.",
      );
    }
  }

  // ⑤ 원본 최상위의 커스텀 속성 — 늦게 도착하면 그 변수를 쓰는 고정 UI 가 통째로 움직인다
  const mustMirrorVars = [...srcMap.values()].filter((r) => r.media === null && /(^|;\s*)--/.test(`;${r.decls}`));
  if (mustMirrorVars.length === 0) {
    fail("원본 최상위에서 커스텀 속성 선언을 하나도 못 찾았다 — 변수가 옮겨 갔다면 잠금과 이 가드를 함께 고쳐야 한다.");
  }
  for (const r of mustMirrorVars) {
    if (!lockMap.has(key(r))) {
      fail(
        `원본(${r.from})의 최상위 변수 선언이 잠금에 없다 — ${r.selector}\n  ${r.decls}\n` +
          "  --cd-mobile-nav-h 가 늦게 도착해 하단 탭바가 72px 커진 사고가 여기서 났다(0.0203).",
      );
    }
  }
}

// ⑥ 신뢰 배지줄이 마크업으로 존재하는가
const trustMarkup = html.match(/<div class="moon-hero__trust"[\s\S]{0,2600}?<\/div>/);
if (!trustMarkup) {
  fail('신뢰 배지줄 <div class="moon-hero__trust"> 마크업이 없다. 스크립트가 다시 만들어 붙이면 히어로가 94px 늦게 커진다.');
} else {
  const heroCopyAt = html.indexOf('<div class="moon-hero__copy">');
  if (heroCopyAt === -1 || trustMarkup.index < heroCopyAt) {
    fail("신뢰 배지줄이 .moon-hero__copy 안에 있지 않다.");
  }
  for (const target of TRUST_TARGETS) {
    if (!trustMarkup[0].includes(`data-cd-hero-trust-target="${target}"`)) {
      fail(`신뢰 배지줄에 data-cd-hero-trust-target="${target}" 링크가 없다 — 스크립트 폴백과 목록이 어긋났다.`);
    }
  }
}

// ⑥-b 스크립트 쪽은 "있으면 재사용" 이어야 한다 — 무조건 만들면 마크업이 있어도 두 줄이 된다
if (!/var trust = copy \? copy\.querySelector\('\.moon-hero__trust'\) : null;/.test(html)) {
  fail("히어로 스크립트가 기존 .moon-hero__trust 를 재사용하지 않는다(무조건 생성으로 되돌아갔다).");
}

if (failures.length) {
  console.error("[hero-firstpaint-lock] 실패\n");
  failures.forEach((f, i) => console.error(`  ${i + 1}. ${f}\n`));
  console.error("  근거·수정 방법: index.html 의 cd-hero-firstpaint-lock-v20260820 주석 참고.");
  process.exit(1);
}

console.log(
  `[hero-firstpaint-lock] OK — 잠금 블록이 히어로 마크업 앞에 있고 원본(${SOURCE_IDS.join(" + ")})과 양방향 일치, 신뢰 배지줄은 마크업으로 존재.`,
);
