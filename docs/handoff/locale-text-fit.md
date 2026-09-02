---
status: active
updated: 2026-09-03
next: PR-2 머지 후 P1 중 하나를 고른다 — 우선순위는 normalizePaymentOverlayBody(한글 정규식 8개로만 중복 머리줄 판정) > 셸 홈 line-clamp/spill 23건 > PointsClient 하드코딩 14곳
---

# 로케일별 텍스트 길이 UI 파손

## 왜

셸 언어 스위처는 **12개 로케일**을 노출하는데 사전 렌더 셸은 4개뿐이고, 나머지 7개는 한국어로
레이아웃된 셸에 더 긴 문자열을 런타임 치환한다. 완충 장치가 0건이다 —
`git grep ":lang(|\[lang=|html\[lang"` → 0. 기존 i18n 가드는 키·금액·잔존 한글만 보고 **기하를 재지 않는다.**

## 지금 상태

- 브랜치 `worktree-locale-text-fit`. PR-1(계측기 + 정적 가드 + 리포트)·PR-2(P0 3건 수정) 모두 미머지.
- PR-2 에서 닫힌 것: 탭 라벨 i18n 키 재조준 · `.cd-direct-payment-cardhead` 줄바꿈 · `.saju-loader-card` 높이 제한.
  가드의 `ACCEPTED_BUDGET` 은 비었고, 결제 헤드 예외는 `needs` 로 전제(flex-wrap)를 검사한다.

## 남은 진단

| 우선순위 | 위치 | 문제 | 재현 로케일 | 수정 방향 |
|---|---|---|---|---|
| P1 | [index.html:24907](index.html#L24907) `normalizePaymentOverlayBody` | 중복 머리줄 제거가 **한글 정규식 8개**로만 판정 → 비한국어에선 중복 문장이 남는다 | ko 외 11개 전부 | 문자열 매칭 대신 i18n 키 동일성으로 |
| P1 | 셸 홈 `/` (dist, 360x800) | ko 대비 신규 23건 — `strong.notranslate` 음악 소개 clip(en·ja·zh·zh-TW·vi·hi·nl·ms), `p.cd-feedback__reward` spill(ja·de), 쿠키 동의 제목·`div.fortune-gateway__entry-copy` spill(ja·zh) | 표시 로케일 참조 | clamp 2→3 또는 폭 확보. 개별 판정 필요 |
| P1 | [app/points/PointsClient.tsx:805](app/points/PointsClient.tsx#L805) | 카피 테이블 리터럴이 ko·en 뿐, JSX 한국어 하드코딩 14곳 | 9개 로케일 | 불변조건 위반 — 키로 추출 |
| P2 | [js/core/checkout-entry.js:121](js/core/checkout-entry.js#L121) 상품권 칩 | 모달 내 유일한 `nowrap+ellipsis`. 현재 여유 46px | 향후 de·nl | 가드 폭 예산에 등재됨 |
| P2 | 셸 탭바 | App Router 쪽과 달리 `text-overflow` 가 없어, 예산이 뚫리면 말줄임 없이 하드 클립 | — | 안전망으로 `text-overflow:ellipsis` 추가 가능 |
| P2 | ko 자체 파손 | `div#cdSigGrid` spill 1137px, `span.tsp-name` 하드 클립 22px, 모바일 헤더 검색 placeholder 말줄임 17px | ko 포함 전 로케일 | 로케일 무관 기존 결함 |

## 정본

- 기하 계측: [scripts/measure-locale-text-fit.mjs](scripts/measure-locale-text-fit.mjs) — 로케일별 수치 정본
- 정적 가드: [scripts/verify-locale-text-fit.mjs](scripts/verify-locale-text-fit.mjs) — 근사 모델이라 **판정 정본이 아니다**(프록시)

## 함정

- 🔴 **사전 값 ≠ 렌더 값.** 셸은 탭 라벨에 사전보다 짧은 문자열을 쓴다 — 탭 전용 키
  `shell.cdMobileBottomNav.cdMobileBottomNavMain.*` 가 그 자리다(es "4 Pilares"). 카드·링크용
  `home.nav.*` 를 탭에 쓰면 안 들어간다. 사전만 재서 판정하면 로케일을 오판한다.
- 🔴 **두 탭바의 칸은 58px 로 같은데 글꼴이 다르다** — 셸 10.36px(`0.6875rem`, 루트 폰트 유동),
  App Router 11px. 즉 **같은 문자열이 App Router 에서 먼저 잘린다.** 셸만 재고 통과라 하면 안 된다.
- 🔴 가드의 `TAB_LABEL_BUDGET_PX` 를 11px 로 올리지 말 것 — 근사 모델 오차대(±3.6px)가 칸 폭보다
  먼저 터져 en "Four Pillars"(모델 55.4 / 실측 잉크 51.8)를 오탐한다.
- 🔴 계측기 `--target=source` 는 `/i18n/<loc>.json` 때문에 서빙 루트가 2개여야 한다(지금은 fail-closed).
- 🔴 셸 오버레이는 부팅 후 **지연분리**된다 — `#sajuLoaderOverlay` 가 null 이면 버그가 아니라
  `window.__cdMobileHomeLazyMount.mount("sajuLoaderOverlay")` 를 먼저 불러야 한다.
- `js/core/checkout-entry.js` 를 고치면 **캐시 핀 22개(44곳)** 가 낡는다 —
  `verify:payment-choice-parity` 가 기대값을 알려주고, `sync:public` 은 그 핀을 안 돌린다.
- Git Bash 가 `--routes=/` 를 경로로 바꾼다 → `MSYS_NO_PATHCONV=1` 접두.

## 검증

```
npm run verify:locale-text-fit && npm run verify:guard-wiring
npm run build:cf
MSYS_NO_PATHCONV=1 npm run measure:locale-text-fit -- --routes=/,/points/ --target=dist --viewports=360x800 --out=.tmp/ltf-dist
```

2026-09-03 실측(dist, 360x800): `/points/` ko 대비 신규 **0건**(수정 전 es·fr·ms 각 1건),
`/` **23건**(위 P1 표가 그 목록, 이번 변경과 무관한 기존 결함).

## 모르는 것

- `.cd-direct-payment-option--secondary` 의 `line-clamp:1` 이 의도된 압축인지(ko 도 잘린다).
- 계획서가 지목한 오역 2건(de `payment.directModal.subtitle.directOnly`,
  fr `featurePreview.paywall.unlockDesc`)은 길이가 아니라 뜻 문제 — 별도 판단 대상.
- 결제 오버레이·모달 내부는 계측기가 못 연다(진입에 결제가 필요). 이번엔 Playwright 로
  `.saju-loader-card` 만 직접 열어 쟀다(제한 없을 때 2575px·화면 밖 887px → 지금 704px·스크롤 가능).
