/**
 * 홈에서 **특정 UI 까지 실제로 도달하는 절차**. perf:interaction 과 perf:tap-cost 가 공유한다.
 *
 * 왜 공유하는가 — 두 도구가 같은 요소를 재는데 도달 절차가 갈라지면, 한쪽에서만 "요소 없음"이
 * 나면서 그 원인이 도구인지 코드인지 알 수 없게 된다. 절차는 한 곳에만 둔다.
 *
 * 🔴 이 파일의 절차는 **셸 자신의 진입점만 쓴다.** 오버레이를 직접 만들거나 내부 함수
 * (`__cdMountMobileCardForIntent` 등)를 부르지 않는다 — 그것들이 바로 측정 대상이라,
 * 도구가 부르면 재려던 경로를 도구가 대신 실행해 버린다.
 *
 * 실측 근거 (2026-08-16, 로컬 dist, 390×844 · CPU 4x):
 *   - settle 직후 `.tarot-tile` 은 **0개**다. 컬렉션이 접혀 있고 카드가 지연 마운트라 그렇다.
 *   - '모든 운세' 오버레이를 열면 `.cd-mobile-collection-tab` 9개가 생긴다(그전에는 0개).
 *   - `tarotCollection` 탭을 누르면 타일 6개 + 플레이스홀더 6개가 된다.
 *   - 열린 컬렉션을 스크롤해야 나머지가 마운트되고, 그때 `a.tarot-tile--mindscan` 이 나타난다
 *     (className 이 필드 데이터와 정확히 같다: `tarot-tile tarot-tile--mindscan notranslate MobileFeatureCard`).
 */

/** '모든 운세' 풀스크린 컬렉션 오버레이를 연다. 이게 열려야 컬렉션 탭 칩이 존재한다. */
export async function openAllCollections(page) {
  await page.locator("#cdMobileBottomNav [data-nav-key='fortunes']").first().click({ timeout: 2500 });
  await page.waitForSelector(".cd-mobile-collection-tab[data-collection-id]", { timeout: 4000 });
  // 오버레이 등장이 만든 시프트를 뒤따르는 측정에 귀속시키지 않는다.
  await page.waitForTimeout(400);
}

/** 오버레이가 열린 상태에서 특정 컬렉션 탭을 누른다. */
export async function openCollectionTab(page, collectionId) {
  await page
    .locator(`.cd-mobile-collection-tab[data-collection-id='${collectionId}']`)
    .first()
    .click({ timeout: 2500 });
  await page.waitForTimeout(600);
}

/**
 * 지연 마운트된 카드가 나타날 때까지 **열린 컬렉션을** 스크롤한다.
 * 🔴 스크롤 대상을 컬렉션 자신으로 먼저 잡는다 — 오버레이가 열리면 body 는 잠겨 있어
 *    document 를 굴려 봐야 아무 일도 일어나지 않는다.
 */
export async function scrollUntilMounted(page, selector, { collectionId = "", steps = 14 } = {}) {
  for (let i = 0; i < steps; i += 1) {
    if (await page.evaluate((sel) => !!document.querySelector(sel), selector)) return true;
    await page.evaluate((id) => {
      const collection = id ? document.getElementById(id) : null;
      const scroller =
        collection && collection.scrollHeight > collection.clientHeight ? collection : document.scrollingElement;
      scroller.scrollBy(0, Math.max(300, window.innerHeight * 0.8));
    }, collectionId);
    await page.waitForTimeout(350);
  }
  return page.evaluate((sel) => !!document.querySelector(sel), selector);
}

/**
 * 필드 INP 3위(`a.tarot-tile--mindscan`, 1,224ms)까지 도달한다.
 * 세 단계(오버레이 → 타로 탭 → 스크롤)를 전부 거쳐야 그 타일이 DOM 에 존재한다.
 */
export async function reachMindscanTile(page) {
  await openAllCollections(page);
  await openCollectionTab(page, "tarotCollection");
  const mounted = await scrollUntilMounted(page, "a.tarot-tile--mindscan", { collectionId: "tarotCollection" });
  if (!mounted) throw new Error("mindscan 타일이 스크롤 뒤에도 마운트되지 않았다 — 지연 마운트 경로가 바뀌었다");
}

/** 오버레이를 닫아 다음 측정이 깨끗한 화면에서 시작하게 한다. */
export async function closeOverlays(page) {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);
}

/**
 * 대상을 뷰포트 안으로 가져온다.
 *
 * 🔴 두 도구 모두 이게 없어서 틀린 값을 내고 있었다 (2026-08-16 실측):
 *   - perf:interaction — `.tarot-collection__header` 는 **y=9574**(폴드 한참 아래)다.
 *     playwright 의 `.click()` 이 자동 스크롤을 하긴 하는데, CPU 4배 스로틀 + 부드러운 스크롤이라
 *     1,200ms 타임아웃 안에 못 끝내고 **매번 "클릭 타임아웃"으로 실패**했다. 느려서가 아니라
 *     화면 밖이라서였다.
 *   - perf:tap-cost — 같은 이유로 좌표(y≈9594)가 뷰포트(844px) 밖이라, **컬렉션 헤더가 아니라
 *     빈 곳을 때리고 있었다.** 그런데도 document 전역 리스너가 도느라 숫자가 그럴듯하게 나와
 *     "대조군"으로 읽힐 뻔했다. 대조군이 대조군이 아니면 회귀를 못 잡는다.
 *
 * 스크롤 자체는 측정 대상이 아니므로 시간을 재지 않는다. 안정될 때까지 기다렸다가 넘긴다.
 */
export async function scrollIntoView(page, selector) {
  /* 🔴 playwright 의 `scrollIntoViewIfNeeded()` 를 쓰지 않는다 — 그건 요소를 "겨우 보이는" 위치,
     즉 화면 맨 아래 가장자리에 둔다. 이 홈에는 `position:fixed` 하단 내비(#cdMobileBottomNav)가
     거기 깔려 있어서 요소가 **가려지고**, playwright 는 "이벤트를 받을 수 있을 때까지" 기다리다
     타임아웃한다. 실제로 이것 때문에 '컬렉션 펼치기'가 계속 실패했다.
     `block:'center'` 로 화면 한가운데에 놓으면 고정 바 어느 것도 덮지 않는다.
     🔴 `behavior:'smooth'` 도 쓰지 않는다 — 스크롤이 끝나기 전에 좌표를 읽게 된다. */
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }, selector);
  // 지연 이미지 마운트로 레이아웃이 한 번 더 움직일 수 있다 — 멎은 뒤에 재도록 한 박자 준다.
  await page.waitForTimeout(500);
}
