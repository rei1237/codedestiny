#!/usr/bin/env node
/**
 * 인증바 첫 페인트 예약 가드 — 홈 히어로가 "게스트 크기로 그렸다가 로그인 카드가 도착하며
 * 통째로 밀려 내려가는" 상태로 되돌아가는 것을 막는다.
 *
 * 왜 필요한가 (2026-08-29 실측, 프로덕션 16b294592, 412x823 dpr1.75, CPU 4x):
 *   #authQuickLinks 는 히어로 **바로 위 형제**인데 첫 페인트에는 게스트 2버튼(108px)으로 그려지고,
 *   인증이 확정되면 .cd-user-card(428~514px)로 통째로 교체된다. 그 순간 히어로가 y166 -> y486 으로
 *   320px 밀렸다:
 *     게스트                  CLS 0.0000
 *     캐시 로그인             CLS 0.2865  (세션 거절되면 되돌림이 한 번 더 나서 0.5728)
 *   부팅 베일(html.cd-boot-gate .cd-boot-gate__veil)은 이 시프트를 가리지 못한다 —
 *   layout-shift 알고리즘에는 가림 판정이 없어서, 덮여 있어도 그대로 계상된다.
 *
 *   고친 방식: 예약값을 **상수로 박지 않는다.** 확정 카드 높이가 뷰포트·neo-mode·이용권/관리자
 *   여부로 396~514px 로 갈려 어떤 상수도 대다수 방문자에게 틀리고, 큰 값 하나로 잡으면 빈 공간이
 *   남는다(app/components/DeferredAdsense.tsx:225 가 정확히 그 실패를 기록해 뒀다).
 *   대신 확정 렌더가 잰 값을 localStorage 에 저장하고, 다음 방문의 첫 페인트 스크립트가 읽어
 *   CSS 변수로 넣는다. 결과(같은 조건): 유효 로그인 0.2865 -> 0.0003.
 *
 * 무엇을 강제하는가 — 이 장치는 다리가 넷이고 **하나만 빠져도 조용히 죽는다**:
 *   ① 첫 페인트 스크립트가 저장값을 읽어 클래스와 CSS 변수를 붙인다
 *   ② 그 CSS 규칙이 존재하고, 값이 **상수가 아니라 그 변수**다
 *   ③ 확정 카드 렌더러(__cdRenderAuthSummary)가 실측 높이를 저장한다
 *   ④ 게스트 확정 렌더러(__cdRenderGuestAuthLinks)가 저장값과 클래스를 해제한다
 *      (안 지우면 세션이 만료된 방문자에게 카드 크기의 빈 공간이 영구히 남는다)
 *   ⑤ ①·②는 #authQuickLinks 마크업보다 **앞**에 있어야 한다 — 뒤면 첫 페인트가 아니다
 *
 * fail-closed: 마크업·스크립트·규칙 중 무엇이든 못 찾으면 "검사할 게 없다"가 아니라 실패다.
 *
 * 실행: npm run verify:auth-bar-reservation
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ENTRY = resolve(root, "index.html");

const STORAGE_KEY = "cd_auth_bar_h_v1";
const RESERVE_CLASS = "cd-auth-bar-reserved";
const RESERVE_VAR = "--cd-auth-bar-reserve";
const BAR_MARKUP = 'id="authQuickLinks"';
const CARD_RENDERER = "function __cdRenderAuthSummary(";
const GUEST_RENDERER = "function __cdRenderGuestAuthLinks(";

const failures = [];
const fail = (msg) => failures.push(msg);

const html = readFileSync(ENTRY, "utf8");

// ── 기준점: 인증바 마크업. 못 찾으면 이 가드가 지킬 대상 자체가 사라진 것이다.
const markupAt = html.indexOf(BAR_MARKUP);
if (markupAt < 0) {
  fail(`#authQuickLinks 마크업(${BAR_MARKUP})을 index.html 에서 못 찾았다 — 인증바가 사라졌거나 식별자가 바뀌었다.`);
}

// ── ① 첫 페인트 스크립트
const readAt = html.indexOf(`getItem('${STORAGE_KEY}')`);
if (readAt < 0) {
  fail(`첫 페인트 스크립트가 저장값을 읽지 않는다 — localStorage.getItem('${STORAGE_KEY}') 가 없다.`);
} else {
  if (!html.includes(`classList.add('${RESERVE_CLASS}')`)) {
    fail(`저장값을 읽고도 예약 클래스를 안 붙인다 — classList.add('${RESERVE_CLASS}') 가 없다.`);
  }
  if (!html.includes(`setProperty('${RESERVE_VAR}'`)) {
    fail(`예약 높이를 CSS 로 넘기지 않는다 — setProperty('${RESERVE_VAR}', ...) 가 없다.`);
  }
  if (markupAt >= 0 && readAt > markupAt) {
    fail(`첫 페인트 스크립트가 인증바 마크업보다 뒤에 있다(스크립트 ${readAt} > 마크업 ${markupAt}) — 그러면 첫 페인트에 예약이 없다.`);
  }
}

// ── ② CSS 규칙. 상수로 박는 것을 막는 것이 이 검사의 핵심이다.
const ruleRe = new RegExp(`html\\.${RESERVE_CLASS}\\s+#authQuickLinks\\s*\\{([^}]*)\\}`);
const rule = html.match(ruleRe);
if (!rule) {
  fail(`예약 규칙 html.${RESERVE_CLASS} #authQuickLinks{...} 가 없다.`);
} else {
  const body = rule[1];
  if (!/min-height\s*:/.test(body)) {
    fail(`예약 규칙에 min-height 가 없다: ${body.trim()}`);
  }
  if (!body.includes(`var(${RESERVE_VAR}`)) {
    fail(
      `🔴 예약값이 상수로 박혔다: ${body.trim()}\n` +
      `   확정 카드 높이는 뷰포트·neo-mode·이용권/관리자 여부로 396~514px 갈린다(2026-08-29 실측).` +
      ` 상수는 대다수 방문자에게 틀리고, 큰 값을 쓰면 빈 공간이 남는다. var(${RESERVE_VAR}) 를 쓸 것.`
    );
  }
  if (markupAt >= 0 && rule.index > markupAt) {
    fail(`예약 규칙이 인증바 마크업보다 뒤에 있다(규칙 ${rule.index} > 마크업 ${markupAt}) — 그러면 첫 페인트에 안 먹는다.`);
  }
}

// ── ③·④ 두 렌더러. 함수 본문 안에 있는지까지 본다(파일 어딘가에 있는 것으로는 부족하다).
function bodyOf(signature) {
  const at = html.indexOf(signature);
  if (at < 0) return null;
  // 다음 최상위 렌더러 정의 전까지를 본문으로 본다 — 셸은 한 파일이라 중괄호 균형을 세지 않는다.
  const rest = html.slice(at + signature.length);
  const end = rest.search(/\n {10}(?:function|window\.)/);
  return end < 0 ? rest : rest.slice(0, end);
}

const cardBody = bodyOf(CARD_RENDERER);
if (cardBody === null) {
  fail(`확정 카드 렌더러(${CARD_RENDERER})를 못 찾았다 — 이름이 바뀌었으면 이 가드도 함께 고칠 것.`);
} else if (!cardBody.includes(`setItem('${STORAGE_KEY}'`)) {
  fail(
    `확정 카드 렌더러가 실측 높이를 저장하지 않는다 — localStorage.setItem('${STORAGE_KEY}', ...) 가 없다.\n` +
    `   저장이 빠지면 예약값이 영영 안 생겨 장치 전체가 무음으로 죽는다.`
  );
}

const guestBody = bodyOf(GUEST_RENDERER);
if (guestBody === null) {
  fail(`게스트 렌더러(${GUEST_RENDERER})를 못 찾았다 — 이름이 바뀌었으면 이 가드도 함께 고칠 것.`);
} else {
  if (!guestBody.includes(`removeItem('${STORAGE_KEY}'`)) {
    fail(
      `게스트 확정 렌더러가 저장값을 지우지 않는다 — localStorage.removeItem('${STORAGE_KEY}') 가 없다.\n` +
      `   안 지우면 세션이 만료된 방문자에게 다음 로드마다 카드 크기의 빈 공간이 남는다.`
    );
  }
  if (!guestBody.includes(`remove('${RESERVE_CLASS}')`)) {
    fail(`게스트 확정 렌더러가 예약 클래스를 떼지 않는다 — classList.remove('${RESERVE_CLASS}') 가 없다.`);
  }
}

if (failures.length) {
  console.error("[auth-bar-reservation] 🔴 인증바 첫 페인트 예약이 깨졌다\n");
  for (const f of failures) console.error(`  - ${f}`);
  console.error(
    "\n  근거와 실측은 scripts/verify-auth-bar-reservation.mjs 머리말과 index.html 의 cdAuthHint 블록 주석에 있다.\n" +
    "  재현: Playwright 로 프로덕션 문서를 CPU 4x 스로틀에 걸고 layout-shift 의 sources[] 를 찍으면 히어로 시프트를 직접 볼 수 있다."
  );
  process.exit(1);
}

console.log(`[auth-bar-reservation] OK — 첫 페인트 예약 4개 다리 전부 확인 (${STORAGE_KEY})`);
