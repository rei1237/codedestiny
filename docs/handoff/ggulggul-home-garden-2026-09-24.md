---
status: active
updated: 2026-09-24
next: 데스크탑 `/?action=cdOpenAllFortunes` scrollY 0 결함을 고쳤다. 모바일·데스크탑·하이브리드 CDP 스모크는 모두 exit 0. 영냥이 밴드 유입 관찰은 계속한다
---
# 꿀꿀 운세 홈 "연이의 꽃정원" 개편 (2026-09-24)

다음 세션 첫 문장: "docs/handoff/ggulggul-home-garden-2026-09-24.md 를 읽고 남은 후속 과제부터 이어가 줘."

## 무엇을 바꿨나
- 히어로: 주 CTA는 하나만 둔다. "연이와 무료 세 장 펼치기"(/today/#daily-tarot)이다. 영냥이 사주는 밑줄 보조 링크로 내렸다. 연이를 키우고(모바일 150px, 데스크탑 최대 240px) 말풍선(`[data-cdh-bubble]`)을 달았다. 말풍선이나 연이를 탭하면 대사 4줄이 순환한다(`js/core/home-funnel.js`).
- 첫 흐름: 퀵 서비스(연이 한마디 포함) → 이용권 → 접힌 "연이의 정원 더 둘러보기"(`<details id="cdhMore">`) → 한 줄 버그 제보 → 가이드.
- 접힘 안: 영냥이 소개 밴드, 오늘의 운세, 다이어리, 고민 고르기, 전체 검색, 컬렉션, 게이트웨이, 대표 상담, 전문가, 카카오 공유, 이야기·음악, 후기. 삭제한 것은 없고 DOM도 그대로다.
- 해시가 접힘 안을 가리키면(`#cdhFeatured`, `#services`, `#cdFinder` 등) `route()`가 `#cdhMore`를 연다.
- 이용권: `scripts/design/build-home-funnel.mjs`의 `vars.pass`를 새 `.cdh-pass` 마크업으로 바꿨다. `CURRENT_PASS_PLANS` 데이터를 그대로 쓴다. 가드 필수 문구 두 개는 유지했다. 연이 마스코트 `public/images/home/yeoni-pass-mascot-{240,480}.webp`는 codex-image로 생성했다.
- 영냥이 밴드 인젝터(index.html `cd-soulcat-navigation-template`): 주입 위치를 `#cdhQuickSlot` 뒤에서 `#cdhMore .cdh-more__body` 맨 앞으로 옮겼다. 접힘이 없으면 예전 위치로 폴백한다.
- 모바일 문서 높이: 15,069px에서 약 7,900px로 줄었다(실측, 가이드 포함).

## 가드
- `verify-home-funnel.cjs`: 접힘 초기 상태, 이용권 대비(두 테마), 딥링크로 접힘이 열리는지를 단언한다.
- 다이어리 순서 가드(`luck-sync-diary-planner`)에 맞춰 다이어리는 오늘의 운세 바로 뒤에 둔다.

## 후속 세션에서 끝낸 것 (2026-09-24)
- 무료 사주 인라인 폼 진입점(`ef0810191`): 사용자 결정에 따라 퀵 서비스 사주 카드에 `data-cdh-free`를 달았다. 카드는 원래 `data-action="cdOneStepFreeSajuEntry"`라 공용 디스패처가 실행한다. `home-funnel.js`의 캡처 핸들러는 `data-action`이 있으면 건너뛴다(두 번 호출 방지, 실측 1회). `verify-mobile-runtime-readiness.mjs`의 단언은 "히어로 주 CTA 존재" 하나와 "무료 진입점 존재" 하나로 나눴다. `seo-search-browser-check.mjs` 로케이터도 함께 바꿨다. `verify-home-funnel.cjs`는 member 단계까지 exit 0이다.
- 새 ko 문구 번역(`a01e000fb`): `i18n/authored/shellCopy-10.json`에 `home.gardenCopy.*` 17키를 넣었고, `shellCopy-09`의 `home.searchEntry.lead`는 새 문구로 갱신했다. 말풍선은 줄을 바꿀 때 `data-cd-trans`와 `data-cd-origin-text`를 같이 옮긴다. 그래서 언어를 전환하면 지금 보이는 줄이 번역되거나 복원된다(en→ko→ja 실측). `.cdh-says span`은 `.cdh-says>span`으로 좁혔다. 이렇게 해야 이름·대사를 감싼 안쪽 span이 말풍선 배경을 받지 않는다. 사전이 바뀌면 앱 라우트 서명도 바뀌므로 sitemap 원장·xml을 같이 커밋했다.

- 모바일 CDP 스모크 계약 갱신(`5444ea7bf`): 히어로 주 CTA는 `.cdh-copy .cdh-primary`이다. 스모크는 href를 읽어서 탭 뒤에 그 경로·해시로 실제 이동했는지 잰다. 목적지가 App Router라 정적 트리에서는 404지만, 잴 대상은 `location`이다. 운세 카드와 `#cdHomeExpandToggle`이 닫힌 `#cdhMore` 안으로 들어가서 탭이 전부 가려졌다. 그래서 `expandHomeFolds()`(정원 summary → 모두 펼치기)를 추가해 제스처 4블록·토템·타로 탭·이용권 블록에 넣었다. 실측 결과 제스처 4개, 토템, 히어로 CTA 2개, 타로 탭, 모든 운세 개요 8개가 PASS다. 남은 실패는 아래 🔴 결함 하나이고, 스모크는 그 결함에서 멈춘다. 그 뒤 구간(무료/유료 타일 시트, 이용권 등)은 아직 미검증이다.

- "모든 운세" 빈 컬렉션 회귀 수정(`01f2cbc61`): 오버레이가 컬렉션으로 들어갈 때(`switchCollection`) `#cdhMore`를 열고, 닫을 때 스크롤을 복원하기 전에 자기가 연 경우만 되접는다(`openedGardenForOverlay`, 기존 `expandedHomeForOverlay`와 같은 짝). 개요 모드에서는 열지 않는다. 오버레이 코드의 성능 주석대로 개요는 홈 DOM을 쓰지 않기 때문이다. 412px playwright 실측 결과: 개요에서는 정원이 닫힌 상태이고, 타로에서는 타일 6/6이 보이며 히트는 `tarotCollection`이 받는다. 닫으면 정원이 다시 닫힌다.
  - 🔴 함정: `home-funnel.js`의 구독자(`move('.feature-card-grid', … 'inputPage' …)`)는 `slot.contains(node)` 때문에 늘 no-op이다. 이것을 "고쳐서" 그리드를 `#inputPage`로 옮기면 더 나빠진다. `home-funnel.css`가 `#inputPage > .feature-card-grid`를 숨기고, 오버레이 CSS(index.html `body.cd-all-fortunes-fullscreen #cdhCollections …`)는 그리드가 `#cdhCollections` 안에 있다고 가정하기 때문이다(실측 후 되돌림).
- 스모크 이용권 블록 계약 갱신(이 커밋 다음): 옛 `#honeyMembershipMini`는 2026-09-08 홈 재조립(`ffcc3626a`) 때부터 홈에서 `display:none`이다. 그래서 대상을 `.cdh-pass .cdh-pass__btn`으로 바꿨다. 계약은 그대로다: 보이는 CTA가 `/points/` 안내로 가고 결제 `data-action`이 없어야 한다. 모바일 CDP 스모크 결과는 exit 0, PASS 49, FAIL 0이다.
- 데스크탑 CDP 스모크 판정·계약 갱신(이 커밋): 제품 결함이 아니다. 스모크가 08-20에 의도적으로 바뀐 두 계약을 따라가지 못한 것이다. 옛 index.html을 이분 탐색해 경계 커밋을 찾았다(1440px playwright 실측). (1) `467d0cc53`(08-20): 8개 `fg-group`에 `data-cd-home-secondary`를 달아 데스크탑에서도 "모두 펼치기" 뒤로 접었다. 데스크탑 진입 경로에는 `__cdExpandHome()`을 붙였다. 09-24부터는 정원 접힘 안이라 두 겹이다. (2) `9f7648605`(08-20): 커밋 메시지에 "하단 네비게이션을 데스크탑에도 노출"이라고 적혀 있다. 그래서 08-04 단언 "desktop keeps the mobile bottom nav out of layout"은 그때부터 낡았다(토글 실패에 가려 보이지 않았다). 고친 것: 데스크탑 분기는 `expandHomeFolds(cdp, clickSelector)`로 접힘을 마우스 클릭으로 연다(`press` 인자를 추가했고 기본값은 모바일과 같은 `tapSelector`다). 하단 탭 단언은 `display !== "none"`으로 바꿨다. 브리지 격리 단언 4개는 그대로다. 결과: `--desktop`·`--hybrid-desktop`은 각각 exit 0, PASS 7이다. 모바일은 exit 0, PASS 49, FAIL 0으로 회귀가 없다.

## 후속 세션에서 끝낸 것 (계속)
- 데스크탑 `/?action=cdOpenAllFortunes` scrollY 0 판정·수정: 원인은 `window.cdOpenAllFortunes`의 데스크톱 폴백이 `__cdExpandHome()`(옛 `cd-home-expanded` 접기)만 열고 `<details id="cdhMore">`는 열지 않은 것이다. `#tarotCollection`은 `move('#featureBegin','cdhCollections')`로 `#cdhCollections`(`#cdhMore` 안)로 옮겨진 상태라, 닫힌 `<details>` 안에서 `.cdh-more__body{display:grid}`가 UA의 닫힘 은닉을 이겨 `getBoundingClientRect`는 높이(408px)를 주지만 `document.documentElement.scrollHeight`에는 반영되지 않는다(playwright 실측: rect.top 7747 > scrollHeight 6855) — `scrollIntoView`가 존재하지 않는 위치로 스크롤을 시도해 무반응이었다. 판정: 제품 결함(사용자가 컬렉션을 못 본다). 고침: `cdOpenAllFortunes`에 `ensureGardenOpen()`과 같은 `more.open = true`를 추가했다(index.html:14249). 수정 후 playwright 실측: `cdhMoreOpen: true`, `scrollY: 7683`, `#tarotCollection` rect.top 365px(뷰포트 안). `verify-mobile-cdp-smoke.mjs --desktop`은 그대로 OK.
- 🔴 함정: index.html 수정은 `/`·`/ggulggul/`·`/en/`·`/ja/` 등 셸 라우트의 사이트맵 서명을 바꾼다. `npm run sitemap:generate`를 같은 커밋에 담지 않으면 `verify:sitemap-drift`가 막는다(실측: index.html만 stash하면 드리프트가 사라짐 → 원인이 이 편집임을 확인).

## 기존 결함 (보고만, 미수정)
- 오버레이의 `ensureHomeExpanded()`는 `38c6ecdde`(09-11) 이후 호출부가 0개인 죽은 함수다. 위 `home-funnel.js` no-op 구독자도 같은 성격이다(삭제는 별도 변경).
- `verify-mobile-runtime-readiness.mjs`에서 이번 변경과 무관한 3건이 실패한다: 하단 탭 메인 슬롯, 퀵 카테고리, 결제 시트. 변경 전 HEAD 스크립트로 돌려도 같은 3건이 실패한다.
- /en/·/ja/ 홈에 기존 한국어 리프가 남아 있다. 이용권 등급명·등급 줄·가격(원), 히어로 연이 alt("연꽃을 단 꽃돼지 연이"), 접힘 안의 적중 기록·공유 카드·일간/띠 링크, 헤더 aria-label이다. 모두 개편 전부터 한국어였다(범위 밖).
- neo 테마에서 연이 틀이 원형이 아니라 16px 라운드 사각형이다(`html.neo-mode #honeypigLogo{border-radius:16px!important}`). 의도된 규칙인지 확인이 필요하다.
- neo 테마의 "두 대통령 적중 기록 원문 보기" summary 대비가 약 1.85:1이다.
- neo 테마 1280px에서 하단 떠 있는 탭바 아이콘 색(112,68,92)이 배경 대비 약 2.34:1이다(시각 판정, 이번 변경과 닿는 CSS 없음).
- `npm run sync:public`이 윈도우에서 가끔 EPERM/UNKNOWN(파일 잠금)으로 실패한다. 재실행하면 수렴한다.

## 후속 과제
- 영냥이 밴드 노출이 줄었다. 영냥이 유입 지표를 1~2주 관찰하고, 필요하면 이용권 뒤로 꺼낸다.
