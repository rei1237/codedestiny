---
name: mobile-preview
description: Launch the dev server and drive the mobile main screen (static index.html) in a real Chromium at a 390px viewport to check UI/UX live — screenshots, theme toggle (연이/네오), contrast, scroll. Use when verifying any change to index.html, the mobile hub (#cdMobileDestinyHub), the bottom nav (#cdMobileBottomNav), or the pig/neo dual theme.
---

# Mobile Preview (연이/네오 모바일 메인 실시간 확인)

이 프로젝트의 **모바일 메인 화면은 정적 `index.html`**(28k+행, `/`에서 Next 라우터 우회)이다.
`app/page.tsx`가 아니라 이 파일과 그 미러(`public/index.html`)가 실제 랜딩이다.

## 핵심 주의 (반드시 지킬 것)

1. **정적 미러 동기화**: `npm run dev`(Next dev)는 **`public/index.html`(정적 미러)** 를 서빙한다.
   루트 `index.html`을 수정해도 `npm run sync:public`을 돌리기 전엔 브라우저에 반영되지 않는다.
   → index.html 편집 후에는 **항상 `npm run sync:public` 먼저** 실행하고 확인한다.
   (부작용: sync는 루트/미러 파일에 `?v=build-<hash>` 캐시버스트를 다시 써서 diff에 해시 변경이 섞인다. 정상이다.)
2. **모바일 조건**: 밝은(연이)/다크(네오) 모드 스타일과 모바일 허브는 뷰포트 `max-width:768~1024px`
   또는 `(hover:none) and (pointer:coarse)`, 그리고 모바일 UA에서만 활성화된다.
   → 반드시 **모바일 뷰포트 + iPhone UA**로 띄운다. 데스크톱 창으로는 허브가 안 보인다.
3. **테마 상태**: `localStorage['fortuneThemeModeStateV1']` = `'pig'`(연이) | `'neo'`(네오).
   토글 UI는 하단 네비의 `button[data-theme-mode="pig"|"neo"]`. body 클래스 `neo-mode` 유무가 진실.

## 1) 개발 서버 실행

```bash
npm run dev            # Next dev(:3000) + local-auth API(:8790). 백그라운드로 띄운다.
```
`http://localhost:3000/` 가 200이면 준비 완료. (이미 떠 있으면 재실행 불필요.)

## 2) index.html 수정 반영

```bash
npm run sync:public    # 루트 index.html → public/index.html 동기화 (편집 후 필수)
```

## 3) 모바일 뷰포트로 구동 + 스크린샷 (puppeteer-core)

`playwright`는 미설치지만 **`puppeteer-core`**와 Playwright 크로미움 캐시가 있다.
크로미움 경로: `C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe`
(버전 폴더가 다르면 `find ~/AppData/Local/ms-playwright -name chrome.exe`로 확인.)

아래 스크립트를 `scratchpad`에 저장해 실행한다(레포에 커밋하지 말 것):

```js
// preview.cjs — node preview.cjs
const puppeteer = require('puppeteer-core');
const OUT = process.env.OUT || '.';
const CHROME = 'C:/Users/user/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';
const MODE = process.env.MODE || 'pig'; // 'pig' | 'neo'
(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  await p.evaluateOnNewDocument((m) => { try { localStorage.setItem('fortuneThemeModeStateV1', m); } catch (_) {} }, MODE);
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));
  // 진단: 대비/스크롤/테마
  const d = await p.evaluate(() => {
    const cs = s => { const el = document.querySelector(s); return el ? getComputedStyle(el).color : null; };
    return {
      neoMode: document.body.classList.contains('neo-mode'),
      scrollLock: document.body.getAttribute('data-cd-scroll-lock'),
      title: cs('#cdMobileDestinyHub .cd-mobile-hub__section-title'),
      cardStrong: cs('#mobileRecommendedCards .cd-mobile-hub__card strong'),
      navItem: cs('#cdMobileBottomNav .cd-mobile-bottom-nav__item'),
    };
  });
  console.log('DIAG', JSON.stringify(d));
  await p.screenshot({ path: OUT + `/preview-${MODE}-top.png` });
  await p.evaluate(() => window.scrollTo(0, 560)); await new Promise(r => setTimeout(r, 400));
  console.log('scrollY', await p.evaluate(() => window.scrollY)); // >0 이면 스크롤 정상
  await p.screenshot({ path: OUT + `/preview-${MODE}-mid.png` });
  await b.close();
})();
```

실행 예:
```bash
OUT="<scratchpad 절대경로>" MODE=pig node preview.cjs   # 연이(밝은 꽃)
OUT="<scratchpad 절대경로>" MODE=neo node preview.cjs   # 네오(달빛)
```
그다음 Read 툴로 PNG를 열어 **육안 확인**한다(스크린샷을 보지 않으면 실행한 게 아니다).

## 확인 체크리스트

- 연이: 페이지 배경 아이보리/살구 + 벚꽃잎 패턴, 카드/네비/토글 텍스트가 진한 브라운으로 또렷(대비 AA≥4.5:1),
  kicker=체리핑크, 1순위 CTA=코랄→핑크, 활성 칩/네비=허니 하이라이트.
- 네오: 딥네이비 + 별빛, 시안/퍼플/실버 강조 — **연이 변경이 네오에 영향 없어야 함**(모든 밝은-모드 규칙은 `body:not(.neo-mode)` 스코프).
- 스크롤: `scrollY>0`, `data-cd-scroll-lock`이 `null`(모달 없을 때). 잠금이 남으면 `window.__cdBodyScrollLockState()`로 원인 key 확인.

## 관련 파일

- `index.html` — 유일 소스. 밝은 모드 권위 레이어: `<style id="cd-yeoni-bright-flower-v20260704">`.
  전환 트랜지션: `cd-theme-crossfade-v20260704`. 스크롤 누수 방어: `cd-scroll-lock-leak-guard-v20260704`.
- 밝은 모드 특정도 주의: 기존 게이트 규칙이 `html.cd-mobile-runtime.mobile-safe-render ... #cdMobileDestinyHub[data-marker*="mobile-flower-readable"]`로 특정도가 높다.
  이를 이기려면 허브는 조상 `#inputPage`(ID 2개), 스팟라이트/카테고리 내부 텍스트는 `#inputPage #cdMobileDestinyHub #mobileRecommendedCards`(ID 3개)처럼 ID 수로 눌러야 한다.
