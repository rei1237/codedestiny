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
 * 무엇을 강제하는가:
 *   ① 잠금 블록이 존재하고, **히어로 마크업보다 앞**에 있다
 *   ② 잠금 블록의 미디어 조건이 정본과 같다
 *   ③ 잠금 블록이 선언한 모든 규칙이 정본에 **글자 그대로** 존재한다 (한쪽만 고치면 점프 부활)
 *   ④ 신뢰 배지줄이 마크업으로 .moon-hero__copy 안에 있고, 링크 3개의 앵커가 스크립트 폴백과 같다
 *
 * fail-closed: 블록·마크업·정본 중 무엇이든 못 찾으면 "검사할 게 없다"가 아니라 실패다.
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
const HERO_MARKUP = 'class="normal-logo moon-hero';
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

/** 주석·개행을 걷어내고 `선택자{선언}` 목록으로 자른다. @media 한 겹만 벗긴다. */
function rules(css) {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(stripped)) !== null) {
    const selector = m[1].replace(/\s+/g, " ").trim();
    if (!selector || selector.startsWith("@")) continue;
    const decls = m[2]
      .split(";")
      .map((d) => d.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .sort()
      .join("; ");
    out.push({ selector, decls });
  }
  return out;
}

function mediaCondition(css) {
  const m = css.match(/@media([^{]+)\{/);
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

const lock = styleBlock(LOCK_ID);
const canon = styleBlock(CANON_ID);
const heroAt = html.indexOf(HERO_MARKUP);

if (!lock) fail(`잠금 블록 <style id="${LOCK_ID}"> 이 index.html 에 없다. 히어로 첫 페인트가 다시 206px 로 그려진다.`);
if (!canon) fail(`정본 블록 <style id="${CANON_ID}"> 이 index.html 에 없다. 대조 대상이 사라졌다.`);
if (heroAt === -1) fail(`히어로 마크업(${HERO_MARKUP}) 을 못 찾았다. 선택자가 바뀌었다면 이 가드도 함께 고쳐야 한다.`);

if (lock && heroAt !== -1 && lock.at > heroAt) {
  fail(`잠금 블록이 히어로 마크업보다 뒤에 있다(style@${lock.at} > hero@${heroAt}). 앞에 있어야 첫 페인트에 적용된다.`);
}

if (lock && canon) {
  // ② 미디어 조건
  const lockMedia = mediaCondition(lock.body);
  const canonMedia = mediaCondition(canon.body);
  if (!lockMedia || !canonMedia) {
    fail("잠금·정본 중 한쪽에서 @media 조건을 못 읽었다.");
  } else if (lockMedia !== canonMedia) {
    fail(`미디어 조건이 다르다.\n  잠금: ${lockMedia}\n  정본: ${canonMedia}`);
  }

  // ③ 규칙 대조 — 잠금이 선언한 것은 전부 정본에 그대로 있어야 한다
  const lockRules = rules(lock.body);
  if (lockRules.length === 0) fail("잠금 블록에서 CSS 규칙을 하나도 못 읽었다(내용이 비었거나 파싱 실패).");
  const canonRules = new Map(rules(canon.body).map((r) => [r.selector, r.decls]));
  for (const r of lockRules) {
    if (!canonRules.has(r.selector)) {
      fail(`정본에 없는 선택자를 잠금이 들고 있다 — ${r.selector}\n  정본(${CANON_ID}) 의 "① Hero" 와 어긋났다.`);
      continue;
    }
    const canonDecls = canonRules.get(r.selector);
    if (canonDecls !== r.decls) {
      fail(
        `선언이 갈렸다 — ${r.selector}\n  잠금: ${r.decls}\n  정본: ${canonDecls}\n` +
          "  한쪽만 고치면 첫 페인트와 최종이 달라져 레이아웃 점프가 되살아난다.",
      );
    }
  }
}

// ④ 신뢰 배지줄이 마크업으로 존재하는가
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

// ④-b 스크립트 쪽은 "있으면 재사용" 이어야 한다 — 무조건 만들면 마크업이 있어도 두 줄이 된다
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
  `[hero-firstpaint-lock] OK — 잠금 블록이 히어로 마크업 앞에 있고 정본(${CANON_ID})과 일치, 신뢰 배지줄은 마크업으로 존재.`,
);
