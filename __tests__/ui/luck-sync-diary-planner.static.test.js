const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("fortune planner entry is folded into the diary modal", () => {
  const html = read("index.html");
  const runtime = read("js/core/index-inline-runtime.js");
  const plannerRoute = read("app/fortune-planner/page.tsx");
  const legacyRoute = read("app/luck-sync-diary/page.tsx");
  const dashboard = read("js/core/saju/reportDashboard.js");

  assert.match(runtime, /openFortunePlanner[\s\S]*luck-sync-diary\.js/);
  assert.match(runtime, /LuckSyncDiary\.open/);
  assert.match(plannerRoute, /redirect\("\/\?fortunePlanner=1"\)/);
  assert.match(legacyRoute, /redirect\("\/\?fortunePlanner=1"\)/);
  assert.doesNotMatch(runtime, /location\.assign\('\/fortune-planner'\)/);
  assert.doesNotMatch(runtime, /mountFortunePlannerHomeCard/);
  assert.doesNotMatch(runtime, /cdFortunePlannerCard/);
  assert.match(html, /id="cdDiaryPlannerEntry"[\s\S]*data-action="openLuckSyncDiary"/);
  assert.match(html, /id="cdDiaryPlannerTitle">운기·기일 다이어리와[\s\S]*나의 운세 플래너/);
  // 2026-08-21(cd-home-secondary-panel-v20260821): 다이어리 진입은 지운 것이 아니라
  // #cdHomeSecondaryPanel 안으로 옮겨 감춘다. data-cd-home-secondary 속성 대신 래퍼
  // 기준으로 접는 이유는 이 패널이 grid-template-rows 트랜지션으로 부드럽게 펼쳐져야 해서다
  // (display:none 즉시 전환인 속성 방식과 같은 곳에 중첩하지 않는다 — 원칙 6).
  assert.match(html, /<section class="cd-diary-planner-entry" id="cdDiaryPlannerEntry"/);
  assert.ok(html.indexOf('id="cdHomeSecondaryPanel"') < html.indexOf('id="cdDiaryPlannerEntry"'));
  assert.match(html, /html body \.cd-home-secondary-panel\{display:grid;grid-template-rows:0fr/);
  // 2026-08-20(home-profile-card-form-panel-v20260820): 프로필 카드 + 폼 패널이 히어로 바로
  // 아래·페이지 맨 위로 승격되며 대표 상담(cdSignatureConsult)보다도 앞으로 올라왔다.
  // 2026-08-19(cd-finder-v20260819)에는 대표 상담이 통합 탐색기 바로 아래로 승격되며 폼보다
  // 앞이었다 — 이번에 다시 뒤집힌 것은 회귀가 아니라 이 개편의 의도다. 폼 자체는 접힌 채 그대로 있다.
  assert.ok(html.indexOf('id="destinyCardForm"') < html.indexOf('id="cdSignatureConsult"'));
  // 2026-08-20(home-profile-card-form-panel-v20260820): 폼을 감추는 방식이 바뀌었다. 이제 폼은
  // 프로필 카드와 한 패널(#dpDestinyPanel) 안에 있고, 패널이 열리기 전까지 CSS 로 감춘다.
  // data-cd-home-secondary 를 쓰지 않는 이유는 그 속성이 프로필 시트로 노드째 대여될 때도
  // 따라가서 뗐다 붙였다 해야 했기 때문이다. 지킬 것은 그대로다 — 폼은 지워지지 않고 감춰진다.
  assert.ok(html.indexOf('id="dpDestinyPanel"') < html.indexOf('id="destinyCardForm"'));
  assert.match(html, /\.dp-destiny-panel:not\(\.is-form-open\) > #destinyCardForm\{display:none!important\}/);
  assert.doesNotMatch(html, /<section class="card input-section moon-destiny-form" id="destinyCardForm"[^>]*data-cd-home-secondary/);
  // 2026-08-21: "ALL SERVICES 펼치기" 버튼이 숨은 섹션보다 DOM 상 위에 있어(cdServiceIndex가
  // cdDiaryPlannerEntry보다 아래) 펼칠 때 콘텐츠가 버튼 위쪽에 나타나던 문제를 고치며
  // cdDiaryPlannerEntry를 cdServiceIndex 뒤로 옮겼다 — 회귀가 아니라 이 개편의 의도다.
  // (기존 "cdDiaryPlannerEntry < fortuneGatewayEntry" 단언은 이 재배치로 더는 성립하지 않아 대체한다.)
  assert.ok(html.indexOf('id="cdServiceIndex"') < html.indexOf('id="cdDiaryPlannerEntry"'));
  /* 2026-08-21: 온보딩 레일 앵커(__cdRailAnchor)를 요구하던 단언을 걷어냈다.
     b44bd7862 'remove empty onboarding rail' 이 그 줄을 통째로 지웠는데 이 단언은 남아
     **main 이 빨간 채로** 머지됐다(PR #869 가 그 실패를 상속해 막혔다).
     제거는 완전하고 옳았다 — 실측: index.html 에 __cdRailAnchor 참조 0개, 온보딩 레일 마크업 0개.
     지킬 것은 앵커 표현식이 아니라 **다이어리 진입이 살아 있고 순서가 유지되는 것**이고,
     그건 바로 위 순서 단언과 앞쪽의 존재·구조 단언 3개가 이미 지킨다.
     🔴 되살리지 말 것 — 사라진 레일을 다시 요구하게 된다. */
  assert.match(dashboard, /label:'갓생 다이어리'/);
  assert.match(dashboard, /cta:'다이어리 열기'/);
});

test("diary calendar adds local schedules without an entitlement dependency", () => {
  const diary = read("js/luck-sync-diary.js");

  assert.match(diary, /PLANNER_STORAGE_KEY = 'cd\.fortunePlanner\.v2'/);
  assert.match(diary, /function plannerEventOccursOn/);
  assert.match(diary, /lsd-month-schedule-count/);
  assert.match(diary, /id="lsdScheduleForm"/);
  assert.match(diary, /cd:fortune-planner-updated/);
  assert.match(diary, /function isLuckSyncDiaryUnlocked\(\)[\s\S]*return true/);
  assert.doesNotMatch(diary, /fetch\([^)]*entitlement/i);
});

test("diary energy waits for a real saju profile instead of rendering uniform defaults", () => {
  const html = read("index.html");
  const diary = read("js/luck-sync-diary.js");

  assert.match(html, /luck-sync-diary-v2\.webp/);
  assert.ok(fs.existsSync(path.join(root, "public/fuctionassets/luck-sync-diary-v2.webp")));
  assert.match(diary, /function _activeProfilePillars\(/);
  assert.match(diary, /__cdEnsureDestinyProfileLoaded/);
  assert.match(diary, /if \(!scores\) \{[\s\S]*사주 프로필을 불러오면 오늘의 균형을 계산합니다/);
  assert.doesNotMatch(diary, /var base = \{ wealth: 50, love: 50, fame: 50, health: 50, study: 50 \}/);
});

// 4,500줄 파일을 상대로 assert.match 를 쓰면 실패 시 파일 전문이 덤프돼 읽을 수 없다.
// 정규식 판정은 assert.ok 로 감싸 메시지만 남긴다.
const has = (source, pattern, message) => assert.ok(pattern.test(source), message);
const lacks = (source, pattern, message) => assert.ok(!pattern.test(source), message);

test("diary hero keeps the DOM ids that openDiary fills", () => {
  const diary = read("js/luck-sync-diary.js");

  // openDiary()/renderMzSections() 는 이 id 들을 전부 null 체크로 감싸 채운다.
  // 마크업에서 하나가 빠져도 에러 없이 값만 조용히 사라지므로 정적으로 잠근다.
  for (const id of [
    "lsdTodayDate",
    "lsdHeaderDate",
    "lsdHeaderIljin",
    "lsdHeaderElement",
    "lsdHeaderOneLine",
  ]) {
    has(diary, new RegExp(`id="${id}"`), `hero id ${id} missing from markup`);
    has(diary, new RegExp(`getElementById\\('${id}'\\)`), `hero id ${id} is never filled`);
  }
});

test("diary tabs keep their tablist wiring", () => {
  const diary = read("js/luck-sync-diary.js");

  has(diary, /<nav class="lsd-tabs" role="tablist"/, "tablist nav lost its role");

  for (const tab of ["dashboard", "challenge", "night", "meditation", "history"]) {
    const cap = tab[0].toUpperCase() + tab.slice(1);
    has(diary, new RegExp(`data-tab="${tab}"`), `tab ${tab} missing`);
    has(diary, new RegExp(`aria-controls="lsdPanel${cap}"`), `tab ${tab} lost aria-controls`);
    has(diary, new RegExp(`id="lsdPanel${cap}"[^>]*role="tabpanel"`), `panel ${cap} missing`);
  }

  // 데스크탑은 세로 레일이라 위/아래도 이동해야 한다.
  for (const key of ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"]) {
    has(diary, new RegExp(`'${key}'`), `tab keyboard handler lost ${key}`);
  }
});

test("diary panel layout never keys off child position", () => {
  const diary = read("js/luck-sync-diary.js");

  // ensureMzBlocks() 가 런타임에 패널 자식을 삽입한다 — history 는 insertBefore(firstChild)
  // 라 #lsdEmotionCard 가 첫 자식이 된다. 위치 기반 선택자는 반드시 깨진다.
  has(
    diary,
    /historyPanel\.insertBefore\(c, historyPanel\.firstChild/,
    "runtime insert point moved — re-check the panel grid assignments",
  );
  lacks(diary, /\.lsd-panel[^{}']*:nth-child/, "panel layout must not use :nth-child");
  lacks(diary, /\.lsd-panel[^{}']*:(first|last)-of-type/, "panel layout must not use :first/last-of-type");
});

test("diary hero is a date masthead with no image and no inline background", () => {
  const diary = read("js/luck-sync-diary.js");

  // applyElementTheme() 이 히어로 <header> 의 background 를 인라인으로 덮으면
  // 인라인이 스타일시트를 이겨 매스트헤드가 런타임에 지워진다. 토큰 주입만 허용한다.
  lacks(diary, /header\.style\.background\s*=/, "element theme must not paint the hero inline");
  has(diary, /setProperty\('--lsd-elem-tint'/, "element theme should inject the tint token");

  // 히어로가 이미지에 기대지 않는다
  lacks(diary, /godlife\.webp/, "hero image should be gone");
  lacks(diary, /lsd-hero-icon/, "hero icon block should be gone");

  // 날짜가 매스트헤드다
  has(diary, /class="lsd-hero-date-num" id="lsdTodayDate"/, "date masthead missing");
  has(diary, /class="lsd-hero-date-day" id="lsdHeaderDate"/, "weekday line missing");

  // 글래스모피즘 칩은 걷어냈다
  lacks(diary, /lsd-hero-stat/, "hero glass chips should be gone");
  lacks(diary, /backdrop-filter[^;}]*\}?[^']*lsd-hero/, "hero should not reintroduce glass");
});

test("diary type and colour resolve through tokens, not literals", () => {
  const diary = read("js/luck-sync-diary.js");
  const styleBlock = (marker) => {
    const start = diary.indexOf(marker);
    return diary.slice(start, diary.indexOf("].join('');", start));
  };
  const tw = styleBlock("st.id = 'lsd-tw-styles';");
  const mz = styleBlock("st.id = 'lsd-mz-styles';");

  for (const [name, block] of [["tw", tw], ["mz", mz]]) {
    lacks(block, /font-weight:\s*[0-9]/, `${name}: font-weight literal left`);
    lacks(block, /font-size:\s*[0-9.]+(rem|px)/, `${name}: font-size literal left`);
  }

  // 토큰 정의 블록 밖에서는 원색이 나오면 안 된다
  const rules = tw.slice(tw.indexOf("@keyframes lsdGlobeSpin"));
  lacks(rules, /#[0-9a-fA-F]{3,6}\b/, "raw hex left outside the token definitions");

  // 참조하는 토큰은 전부 정의돼 있어야 한다
  const defined = new Set([...diary.matchAll(/(--lsd-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  const used = new Set([...diary.matchAll(/var\((--lsd-[a-z0-9-]+)/g)].map((m) => m[1]));
  const missing = [...used].filter((t) => !defined.has(t));
  assert.deepEqual(missing, [], "undefined design tokens referenced");
});

test("diary static bundle stays byte-identical to its public mirror", () => {
  // verify:public-parity 의 미러 5쌍에 luck-sync-diary.js 가 없어 CI 가 이 드리프트를
  // 잡지 못한다. 한쪽만 고치면 정적 셸이 옛 파일을 서빙하므로 여기서 막는다.
  // 4,500줄 파일이라 내용이 아니라 해시를 비교한다(실패 메시지가 읽히도록).
  const digest = (file) => crypto.createHash("sha256").update(read(file)).digest("hex");

  assert.equal(
    digest("public/js/luck-sync-diary.js"),
    digest("js/luck-sync-diary.js"),
    "public/js/luck-sync-diary.js is stale — run `npm run sync:public`",
  );
});
