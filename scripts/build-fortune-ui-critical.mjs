/**
 * `index.html` 의 `<style id="cd-fortune-ui-critical">` 블록을 **실측으로 재생성**한다.
 *
 * 왜 스크립트인가 — 그 블록 위 주석(주의 3)이 "fortune-ui.css 를 수정하면 이 블록도
 * 재생성해야 한다"고만 적어 두고 재생성 방법은 산문으로 남겨 뒀다. 그래서 실제로 낡았다:
 * 블록은 3,713 규칙 시절 715개를 담고 있는데 시트는 그 뒤로 4,673 셀렉터까지 자랐고,
 * 2026-08-15 측정에서 **전체 시트를 비우면 모바일 computed style 1,621건이 달라졌다**
 * (#fsnNavBar 가 pointer-events:none → auto 로 드러나고 #destinyFlowerStudioSheet 가
 * opacity 0 → 1 이 되는 기능 회귀 포함). 블록이 홈을 못 덮고 있었다는 뜻이다.
 *
 * 판정 방법 — 정적 grep 금지(CLAUDE.md 원칙 9, 그리고 이 레포에서 "매칭 불가" 판정의 83%가
 * JS 문자열로 되살아난 전례). 여기서는 **실제 렌더된 문서에서 element.matches() 가 참인
 * 규칙만** 고른다. 기존 블록이 쓰던 방법과 같다.
 *
 * 🔴 뷰포트 안 요소만으로 좁히지 말 것 — 숨김 규칙이 빠지면 개인정보 동의 모달이 그대로
 *    노출되고 스크롤 아래가 재배치돼 CLS 가 터진다(실측 0.006 → 0.265, 블록 주석 주의 1).
 *    그래서 문서 전체를 대상으로 하고, `:hover` 같은 동적 의사클래스와 의사요소는 떼고 본다.
 *
 * 🔴 @media 는 지금 적용 중인지와 무관하게 내부 규칙을 본다. 블록 하나가 모든 뷰포트를
 *    덮어야 하므로, 모바일에서 잰다고 데스크탑 규칙을 버리면 안 된다.
 *
 * 4셀(모바일/데스크탑 × 연이/네오)에서 걷어 **합집합**을 쓴다. 테마가 body/html 클래스를
 * 바꾸므로 한 셀만 보면 반대 테마 규칙이 통째로 빠진다.
 *
 * 사용:
 *   npm run build:cf
 *   node scripts/build-fortune-ui-critical.mjs          # index.html 을 제자리에서 갱신
 *   node scripts/build-fortune-ui-critical.mjs --dry    # 통계만
 *   npm run sync:public
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";

const root = process.cwd();
const staticRoot = path.join(root, "dist");
const dryRun = process.argv.includes("--dry");

const HEADER = `/* 생성물 — 손으로 고치지 말 것. 재생성: node scripts/build-fortune-ui-critical.mjs
   styles/fortune-ui.css 중 홈 셸이 실제로 매칭하는 규칙만 뽑은 것이다(4셀 합집합).
   전체 시트는 여전히 지연 로드되므로, 여기서 빠진 규칙은 사라지는 게 아니라 늦게 온다. */`;
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";
// 🔴 모바일 셀은 **Lighthouse 가 실제로 쓰는 값**이어야 한다 — 이 블록이 덮어야 하는 첫 페인트가
//    그 뷰포트에서 일어나기 때문이다. Lighthouse 기본 모바일은 Moto G Power **412x823, DPR 1.75**
//    (node_modules/lighthouse/core/config/constants.js 의 MOTOGPOWER_EMULATION_METRICS).
//    예전 값 390x844(DPR 3)는 어느 프리셋에도 대응하지 않았다.
//    실측(2026-08-16): 390↔412 사이에 걸리는 브레이크포인트는 `@media (min-width:400px)` 하나뿐이고
//    (styles/fortune-ui.css:15012) 그 안은 `.res-section-card--stats` = 결과 페이지 셀렉터라
//    홈 문서에는 없다. 즉 **뽑히는 규칙 집합은 사실상 그대로**이고, 달라지는 것은 텍스트 랩과
//    그로 인한 높이다. DPR 도 규칙 매칭을 바꾸지 않는다(전 시트의 해상도 미디어쿼리는
//    `min-resolution: 0.001dpcm` 하나이고 어느 DPR 에서도 참이다).
// 🔴 데스크탑은 1440x1000 그대로 둔다. Lighthouse 데스크탑은 1350x940 이지만 두 값 사이에
//    걸리는 브레이크포인트가 **0개**임을 실측했다(styles/{fortune-ui,cosmic-main,core-ui}.css).
const BASE_CELLS = [
  { name: "mobile-yeon", neo: false, ctx: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: MOBILE_UA } },
  { name: "mobile-neo", neo: true, ctx: { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: MOBILE_UA } },
  { name: "desktop-yeon", neo: false, ctx: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 } },
  { name: "desktop-neo", neo: true, ctx: { viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 } },
];

// 🔴 비로그인만 재면 저장된 프로필 카드가 통째로 빠진다. 이 4셀은 프로필 카드가 **없는** 상태라
//    #dpMasterCard 가 --empty/--moon-loading 으로만 관측되고, .dp-master-card--active 안쪽
//    (.dp-mc-inner·.dp-mc-name·.dp-mc-birth·.dp-mc-info-* 등 34규칙)은 매칭 0으로 탈락한다.
//    그러면 그 규칙들은 지연 로더(index.html 의 data-cd-noncritical-style-src)에 남아 모바일에서
//    최대 45초 뒤에 도착한다 — 카드가 무스타일로 먼저 그려지는 실제 증상이 이것이었다.
//    특히 .dp-mc-flower 는 svg 에 width/height 속성이 없어, 규칙이 늦으면 셸의
//    `svg{max-width:100%;height:auto}` 가 먹어 390px 뷰포트에서 358px 인플로 블록이 된다.
// 🔴 기존 4셀을 프로필 상태로 **바꾸지 않는다.** 바꾸면 이번엔 --empty 규칙이 탈락해 FOUC 가
//    반대편(카드 없는 사용자)으로 옮겨갈 뿐이다. 두 상태의 합집합이어야 한다.
const CELLS = [...BASE_CELLS, ...BASE_CELLS.map((cell) => ({ ...cell, name: `${cell.name}-profile`, profile: true }))];

if (!fs.existsSync(path.join(staticRoot, "index.html"))) {
  console.error("[critical-css] dist/index.html 이 없다. 먼저 `npm run build:cf` 를 돌릴 것.");
  process.exit(1);
}

const server = await startStaticServer();
const port = server.address().port;
const browser = await chromium.launch();

/** 규칙 cssText → 그 규칙을 감싸야 하는 조건 스택. 셀 간 합집합의 키가 cssText 다. */
const kept = new Map();
try {
  for (const cell of CELLS) {
    const context = await browser.newContext(cell.ctx);
    const page = await context.newPage();
    if (cell.neo) {
      // 셸의 테마 복원 키. index.html 의 `var NEO_KEY = 'fortuneThemeModeStateV1'` 와 같아야 한다 —
      // 어긋나면 네오가 안 켜지고 body.neo-mode 규칙이 통째로 빠진다(첫 시도가 그랬다).
      await page.addInitScript(() => {
        try {
          localStorage.setItem("fortuneThemeModeStateV1", "neo");
        } catch (_) {}
      });
    }
    if (cell.profile) {
      // 🔴 키에 스코프 접미사가 붙는다(`.list::guest`). 접미사 없는 `.list` 에 넣으면
      //    _dpReadStoredProfileState 가 읽지 않아 조용히 무시된다(scripts/measure-home-interaction.mjs
      //    가 같은 이유로 같은 키를 쓴다).
      // 🔴 전역(window.__cdCurrentDestinyProfile)만 심으면 안 된다 — _dpEnsureScopedStorageReady 가
      //    저장소를 읽어 카드가 없으면 그 전역을 지우고 카드가 다시 --empty 로 돌아간다.
      await page.addInitScript(() => {
        try {
          const profile = {
            id: "critical-css-fixture",
            profileId: "critical-css-fixture",
            name: "측정",
            gender: "F",
            birth: { year: 1990, month: 5, day: 14, hour: 9, minute: 30, calType: "solar" },
            // 🔴 location.label 이 없으면 카드와 모달의 위치 줄(.dp-fsel-ploc 등)이 아예 렌더되지
            //    않아 그 규칙이 조용히 부분집합에서 빠진다. 픽스처는 **분기를 다 켜는** 값이어야 한다.
            location: { label: "서울특별시", tz: "Asia/Seoul", lat: 37.5665, lng: 126.978 },
          };
          localStorage.setItem("FORTUNE_APP_USER_PROFILES.list::guest", JSON.stringify([profile]));
          localStorage.setItem("FORTUNE_APP_USER_PROFILES.current::guest", "critical-css-fixture");
        } catch (_) {}
      });
    }
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(6000);
    // 🔴 추출원을 셸의 로딩 방식에 의존하지 않는다. 이 스크립트가 만든 부분집합을 셸이 쓰기
    //    시작하면 전체 시트는 지연 로더로 넘어가고, 6초 안에는 CSSOM 에 없다 — 그러면 다음
    //    재생성이 0규칙을 뽑는다(실제로 그랬고, 0규칙 가드가 덮어쓰기를 막았다). 직접 붙인다.
    await page.evaluate(
      (href) =>
        new Promise((resolve) => {
          if ([...document.styleSheets].some((sheet) => (sheet.href || "").includes("/styles/fortune-ui.css"))) return resolve();
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          link.onload = resolve;
          link.onerror = resolve;
          document.head.appendChild(link);
        }),
      "/styles/fortune-ui.css",
    );
    await page.waitForTimeout(1000);
    // 🔴 fail-closed. 시드가 먹지 않으면 카드는 --empty 로 남고, 그러면 이 스크립트는 아무 경고 없이
    //    "고치기 전과 똑같은" 부분집합을 다시 뽑는다. 저장 키가 바뀌면 조용히 회귀하므로 실행으로 막는다.
    if (cell.profile) {
      const rendered = await page.evaluate(() => ({
        active: !!document.querySelector(".dp-master-card--active"),
        cls: (document.querySelector(".dp-master-card") || {}).className || "(카드 없음)",
      }));
      if (!rendered.active) {
        throw new Error(
          `[critical-css] ${cell.name}: 프로필 카드가 --active 로 렌더되지 않았다(현재 클래스: ${rendered.cls}). ` +
            "시드 키(FORTUNE_APP_USER_PROFILES.list::guest / .current::guest)가 바뀌었는지 확인할 것 — " +
            "이대로 뽑으면 .dp-mc-* 규칙이 다시 지연 시트에 남는다.",
        );
      }
    }
    const found = await page.evaluate(collectMatchingRules);
    for (const row of found) if (!kept.has(row.text)) kept.set(row.text, row);
    console.log(`[critical-css] ${cell.name.padEnd(13)} matched ${String(found.length).padStart(5)} · union ${kept.size}`);

    // 🔴 클릭해야 생기는 표면은 렌더 수확으로 영원히 발견되지 않는다.
    //    운세 유형 선택 모달(.dp-fsel-*)이 정확히 그랬다 — 39규칙 전부가 지연 시트에만 남아,
    //    홈에서 다른 기능 카드를 건드리지 않고 곧장 프로필 카드를 누른 모바일 사용자는
    //    무스타일 블록이 문서 끝에 붙는 것만 보고(= 아무 일도 안 일어난 것처럼 보인다)
    //    시트가 도착할 때까지 창을 못 봤다. 지연 로더의 최후 폴백이 45초다.
    //    .dp-mc-* 카드 FOUC 와 같은 사고가 한 단계 깊은 곳에서 재발한 것이므로, 여기서 연다.
    if (cell.profile) {
      // page.click 이 아니라 el.click() 인 이유: 헤드리스에서 PWA 설치 배너 backdrop 이 탭 지점을
      // 가리는 기존 문제가 있어(verify:mobile-cdp-smoke 의 알려진 실패) actionability 로 죽는다.
      // 여는 경로 자체는 동일하다 — .dp-mc-load-btn 의 click 리스너가 dpLoadProfile 을 부른다.
      await page.$eval(".dp-mc-load-btn", (el) => el.click());
      await page.waitForSelector(".dp-fsel-overlay", { state: "attached", timeout: 15000 }).catch(() => {});
      // 열림 상태 클래스는 다음 rAF 에 붙는다(js/destiny-profile.js). 그 상태 규칙도 필요하다.
      await page.waitForFunction(() => !!document.querySelector(".dp-fsel-overlay--in"), null, { timeout: 15000 }).catch(() => {});
      const modalOpen = await page.evaluate(() => !!document.querySelector(".dp-fsel-overlay--in"));
      if (!modalOpen) {
        throw new Error(
          `[critical-css] ${cell.name}: .dp-mc-load-btn 을 눌렀는데 .dp-fsel-overlay--in 이 뜨지 않았다. ` +
            "여는 경로(dpLoadProfile)나 클래스 이름이 바뀌었는지 확인할 것 — " +
            "이대로 뽑으면 모달 규칙이 다시 지연 시트에 남아 모바일에서 창이 늦게 뜬다.",
        );
      }
      const modalFound = await page.evaluate(collectMatchingRules, ".dp-fsel-overlay");
      let added = 0;
      for (const row of modalFound) {
        if (kept.has(row.text)) continue;
        kept.set(row.text, row);
        added += 1;
      }
      console.log(
        `[critical-css] ${`${cell.name}+fsel`.padEnd(13)} matched ${String(modalFound.length).padStart(5)} · new ${added} · union ${kept.size}`,
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (!kept.size) {
  console.error("[critical-css] 매칭된 규칙이 0개다 — 시트를 못 찾았거나 로드에 실패했다. 갱신하지 않는다.");
  process.exit(1);
}

const css = renderCss([...kept.values()].sort((a, b) => a.order - b.order));
assertNoEmptyDeclarations(css);
assertInteractionSurfacesPresent(css);
console.log(`[critical-css] rules ${kept.size} · ${css.length} bytes`);

if (dryRun) process.exit(0);

// 🔴 인라인 <style> 로 넣지 않는다. 셸 HTML 은 `no-store` 라 매 방문 다시 내려가고 이미 head 의
//    91% 가 인라인 CSS 다. 150KB 를 더 얹으면 FCP 가 그만큼 늦어진다. 외부 파일이라야 캐시된다.
const outPath = path.resolve(root, argValue("out") || "styles/fortune-ui-home.css");
const previous = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
fs.writeFileSync(outPath, `${HEADER}\n${css}\n`, "utf8");
console.log(`[critical-css] wrote ${path.relative(root, outPath)} — ${previous} → ${fs.statSync(outPath).size} bytes`);
console.log("[critical-css] 이제 `npm run sync:public` 으로 미러에 전파할 것.");

function argValue(name) {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : "";
}

/* ───────────────────────────── page context ───────────────────────────── */

/**
 * 브라우저 안에서 돈다. fortune-ui.css 의 규칙을 훑어 이 문서에 매칭되는 것만 돌려준다.
 * 반환: [{ text, conditions: ["@media (...)", ...] }]
 */
function collectMatchingRules(scopeSelector) {
  // 🔴 "fortune-ui.css" 부분일치로 잡으면 우리가 만든 fortune-ui-home.css 까지 걸린다.
  const sheets = [...document.styleSheets].filter((sheet) => (sheet.href || "").includes("/styles/fortune-ui.css"));
  const out = [];
  // scopeSelector 가 있으면 그 요소와 자손만 대상으로 삼는다(상호작용으로 생긴 표면 전용 수확).
  // 🔴 fail-closed. 선택자가 안 맞을 때 문서 전체 수확으로 흘러내리면, 이름이 바뀐 것을 아무도
  //    모른 채 부분집합만 조용히 불어난다(실측: 1,141 → 1,152 규칙, +1.5KB). 그래서 던진다.
  const scopeRoot = scopeSelector ? document.querySelector(scopeSelector) : null;
  if (scopeSelector && !scopeRoot) throw new Error(`[critical-css] 스코프 수확 대상이 없다: ${scopeSelector}`);
  const scopeEls = scopeRoot ? [scopeRoot, ...scopeRoot.querySelectorAll("*")] : null;
  // 동적 의사클래스·의사요소는 querySelector 로 검사할 수 없다. 떼고 구조만 본다.
  const DYNAMIC = /::?(?:hover|focus|focus-visible|focus-within|active|checked|disabled|enabled|target|visited|link|placeholder-shown|user-invalid|invalid|valid|indeterminate|default|read-only|read-write|autofill|-webkit-[a-z-]+|-moz-[a-z-]+|before|after|marker|selection|backdrop|first-line|first-letter|placeholder|file-selector-button)\b(?:\([^()]*\))?/g;

  function structural(selector) {
    const stripped = selector.replace(DYNAMIC, "").replace(/\s+/g, " ").trim();
    // 조합자만 남았거나 비었으면 구조로는 판별 불가 — 보수적으로 남긴다.
    if (!stripped || /^[>+~\s]*$/.test(stripped)) return null;
    return stripped;
  }

  function selectorMatches(selectorText) {
    for (const part of selectorText.split(",")) {
      const probe = structural(part);
      // 🔴 판정 불가일 때의 기본값이 두 모드에서 반대다.
      //    문서 전체 수확은 남긴다(빠지면 홈이 깨진다 — 주의 1).
      //    스코프 수확은 버린다(남기면 홈과 무관한 규칙까지 부분집합에 끌려와,
      //    부분집합의 존재 이유인 "매칭 후보 축소"가 무너진다). 버려도 전체 시트가 늦게 오므로
      //    사라지는 게 아니다.
      if (probe === null) {
        if (scopeEls) continue;
        return true;
      }
      try {
        if (scopeEls) {
          if (scopeEls.some((el) => el.matches(probe))) return true;
        } else if (document.querySelector(probe)) {
          return true;
        }
      } catch (_) {
        // 브라우저가 못 파싱하는 셀렉터는 판정 불가.
        if (scopeEls) continue;
        return true;
      }
    }
    return false;
  }

  // 🔴 방문한 모든 규칙에 시트 내 일련번호를 매긴다(고른 것만이 아니라). 셀마다 고르는 집합이
  //    달라도 번호는 같으므로, 합집합을 이 번호로 정렬하면 원래 캐스케이드 순서가 복원된다.
  //    처음엔 셀 순서대로 이어붙였다가 데스크탑 전용 규칙이 뒤로 밀려 font-weight 가 700 대신
  //    800/900 으로 이겨 버렸다(시각 파리티 2건).
  let order = 0;

  function walk(rules, conditions) {
    for (const rule of rules) {
      const seq = order++;
      // CSSStyleRule
      if (rule.type === 1 || rule.selectorText !== undefined) {
        if (rule.selectorText && selectorMatches(rule.selectorText)) {
          out.push({ text: rule.cssText, conditions: conditions.slice(), order: seq });
        }
        continue;
      }
      // @media / @supports / @container — 지금 적용 중인지와 무관하게 내부를 본다.
      if (rule.cssRules && rule.conditionText !== undefined) {
        const at = rule.constructor.name === "CSSSupportsRule" ? "@supports" : rule.constructor.name === "CSSContainerRule" ? "@container" : "@media";
        walk(rule.cssRules, conditions.concat(`${at} ${rule.conditionText}`));
        continue;
      }
      // 🔴 나머지 at-규칙(@keyframes·@font-face·@layer·@property…)은 **통째로** 보존한다.
      //    처음엔 `!rule.cssRules` 인 것만 남겼다가, 자식을 가진 @keyframes 류가 통째로 빠져
      //    시각 파리티에서 transform 이 none 으로 죽고 #destinyFlowerStudioSheet 가 드러났다.
      //    모르는 at-규칙은 버리지 말고 그대로 내보내는 쪽이 항상 안전하다.
      //    단 스코프 수확에서는 건너뛴다 — 문서 전체 수확이 이미 **매칭과 무관하게** 전부 담으므로
      //    여기서 또 담으면 잃는 것 없이 로그의 규칙 수만 부풀린다.
      if (rule.cssText && !scopeEls) out.push({ text: rule.cssText, conditions: conditions.slice(), order: seq });
    }
  }

  for (const sheet of sheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch (_) {
      continue;
    }
    walk([...rules], []);
  }
  return out;
}

/* ───────────────────────────── output ───────────────────────────── */

/**
 * 🔴 값이 빈 선언(`padding-top: ;`)이 산출물에 들어가면 **실패한다.**
 *
 * 왜 가드가 필요한가 — CSSOM 은 `env()`/`var()` 가 든 **단축속성**을 롱핸드로 되돌려 쓰지 못하고
 * 값이 빈 선언을 내놓는다. 우리는 `rule.cssText` 를 그대로 담으므로 그게 산출물로 새어 나가고,
 * 빈 선언은 무효라 조용히 드롭된다 = **그 속성이 크리티컬 블록에서 사라진다.**
 * 실제로 `styles/fortune-ui.css` 의 `.wrap` 이 `padding:0 8px calc(… env(…))` 단축속성이라
 * `padding-top/right/left` 3면이 index.html 의 크리티컬 블록과 styles/fortune-ui-home.css
 * 양쪽에서 빠져 있었다(2026-08-17 발견).
 *
 * 조용히 지우지 않고 **실패시킨다** — 소스를 롱핸드로 고쳐야 하는 문제이고, 여기서 손대면
 * 원인은 그대로 둔 채 증상만 감춘다(CLAUDE.md 코딩 원칙 10: 가드는 fail-closed).
 */
function assertNoEmptyDeclarations(css) {
  const hits = [...css.matchAll(/([-a-zA-Z]+)\s*:\s*(?=[;}])/g)].map((m) => m[1]);
  if (!hits.length) return;
  const uniq = [...new Set(hits)];
  console.error(`[critical-css] 🔴 값이 빈 선언 ${hits.length}건: ${uniq.join(", ")}`);
  console.error("  CSSOM 이 되돌려 쓰지 못하는 단축속성이 원인이다(env()/var() 를 담은 padding·margin 등).");
  console.error("  산출물이 아니라 **소스 시트**를 롱핸드로 고칠 것. 예: styles/fortune-ui.css 의 .wrap");
  process.exit(1);
}

/**
 * 🔴 상호작용으로만 생기는 표면의 규칙이 산출물에서 빠지면 **실패한다.**
 *
 * 왜 가드가 필요한가 — 이 스크립트의 수확은 "렌더된 문서에 매칭되는 규칙"이라, 클릭해야
 * 만들어지는 DOM 은 원리상 발견되지 않는다. 그래서 운세 유형 선택 모달(.dp-fsel-*)의 39규칙이
 * 통째로 지연 시트에만 남았고, 모바일에서 프로필 카드를 눌러도 창이 한참 안 뜨는 버그가 됐다.
 * 위 셀 루프가 모달을 실제로 열어 수확하지만, 그 코드가 조용히 무력화되면(선택자 변경·타임아웃)
 * 산출물만 예전 모습으로 돌아가고 아무도 모른다. 그래서 결과물을 직접 단언한다.
 *
 * 🔴 손으로 쓴 선택자 목록이 아니라 **여는 경로가 실재함이 이미 위에서 단언된** 표면만 적는다.
 *    새 상호작용 표면을 부분집합에 넣었으면 여기에도 함께 넣는다(CLAUDE.md 코딩 원칙 10).
 */
function assertInteractionSurfacesPresent(css) {
  // .dp-fsel-ploc 은 프로필에 location.label 이 있을 때만 렌더된다 — 픽스처가 그 분기를 끄면
  // 조용히 빠지므로 여기서 함께 잡는다(실제로 첫 수확에서 이것만 빠졌다).
  const REQUIRED = [".dp-fsel-overlay", ".dp-fsel-modal", ".dp-fsel-btn", ".dp-fsel-ploc"];
  const missing = REQUIRED.filter((token) => !css.includes(token));
  if (!missing.length) return;
  console.error(`[critical-css] 🔴 상호작용 표면 규칙이 산출물에 없다: ${missing.join(", ")}`);
  console.error("  셀 루프의 모달 수확(.dp-mc-load-btn 클릭 → .dp-fsel-overlay)이 실제로 돌았는지 확인할 것.");
  console.error("  이대로 쓰면 모바일에서 프로필 카드를 눌러도 창이 지연 시트 도착까지 안 뜬다.");
  process.exit(1);
}

/** 같은 조건 스택끼리 묶어 @media 중첩을 한 번만 연다. 원래 순서(특이도 동률 시 뒤가 이김)를 지킨다. */
function renderCss(rows) {
  const lines = [];
  let openConditions = [];
  const closeTo = (depth) => {
    while (openConditions.length > depth) {
      openConditions.pop();
      lines.push("}");
    }
  };
  for (const row of rows) {
    let shared = 0;
    while (shared < openConditions.length && shared < row.conditions.length && openConditions[shared] === row.conditions[shared]) shared += 1;
    closeTo(shared);
    for (let i = shared; i < row.conditions.length; i += 1) {
      lines.push(`${row.conditions[i]} {`);
      openConditions.push(row.conditions[i]);
    }
    lines.push(row.text);
  }
  closeTo(0);
  return lines.join("\n");
}

/* ───────────────────────────── plumbing ───────────────────────────── */

function startStaticServer() {
  const instance = http.createServer((req, res) => {
    const rawPath = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    let filePath = path.normalize(path.join(staticRoot, rawPath));
    if (!filePath.startsWith(staticRoot)) return res.writeHead(403).end();
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (error, buffer) => {
      if (error) return res.writeHead(404).end();
      const ext = path.extname(filePath);
      const headers = { "content-type": contentType(ext), "cache-control": "no-store" };
      let body = buffer;
      if (COMPRESSIBLE.has(ext)) {
        body = zlib.brotliCompressSync(buffer, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } });
        headers["content-encoding"] = "br";
      }
      res.writeHead(200, headers).end(body);
    });
  });
  return new Promise((resolve) => instance.listen(0, "127.0.0.1", () => resolve(instance)));
}

function contentType(ext) {
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript",
      ".mjs": "text/javascript",
      ".css": "text/css",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".webp": "image/webp",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".woff2": "font/woff2",
      ".ico": "image/x-icon",
    }[ext] || "application/octet-stream"
  );
}
