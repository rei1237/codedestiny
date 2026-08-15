import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import WebSocket from "ws";

const root = process.cwd();
// dist 는 웹 배포본일 수도, 앱(Android) 빌드본일 수도 있다. 앱 빌드는 build-mobile-app.mjs 가
const staticRoot = resolveStaticRoot();
const chromePath = findChrome();
const server = await startStaticServer();
const tempProfilePrefix = path.join(os.tmpdir(), "code-destiny-mobile-cdp-profile-");
const debugCdp = process.env.MOBILE_CDP_DEBUG === "1";
const focusAllFortunes = process.env.MOBILE_CDP_FOCUS === "all-fortunes";
const hybridDesktopProfile = process.argv.includes("--hybrid-desktop");
const desktopProfile = hybridDesktopProfile || process.argv.includes("--desktop");

const failures = [];
let chrome;
let cdp;
let userDataDir;

try {
  const launched = await launchReadyChrome();
  chrome = launched.chrome;
  cdp = launched.cdp;
  userDataDir = launched.userDataDir;

  await send(cdp, "Runtime.enable");
  await send(cdp, "Network.enable");
  if (hybridDesktopProfile) {
    await send(cdp, "Page.addScriptToEvaluateOnNewDocument", {
      source: `Object.defineProperty(Navigator.prototype, "maxTouchPoints", {
        configurable: true,
        get: () => 10
      });`,
    });
  }
  await send(cdp, "Emulation.setDeviceMetricsOverride", desktopProfile ? {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  } : {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await send(cdp, "Emulation.setTouchEmulationEnabled", desktopProfile ? { enabled: false } : { enabled: true, maxTouchPoints: 5 });
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);

  if (desktopProfile) {
    const desktopState = await evaluate(cdp, `(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      maxTouchPoints: navigator.maxTouchPoints,
      bridgeReady: window.__cdMobileTouchBridgeReady === true,
      touchBridgeBound: document.__cdTouchBridgeBound === true,
      fallbackBound: document.__cdMobileDataActionFallbackBound === true,
      touchStyleInjected: !!document.getElementById('cd-mobile-touch-bridge-style'),
      bottomNavDisplay: getComputedStyle(document.getElementById('cdMobileBottomNav')).display
    }))()`, "desktop bridge state");
    assert(desktopState.viewport.width === 1440 && desktopState.viewport.height === 900, "desktop viewport is 1440x900", desktopState);
    assert(!desktopState.bridgeReady && !desktopState.touchBridgeBound && !desktopState.fallbackBound && !desktopState.touchStyleInjected, "desktop does not initialize the mobile touch bridge or its global capture handlers", desktopState);
    assert(desktopState.bottomNavDisplay === "none", "desktop keeps the mobile bottom nav out of layout", desktopState);

    const selector = '.fc-toggle-btn[data-target="tarotCollection"]';
    const probeReady = await evaluate(cdp, `(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      sessionStorage.setItem('__cdDesktopClickProbe', '[]');
      window.addEventListener('click', function desktopClickProbe(event) {
        if (!event.target || !event.target.closest(${JSON.stringify(selector)})) return;
        window.setTimeout(function () {
          const clicks = JSON.parse(sessionStorage.getItem('__cdDesktopClickProbe') || '[]');
          clicks.push({
            defaultPrevented: event.defaultPrevented,
            expanded: target.getAttribute('aria-expanded')
          });
          sessionStorage.setItem('__cdDesktopClickProbe', JSON.stringify(clicks));
        }, 0);
      }, true);
      return true;
    })()`, "desktop click probe setup");
    assert(probeReady, "desktop tarot collection control exists", { selector });
    await clickSelector(cdp, selector);
    await delay(100);
    await clickSelector(cdp, selector);
    await delay(100);
    const clickState = await evaluate(cdp, `(() => ({
      clicks: JSON.parse(sessionStorage.getItem('__cdDesktopClickProbe') || '[]'),
      bridgeReady: window.__cdMobileTouchBridgeReady === true,
      touchBridgeBound: document.__cdTouchBridgeBound === true
    }))()`, "desktop click probe result");
    assert(clickState.clicks.length === 2, "desktop collection control receives consecutive native clicks", clickState);
    assert(clickState.clicks[0]?.expanded === "true" && clickState.clicks[1]?.expanded === "false", "desktop collection remains usable after its first interaction", clickState);
    assert(!clickState.bridgeReady && !clickState.touchBridgeBound, "desktop click flow never activates the mobile bridge", clickState);
  } else {
  const initial = await evaluate(cdp, mobileStateExpression(), "initial mobile state");
  assert(initial.viewportWidth === 390, "viewport width is 390", initial);
  if (!focusAllFortunes) {
    assert(initial.responsiveHomeVisible, "responsive mobile home is visible", initial);
    assert(initial.primaryCtaInFirstView, "primary CTA is in first view", initial);
  }
  assert(initial.bottomNavVisible, "bottom nav is visible", initial);
  assert(initial.bottomNavMainCount === 5, "bottom nav has five main items", initial);
  assert(initial.bottomNavQuickHidden, "bottom nav quick rail is hidden", initial);
  assert(initial.languageDropdownClosed, "language dropdown is closed without hit boxes", initial);
  // 2026-07 모바일 홈 리디자인부터 추천 카드가 첫 화면에 일부 노출된다(프로덕션 실측 top≈502).
  // 리디자인에도 살아남는 불변식은 "카드가 주 CTA 를 덮고 올라오지 않는다"이다.
  if (!focusAllFortunes) {
    assert(initial.membershipBelowPrimaryCta, "membership guidance begins below the primary CTA", initial);
  }
  assert(initial.noHorizontalOverflow, "no horizontal overflow", initial);
  assert(initial.audioVideoCount === 0, "home has no initial audio/video elements", initial);
  assert(initial.hiddenOverlaysPointerSafe, "hidden overlays do not block touch", initial);

  // ── 스크롤 중 오탭 회귀 (2026-08-15) ──────────────────────────────────────────
  // 이 셸에는 같은 탭을 놓고 경쟁하는 리스너 스택이 8벌 있고 임계값이 제각각이라,
  // 한 스택이 "스크롤이니 막자"고 판정해도 다른 스택이 기능을 열었다. 판정 정본은
  // js/inline/gesture-arbiter.js 하나이며 아래가 그 계약을 고정한다.
  // 판정 축은 하드 내비게이션(href) 이다 — 오탭의 실제 대가가 셸 전체 재로드이기 때문.
  {
    const scrollTapTarget = '.moon-preview-card[href="/tarot/mingri"]';
    const homeUrl = `http://127.0.0.1:${server.port}/index.html`;

    const arbiter = await evaluate(cdp, gestureProbeExpression(), "gesture arbiter presence");
    assert(arbiter.arbiterPresent, "gesture arbiter is installed on the mobile shell", arbiter);

    // 1) 세로 스크롤 — 카드 위에서 시작해 끌어올린 뒤 떼도 열리면 안 된다.
    const beforeVertical = await evaluate(cdp, gestureProbeExpression(), "before vertical swipe");
    await swipeFromSelector(cdp, scrollTapTarget, 0, -160);
    await delay(600);
    const afterVertical = await evaluate(cdp, gestureProbeExpression(), "after vertical swipe");
    assert(
      afterVertical.href === beforeVertical.href && afterVertical.lastAction === beforeVertical.lastAction
        && !!afterVertical.lastBlock && afterVertical.lastBlock.at >= beforeVertical.now,
      "vertical scroll starting on a fortune card does not open it",
      { before: beforeVertical, after: afterVertical },
    );

    // 2) 가로 스와이프 — .moon-collection-nav 는 overflow-x:auto 레일이고, 예전에는
    //    어떤 스크롤 잠금 목록에도 없어 가로 스와이프가 그대로 기능을 열었다.
    await navigate(cdp, homeUrl);
    await delay(400);
    const beforeHorizontal = await evaluate(cdp, gestureProbeExpression(), "before horizontal swipe");
    await swipeFromSelector(cdp, scrollTapTarget, -150, 0);
    await delay(600);
    const afterHorizontal = await evaluate(cdp, gestureProbeExpression(), "after horizontal swipe");
    assert(
      afterHorizontal.href === beforeHorizontal.href && afterHorizontal.lastAction === beforeHorizontal.lastAction
        && !!afterHorizontal.lastBlock && afterHorizontal.lastBlock.at >= beforeHorizontal.now,
      "horizontal swipe on the fortune card rail does not open a card",
      { before: beforeHorizontal, after: afterHorizontal },
    );

    // 3) 스크롤 아웃&백 — 끌었다가 시작점으로 되돌아와 떼는 제스처. 시작점과 끝점의
    //    좌표 차이만 보는 판정기(기존 4벌 전부)는 이걸 전부 탭으로 통과시킨다.
    await navigate(cdp, homeUrl);
    await delay(400);
    const beforeOutBack = await evaluate(cdp, gestureProbeExpression(), "before out-and-back swipe");
    await swipeOutAndBackFromSelector(cdp, scrollTapTarget, -120);
    await delay(600);
    const afterOutBack = await evaluate(cdp, gestureProbeExpression(), "after out-and-back swipe");
    assert(
      afterOutBack.href === beforeOutBack.href && afterOutBack.lastAction === beforeOutBack.lastAction
        && !!afterOutBack.lastBlock && afterOutBack.lastBlock.at >= beforeOutBack.now,
      "drag that returns to its origin is not treated as a tap",
      { before: beforeOutBack, after: afterOutBack },
    );

    // 관성 캐치(흐르는 리스트에 손가락을 대 멈추는 동작)는 의도적으로 다루지 않는다 —
    // 앱 자신이 스크롤하는 순간과 구분할 신호가 없어 시도한 세 방식이 모두 멀쩡한 탭을 죽였다.
    // 근거와 재현 사례는 js/inline/gesture-arbiter.js 상단 주석에 남겼다.

    // 4) 🔴 정상 동작 보존 — 여기가 이 블록에서 가장 중요한 단언이다.
    //    2026-08-14 13cc7e6d7 은 과차단으로 유료 진입 CTA 가 두 릴리스 동안 완전히
    //    죽어 있었는데 스모크는 초록이었던 사고를 고쳤다. 오탭을 막는 코드는 언제든
    //    "아무것도 안 열림"으로 넘어갈 수 있으므로, 스크롤이 멎은 뒤의 탭이 실제로
    //    기능을 여는지 매번 확인한다.
    // 판정 축은 "액션이 실제로 발화했는가"(__cdLastMobileAction)다. 라우트 도달 여부로 재면
    // 정적 트리에 없는 Next 라우트 때문에 환경 탓으로 실패해 신호가 흐려진다.
    await navigate(cdp, homeUrl);
    await delay(400);
    await evaluate(cdp, "(() => { window.scrollBy(0, 120); return true; })()", "emit scroll before settled tap");
    await delay(500); // 스크롤이 완전히 멎은 상태를 만든다
    const beforeSettled = await evaluate(cdp, gestureProbeExpression(), "before settled tap");
    await tapSelector(cdp, scrollTapTarget);
    let afterSettled = beforeSettled;
    for (let i = 0; i < 8; i += 1) {
      await delay(250);
      afterSettled = await evaluate(cdp, gestureProbeExpression(), "after settled tap");
      if (afterSettled.lastAction !== beforeSettled.lastAction || afterSettled.href !== beforeSettled.href) break;
    }
    assert(
      afterSettled.lastAction !== beforeSettled.lastAction || afterSettled.href !== beforeSettled.href,
      "a deliberate tap after scrolling settles still opens the card",
      { before: beforeSettled, after: afterSettled },
    );

    await navigate(cdp, homeUrl);
    await delay(400);
  }

  // ── 중재자를 안 묻던 스택의 회귀 (2026-08-15) ────────────────────────────────
  // 위 블록은 .moon-preview-card 한 종류만 본다. 그런데 판정 정본을 도입한 #640 은
  // index.html 4곳과 js/mobile-interaction-patch.js 1곳만 배선했고 js/core/* 는 통째로
  // 빠져 있었다(그 커밋의 js/core 변경은 전부 캐시키 재스탬프였다). 애니멀 토템 타일은
  // 그중에서도 완전 무방비였다 — 자체 판정은 TAP_THRESH(10px)뿐이고, 타일에
  // data-coin-cost·data-tile-lock-cost 가 없어 index.html 의 touchend 게이트 셀렉터
  // ([data-coin-cost],[data-tile-lock-cost],.rpt-v2-toggle-btn)에도 매칭되지 않았다.
  //
  // 🔴 두 단언을 쌍으로 둔다. 오탭을 막는 코드는 언제든 "아무것도 안 열림"으로 넘어가므로
  //    차단 단언만 두면 죽은 UI 를 초록으로 통과시킨다(2026-08-14 13cc7e6d7 의 교훈).
  {
    const totemHomeUrl = `http://127.0.0.1:${server.port}/index.html`;
    const totemTile = ".tarot-tile--animal-totem";
    const totemProbe = `(() => {
      const overlay = document.getElementById('animalTotemOverlay');
      const sheet = document.getElementById('tilePvwOverlay');
      const last = window.__cdLastMobileAction || null;
      return {
        totemOpen: !!(overlay && (overlay.classList.contains('is-open') || overlay.style.display === 'block')),
        sheetOpen: !!(sheet && sheet.classList.contains('pvw-open')),
        lastAction: last ? String(last.action || '') + '@' + String(last.at || '') : '',
        href: location.href,
        now: Date.now()
      };
    })()`;

    await navigate(cdp, totemHomeUrl);
    await delay(400);
    // 컬렉션은 접힌 채 시작한다 — 열어야 타일이 히트 테스트를 받는다.
    // 셸이 로드 직후 스크롤 위치를 복원하므로(index.html 의 window.scrollTo(0, savedScrollY)),
    // tapSelector 안의 scrollIntoView 만 믿으면 그 복원에 밀려 좌표가 뷰포트 밖으로 나간다.
    // 먼저 스크롤을 잡아 두고 충분히 기다린 뒤 탭한다.
    const animalToggle = '.fc-toggle-btn[data-target="animalCollection"]';
    await waitForSelector(cdp, animalToggle);
    await evaluate(cdp, scrollSelectorIntoViewExpression(animalToggle), "scroll animal collection toggle into view");
    await delay(500);
    await tapSelector(cdp, animalToggle);
    await delay(600);
    await waitForSelector(cdp, totemTile);

    // 🔴 여기에 out-and-back 드래그의 **차단** 단언을 두려다 뺐다. 근거를 남긴다.
    //
    // 이 제스처는 시작점에서 손을 떼므로 touchend 뒤에 브라우저가 click 도 쏜다. touchend 경로는
    // 이 PR 이 배선한 대로 확실히 막히지만(가드를 끄고 재면 250ms 안에 totemOpen:true 로 열린다 —
    // 실측), 뒤따르는 click 은 중재자의 VERDICT_TTL_MS(700ms, gesture-arbiter.js)에 걸려 있어
    // 그 창을 넘겨 도착하면 판정이 만료된 채 통과한다. 하네스가 부하를 받으면 그 창을 넘기므로
    // 단언이 실행마다 뒤집혔다(같은 커밋에서 통과·실패 양쪽 실측).
    //
    // 🔴 간헐 실패하는 가드는 없느니만 못하다 — 사람이 재실행으로 넘기는 법을 배우고, 그때부터
    //    진짜 회귀도 함께 넘어간다. TTL 노출 자체는 이 PR 이 만든 것이 아니라 중재자의 기존
    //    성질이고, 늘리면 과차단(죽은 UI) 위험이 붙어 검증 없이 손댈 수 없다.
    //    후속 과제로 넘겼다 — docs/handoff/mobile-fling-catch-arbiter.md.
    //
    // 아래 포지티브 컨트롤은 그대로 둔다. 이 PR 이 만들 수 있는 가장 비싼 실수는 과차단이고,
    // 그걸 잡는 것이 이 단언이다.

    // 🔴 정상 동작 보존 — 스크롤이 멎은 뒤의 의도적 탭은 여전히 열려야 한다.
    // 앞 단언이 깨진 상태(모달이 열려 버린 상태)에서 이어가면 모달 캔버스가 타일을 덮어
    // tapSelector 가 throw 하고, throw 는 쌓인 실패 목록을 통째로 잃는다. 항상 새 페이지에서 시작한다.
    await navigate(cdp, totemHomeUrl);
    await delay(400);
    await waitForSelector(cdp, animalToggle);
    await evaluate(cdp, scrollSelectorIntoViewExpression(animalToggle), "re-scroll animal collection toggle into view");
    await delay(500);
    await tapSelector(cdp, animalToggle);
    await delay(600);
    await waitForSelector(cdp, totemTile);
    await delay(500);
    const beforeTotemTap = await evaluate(cdp, totemProbe, "before totem tap");
    await tapSelector(cdp, totemTile);
    let afterTotemTap = beforeTotemTap;
    for (let i = 0; i < 8; i += 1) {
      await delay(250);
      afterTotemTap = await evaluate(cdp, totemProbe, "after totem tap");
      if (afterTotemTap.totemOpen || afterTotemTap.sheetOpen
        || afterTotemTap.lastAction !== beforeTotemTap.lastAction) break;
    }
    assert(
      afterTotemTap.totemOpen || afterTotemTap.sheetOpen
        || afterTotemTap.lastAction !== beforeTotemTap.lastAction,
      "a deliberate tap on the animal totem tile still opens it",
      { before: beforeTotemTap, after: afterTotemTap },
    );

    await navigate(cdp, totemHomeUrl);
    await delay(400);
  }

  if (!focusAllFortunes) {
  await tapSelector(cdp, ".moon-hero__cta--primary[href=\"/codedestiny-novel.html\"]");
  // 단일 반응형 홈의 주 CTA는 운명 여정으로 이동한다. 정적 셸의 문서 전환은 고정 대기보다 짧은 폴링이 안정적이다.
  let afterPrimaryTap = { pathname: "" };
  for (let i = 0; i < 12; i += 1) {
    await delay(250);
    afterPrimaryTap = await evaluate(cdp, "({ pathname: location.pathname })", "after primary CTA tap");
    if (afterPrimaryTap.pathname.indexOf("/codedestiny-novel.html") === 0) break;
  }
  assert(
    afterPrimaryTap.pathname.indexOf("/codedestiny-novel.html") === 0,
    "primary CTA opens the destiny journey",
    afterPrimaryTap,
  );

  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  await tapSelector(cdp, ".moon-preview-card[href=\"/tarot/mingri\"]");
  await delay(450);
  const afterTarotTap = await evaluate(cdp, `(() => {
    const modal = ${modalStateExpression()};
    return Object.assign({ pathname: location.pathname }, modal);
  })()`, "after tarot tap");
  assert(afterTarotTap.pathname.indexOf("/tarot/mingri") === 0 || afterTarotTap.tilePreviewOpen || afterTarotTap.tarotModalVisible, "tarot touch opens route, sheet, or modal", afterTarotTap);
  }

  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  // 모든 운세 탭은 이동하지 않고 풀스크린 오버레이를 전체 개요 모드로 연다.
  await tapSelector(cdp, "#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key=\"fortunes\"]");
  // Visual exit completes at 280ms; allow scheduler margin before checking the
  // follow-up display:none cleanup under CDP's mobile emulation load.
  await delay(800);
  const afterFortunesNav = await evaluate(cdp, `(() => {
    const panel = document.getElementById('cdMobileFortuneOverview');
    const api = window.cdMobileCollectionFullscreen;
    return {
      pathname: location.pathname,
      overlayOpen: !!(api && api.isOpen()),
      overviewShown: !!panel && panel.classList.contains('is-open'),
      categoryCount: panel ? panel.querySelectorAll('.cd-fov__cat').length : 0,
      activeKey: document.querySelector('#cdMobileBottomNav .cd-mobile-bottom-nav__main [aria-current="page"]')?.getAttribute('data-nav-key') || null,
      navDisplay: getComputedStyle(document.getElementById('cdMobileBottomNav')).display,
      navPointerEvents: getComputedStyle(document.getElementById('cdMobileBottomNav')).pointerEvents,
      navAriaHidden: document.getElementById('cdMobileBottomNav')?.getAttribute('aria-hidden'),
      panelBottom: panel ? Math.round(panel.getBoundingClientRect().bottom) : 0,
      viewportHeight: innerHeight
    };
  })()`, "after bottom nav all-fortunes tap");
  assert(afterFortunesNav.overlayOpen && afterFortunesNav.overviewShown, "bottom nav all-fortunes opens the overview overlay", afterFortunesNav);
  assert(afterFortunesNav.categoryCount > 0, "all-fortunes overview lists categories", afterFortunesNav);
  assert(afterFortunesNav.activeKey === "fortunes", "all-fortunes tab marks itself active", afterFortunesNav);
  assert(afterFortunesNav.navDisplay === "none" && afterFortunesNav.navPointerEvents === "none" && afterFortunesNav.navAriaHidden === "true", "immersive all-fortunes removes the bottom-nav layout and touch target", afterFortunesNav);
  assert(afterFortunesNav.panelBottom >= afterFortunesNav.viewportHeight - 1, "all-fortunes content extends through the released bottom safe area", afterFortunesNav);

  await tapSelector(cdp, '.cd-fov__cat[data-collection-id="tarotCollection"]');
  await delay(120);
  await tapSelector(cdp, '.cd-mobile-collection-tab[data-collection-id="oracleCollection"]');
  await delay(120);
  const afterRapidCollectionSwitch = await evaluate(cdp, `(() => {
    const api = window.cdMobileCollectionFullscreen;
    const chrome = document.getElementById('cdMobileCollectionChromeBar');
    const activeTab = chrome?.querySelector('.cd-mobile-collection-tab[aria-current="page"]');
    return {
      overlayOpen: !!api?.isOpen?.(),
      currentCollection: api?.getCurrent?.() || null,
      activeCollection: activeTab?.getAttribute('data-collection-id') || null,
      chromePointerEvents: chrome ? getComputedStyle(chrome).pointerEvents : null
    };
  })()`, "after rapid tarot-to-oracle touch switch");
  assert(afterRapidCollectionSwitch.overlayOpen && afterRapidCollectionSwitch.currentCollection === "oracleCollection" && afterRapidCollectionSwitch.activeCollection === "oracleCollection" && afterRapidCollectionSwitch.chromePointerEvents === "auto", "rapid tarot-to-oracle touch switch remains interactive", afterRapidCollectionSwitch);
  await tapSelector(cdp, '.cd-mobile-collection-tab[data-collection-id="miscCollection"]');
  await delay(120);
  await tapSelector(cdp, ".cd-mobile-collection-close");
  await delay(350);
  const afterFortunesClose = await evaluate(cdp, `(() => {
    const nav = document.getElementById('cdMobileBottomNav');
    const api = window.cdMobileCollectionFullscreen;
    return { overlayOpen: !!(api && api.isOpen()), navDisplay: getComputedStyle(nav).display, navPointerEvents: getComputedStyle(nav).pointerEvents, navAriaHidden: nav.getAttribute('aria-hidden') };
  })()`, "after all-fortunes close");
  assert(!afterFortunesClose.overlayOpen && afterFortunesClose.navDisplay !== "none" && afterFortunesClose.navPointerEvents !== "none" && afterFortunesClose.navAriaHidden !== "true", "closing all-fortunes restores a usable bottom nav", afterFortunesClose);

  await tapSelector(cdp, "#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key=\"fortunes\"]");
  await delay(450);
  const restoredFortunesState = await evaluate(cdp, "({ currentCollection: window.cdMobileCollectionFullscreen?.getCurrent?.() || null, overlayOpen: !!window.cdMobileCollectionFullscreen?.isOpen?.() })", "restored all-fortunes state");
  assert(restoredFortunesState.overlayOpen && restoredFortunesState.currentCollection === "miscCollection", "reopening all-fortunes preserves its selected collection", restoredFortunesState);

  // ── 상세 팝업 → 진입 버튼 구간 ──────────────────────────────────────────────
  // 여기가 비어 있어서 "카드는 눌리는데 진입 버튼을 누르면 화면이 프리징"을 놓쳤다.
  // 상세 팝업은 열릴 때 body 자식 전체에 inert 를 걸고 닫을 때 되돌리는데, 열려 있는 채로
  // _open 이 재진입하면(가격 조회 완료, touchend+pointerup 이중 발화) 이미 true 인 값을
  // "원래값"으로 다시 스냅샷해 닫는 순간 배경이 inert 로 고착됐다. 화면은 보이고 스크롤도
  // 되는데 아무것도 안 눌리는 상태라 육안·기존 단언 모두 통과했다.
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  await tapSelector(cdp, "#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key=\"fortunes\"]");
  await delay(700);
  await tapSelector(cdp, '.cd-fov__cat[data-collection-id="tarotCollection"]');
  await delay(450);

  const GATED_TILE = '.tarot-tile[data-feature-key="tarot-love-relationship"]';
  const inertProbe = `(() => {
    const ov = document.getElementById('tilePvwOverlay');
    const stuck = Array.prototype.slice.call(document.body.children)
      .filter((n) => n.inert && n.id !== 'cdMobileBottomNav')
      .map((n) => n.id || n.className || n.tagName);
    return {
      sheetOpen: !!(ov && ov.classList.contains('pvw-open')),
      sheetAriaHidden: ov ? ov.getAttribute('aria-hidden') : null,
      wrapInert: !!(document.querySelector('.wrap') || {}).inert,
      stuckInert: stuck
    };
  })()`;

  await waitForSelector(cdp, GATED_TILE);
  await tapSelector(cdp, GATED_TILE);
  await delay(500);
  const afterTileTap = await evaluate(cdp, inertProbe, "after gated fortune tile tap");
  assert(afterTileTap.sheetOpen, "tapping a gated fortune tile opens the detail sheet", afterTileTap);

  // 가격 조회가 끝나면서 _open 이 재진입하는 구간. 여기를 지나야 회귀가 재현된다.
  await delay(1800);
  await tapSelector(cdp, "#tilePvwClose");
  await delay(600);
  const afterSheetClose = await evaluate(cdp, inertProbe, "after detail sheet close");
  assert(!afterSheetClose.sheetOpen, "the detail sheet closes on its ✕", afterSheetClose);
  assert(!afterSheetClose.wrapInert && afterSheetClose.stuckInert.length === 0, "closing the detail sheet leaves no inert body child", afterSheetClose);

  // 상세 팝업 ✕ 는 pointerup 에서 시트를 닫는다. 그 뒤 touchend 의 좌표 기반 컬렉션 토글 조회가
  // 시트가 사라진 자리의 컬렉션 헤더를 집으면, 닫기 한 번에 컬렉션이 접히고 카드가 전부 사라진다.
  const postCloseState = await evaluate(cdp, `(() => {
    const api = window.cdMobileCollectionFullscreen;
    const coll = document.getElementById('tarotCollection');
    const ov = document.getElementById('cdMobileFortuneOverview');
    return {
      overlayOpen: !!api?.isOpen?.(),
      current: api?.getCurrent?.() || null,
      overviewOpen: !!(ov && ov.classList.contains('is-open')),
      collInDom: !!coll,
      collOpenAttr: coll ? coll.getAttribute('data-collection-open') : null,
      collFullscreen: coll ? coll.classList.contains('cd-mobile-collection-fullscreen') : null,
      collDisplay: coll ? getComputedStyle(coll).display : null,
      tiles: coll ? coll.querySelectorAll('.tarot-tile').length : -1,
      placeholders: coll ? coll.querySelectorAll('.cd-mobile-card-placeholder').length : -1
    };
  })()`, "post sheet-close collection state");
  assert(
    postCloseState.overlayOpen && postCloseState.collOpenAttr === "true" && postCloseState.tiles > 0,
    "closing the detail sheet keeps the fortune collection open with its cards",
    postCloseState,
  );

  // 진입 버튼(CTA) 경로 — _onCta 는 _close() 를 먼저 부르고 타일을 다시 클릭한다.
  await delay(700);
  await waitForSelector(cdp, GATED_TILE);
  await tapSelector(cdp, GATED_TILE);
  await delay(2000);
  await tapSelector(cdp, "#tilePvwCtaBtn");
  await delay(2600);

  // 🔴 이 단언이 없어서 진입이 완전히 죽은 채로 두 번의 릴리스를 통과했다.
  // 예전에는 CTA 를 누른 뒤 inert 누수만 봤고, 아래 닫기버튼 검사가 오버레이를 손으로 열어
  // (style.display='block') 검사했기 때문에, 기능이 아예 안 열려도 스모크는 초록이었다.
  const ctaEntryOpened = await evaluate(cdp, `(() => {
    const ov = document.getElementById('tarotLoveOverlay');
    const cs = ov ? getComputedStyle(ov) : null;
    return {
      path: location.pathname,
      scriptLoaded: typeof window.openTarotLoveModal === 'function',
      inDocument: !!(ov && document.documentElement.contains(ov)),
      display: cs ? cs.display : null,
      visibility: cs ? cs.visibility : null,
      isOpen: !!(ov && ov.classList.contains('is-open'))
    };
  })()`, "detail sheet CTA actually opens the feature");
  assert(
    ctaEntryOpened.scriptLoaded && ctaEntryOpened.inDocument
      && ctaEntryOpened.display !== "none" && ctaEntryOpened.visibility !== "hidden"
      && ctaEntryOpened.isOpen,
    "the detail sheet CTA actually opens the paid feature",
    ctaEntryOpened,
  );
  assert(
    ctaEntryOpened.path === "/index.html" || ctaEntryOpened.path === "/",
    "entering from the detail sheet opens in place instead of navigating away",
    ctaEntryOpened,
  );

  const afterCtaEntry = await evaluate(cdp, inertProbe, "after detail sheet CTA entry");
  assert(!afterCtaEntry.wrapInert && afterCtaEntry.stuckInert.length === 0, "entering a feature from the detail sheet leaves the page interactive", afterCtaEntry);

  // 기능적 증명: 배경이 살아 있어야 모든 운세 ✕ 가 실제로 먹는다.
  const closeStillWorks = await evaluate(cdp, `(() => {
    const btn = document.querySelector('.cd-mobile-collection-close');
    if (!btn) return { present: false };
    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2));
    return {
      present: true,
      hits: !!(top && (top.closest('.cd-mobile-collection-close') || top.closest('#tarotLoveOverlay'))),
      topEl: top ? (top.id || top.className || top.tagName) : null
    };
  })()`, "all-fortunes close reachability after feature entry");
  assert(!closeStillWorks.present || closeStillWorks.hits, "the opened feature owns the hit test after entering from the detail sheet", closeStillWorks);

  // "우리는 무슨 사이?" 닫기 버튼 — .tarot-love-hero 가 position:relative 로 DOM 상 뒤에 와서
  // 둘 다 z-index:auto 면 히어로가 버튼 위에 그려진다(모바일에서 48px 중 38px 가 덮였다).
  const tarotLoveClose = await evaluate(cdp, `(() => {
    document.querySelectorAll('link[rel="stylesheet"][media="print"]').forEach((l) => { l.media = 'all'; });
    // 🔴 오버레이를 손으로 열지 않는다 — 위 CTA 진입이 실제로 연 상태를 그대로 검사해야
    // "진입은 죽었는데 닫기버튼만 초록"인 예전 구멍이 되살아나지 않는다.
    const ov = document.getElementById('tarotLoveOverlay');
    if (!ov) return { present: false };
    const btn = ov.querySelector('.tarot-love-close');
    if (!btn) return { present: true, button: false };
    const r = btn.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const top = document.elementFromPoint(cx, cy);
    return {
      present: true,
      button: true,
      width: Math.round(r.width),
      height: Math.round(r.height),
      hits: !!(top && top.closest('.tarot-love-close')),
      topEl: top ? (top.className || top.tagName) : null
    };
  })()`, "tarot love close hit test");
  assert(
    !tarotLoveClose.present || !tarotLoveClose.button || tarotLoveClose.hits,
    "the 우리는 무슨 사이? close button is not covered by its hero",
    tarotLoveClose,
  );

  if (!focusAllFortunes) {
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  await navigate(cdp, `http://127.0.0.1:${server.port}/index.html`);
  // 🔴 첫 매치를 그냥 집으면 안 된다. 이 섹션에는 benefits CTA 가 둘 있고, 앞의
  // .honey-membership-mini__hero 는 모바일에서 display:none 이다(index.html 의
  // "#honeyMembershipMini .honey-membership-mini__hero{display:none!important}").
  // 예전에는 그 숨은 쪽을 재고 있었는데, 스모크가 낡은 dist 를 서빙한 탓에 어긋남이 드러나지
  // 않았다(G-8). 계약은 "모바일에서 눌리는 benefits CTA 가 하나는 있다"이므로 그대로 잰다.
  const membershipButtonState = await evaluate(cdp, `(() => {
    const nodes = Array.from(document.querySelectorAll('#honeyMembershipMini [data-membership-cta="benefits"]'));
    if (!nodes.length) return { exists: false, visible: false, action: null, total: 0 };
    const isVisible = (node) => {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    nodes.forEach((node) => node.removeAttribute('data-cdp-benefits-target'));
    const node = nodes.find(isVisible);
    if (!node) {
      return { exists: true, visible: false, action: null, total: nodes.length };
    }
    node.setAttribute('data-cdp-benefits-target', '1');
    const r = node.getBoundingClientRect();
    return {
      exists: true,
      visible: true,
      action: node.getAttribute('data-membership-cta'),
      total: nodes.length,
      width: Math.round(r.width),
      height: Math.round(r.height)
    };
  })()`, "membership benefits button state");
  assert(membershipButtonState.exists && membershipButtonState.visible && membershipButtonState.action === "benefits", "mobile membership benefits button is visible and action-wired", membershipButtonState);

  await tapSelector(cdp, '#honeyMembershipMini [data-cdp-benefits-target="1"]');
  let membershipBenefitsDestination = { pathname: "", search: "" };
  for (let i = 0; i < 12; i += 1) {
    await delay(250);
    membershipBenefitsDestination = await evaluate(cdp, "({ pathname: location.pathname, search: location.search })", "membership benefits destination");
    if (membershipBenefitsDestination.pathname.indexOf("/points") === 0 || membershipBenefitsDestination.pathname.indexOf("/login") === 0) break;
  }
  // next 파라미터는 퍼센트 인코딩돼 온다(?next=%2Fpoints%3F...). 디코드하지 않으면 로그인
  // 리다이렉트가 이용권 안내를 제대로 가리키고 있어도 이 단언이 틀리게 실패한다.
  // 이 경로는 예전엔 아예 도달하지 않았다 — 위 탭이 모바일에서 숨겨진 버튼을 노렸기 때문이다(G-8).
  const membershipBenefitsNext = (() => {
    try {
      return decodeURIComponent(membershipBenefitsDestination.search || "");
    } catch (_) {
      return membershipBenefitsDestination.search || "";
    }
  })();
  assert(
    membershipBenefitsDestination.pathname.indexOf("/points") === 0 || (
      membershipBenefitsDestination.pathname.indexOf("/login") === 0 &&
      membershipBenefitsNext.indexOf("/points") >= 0
    ),
    "mobile membership benefits routes to the pass guide without entering a payment flow",
    { ...membershipBenefitsDestination, decodedSearch: membershipBenefitsNext },
  );
  }

  }

  if (failures.length) {
    console.error(desktopProfile ? "Desktop CDP smoke failed." : "Mobile CDP smoke failed.");
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${JSON.stringify(failure.details)}`);
    }
    process.exitCode = 1;
  } else {
    if (desktopProfile) {
      console.log("Desktop CDP smoke OK");
      console.log(`- Profile: ${hybridDesktopProfile ? "1440x900 hybrid touch desktop" : "1440x900 mouse desktop"}`);
      console.log("- Mobile bridge initialization: skipped");
      console.log("- Consecutive tarot collection clicks: OK");
    } else {
      console.log("Mobile CDP smoke OK");
      console.log("- Viewport: 390x844");
      if (!focusAllFortunes) {
        console.log("- Primary CTA opens the destiny journey: OK");
        console.log("- Tarot touch: OK");
        console.log("- Bottom nav 5-tab tarot touch: OK");
        console.log("- Membership benefits CTA routes to the pass guide: OK");
      }
      console.log("- Initial audio/video elements: 0");
      if (focusAllFortunes) console.log("- Focused all-fortunes touch flow: OK");
    }
  }
} finally {
  if (cdp) {
    try {
      await send(cdp, "Browser.close");
    } catch {}
    try {
      cdp.close();
    } catch {}
  }
  await closeQuietly(server.instance);
  if (chrome) {
    chrome.kill();
    await waitForProcessExit(chrome, 5000);
  }
  if (userDataDir) {
    await removeTempDir(userDataDir);
  }
}

/* 🔴 무엇을 서빙할지는 명시적으로 정한다.
   예전에는 `dist/index.html 이 있으면 무조건 그것`이었고 신선도를 보지 않았다. dist 는
   gitignore 된 로컬 산출물이라 마지막 빌드 시점에 멈춰 있어서, 소스를 아무리 고쳐도 이 스모크는
   옛 셸을 검사하며 조용히 통과했다(실측 2026-08-15: 로컬 dist 에 data-pvw-cta-bypass 0건 /
   루트 21건, 1.47MB vs 2.65MB). 초록불인데 아무것도 안 지키는 상태였고, 그 탓에 실제 단언
   하나가 소스와 어긋난 것도 가려져 있었다(모바일에서 display:none 인 버튼을 검사하고 있었다).

   MOBILE_CDP_TARGET=source (기본) → 레포 루트. 방금 고친 소스를 검사한다.
   MOBILE_CDP_TARGET=dist         → 빌드 산출물. 낡았으면 통과시키지 않고 실패한다.
   docs/guard-integrity-2026-08-13.md G-8 참고. */
function resolveStaticRoot() {
  const requested = String(process.env.MOBILE_CDP_TARGET || "source").toLowerCase();
  if (requested !== "source" && requested !== "dist") {
    throw new Error(`MOBILE_CDP_TARGET must be "source" or "dist" (got "${requested}")`);
  }
  if (requested === "source") return root;

  const distIndex = path.join(root, "dist", "index.html");
  if (!fs.existsSync(distIndex)) {
    throw new Error("MOBILE_CDP_TARGET=dist but dist/index.html does not exist. Run a build first, or use MOBILE_CDP_TARGET=source.");
  }
  const builtAt = fs.statSync(distIndex).mtimeMs;
  const stale = newestSourceInput(builtAt);
  if (stale) {
    throw new Error(
      `dist/index.html is older than ${path.relative(root, stale)} - this run would test a stale shell.
` +
      "  Rebuild (npm run build:cf) or use MOBILE_CDP_TARGET=source."
    );
  }
  return path.join(root, "dist");
}

/* 산출물보다 새로운 소스 파일을 하나라도 찾으면 그 경로를 돌려준다(없으면 null).
   전부 훑을 필요는 없다 — 하나만 나와도 산출물은 낡은 것이다. */
function newestSourceInput(builtAt) {
  const roots = [path.join(root, "index.html"), path.join(root, "js"), path.join(root, "styles")];
  const stack = roots.filter((p) => fs.existsSync(p));
  while (stack.length) {
    const current = stack.pop();
    const stat = fs.statSync(current);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        if (entry === "node_modules" || entry.startsWith(".")) continue;
        stack.push(path.join(current, entry));
      }
      continue;
    }
    if (stat.mtimeMs > builtAt) return current;
  }
  return null;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error("Chrome or Edge executable was not found.");
  }
  return found;
}

function startStaticServer() {
  const instance = http.createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const rawPath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.normalize(path.join(staticRoot, rawPath));
    if (!filePath.startsWith(staticRoot)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        res.writeHead(404).end("Not found");
        return;
      }
      res.writeHead(200, { "content-type": contentType(filePath), "cache-control": "no-store" });
      res.end(buffer);
    });
  });
  return new Promise((resolve) => {
    instance.listen(0, "127.0.0.1", () => {
      resolve({ instance, port: instance.address().port });
    });
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
  }[ext] || "application/octet-stream";
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const instance = http.createServer();
    instance.on("error", reject);
    instance.listen(0, "127.0.0.1", () => {
      const address = instance.address();
      const port = typeof address === "object" && address ? address.port : 0;
      instance.close(() => {
        if (port > 0) resolve(port);
        else reject(new Error("Failed to reserve a Chrome debug port."));
      });
    });
  });
}

function startChrome(args) {
  return spawn(chromePath, args, {
    stdio: ["ignore", "ignore", "pipe"],
    windowsHide: true,
  });
}

function logDebug(message) {
  if (debugCdp) {
    console.warn(`[mobile-cdp-smoke] ${message}`);
  }
}

async function launchReadyChrome() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const debugPort = await getFreePort();
    const attemptUserDataDir = `${tempProfilePrefix}${Date.now()}-${attempt}`;
    const attemptChrome = startChrome([
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-features=DawnGraphite,DawnWebGPU",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${attemptUserDataDir}`,
      "about:blank",
    ]);
    let chromeStderr = "";
    attemptChrome.stderr?.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      chromeStderr = `${chromeStderr}${text}`.slice(-800);
      if (debugCdp && text.trim()) {
        console.warn(`[mobile-cdp-smoke] chrome stderr: ${text.trim()}`);
      }
    });
    let attemptExit = null;
    attemptChrome.once("exit", (code, signal) => {
      attemptExit = `code=${code} signal=${signal}`;
      logDebug(`chrome exited attempt=${attempt} ${attemptExit}`);
    });
    attemptChrome.once("error", (error) => {
      attemptExit = `error=${error.message}`;
      logDebug(`chrome launch error attempt=${attempt} ${attemptExit}`);
    });
    logDebug(`launch attempt=${attempt} pid=${attemptChrome.pid || "unknown"} port=${debugPort} profile=${attemptUserDataDir}`);

    try {
      await delay(100);
      await waitForChrome(debugPort);
      await delay(500);
      const attemptCdp = await createReadyCdp(debugPort);
      if (attempt > 1) {
        console.warn(`[mobile-cdp-smoke] Chrome launch recovered on attempt ${attempt}.`);
      }
      return { chrome: attemptChrome, cdp: attemptCdp, userDataDir: attemptUserDataDir };
    } catch (error) {
      const stderrTail = chromeStderr.trim() ? `; stderr=${chromeStderr.trim()}` : "";
      lastError = attemptExit ? new Error(`${error.message}; Chrome ${attemptExit}${stderrTail}`) : error;
      logDebug(`launch attempt=${attempt} failed: ${error.message}`);
      attemptChrome.kill();
      await waitForProcessExit(attemptChrome, 5000);
      await removeTempDir(attemptUserDataDir);
      await delay(1000 * attempt);
    }
  }
  throw new Error(`Failed to launch ready Chrome for mobile CDP smoke: ${lastError?.message || "unknown error"}`);
}

async function waitForChrome(port) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      const response = await requestCdpJson(port, "/json/version");
      if (response.ok) return;
    } catch {}
    await delay(150);
  }
  throw new Error("Timed out waiting for Chrome CDP endpoint.");
}

async function createCdpPage(port, url) {
  let response;
  try {
    response = await requestCdpJson(port, `/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  } catch (error) {
    const fallback = await findExistingCdpPage(port);
    if (fallback) return fallback;
    throw new Error(`Failed to create CDP page: ${error.message}`);
  }
  if (!response.ok) {
    const fallback = await findExistingCdpPage(port);
    if (fallback) return fallback;
    throw new Error(`Failed to create CDP page: HTTP ${response.status}`);
  }
  return response.data;
}

async function findExistingCdpPage(port) {
  try {
    const response = await requestCdpJson(port, "/json");
    if (!response.ok) return null;
    const targets = response.data;
    return targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl) || null;
  } catch {
    return null;
  }
}

function requestCdpJson(port, requestPath, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: requestPath,
        method: options.method || "GET",
        headers: { connection: "close" },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode || 0,
              data: body ? JSON.parse(body) : null,
            });
          } catch (error) {
            reject(new Error(`Invalid CDP JSON response: ${error.message}`));
          }
        });
      }
    );
    request.setTimeout(5000, () => {
      request.destroy(new Error(`CDP HTTP timeout: ${requestPath}`));
    });
    request.on("error", reject);
    request.end();
  });
}

async function createReadyCdp(port) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    let attemptCdp;
    try {
      const page = await createCdpPage(port, "about:blank");
      attemptCdp = await connectCdp(page.webSocketDebuggerUrl);
      await send(attemptCdp, "Page.enable");
      if (attempt > 1) {
        console.warn(`[mobile-cdp-smoke] CDP handshake recovered on attempt ${attempt}.`);
      }
      return attemptCdp;
    } catch (error) {
      lastError = error;
      try {
        attemptCdp?.close();
      } catch {}
      await delay(650 * attempt);
    }
  }
  try {
    return await createReadyCdpFromBrowserTarget(port);
  } catch (error) {
    lastError = error;
  }
  throw new Error(`Failed to initialize Chrome CDP after retries: ${lastError?.message || "unknown error"}`);
}

async function createReadyCdpFromBrowserTarget(port) {
  const version = await requestCdpJson(port, "/json/version");
  const browserSocket = version.data?.webSocketDebuggerUrl;
  if (!version.ok || !browserSocket) {
    throw new Error("Chrome CDP browser websocket is unavailable.");
  }
  const browserCdp = await connectCdp(browserSocket);
  try {
    const target = await send(browserCdp, "Target.createTarget", { url: "about:blank" });
    const attached = await send(browserCdp, "Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    });
    const pageCdp = browserCdp.withSession(attached.sessionId);
    await send(pageCdp, "Page.enable");
    console.warn("[mobile-cdp-smoke] CDP handshake used browser-target fallback.");
    return pageCdp;
  } catch (error) {
    try {
      browserCdp.close();
    } catch {}
    throw error;
  }
}

function connectCdp(webSocketUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(webSocketUrl);
    const pending = new Map();
    const events = new Map();
    let id = 0;
    let connected = false;

    ws.once("open", () => {
      connected = true;
      const client = {
        sessionId: null,
        withSession(sessionId) {
          return { ...client, sessionId };
        },
        send(method, params = {}) {
          const messageId = ++id;
          const responsePromise = new Promise((res, rej) => {
            pending.set(messageId, { resolve: res, reject: rej });
            setTimeout(() => {
              if (pending.has(messageId)) {
                pending.delete(messageId);
                rej(new Error(`CDP timeout: ${method}`));
              }
            }, 45000);
          });
          const sendTrace = `[cdp-send] ${messageId} ${method}`;
          if (process.env.MOBILE_CDP_DEBUG === "1") console.log(sendTrace);
          try {
            const message = { id: messageId, method, params };
            if (this.sessionId && !method.startsWith("Browser.") && !method.startsWith("Target.")) {
              message.sessionId = this.sessionId;
            }
            ws.send(JSON.stringify(message));
          } catch (error) {
            if (pending.has(messageId)) {
              pending.delete(messageId);
              throw error;
            }
          }
          return responsePromise;
        },
        waitForEvent(method, timeoutMs = 15000) {
          return new Promise((res, rej) => {
            const timer = setTimeout(() => {
              const list = events.get(method) || [];
              events.set(method, list.filter((entry) => entry.resolve !== res));
              rej(new Error(`CDP event timeout: ${method}`));
            }, timeoutMs);
            const list = events.get(method) || [];
            list.push({ resolve: (params) => {
              clearTimeout(timer);
              res(params);
            } });
            events.set(method, list);
          });
        },
        close() {
          ws.close();
        },
      };
      setTimeout(() => resolve(client), 120);
    });
    ws.once("error", (error) => {
      if (!connected) {
        reject(error);
        return;
      }
      rejectPending(pending, error);
    });
    ws.once("close", () => {
      const error = new Error("CDP WebSocket closed before command response.");
      if (!connected) {
        reject(error);
        return;
      }
      rejectPending(pending, error);
    });
    ws.on("message", (data) => {
      let payload = data;
      if (typeof payload !== "string") {
        if (Buffer.isBuffer(payload)) {
          payload = payload.toString("utf8");
        } else if (payload instanceof ArrayBuffer) {
          payload = new TextDecoder().decode(payload);
        } else if (ArrayBuffer.isView(payload)) {
          payload = new TextDecoder().decode(payload);
        } else {
          payload = String(payload || "");
        }
      }

      let message;
      try {
        message = JSON.parse(payload);
      } catch {
        return;
      }
      const messageTrace = `[cdp-message] id=${message.id || ""} method=${message.method || ""}`;
      if (process.env.MOBILE_CDP_DEBUG === "1") console.log(messageTrace);

      if (message.id && pending.has(message.id)) {
        const entry = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) entry.reject(new Error(message.error.message || "CDP error"));
        else entry.resolve(message.result);
        return;
      }
      if (message.method && events.has(message.method)) {
        const list = events.get(message.method);
        const entry = list.shift();
        if (entry) entry.resolve(message.params || {});
      }
    });
  });
}

function rejectPending(pending, error) {
  for (const [, entry] of pending) {
    entry.reject(error);
  }
  pending.clear();
}

async function send(cdp, method, params) {
  return cdp.send(method, params);
}

async function navigate(cdp, url) {
  const loaded = cdp.waitForEvent("Page.loadEventFired", 20000);
  await send(cdp, "Page.navigate", { url });
  await loaded;
}

async function evaluate(cdp, expression, label = "Runtime.evaluate") {
  let result;
  try {
    result = await send(cdp, "Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
  } catch (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  if (result.exceptionDetails) {
    throw new Error(`${label}: ${result.exceptionDetails.text || "Runtime evaluation failed"}`);
  }
  return result.result.value;
}

// 모바일 컬렉션 카드는 자리표시자 → 실제 카드로 지연 마운트된다. 마운트 순간을 놓치면
// querySelector 가 null 을 돌려주므로, 탭 전에 실제로 붙을 때까지 기다린다.
async function waitForSelector(cdp, selector, timeoutMs) {
  const deadline = Date.now() + (typeof timeoutMs === "number" ? timeoutMs : 10000);
  let box = null;
  for (;;) {
    box = await evaluate(cdp, selectorBoxExpression(selector), `wait for ${selector}`);
    if (box.exists && box.visible) return box;
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for selector: ${selector} ${JSON.stringify(box)}`);
    }
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `nudge ${selector}`);
    await delay(200);
  }
}

async function tapSelector(cdp, selector) {
  let box = await evaluate(cdp, selectorBoxExpression(selector));
  if (!box.exists || !box.visible) {
    throw new Error(`Cannot tap hidden selector: ${selector} ${JSON.stringify(box)}`);
  }
  if (!box.inViewport) {
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `scroll ${selector} into view`);
    await delay(160);
    box = await evaluate(cdp, selectorBoxExpression(selector));
  }
  if (!box.inViewport) {
    throw new Error(`Cannot tap selector outside viewport: ${selector} ${JSON.stringify(box)}`);
  }
  // load 직후엔 부팅 실드(.cd-boot-gate__veil 등)가 좌표를 덮고 있어 탭이 실드에 떨어진다.
  // getBoundingClientRect 는 오버레이를 뚫고 측정되므로, 좌표가 실제로 대상 요소에
  // 닿는지(elementFromPoint) 확인될 때까지 기다린 뒤 디스패치한다.
  let hit = null;
  const occlusionDeadline = Date.now() + 8000;
  for (;;) {
    hit = await evaluate(cdp, tapPointHitExpression(selector, box.centerX, box.centerY), `hit-test ${selector}`);
    if (hit.hits) break;
    if (Date.now() > occlusionDeadline) {
      throw new Error(`Tap point occluded for ${selector}: top element is ${hit.top || "(none)"}`);
    }
    await delay(120);
    box = await evaluate(cdp, selectorBoxExpression(selector));
    if (!box.exists || !box.visible || !box.inViewport) {
      throw new Error(`Selector became untappable while waiting: ${selector} ${JSON.stringify(box)}`);
    }
  }
  await send(cdp, "Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.centerX, y: box.centerY, radiusX: 3, radiusY: 3, force: 1 }],
  });
  await send(cdp, "Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

/* 손가락이 눌린 채 이동했다가 떼는 제스처. dx/dy 는 시작점 기준 총 이동량. */
async function swipeFromSelector(cdp, selector, dx, dy, steps = 8) {
  let box = await evaluate(cdp, selectorBoxExpression(selector));
  if (!box.exists || !box.visible) {
    throw new Error(`Cannot swipe hidden selector: ${selector} ${JSON.stringify(box)}`);
  }
  if (!box.inViewport) {
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `scroll ${selector} into view`);
    await delay(200);
    box = await evaluate(cdp, selectorBoxExpression(selector));
  }
  if (!box.inViewport) {
    throw new Error(`Cannot swipe selector outside viewport: ${selector} ${JSON.stringify(box)}`);
  }
  await send(cdp, "Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.centerX, y: box.centerY, radiusX: 3, radiusY: 3, force: 1 }],
  });
  for (let i = 1; i <= steps; i += 1) {
    await send(cdp, "Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: box.centerX + (dx * i) / steps,
        y: box.centerY + (dy * i) / steps,
        radiusX: 3,
        radiusY: 3,
        force: 1,
      }],
    });
    await delay(16);
  }
  await send(cdp, "Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/* 이동했다가 시작점으로 되돌아와 떼는 제스처. 좌표 임계값만 보는 판정기는 전부 이걸 탭으로 오인한다. */
async function swipeOutAndBackFromSelector(cdp, selector, dy, steps = 6) {
  let box = await evaluate(cdp, selectorBoxExpression(selector));
  if (!box.inViewport) {
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `scroll ${selector} into view`);
    await delay(200);
    box = await evaluate(cdp, selectorBoxExpression(selector));
  }
  if (!box.exists || !box.visible || !box.inViewport) {
    throw new Error(`Cannot swipe selector: ${selector} ${JSON.stringify(box)}`);
  }
  const point = (y) => ({
    type: "touchMove",
    touchPoints: [{ x: box.centerX, y, radiusX: 3, radiusY: 3, force: 1 }],
  });
  await send(cdp, "Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: box.centerX, y: box.centerY, radiusX: 3, radiusY: 3, force: 1 }],
  });
  for (let i = 1; i <= steps; i += 1) {
    await send(cdp, "Input.dispatchTouchEvent", point(box.centerY + (dy * i) / steps));
    await delay(16);
  }
  for (let i = steps - 1; i >= 0; i -= 1) {
    await send(cdp, "Input.dispatchTouchEvent", point(box.centerY + (dy * i) / steps));
    await delay(16);
  }
  await send(cdp, "Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

/* 오탭 여부를 판정할 상태 스냅샷. 하드 내비게이션이 가장 명확한 신호라 href 를 축으로 쓴다. */
function gestureProbeExpression() {
  return `(() => {
    const last = window.__cdLastMobileAction || null;
    return {
      href: location.href,
      lastAction: last ? String(last.action || '') + '@' + String(last.at || '') : '',
      now: Date.now(),
      arbiterPresent: !!window.__cdGesture,
      lastBlock: (window.__cdGesture && window.__cdGesture.lastBlock) ? window.__cdGesture.lastBlock() : null,
      blockLog: (window.__cdGesture && window.__cdGesture.blockLog) ? window.__cdGesture.blockLog() : []
    };
  })()`;
}

async function clickSelector(cdp, selector) {
  let box = await evaluate(cdp, selectorBoxExpression(selector));
  if (!box.exists || !box.visible) {
    throw new Error(`Cannot click hidden selector: ${selector} ${JSON.stringify(box)}`);
  }
  if (!box.inViewport) {
    await evaluate(cdp, scrollSelectorIntoViewExpression(selector), `scroll ${selector} into view`);
    await delay(120);
    box = await evaluate(cdp, selectorBoxExpression(selector));
  }
  if (!box.inViewport) {
    throw new Error(`Cannot click selector outside viewport: ${selector} ${JSON.stringify(box)}`);
  }
  let hit = null;
  const occlusionDeadline = Date.now() + 8000;
  for (;;) {
    hit = await evaluate(cdp, tapPointHitExpression(selector, box.centerX, box.centerY), `hit-test ${selector}`);
    if (hit.hits) break;
    if (Date.now() > occlusionDeadline) {
      throw new Error(`Click point occluded for ${selector}: top element is ${hit.top || "(none)"}`);
    }
    await delay(120);
    box = await evaluate(cdp, selectorBoxExpression(selector));
    if (!box.exists || !box.visible || !box.inViewport) {
      throw new Error(`Selector became unclickable while waiting: ${selector} ${JSON.stringify(box)}`);
    }
  }
  await evaluate(cdp, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return false;
    node.click();
    return true;
  })()`, `click ${selector}`);
}

function tapPointHitExpression(selector, x, y) {
  return `(() => {
    const el = document.elementFromPoint(${Number(x)}, ${Number(y)});
    if (!el) return { hits: false, top: null };
    const target = el.closest(${JSON.stringify(selector)});
    const label = el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (el.classList && el.classList.length ? '.' + Array.from(el.classList).slice(0, 3).join('.') : '');
    return { hits: !!target, top: label };
  })()`;
}

function scrollSelectorIntoViewExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return false;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    return true;
  })()`;
}

function selectorBoxExpression(selector) {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { exists: false, visible: false };
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return {
      exists: true,
      visible: r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height),
      centerX: Math.round(r.left + r.width / 2),
      centerY: Math.round(r.top + r.height / 2),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
      pointerEvents: style.pointerEvents
    };
  })()`;
}

function mobileStateExpression() {
  return `(() => {
    const home = document.querySelector('#inputPage');
    const nav = document.querySelector('#cdMobileBottomNav');
    const cta = document.querySelector('.moon-hero__cta--primary[href="/codedestiny-novel.html"]');
    const quickRail = document.querySelector('#cdMobileBottomNav .cd-mobile-bottom-nav__quick');
    const mainNavItems = Array.from(document.querySelectorAll('#cdMobileBottomNav .cd-mobile-bottom-nav__main [data-nav-key]'));
    const langDropdown = document.querySelector('#langDropdown');
    const langButtons = Array.from(document.querySelectorAll('#langDropdown [data-action="changeLanguage"]'));
    const membership = document.querySelector('#honeyMembershipMini');
    const overlays = ['#tilePvwOverlay', '#privacy-modal-overlay', '#goldenGrainChargeModalRoot'];
    const ctaRect = cta?.getBoundingClientRect();
    const navRect = nav?.getBoundingClientRect();
    const membershipRect = membership?.getBoundingClientRect();
    const quickStyle = quickRail ? getComputedStyle(quickRail) : null;
    const langStyle = langDropdown ? getComputedStyle(langDropdown) : null;
    const visibleLangButtons = langButtons.filter((node) => {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    return {
      viewportWidth: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      noHorizontalOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
      responsiveHomeVisible: !!home && getComputedStyle(home).display !== 'none',
      primaryCtaInFirstView: !!ctaRect && ctaRect.top >= 0 && ctaRect.bottom <= innerHeight,
      bottomNavVisible: !!navRect && navRect.bottom <= innerHeight + 2 && navRect.top < innerHeight,
      bottomNavMainCount: mainNavItems.length,
      bottomNavMainKeys: mainNavItems.map((node) => node.getAttribute('data-nav-key')),
      bottomNavQuickHidden: !!quickRail && (quickRail.hidden || quickStyle.display === 'none' || quickStyle.visibility === 'hidden'),
      languageDropdownClosed: !!langDropdown && langDropdown.getAttribute('aria-hidden') === 'true' && langStyle.display === 'none' && visibleLangButtons.length === 0,
      membershipBelowPrimaryCta: !!membershipRect && !!ctaRect && membershipRect.top >= ctaRect.bottom,
      membershipRect: membershipRect ? { top: Math.round(membershipRect.top), bottom: Math.round(membershipRect.bottom) } : null,
      audioVideoCount: document.querySelectorAll('audio,video').length,
      bodyClass: document.body.className,
      navRect: navRect ? { top: Math.round(navRect.top), bottom: Math.round(navRect.bottom), height: Math.round(navRect.height) } : null,
      navStyle: nav ? { display: getComputedStyle(nav).display, visibility: getComputedStyle(nav).visibility, opacity: getComputedStyle(nav).opacity, transform: getComputedStyle(nav).transform } : null,
      overlayDetails: overlays.map((selector) => {
        const node = document.querySelector(selector);
        if (!node) return { selector, exists: false };
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          selector,
          exists: true,
          ariaHidden: node.getAttribute('aria-hidden'),
          classes: node.className,
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          rect: { width: Math.round(r.width), height: Math.round(r.height), top: Math.round(r.top), bottom: Math.round(r.bottom) }
        };
      }),
      hiddenOverlaysPointerSafe: overlays.every((selector) => {
        const node = document.querySelector(selector);
        if (!node) return true;
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        const visuallyEmpty = r.width === 0 || r.height === 0 || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0;
        const hidden = visuallyEmpty || node.getAttribute('aria-hidden') === 'true' || (!node.classList.contains('pvw-open') && !node.classList.contains('golden-grain-modal--open'));
        return hidden || style.pointerEvents === 'none';
      })
    };
  })()`;
}

function modalStateExpression() {
  return `(() => {
    const preview = document.querySelector('#tilePvwOverlay');
    const tarot = document.querySelector('#tarotModalOverlay, #tarotModal');
    return {
      tilePreviewOpen: !!preview && (preview.classList.contains('pvw-open') || preview.getAttribute('aria-hidden') === 'false'),
      tarotModalVisible: !!tarot && getComputedStyle(tarot).display !== 'none' && getComputedStyle(tarot).visibility !== 'hidden'
    };
  })()`;
}

function assert(pass, name, details) {
  if (pass) {
    if (debugCdp) logDebug(`PASS ${name}`);
    return;
  }
  failures.push({ name, details });
  // 이 하네스는 숨은 요소를 탭하려다 throw 하면 그때까지 쌓인 실패 목록을 통째로 잃는다.
  // 디버그 실행에서는 발생 즉시 남겨 어디서 무엇이 깨졌는지 추적할 수 있게 한다.
  if (debugCdp) logDebug(`FAIL ${name} :: ${JSON.stringify(details)}`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function closeQuietly(serverInstance) {
  return new Promise((resolve) => {
    serverInstance.close(() => resolve());
  });
}

function waitForProcessExit(child, timeoutMs) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode) {
      resolve();
      return;
    }
    if (typeof child.once !== "function") {
      setTimeout(resolve, Math.min(timeoutMs, 1000));
      return;
    }
    const timer = setTimeout(resolve, timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

async function removeTempDir(dir) {
  if (!dir.startsWith(tempProfilePrefix)) {
    return;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 150 });
      return;
    } catch (error) {
      if (attempt === 5) {
        if (process.env.MOBILE_CDP_STRICT_CLEANUP === "1") {
          console.warn(`[mobile-cdp-smoke] cleanup warning: ${error.message}`);
        }
        return;
      }
      await delay(250);
    }
  }
}
