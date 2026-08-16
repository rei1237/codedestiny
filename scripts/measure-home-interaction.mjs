/**
 * 홈의 **체감 성능**을 잰다 — 버튼·입력이 얼마나 빨리 반응하는가, 스크롤이 버벅이는가.
 *
 * 왜 따로 필요한가 — Lighthouse 점수(perf:home)는 로딩만 본다. TBT 는 INP 의 대용이 아니다:
 * TBT 는 "FCP~TTI 사이 롱태스크 합"이라 **부팅이 끝난 뒤의 반응성은 하나도 안 센다.**
 * 사용자가 요구한 것은 "버튼/입력이 즉각 반응한다 · 스크롤이 버벅이지 않는다" 이고,
 * 그건 Event Timing(INP 의 실제 재료)과 Long Animation Frame 으로만 잴 수 있다.
 *
 * 재사용:
 *   - playwright chromium · 모바일 컨텍스트는 scripts/verify-home-visual-parity.mjs 와 동일
 *   - brotli 정적 서버는 scripts/measure-home-lighthouse.mjs 와 같은 방식
 *   - CPU 4배 스로틀은 Lighthouse 모바일 프리셋과 같은 값(CDP Emulation.setCPUThrottlingRate)
 *
 * 측정하는 것
 *   1) 인터랙션 지연 — Event Timing 의 `duration`(입력~다음 페인트). INP 는 이 값들의 상위 백분위다.
 *      입력 지연 / 처리 시간 / 렌더 지연 3단으로 쪼개 어디서 늦는지까지 낸다.
 *   2) 스크롤 버벅임 — 스크롤 중 Long Animation Frame(50ms 초과 프레임) 수와 최장 길이.
 *   3) 인터랙션 중 레이아웃 시프트 — 누르고 나서 생기는 CLS 는 로딩 CLS 와 별개 문제다.
 *
 * 🔴 판정은 perf:home 과 같다 — **min~max 밴드 비겹침**. 인터랙션 지연은 노이즈가 크다.
 * 🔴 이름이 `perf:*` 인 이유: `verify:*` 는 verify-guard-wiring 의 배선 의무가 붙는데
 *    사용자 지시로 CI 에 새 게이트를 만들지 않기로 했다.
 *
 * 사용:
 *   npm run build:cf
 *   npm run perf:interaction -- --runs=5 --label=base            # 프로필 카드 없음
 *   npm run perf:interaction -- --runs=5 --label=base-p --profile=1   # 프로필 카드 있음
 *   npm run perf:interaction -- --url=https://code-destiny.com --runs=3
 *
 * 🔴 `--profile=1` 은 다른 모든 대상의 값도 바꾼다(카드 렌더 + 오늘의 운세 fetch 1건).
 *    **두 라벨의 값을 섞어 비교하지 말 것.** 베이스라인도 항상 2벌로 잡는다.
 * 🔴 못 잰 대상이 **하나라도** 있으면 exit 1 이다. "대상이 전부 사라졌을 때만 실패"였던 예전
 *    정책은 가드가 아니었다 — 필드 상위 2개가 매 회차 조용히 빠진 채 리포트가 초록이었다.
 */
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { chromium } from "@playwright/test";
import { closeOverlays, openAllCollections, reachMindscanTile, scrollIntoView } from "./lib/perf-home-reach.mjs";

const root = process.cwd();
const staticRoot = fs.existsSync(path.join(root, "dist", "index.html")) ? path.join(root, "dist") : root;
const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".svg", ".xml", ".txt"]);
const encodedCache = new Map();

const MOBILE_UA =
  "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

/**
 * 누를 대상.
 *
 * `type`      "type" 이면 키 입력, 아니면 탭.
 * `setup`     그 대상이 **존재하려면** 먼저 만들어야 하는 상태. 셸 자신의 진입점만 쓴다(§아래).
 * `teardown`  다음 대상이 깨끗한 화면에서 시작하도록 되돌린다.
 * `navigates` 누르면 문서가 바뀌는 대상. CDP 로 문서 요청만 취소하고 잰다(§measureOnce).
 * `needsProfile` 프로필 카드가 있어야만 보이는 대상. `--profile=1` 일 때만 잰다.
 *
 * 🔴 예전 주석("화면을 떠나는 것은 넣지 않는다")은 도구의 한계였지 측정 대상의 한계가 아니었다.
 *    필드 INP 상위 2·3위가 정확히 그 이동하는 요소들(`a.cd-mobile-bottom-nav__item` 1,592ms ·
 *    `a.tarot-tile--mindscan` 1,224ms)이라, 못 잰다는 것은 **가장 중요한 것을 못 잰다**는 뜻이었다.
 */
const TARGETS = [
  { name: "서비스 검색 입력", selector: "#cdServiceSearchInput", type: "type", text: "사주" },

  /* 🔴 '탑바 드롭다운'(`.cd-nav-group__toggle`)은 뺐다. **모바일 DOM 에 0개다**(실측 2026-08-16 —
     느려서 못 잰 게 아니라 데스크탑 전용 요소다). 데스크탑 프리셋을 붙일 때 `#themeToggleLabel`
     과 함께 되살린다. */

  /* 🔴 이 헤더는 y≈9,574 로 폴드 한참 아래다. 자동 스크롤이 CPU 4배 스로틀에서 1,200ms 안에
     못 끝나 그동안 **매 회차 "클릭 타임아웃"으로 조용히 빠지고 있었다.** 스크롤은 측정 대상이
     아니므로 setup 에서 미리 끝내고, 클릭만 잰다. */
  {
    name: "컬렉션 펼치기",
    selector: ".tarot-collection__header",
    setup: (page) => scrollIntoView(page, ".tarot-collection__header"),
    /* 🔴 이 대상만 타임아웃을 올린다. UI 가 느려서가 아니다 — 스크롤 뒤 상태를 실측하면
       rect 는 4프레임 내내 [41, 383.6, 308, 91.8] 로 **완전히 불변**이고, 중앙 좌표의 최상단은
       자기 자식(`p.tarot-collection__subtitle`)이며 pointer-events 도 auto 다. 즉 가려짐도
       흔들림도 없고, 1,200ms 로는 CPU 4배 스로틀에서 playwright 자신의 actionability 검사가
       못 끝날 뿐이다(8,000ms 로는 성공).
       조용한 구간이 시프트 귀속을 어긋내는 문제는 그대로 막힌다 — 마크를 클릭 **전에** 찍으므로
       기다리는 동안 도착한 시프트도 이 대상의 구간으로 귀속된다. */
    clickTimeout: 4000,
  },

  /* 🔴 이 칩이 "요소 없음"이었던 것은 느려서가 아니라 **'모든 운세' 오버레이가 열려야 생기기**
     때문이다(index.html 의 createChromeBar 가 그때 document.body 에 붙인다).
     오버레이를 직접 만들지 않는다 — 셸 자신의 진입점(하단 내비 '모든 운세')을 그대로 누른다.
     그래야 재는 대상이 사용자가 실제로 밟는 상태와 같다. */
  {
    name: "모바일 컬렉션 탭",
    selector: ".cd-mobile-collection-tab[data-collection-id]:not([data-collection-id='__overview'])",
    setup: openAllCollections,
    teardown: closeOverlays,
  },

  /* 🔴 타임아웃의 원인은 느려서가 아니라 **프로필 카드가 없으면 #cdTodayHubBody 가 hidden** 이라
     playwright 의 actionability 대기가 끝내 만족되지 않기 때문이다(render() 의 게이트 분기).
     그래서 --profile=1 로 카드를 심었을 때만 잰다. */
  { name: "오늘의 운세 탭", selector: "#cdTodayTabVedic", needsProfile: true },

  /* 폴드 아래라 앞 대상이 레이아웃을 바꾸면 화면 밖으로 밀린다 — 재기 전에 화면 안으로 가져온다. */
  {
    name: "푸터 아코디언",
    selector: ".cd-footer-accordion__toggle, .cd-footer-col__title",
    setup: (page) => scrollIntoView(page, ".cd-footer-accordion__toggle, .cd-footer-col__title"),
    clickTimeout: 4000,
  },

  /* 필드 INP 1,592ms · 1,224ms. 이동하므로 문서 요청을 취소하고 잰다.
     🔴 navigates 대상은 **입력 대기·처리만 신뢰하고 렌더 성분은 신뢰하지 않는다** —
        취소가 확정되기 전까지 크로미움이 페인트를 미룰 수 있다(보고서에도 그렇게 적는다). */
  { name: "하단 내비 탭", selector: "#cdMobileBottomNav [data-nav-key='pass']", navigates: true },

  /* 🔴 이 타일은 settle 만으로는 DOM 에 **없다**(실측: settle 직후 `.tarot-tile` 0개).
     오버레이 → 타로 탭 → 열린 컬렉션 스크롤, 세 단계를 거쳐야 지연 마운트가 끝난다.
     절차는 scripts/lib/perf-home-reach.mjs 에 근거와 함께 있다. */
  {
    name: "타로 타일(mindscan)",
    selector: "a.tarot-tile--mindscan",
    navigates: true,
    setup: reachMindscanTile,
    teardown: closeOverlays,
  },

  /* 🔴 '테마 전환'(#themeToggleLabel)은 모바일에서 가려져 있어 매 회차 1,200ms 의 조용한 구간을
     만들고, 그 사이 도착한 지연 이미지 시프트가 "입력과 무관"으로 계상돼 귀속이 어긋났다.
     데스크탑 프리셋을 붙일 때 되살린다. 지금 목록에서 빼는 이유가 이것이고, 느려서가 아니다. */
];

/**
 * 🔴 부팅 중 탭. 필드 INP 가 최악인 요소가 **핸들러가 없는** `#inputPage > header.logo-area`
 * (2,672ms · 2,504ms) 라는 것은, 비용이 처리 시간이 아니라 **입력 대기**(메인스레드 점유)라는 뜻이다.
 * 부팅이 끝난 뒤만 재면(settle) 이 구간이 통째로 안 보인다 — 실제로 로컬 최악은 176ms 였는데
 * 필드는 2,672ms 였다. 그래서 아무 일도 하지 않는 요소를 부팅 도중 여러 시점에 눌러
 * "지금 누르면 몇 ms 만에 답이 오는가"의 바닥값을 잰다.
 */
const EARLY_TAP_SELECTOR = "#inputPage > header.logo-area";
const EARLY_TAP_AT = [800, 1600, 2600, 4000];

const args = parseArgs(process.argv.slice(2));
const server = await startStaticServer();
const port = server.address().port;
const targetUrl = args.url || `http://127.0.0.1:${port}/`;

console.log(`[perf:interaction] target ${targetUrl}`);
console.log(
  `[perf:interaction] runs ${args.runs} · CPU ${args.cpu}x · label ${args.label} · 프로필 ${args.profile ? "시드" : "없음"}`,
);

const runs = [];
try {
  for (let i = 0; i < args.runs; i += 1) {
    process.stdout.write(`[perf:interaction] run ${i + 1}/${args.runs} ... `);
    const result = await measureOnce(targetUrl);
    runs.push(result);
    const worst = result.interactions.concat(result.early).reduce((max, it) => Math.max(max, Number(it.duration) || 0), 0);
    console.log(
      `최악 인터랙션 ${Math.round(worst)}ms · 스크롤 롱프레임 ${result.scroll.longFrames}개 · ` +
        `부팅후 시프트 ${result.shiftReport.total.toFixed(3)}`,
    );
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

report();

/* ───────────────────────────── 측정 ───────────────────────────── */

async function measureOnce(url) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      // Lighthouse/PSI 기본 모바일과 같은 값(Moto G Power 412x823, DPR 1.75) —
      // node_modules/lighthouse/core/config/constants.js 의 MOTOGPOWER_EMULATION_METRICS.
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
      userAgent: MOBILE_UA,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpu });

    /**
     * 🔴 프로필 카드 시드. 필드 INP 를 낸 사용자는 카드를 가진 사용자다 — 카드 없는 화면만 재면
     * '오늘의 운세'처럼 카드 뒤에 있는 UI 를 통째로 못 잰다.
     *
     * 🔴 키에 **스코프 접미사가 붙는다**(`.list::guest`). 접미사 없는 `.list` 에 넣으면
     *    _dpReadStoredProfileState 가 읽지 않아 조용히 무시된다 — 실측으로 확인한 값이다.
     * 🔴 전역(window.__cdCurrentDestinyProfile)만 심으면 안 된다. _dpEnsureScopedStorageReady 가
     *    저장소를 읽어 카드가 없으면 그 전역을 delete 하고 cd:profile-card-published 를 쏴
     *    render() 가 다시 게이트를 띄운다. 반드시 **저장소**에 넣는다.
     * 🔴 시드는 다른 모든 대상의 값도 바꾼다(카드 렌더 + fetch 1건). 그래서 베이스라인을 2벌
     *    잡고(--label 을 나눠) 섞지 않는다.
     */
    if (args.profile) {
      await page.addInitScript(() => {
        try {
          const profile = {
            id: "perf-fixture",
            profileId: "perf-fixture",
            name: "측정",
            gender: "F",
            birth: { year: 1990, month: 5, day: 14, hour: 9, minute: 30, calType: "solar" },
          };
          localStorage.setItem("FORTUNE_APP_USER_PROFILES.list::guest", JSON.stringify([profile]));
          localStorage.setItem("FORTUNE_APP_USER_PROFILES.current::guest", "perf-fixture");
        } catch {}
      });
    }

    /**
     * 🔴 이동하는 대상을 재는 방법. `window.location` 을 덮어쓰지 않는다 — 셸이 그 경로를 스스로
     * 쓰므로(mobile-interaction-patch 의 invokeMobileCardLink 등) 덮으면 측정 대상의 동작이 바뀐다.
     * `page.route()` 도 쓰지 않는다 — 모든 요청이 JS 를 거쳐 부팅 네트워크가 통째로 달라진다.
     * 대신 CDP Fetch 를 **Document 리소스에만** 걸어, 필요한 순간에만 문서 요청을 취소한다.
     * 크로미움은 커밋 전에 취소된 내비게이션에서 현재 문서를 그대로 유지하고 unload 도 쏘지 않는다.
     *
     * 🔴 활성화는 **부팅 측정이 끝난 뒤**다(아래 armNavigationBlocker). goto 전에 켜면 첫 문서
     *    요청까지 인터셉터를 거쳐 부팅 타이밍이 달라지고, 그러면 이 도구의 1순위 지표인
     *    '부팅 중 탭'이 오염된다.
     */
    let blockNavigation = false;
    let navigationBlockerArmed = false;
    const armNavigationBlocker = async () => {
      if (navigationBlockerArmed) return;
      navigationBlockerArmed = true;
      await cdp.send("Fetch.enable", {
        patterns: [{ urlPattern: "*", requestStage: "Request", resourceType: "Document" }],
      });
      cdp.on("Fetch.requestPaused", (event) => {
        const done = blockNavigation
          ? cdp.send("Fetch.failRequest", { requestId: event.requestId, errorReason: "Aborted" })
          : cdp.send("Fetch.continueRequest", { requestId: event.requestId });
        done.catch(() => {});
      });
    };

    // 🔴 관찰자는 문서보다 먼저 설치해야 한다. 로드 뒤에 붙이면 이미 지나간 엔트리를 못 본다.
    await page.addInitScript(() => {
      window.__cdPerf = { events: [], loaf: [], shifts: [], marks: [] };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__cdPerf.events.push({
              name: e.name,
              startTime: e.startTime,
              duration: e.duration,
              processingStart: e.processingStart,
              processingEnd: e.processingEnd,
            });
          }
        }).observe({ type: "event", durationThreshold: 16, buffered: true });
      } catch {}
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            window.__cdPerf.loaf.push({ startTime: e.startTime, duration: e.duration, blockingDuration: e.blockingDuration });
          }
        }).observe({ type: "long-animation-frame", buffered: true });
      } catch {}
      // 🔴 값만 모으면 "0.32 가 났다"까지밖에 못 말한다. 고치려면 **무엇이 밀렸는지**가 있어야 하므로
      //    sources 의 노드를 그 자리에서 사람이 읽을 수 있는 이름으로 굳힌다(나중엔 노드가 사라진다).
      const describe = (node) => {
        if (!node || node.nodeType !== 1) return "(비요소)";
        const id = node.id ? `#${node.id}` : "";
        const cls = String(node.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((c) => `.${c}`).join("");
        return `${node.tagName.toLowerCase()}${id}${cls}`;
      };
      try {
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) {
            if (e.hadRecentInput) continue;
            window.__cdPerf.shifts.push({
              startTime: e.startTime,
              value: e.value,
              sources: Array.from(e.sources || []).slice(0, 3).map((s) => describe(s.node)),
            });
          }
        }).observe({ type: "layout-shift", buffered: true });
      } catch {}
    });

    // 🔴 goto 를 기다리면 부팅 초반을 이미 놓친다. commit 직후부터 시계를 잡는다.
    const navStartedAt = Date.now();
    await page.goto(url, { waitUntil: "commit", timeout: 90000 });

    const early = [];
    for (const at of EARLY_TAP_AT) {
      const wait = at - (Date.now() - navStartedAt);
      if (wait > 0) await page.waitForTimeout(wait);
      const before = await page.evaluate(() => (window.__cdPerf ? window.__cdPerf.events.length : 0)).catch(() => 0);
      try {
        // 좌표 탭이다 — 요소 핸들을 잡으려 기다리면 그 대기 자체가 시점을 밀어 버린다.
        const box = await page.locator(EARLY_TAP_SELECTOR).first().boundingBox({ timeout: 1500 });
        if (!box) throw new Error("요소 없음");
        await page.mouse.click(box.x + box.width / 2, Math.min(box.y + 12, box.y + box.height / 2));
      } catch (error) {
        early.push({ at, failed: String(error.message || error).split("\n")[0] });
        continue;
      }
      await page.waitForTimeout(500);
      const fresh = await page
        .evaluate((n) => (window.__cdPerf ? window.__cdPerf.events.slice(n) : []), before)
        .catch(() => []);
      const worst = fresh.reduce((best, e) => (!best || e.duration > best.duration ? e : best), null);
      early.push(
        worst
          ? {
              at,
              duration: worst.duration,
              inputDelay: worst.processingStart - worst.startTime,
              processing: worst.processingEnd - worst.processingStart,
              presentation: worst.duration - (worst.processingEnd - worst.startTime),
            }
          : { at, duration: 0, inputDelay: 0, processing: 0, presentation: 0 },
      );
    }

    await page.waitForLoadState("load", { timeout: 90000 }).catch(() => {});
    // 여기부터는 부팅이 끝난 뒤의 반응성이다. 위 early 와 섞으면 둘 다 못 읽는다.
    await page.waitForTimeout(args.settle);
    const bootMark = await page.evaluate(() => performance.now());

    await armNavigationBlocker();
    const baselineUrl = page.url();

    const interactions = [];
    for (const target of TARGETS) {
      // 프로필이 있어야만 존재하는 대상은, 시드하지 않은 런에서 "잴 수 없음"이지 "실패"가 아니다.
      if (target.needsProfile && !args.profile) {
        interactions.push({ name: target.name, skipped: "--profile=1 필요" });
        continue;
      }
      if (typeof target.setup === "function") {
        try {
          await target.setup(page);
        } catch (error) {
          interactions.push({ name: target.name, failed: `setup: ${String(error.message || error).split("\n")[0]}` });
          continue;
        }
      }
      const handle = await page.$(target.selector);
      if (!handle) {
        interactions.push({ name: target.name, missing: true });
        if (typeof target.teardown === "function") await target.teardown(page).catch(() => {});
        continue;
      }
      const before = await page.evaluate(() => window.__cdPerf.events.length);
      const startedAt = await page.evaluate((n) => { window.__cdPerf.marks.push({ name: n, at: performance.now() }); return performance.now(); }, target.name);
      if (target.navigates) blockNavigation = true;
      try {
        // 🔴 타임아웃을 길게 주면 실패한 대상이 수 초의 조용한 구간을 만들고, 그 사이에 도착한
        //    지연 이미지 시프트가 "입력과 무관한 시프트"로 계상돼 귀속이 통째로 어긋난다.
        //    그래서 기본은 1,200ms 로 묶어 두고, 올리는 대상은 **왜 올리는지 근거를 그 자리에**
        //    적는다(측정으로 확인한 것만 — "느린 것 같아서"는 사유가 아니다).
        const clickTimeout = target.clickTimeout || 1200;
        if (target.type === "type") {
          await handle.click({ timeout: clickTimeout });
          await page.keyboard.type(target.text, { delay: 60 });
        } else {
          await handle.click({ timeout: clickTimeout });
        }
      } catch (error) {
        blockNavigation = false;
        interactions.push({ name: target.name, failed: String(error.message || error).split("\n")[0] });
        await page.evaluate((n) => window.__cdPerf.marks.push({ name: n, at: performance.now() }), `${target.name} (실패)`);
        if (typeof target.teardown === "function") await target.teardown(page).catch(() => {});
        continue;
      }
      await page.waitForTimeout(args.between);
      blockNavigation = false;

      // 🔴 통과가 아니라 **실패로 죽인다**. 이동을 못 막았으면 이 대상 뒤의 모든 측정이 다른
      //    문서를 잰 것이고, 그 사실을 모르면 결과 전체가 조용히 거짓이 된다(원칙 10).
      if (page.url() !== baselineUrl) {
        throw new Error(
          `[${target.name}] 이동을 막지 못했다(now=${page.url()}). 이후 대상은 다른 문서를 재게 되므로 측정을 중단한다.`,
        );
      }

      const fresh = await page.evaluate((n) => window.__cdPerf.events.slice(n), before);
      const worst = fresh.reduce((best, e) => (!best || e.duration > best.duration ? e : best), null);
      interactions.push(
        worst
          ? {
              name: target.name,
              duration: worst.duration,
              inputDelay: worst.processingStart - worst.startTime,
              processing: worst.processingEnd - worst.processingStart,
              presentation: worst.duration - (worst.processingEnd - worst.startTime),
              events: fresh.length,
              // 렌더 성분을 믿을 수 없는 대상이라는 표식. 보고서가 이 값을 그대로 노출한다.
              navigationBlocked: !!target.navigates,
            }
          // 16ms 를 넘는 엔트리가 하나도 없으면 그 인터랙션은 한 프레임 안에 끝났다는 뜻이다.
          : { name: target.name, duration: 0, inputDelay: 0, processing: 0, presentation: 0, events: 0, navigationBlocked: !!target.navigates },
      );
      if (typeof target.teardown === "function") await target.teardown(page).catch(() => {});
      void startedAt;
    }

    // ── 스크롤 ──
    const scrollMark = await page.evaluate(() => { window.__cdPerf.marks.push({ name: '스크롤', at: performance.now() }); return performance.now(); });
    await page.evaluate(async (steps) => {
      const step = Math.max(200, Math.floor(window.innerHeight * 0.9));
      for (let i = 0; i < steps; i += 1) {
        window.scrollBy(0, step);
        await new Promise((r) => setTimeout(r, 120));
      }
    }, args.scrollSteps);
    await page.waitForTimeout(400);

    const perf = await page.evaluate((mark) => {
      const p = window.__cdPerf;
      const during = p.loaf.filter((f) => f.startTime >= mark);
      return {
        longFrames: during.filter((f) => f.duration > 50).length,
        worstFrame: during.reduce((m, f) => Math.max(m, f.duration), 0),
        blockingTotal: during.reduce((s, f) => s + (f.blockingDuration || 0), 0),
        frames: during.length,
      };
    }, scrollMark);

    const shiftReport = await page.evaluate(([mark, scrollAt]) => {
      const after = window.__cdPerf.shifts.filter((s) => s.startTime >= mark);
      const interactionPhase = after.filter((s) => s.startTime < scrollAt).reduce((sum, s) => sum + s.value, 0);
      const scrollPhase = after.filter((s) => s.startTime >= scrollAt).reduce((sum, s) => sum + s.value, 0);
      const bySource = {};
      for (const s of after) {
        const key = s.sources.length ? s.sources.join(" + ") : "(출처 미상)";
        bySource[key] = (bySource[key] || 0) + s.value;
      }
      // 🔴 "무엇이 밀렸나"만으로는 못 고친다. 밀린 요소는 결과이고 원인은 그 위에서 커진 무언가다.
      //    그래서 각 시프트를 **그 시각에 진행 중이던 인터랙션**에 귀속시킨다.
      const marks = window.__cdPerf.marks;
      const byPhase = {};
      for (const s of after) {
        let phase = "(첫 대상 이전)";
        for (const m of marks) if (m.at <= s.startTime) phase = m.name;
        byPhase[phase] = (byPhase[phase] || 0) + s.value;
      }
      return {
        total: after.reduce((sum, s) => sum + s.value, 0),
        byPhase,
        interactionPhase,
        scrollPhase,
        count: after.length,
        top: Object.entries(bySource)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([source, value]) => ({ source, value })),
      };
    }, [bootMark, scrollMark]);

    await context.close();
    return { early, interactions, scroll: perf, shiftReport };
  } finally {
    await browser.close();
  }
}

/* ───────────────────────────── 보고 ───────────────────────────── */

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function band(values) {
  return values.length ? `${Math.round(Math.min(...values))}–${Math.round(Math.max(...values))}` : "-";
}

function report() {
  const lines = [];
  lines.push(`# perf:interaction — ${args.label}`, "", `- URL: ${targetUrl}`, `- Runs: ${args.runs} · CPU ${args.cpu}x`, "");
  lines.push(
    `## 🔴 부팅 중 탭 — \`${EARLY_TAP_SELECTOR}\` (핸들러 없음 = 순수 대기)`,
    "",
    "| 탭 시점 | 총 지연 | 입력 대기 | 처리 | 렌더 |",
    "|---|---:|---:|---:|---:|",
  );
  for (const at of EARLY_TAP_AT) {
    const samples = runs.map((r) => r.early.find((e) => e.at === at)).filter((s) => s && typeof s.duration === "number");
    if (samples.length === 0) {
      lines.push(`| ${at}ms | (측정 실패) | | | |`);
      continue;
    }
    const d = samples.map((s) => s.duration);
    lines.push(
      `| ${at}ms | **${Math.round(median(d))}** [${band(d)}] | ${Math.round(median(samples.map((s) => s.inputDelay)))} | ` +
        `${Math.round(median(samples.map((s) => s.processing)))} | ${Math.round(median(samples.map((s) => s.presentation)))} |`,
    );
  }
  const earlyWorst = runs.map((r) => r.early.reduce((m, e) => Math.max(m, Number(e.duration) || 0), 0));
  lines.push("", `**부팅 중 최악: ${Math.round(median(earlyWorst))} ms [${band(earlyWorst)}]**`, "");

  lines.push("## 부팅 이후 인터랙션 지연 (ms, 중앙값 [min–max])", "");
  lines.push("| 대상 | 총 지연 | 입력 대기 | 처리 | 렌더 |", "|---|---:|---:|---:|---:|");

  const unmeasured = [];
  for (const target of TARGETS) {
    const samples = runs.map((r) => r.interactions.find((i) => i.name === target.name)).filter(Boolean);
    if (samples.length && samples.every((s) => s.skipped)) {
      lines.push(`| ${target.name} | (건너뜀: ${samples[0].skipped}) | | | |`);
      continue;
    }
    if (samples.every((s) => s.missing)) {
      lines.push(`| ${target.name} | (요소 없음) | | | |`);
      unmeasured.push(`${target.name}: 요소 없음 (\`${target.selector}\`)`);
      continue;
    }
    const usable = samples.filter((s) => typeof s.duration === "number");
    if (usable.length === 0) {
      lines.push(`| ${target.name} | (실패: ${samples[0]?.failed || "?"}) | | | |`);
      unmeasured.push(`${target.name}: ${samples[0]?.failed || "실패"}`);
      continue;
    }
    const d = usable.map((s) => s.duration);
    // 🔴 이동을 막고 잰 대상은 렌더 성분을 믿을 수 없다 — 취소가 확정되기 전까지 크로미움이
    //    페인트를 미룰 수 있다. 값을 지우지 않고 **믿지 말라고 표시**한다.
    const renderCell = usable[0]?.navigationBlocked
      ? `${Math.round(median(usable.map((s) => s.presentation)))} ⚠`
      : `${Math.round(median(usable.map((s) => s.presentation)))}`;
    lines.push(
      `| ${target.name} | **${Math.round(median(d))}** [${band(d)}] | ${Math.round(median(usable.map((s) => s.inputDelay)))} | ` +
        `${Math.round(median(usable.map((s) => s.processing)))} | ${renderCell} |`,
    );
  }
  lines.push("", "⚠ = 이동을 막고 잰 대상. **입력 대기·처리만 신뢰하고 렌더 성분은 신뢰하지 않는다.**");

  const worstPerRun = runs.map((r) => r.interactions.reduce((m, i) => Math.max(m, Number(i.duration) || 0), 0));
  lines.push(
    "",
    `**최악 인터랙션(=INP 대용): ${Math.round(median(worstPerRun))} ms [${band(worstPerRun)}]** — 목표 ≤ 200ms`,
    "",
    "## 스크롤",
    "",
    "| 항목 | 중앙값 | min–max |",
    "|---|---:|---|",
    `| 50ms 초과 프레임 수 | ${median(runs.map((r) => r.scroll.longFrames))} | ${band(runs.map((r) => r.scroll.longFrames))} |`,
    `| 최장 프레임(ms) | ${Math.round(median(runs.map((r) => r.scroll.worstFrame)))} | ${band(runs.map((r) => r.scroll.worstFrame))} |`,
    `| 블로킹 합계(ms) | ${Math.round(median(runs.map((r) => r.scroll.blockingTotal)))} | ${band(runs.map((r) => r.scroll.blockingTotal))} |`,
    "",
    `**부팅 이후 레이아웃 시프트: ${median(runs.map((r) => r.shiftReport.total)).toFixed(4)}** ` +
      `(누르는 동안 ${median(runs.map((r) => r.shiftReport.interactionPhase)).toFixed(4)} · ` +
      `스크롤 중 ${median(runs.map((r) => r.shiftReport.scrollPhase)).toFixed(4)}) — 로딩 CLS 와 별개다. 목표 ≤ 0.1`,
    "",
    "### 어느 인터랙션이 일으켰나",
    "",
    "| 구간 | 시프트 합계 |",
    "|---|---:|",
  );
  const phaseTotals = new Map();
  for (const run of runs) for (const [k, v] of Object.entries(run.shiftReport.byPhase || {})) phaseTotals.set(k, (phaseTotals.get(k) || 0) + v / runs.length);
  for (const [k, v] of [...phaseTotals].sort((a, b) => b[1] - a[1])) lines.push(`| ${k} | ${v.toFixed(4)} |`);
  lines.push(
    "",
    "### 무엇이 밀렸나 (시프트 값 합계 상위)",
    "",
    "| 출처 | 합계 |",
    "|---|---:|",
  );
  const shiftTotals = new Map();
  for (const run of runs) {
    for (const item of run.shiftReport.top) {
      shiftTotals.set(item.source, (shiftTotals.get(item.source) || 0) + item.value / runs.length);
    }
  }
  for (const [source, value] of [...shiftTotals].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    lines.push(`| \`${source}\` | ${value.toFixed(4)} |`);
  }

  const text = lines.join("\n");
  console.log("\n" + text);

  const outDir = args.out || path.join(os.tmpdir(), "code-destiny-perf");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `interaction-${args.label}.md`), text, "utf8");
  fs.writeFileSync(
    path.join(outDir, `interaction-${args.label}.json`),
    JSON.stringify({ label: args.label, url: targetUrl, runs }, null, 2),
    "utf8",
  );
  console.log(`\n[perf:interaction] wrote ${path.join(outDir, `interaction-${args.label}.md`)}`);

  // 🔴 예전에는 "대상이 **하나도** 안 잡힐 때"만 죽었다. 그래서 필드 상위인 컬렉션 탭과
  //    오늘의 운세 탭이 매 회차 조용히 빠진 채로 리포트가 초록으로 나왔다 — 가드가 아니었다.
  //    이제는 **하나라도** 못 재면 실패다. 못 재는 대상은 고치거나 목록에서 사유와 함께 빼야 한다.
  if (unmeasured.length) {
    console.error(`\n[perf:interaction] 실패 — 못 잰 대상 ${unmeasured.length}개:`);
    for (const item of unmeasured) console.error(`  · ${item}`);
    console.error("  셀렉터를 고치거나, 못 재는 사유를 TARGETS 주석에 적고 목록에서 빼라.");
    process.exit(1);
  }
}

/* ───────────────────────────── 인프라 ───────────────────────────── */

function parseArgs(argv) {
  const get = (name, fallback) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : fallback;
  };
  return {
    runs: Math.max(1, parseInt(get("runs", "3"), 10)),
    cpu: Math.max(1, parseInt(get("cpu", "4"), 10)),
    settle: Math.max(0, parseInt(get("settle", "6000"), 10)),
    between: Math.max(100, parseInt(get("between", "700"), 10)),
    scrollSteps: Math.max(1, parseInt(get("scroll-steps", "12"), 10)),
    label: get("label", "run"),
    url: get("url", ""),
    out: get("out", ""),
    // 프로필 카드를 심고 잰다. 🔴 시드한 런과 안 한 런의 값을 섞어 비교하지 말 것.
    profile: get("profile", "") === "1" || argv.includes("--profile"),
  };
}

function startStaticServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(staticRoot, urlPath);
    if (urlPath.endsWith("/")) filePath = path.join(filePath, "index.html");
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(403).end();
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexed = path.join(filePath, "index.html");
      if (fs.existsSync(indexed)) filePath = indexed;
      else {
        res.writeHead(404).end();
        return;
      }
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { "content-type": contentType(ext), "cache-control": ext === ".html" ? "no-store" : "public, max-age=3600" };
    if (COMPRESSIBLE.has(ext) && String(req.headers["accept-encoding"] || "").includes("br")) {
      let encoded = encodedCache.get(filePath);
      if (!encoded) {
        encoded = zlib.brotliCompressSync(fs.readFileSync(filePath));
        encodedCache.set(filePath, encoded);
      }
      res.writeHead(200, { ...headers, "content-encoding": "br" }).end(encoded);
      return;
    }
    res.writeHead(200, headers).end(fs.readFileSync(filePath));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function contentType(ext) {
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".xml": "application/xml",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}
