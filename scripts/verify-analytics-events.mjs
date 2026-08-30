/**
 * GA4 계측 회귀 가드 (jsdom 실행 검증).
 *
 * 계측은 조용히 죽는다 — 이벤트가 안 나가도 화면은 멀쩡하고 에러도 없다. 그래서 문자열 단언이
 * 아니라 js/core/analytics.js 를 실제로 실행해 window.dataLayer 에 무엇이 쌓이는지 본다.
 *
 * 🔴 네트워크는 한 번도 타지 않는다. jsdom 은 기본적으로 외부 리소스를 받지 않으므로
 * gtag.js 는 <script> 태그만 붙고 실행되지 않으며, 표준 스니펫의 gtag() 는 dataLayer.push 셤이라
 * 모든 이벤트가 그대로 관측된다. 실제 GA 속성으로 나가는 요청은 0건이다.
 *
 * 고정하는 성질:
 *   ① 동의 기본값이 config 보다 먼저 들어간다(순서가 뒤집히면 거부 상태에서도 쿠키가 써진다).
 *   ② cd_cookie_consent 가 accepted 일 때만 analytics_storage 가 granted 다.
 *   ③ cdSyncConsent() 가 consent update 를 쏜다(배너 클릭이 새로고침 없이 반영되어야 한다).
 *   ④ share_receive 는 ref 파라미터가 있을 때만, retention_visit 은 첫 방문에 쏘지 않는다.
 *   ⑤ cross_sell_click 은 data-cd-cross-sell 목록 안의 앵커에서만 발화한다.
 *   ⑥ 측정 ID 가 깨지면 태그를 아예 붙이지 않고 cdTrack 은 no-op 이 된다.
 *   ⑦ 🔴 analytics.js 는 page_view 이벤트를 직접 쏘지 않는다 — 첫 발화는 gtag("config") 담당이고,
 *      React 라우트 전환분만 NavigationProvider 가 보탠다. 양쪽이 다 쏘면 진입 화면이 두 번 잡힌다.
 *   ⑧ useAnalytics 훅은 태그를 다시 붙이지 않고 발화를 전부 trackEvent 로 보낸다.
 *   ⑨ 훅이 쏘는 이름이 레포에서 이미 발화하는 이름·GA4 예약어와 겹치지 않는다.
 *   ⑩ home_section_click 은 data-cd-funnel-section 안의 앵커에서만 발화하고(버튼은 세지 않는다),
 *      한 리스너로 합친 뒤에도 cross_sell_click 과 함께 산다.
 *   ⑪ 홈 셸(index.html)의 표식이 실제로 붙어 있고, 결과 페이지 구간에는 하나도 없다.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ANALYTICS_SOURCE = fs.readFileSync(path.join(ROOT, "js/core/analytics.js"), "utf8");
const SHELL_SOURCE = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/**
 * 이 레포가 실제로 쏘는 이벤트 이름을 소스에서 전수 발견한다.
 *
 * 🔴 손으로 쓴 목록은 가드가 아니다(CLAUDE.md 원칙 10). 실제로 이 목록이 배열로 박혀 있던
 * 동안 free_saju_started·free_saju_completed 와 checkout_* 6종이 빠져 있었고, 훅이 그 이름을
 * 골라도 아무도 막지 못하는 상태였다.
 *
 * 두 갈래로 모은다.
 *  (a) cdTrack("x") · trackEvent("x") 의 문자열 리터럴 — 발화 지점 대부분이 이 형태다.
 *  (b) js/core/checkout-entry.js 의 FUNNEL_EVENTS 키 — 결제 퍼널은 이벤트 이름을 변수로
 *      넘기므로 리터럴 스캔에 안 잡힌다.
 * 훅 자신(app/hooks/useAnalytics.ts)은 검사 대상이므로 뺀다.
 */
function collectEmittedEventNames() {
  const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out", "__tests__"]);
  const SUBJECT = path.join(ROOT, "app/hooks/useAnalytics.ts");
  const files = [path.join(ROOT, "index.html")];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (/\.(?:js|jsx|mjs|ts|tsx)$/.test(entry.name) && full !== SUBJECT) {
        files.push(full);
      }
    }
  };
  for (const root of ["js", "app", "lib"]) walk(path.join(ROOT, root));

  const names = new Set();
  const literal = /(?:cdTrack|trackEvent)\(\s*["']([a-z0-9_]+)["']/g;
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(literal)) names.add(match[1]);
  }

  const checkoutEntry = fs.readFileSync(path.join(ROOT, "js/core/checkout-entry.js"), "utf8");
  const funnelBlock = checkoutEntry.match(/FUNNEL_EVENTS\s*=\s*\{([\s\S]*?)\n\s*\};/);
  assert.ok(funnelBlock, "checkout-entry.js 에서 FUNNEL_EVENTS 블록을 못 찾았다 — 이 파서가 낡았다");
  const funnelNames = [...funnelBlock[1].matchAll(/^\s*([a-z0-9_]+)\s*:\s*true/gm)].map((m) => m[1]);
  assert.ok(funnelNames.length >= 5, `FUNNEL_EVENTS 키가 ${funnelNames.length}개다 — 파서가 낡았다`);
  for (const name of funnelNames) names.add(name);

  // 🔴 대상이 0개일 때 통과하는 검사는 가드가 아니다.
  assert.ok(names.size >= 12, `발화 이름을 ${names.size}개밖에 못 찾았다 — 스캔 범위나 정규식이 낡았다`);
  return names;
}

function boot({ url = "https://code-destiny.com/", consent = "", measurementId = "", lastVisit = null, body = "" } = {}) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => { /* 미구현 내비게이션 경고는 이 가드의 관심사가 아니다 */ });

  const dom = new JSDOM(`<!doctype html><html><head></head><body>${body}</body></html>`, {
    url,
    runScripts: "outside-only",
    virtualConsole,
  });
  const { window } = dom;

  if (consent) window.document.cookie = `cd_cookie_consent=${encodeURIComponent(consent)}; path=/`;
  if (lastVisit !== null) window.localStorage.setItem("cd_ga_last_visit_v1", String(lastVisit));
  if (measurementId) window.__CD_GA_ID = measurementId;

  window.eval(ANALYTICS_SOURCE);

  const calls = (window.dataLayer || []).map((entry) => Array.from(entry));
  return { window, calls };
}

const events = (calls) => calls.filter((c) => c[0] === "event");
const eventNames = (calls) => events(calls).map((c) => c[1]);

/* ① 동의 기본값이 config 보다 먼저 들어가는가 */
{
  const { calls } = boot();
  const consentDefaultAt = calls.findIndex((c) => c[0] === "consent" && c[1] === "default");
  const configAt = calls.findIndex((c) => c[0] === "config");
  assert.notEqual(consentDefaultAt, -1, "consent default 가 dataLayer 에 없다");
  assert.notEqual(configAt, -1, "config 가 dataLayer 에 없다");
  assert.ok(
    consentDefaultAt < configAt,
    `consent default 는 config 보다 먼저여야 한다 (default=${consentDefaultAt}, config=${configAt})`,
  );
  /* ⑦ analytics.js 자신은 page_view 를 쏘지 않는다 */
  assert.ok(!eventNames(calls).includes("page_view"), "analytics.js 가 page_view 를 직접 쐈다 — 진입 화면이 두 번 집계된다");
  assert.equal(calls.filter((c) => c[0] === "config").length, 1, "config 는 정확히 1회여야 한다");
}

/* ② 동의 상태에 따른 analytics_storage */
{
  const denied = boot().calls.find((c) => c[0] === "consent" && c[1] === "default");
  assert.equal(denied[2].analytics_storage, "denied", "동의 전 기본값은 denied 여야 한다");
  assert.ok(!("ad_storage" in denied[2]), "ad_* 는 선언하지 않는다 — AdSense 현재 동작을 바꾸지 않기 위해서다");

  const essential = boot({ consent: "essential" }).calls.find((c) => c[0] === "consent" && c[1] === "default");
  assert.equal(essential[2].analytics_storage, "denied", "essential 은 granted 가 아니다");

  const accepted = boot({ consent: "accepted" }).calls.find((c) => c[0] === "consent" && c[1] === "default");
  assert.equal(accepted[2].analytics_storage, "granted", "accepted 는 granted 여야 한다");
}

/* ③ 배너 선택 변경이 새로고침 없이 반영되는가 */
{
  const { window } = boot();
  assert.equal(typeof window.cdSyncConsent, "function", "cdSyncConsent 가 없다");
  window.document.cookie = "cd_cookie_consent=accepted; path=/";
  window.cdSyncConsent();
  // jsdom 객체는 다른 realm 이라 deepStrictEqual 이 프로토타입에서 걸린다. 필드로 단언한다.
  const update = Array.from(window.dataLayer[window.dataLayer.length - 1]);
  assert.equal(update[0], "consent", "consent update 가 쏘이지 않았다");
  assert.equal(update[1], "update", "consent update 가 쏘이지 않았다");
  assert.equal(update[2].analytics_storage, "granted", "동의 후에도 granted 로 갱신되지 않았다");
}

/* ④ share_receive / retention_visit */
{
  assert.ok(!eventNames(boot().calls).includes("share_receive"), "ref 없는 방문에서 share_receive 가 나갔다");

  const received = boot({ url: "https://code-destiny.com/?ref=abc123&via=kakao_reward" });
  const shareEvent = events(received.calls).find((c) => c[1] === "share_receive");
  assert.ok(shareEvent, "ref 파라미터가 있는데 share_receive 가 없다");
  assert.equal(shareEvent[2].referral_channel, "kakao_reward");

  assert.ok(!eventNames(boot().calls).includes("retention_visit"), "첫 방문에 retention_visit 이 나갔다 — 리텐션이 신규 유입만큼 부풀어 오른다");
  assert.ok(
    !eventNames(boot({ lastVisit: Date.now() - 3600_000 }).calls).includes("retention_visit"),
    "같은 날 재방문에 retention_visit 이 나갔다",
  );
  const returning = boot({ lastVisit: Date.now() - 3 * 86400_000 });
  const retention = events(returning.calls).find((c) => c[1] === "retention_visit");
  assert.ok(retention, "3일 만의 재방문에 retention_visit 이 없다");
  assert.equal(retention[2].days_since_last_visit, 3);
  assert.ok(
    Number(returning.window.localStorage.getItem("cd_ga_last_visit_v1")) > Date.now() - 60_000,
    "마지막 방문 시각이 갱신되지 않았다",
  );
}

/* ⑤ cross_sell_click 은 표식이 붙은 목록 안에서만 */
{
  const markup = `
    <ul data-cd-cross-sell="/saju"><li><a id="inside" href="/ziwei">자미두수</a></li></ul>
    <nav><a id="outside" href="/faq">자주 묻는 질문</a></nav>
  `;
  const { window, calls } = boot({ body: markup });
  const before = events(calls).length;

  window.document.getElementById("outside").click();
  assert.equal(
    events((window.dataLayer || []).map((e) => Array.from(e))).length,
    before,
    "표식 밖의 일반 링크에서 cross_sell_click 이 나갔다",
  );

  window.document.getElementById("inside").click();
  const fired = events((window.dataLayer || []).map((e) => Array.from(e))).find((c) => c[1] === "cross_sell_click");
  assert.ok(fired, "표식 안의 링크에서 cross_sell_click 이 나가지 않았다");
  assert.equal(fired[2].from_service, "/saju");
  assert.equal(fired[2].to_service, "/ziwei");
}

/* ⑥ 깨진 측정 ID 는 태그를 붙이지 않는다 */
{
  const { window } = boot({ measurementId: "__CD_GA_MEASUREMENT_ID__" });
  assert.equal(typeof window.cdTrack, "function", "cdTrack 은 항상 정의되어야 한다(호출부가 검사하지 않는다)");
  assert.equal(window.dataLayer, undefined, "형식이 깨진 ID 로 dataLayer 가 만들어졌다");
  assert.equal(
    window.document.querySelectorAll('script[src*="googletagmanager"]').length,
    0,
    "형식이 깨진 ID 로 gtag.js 를 받았다",
  );
  window.cdTrack("purchase_complete", {});
  window.cdSyncConsent();
}

/* ⑦ React 라우트 전환분: page_view 가 "경로가 바뀐 경우"로 좁혀져 있는가 */
{
  const provider = fs.readFileSync(path.join(ROOT, "app/providers/NavigationProvider.tsx"), "utf8");
  const guarded = /if\s*\(\s*pathRef\.current\s*!==\s*pathname\s*\)\s*\{\s*\n\s*trackEvent\("page_view"/.test(provider);
  assert.ok(
    guarded,
    'NavigationProvider 의 page_view 가 pathRef.current !== pathname 가드 안에 있어야 한다 — '
      + '가드가 빠지면 마운트 시에도 쏴서 gtag("config") 의 첫 발화와 겹친다',
  );
  assert.equal(
    (provider.match(/trackEvent\("page_view"/g) || []).length,
    1,
    "NavigationProvider 의 page_view 발화 지점은 한 곳이어야 한다",
  );
}

/* ⑧ useAnalytics 훅은 태그를 다시 붙이지 않고, 발화를 전부 trackEvent 로 보낸다 */
{
  const hook = fs.readFileSync(path.join(ROOT, "app/hooks/useAnalytics.ts"), "utf8");
  // 주석에도 gtag·page_view 가 설명으로 등장한다. 정규식 대신 줄 단위로 주석을 걷어낸다.
  const source = hook
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith("*") && !trimmed.startsWith("/*") && !trimmed.startsWith("//");
    })
    .join("\n");

  for (const forbidden of ["googletagmanager", "dataLayer", "gtag(", "createElement"]) {
    assert.ok(
      !source.includes(forbidden),
      "useAnalytics.ts 가 " + forbidden + " 을 직접 만진다 — gtag 설치 정본은 js/core/analytics.js 하나이고, "
        + "훅이 태그를 다시 붙이면 같은 방문이 두 번 집계된다",
    );
  }
  assert.ok(
    !source.includes("window."),
    "useAnalytics.ts 가 window 를 직접 만진다 — 모든 발화가 trackEvent 를 거쳐야 스크립트 부재 시 no-op 이 보장된다",
  );
  assert.ok(
    hook.includes('from "../../lib/analytics"'),
    "useAnalytics.ts 가 lib/analytics 의 trackEvent 를 쓰지 않는다",
  );

  /* ⑨ 훅이 쏘는 이벤트 이름이 이미 쓰는 이름과 겹치지 않는가 */
  const TAKEN_EVENT_NAMES = new Set([
    ...collectEmittedEventNames(),
    // GA4 가 자동 수집하거나 예약해 둔 이름. 이것만 손으로 쓴다 — 레포 소스에 나타나지 않는
    // 외부 사실이라 전수 발견의 대상이 아니다.
    "purchase", "first_visit", "session_start", "user_engagement", "click", "scroll",
  ]);
  const emitted = source.split('trackEvent("').slice(1).map((chunk) => chunk.split('"')[0]);
  // 🔴 대상이 0개일 때 통과하는 검사는 가드가 아니다(CLAUDE.md 원칙 10).
  assert.ok(
    emitted.length >= 4,
    "useAnalytics.ts 에서 찾은 이벤트가 " + emitted.length + "개다 — 훅이 비었거나 이 파서가 낡았다",
  );
  for (const name of emitted) {
    assert.ok(
      !TAKEN_EVENT_NAMES.has(name),
      "useAnalytics.ts 의 " + name + " 이 이미 쓰는 이벤트 이름과 겹친다 — 두 지점이 한 이름에 쏘면 분해가 불가능해진다",
    );
  }
}

/* ⑩ home_section_click — 홈 섹션 귀속 */
{
  const markup = `
    <section data-cd-funnel-section="signature_consult">
      <a id="inside" href="/fusion-fortune/">초융합 리딩</a>
      <button id="toggle" type="button">펼치기</button>
    </section>
    <section><a id="outside" href="/tarot/">타로</a></section>
  `;
  const { window } = boot({ body: markup });
  const fired = () =>
    (window.dataLayer || [])
      .map((entry) => Array.from(entry))
      .filter((c) => c[0] === "event" && c[1] === "home_section_click");

  window.document.getElementById("outside").click();
  assert.equal(fired().length, 0, "표식 밖의 링크에서 home_section_click 이 나갔다 — 홈 밖 클릭이 홈으로 집계된다");

  window.document.getElementById("toggle").click();
  assert.equal(
    fired().length,
    0,
    "버튼 클릭에서 home_section_click 이 나갔다 — 앵커만 세야 목적지별 분해가 유지된다(탭·펼치기는 화면을 떠나지 않는다)",
  );

  window.document.getElementById("inside").click();
  const hits = fired();
  assert.equal(hits.length, 1, "표식 안의 앵커에서 home_section_click 이 한 번 나가지 않았다");
  assert.equal(hits[0][2].section, "signature_consult");
  assert.equal(hits[0][2].destination, "/fusion-fortune/");
}

/* ⑩-2 두 축을 한 리스너로 합친 뒤에도 서로를 죽이지 않는가 */
{
  const markup = `
    <section data-cd-funnel-section="why_us">
      <ul data-cd-cross-sell="/"><li><a id="both" href="/ziwei/">자미두수</a></li></ul>
    </section>
  `;
  const { window } = boot({ body: markup });
  window.document.getElementById("both").click();
  const names = (window.dataLayer || [])
    .map((entry) => Array.from(entry))
    .filter((c) => c[0] === "event")
    .map((c) => c[1]);
  assert.ok(names.includes("cross_sell_click"), "합친 리스너에서 cross_sell_click 이 사라졌다");
  assert.ok(names.includes("home_section_click"), "합친 리스너에서 home_section_click 이 사라졌다");
}

/* ⑪ 홈 셸에 표식이 실제로 붙어 있고, 결과 페이지에는 없는가 */
{
  const homeStart = SHELL_SOURCE.indexOf('<main id="inputPage"');
  const resultStart = SHELL_SOURCE.indexOf('<article id="resultPage"');
  assert.ok(homeStart > -1, 'index.html 에서 <main id="inputPage"> 를 못 찾았다 — 이 검사가 통째로 안 돌게 된다');
  assert.ok(resultStart > homeStart, 'index.html 에서 <article id="resultPage"> 를 홈 뒤에서 못 찾았다 — 이 검사가 통째로 안 돌게 된다');

  const home = SHELL_SOURCE.slice(homeStart, resultStart);
  const outsideHome = SHELL_SOURCE.slice(0, homeStart) + SHELL_SOURCE.slice(resultStart);
  const marks = [...home.matchAll(/data-cd-funnel-section="([^"]*)"/g)].map((m) => m[1]);

  assert.ok(
    marks.length >= 8,
    `홈의 data-cd-funnel-section 표식이 ${marks.length}개다 — 면이 통째로 빠지면 그 면의 클릭이 어디에도 안 잡힌다`,
  );
  assert.equal(
    new Set(marks).size,
    marks.length,
    "표식 값이 중복이다 — 두 면이 한 이름으로 합쳐지면 어느 쪽이 클릭을 만들었는지 분해할 수 없다",
  );
  for (const name of marks) {
    assert.ok(
      /^[a-z][a-z0-9_]*$/.test(name),
      `표식 값 "${name}" 이 snake_case 가 아니다 — GA4 파라미터 값으로 그대로 나가므로 표기가 갈리면 집계가 쪼개진다`,
    );
  }
  assert.equal(
    (outsideHome.match(/data-cd-funnel-section=/g) || []).length,
    0,
    '홈 <main id="inputPage"> 밖에 표식이 있다 — 결과 페이지 클릭이 홈 섹션 클릭으로 집계된다',
  );
}

console.log("[verify-analytics-events] 통과 — consent 순서·상태 3종 · share_receive · retention_visit · cross_sell_click · 깨진 ID no-op · page_view 단일 발화 · useAnalytics 훅 계약 · home_section_click 위임 · 홈 셸 표식");
