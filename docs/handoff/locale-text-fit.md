---
status: active
updated: 2026-09-03
next: PR-2 — 아래 표의 P0 3건(ms 탭 라벨 · cardhead flex-wrap · saju-loader-card max-height)을 고치고 verify-locale-text-fit.mjs 의 ACCEPTED_BUDGET 에서 home.nav.saju 예외를 걷어낸다
---

# 로케일별 텍스트 길이 UI 파손

## 왜

셸 언어 스위처는 **12개 로케일**을 노출하는데 사전 렌더 셸은 4개뿐이고, 나머지 7개는 한국어로
레이아웃된 셸에 더 긴 문자열을 런타임 치환한다. 완충 장치가 0건이다 —
`git grep ":lang(|\[lang=|html\[lang"` → 0. 기존 i18n 가드는 키·금액·잔존 한글만 보고 **기하를 재지 않는다.**

## 지금 상태

- 브랜치 `worktree-locale-text-fit` — PR-1(계측기 + 정적 가드 + 이 리포트). 미머지.
- PR-2(P0 수정)는 착수 전.

## 진단 (🔴 = 계획서 수치를 실측이 뒤집은 행)

| 우선순위 | 위치 | 문제 | 재현 로케일 | 수정 방향 |
|---|---|---|---|---|
| P0 🔴 | [index.html:3083-3085](index.html#L3083-L3085) 셸 탭바 | `overflow:hidden`+`nowrap` 인데 `text-overflow` 가 `clip` → 말줄임 없이 글자 중간 하드 클립 | **ms 1개뿐**. `home.nav.saju` "Empat Tiang" 잉크 58.84px vs 칸 58px | 짧은 라벨 i18n 키 신설(11px 미만 축소는 인체공학 하한 위반). 응급책으로 `text-overflow:ellipsis` |
| P0 | [js/core/checkout-entry.js:85-88](js/core/checkout-entry.js#L85-L88) `.cd-direct-payment-cardhead` | `flex-wrap` 없음 + 배지·리본 **둘 다 `flex:0 0 auto`** → 축소도 줄바꿈도 못 함. 다이얼로그가 `overflow-x:hidden`(`:50`)이라 초과분이 조용히 잘린다 | 🔴 **현재 초과 로케일 없음**(모델 최대 es 272.1px / 예산 290px). 여유 장치가 없다는 구조 결함이라 P0 유지 | `flex-wrap:wrap` + 배지 `flex:1 1 auto;min-width:0` |
| P0 | [index.html:37139](index.html#L37139) `.saju-loader-card` | `max-height`·`overflow` 둘 다 없고 부모가 `overflow:hidden`+세로중앙 → 문구가 길면 카드 위아래가 스크롤 없이 잘림. React 오버레이는 이미 안전 | de·fr·es·nl·vi (미검증, 사전 팽창률 1.35~1.44 근거) | React 와 동일 규격 `max-height:min(88svh,88dvh);overflow-y:auto` |
| P1 | [index.html:24907](index.html#L24907) `normalizePaymentOverlayBody` | 중복 머리줄 제거가 **한글 정규식 8개**로만 판정 → 비한국어에선 중복 문장이 남아 위 P0 잘림을 악화 | ko 외 11개 전부 | 문자열 매칭 대신 i18n 키 동일성으로 |
| P1 | 브라우저 계측 결과(`/`, 360x800) | line-clamp(2) 초과: `strong.notranslate` 음악 소개(ja·zh-CN·zh-TW·vi·hi·nl·ms), `span.moon-preview-card__name`(en·es·fr·de·nl·vi). spill: 쿠키 동의 제목·운세 게이트웨이(ja·zh), `p.cd-feedback__reward`(ja·de) | 표시 로케일 참조 | clamp 2→3 또는 폭 확보. 개별 판정 필요 |
| P1 | [app/points/PointsClient.tsx:805](app/points/PointsClient.tsx#L805) | 카피 테이블 리터럴이 ko·en 뿐, JSX 한국어 하드코딩 14곳 | 9개 로케일 | 불변조건 위반 — 키로 추출 |
| P2 | [js/core/checkout-entry.js:121](js/core/checkout-entry.js#L121) 상품권 칩 | 모달 내 유일한 `nowrap+ellipsis`. 현재 여유 46px | 향후 de·nl | 가드 폭 예산에 등재됨 |
| P2 | ko 자체 파손 | `div#cdSigGrid` spill 1137px, `span.tsp-name` 하드 클립 22px, 모바일 헤더 검색 placeholder 말줄임 17px | ko 포함 전 로케일 | 로케일 무관 기존 결함 |
| 정상 | 점술 엔진 카드 · 캐릭터 말풍선 | 그리드 `minmax(0,1fr)`, 말풍선 `max-width:100%`+`keep-all`, 고정 높이 없음 | — | 조치 불필요 |

## 정본 예시

- 기하 계측: [scripts/measure-locale-text-fit.mjs](scripts/measure-locale-text-fit.mjs) — 이 표의 로케일별 수치 정본
- 정적 가드: [scripts/verify-locale-text-fit.mjs](scripts/verify-locale-text-fit.mjs) — 폭 예산 상수에 실측 근거 주석

## 함정

- 🔴 **사전 값 ≠ 렌더 값.** 셸은 `home.nav.saju` 에 사전보다 짧은 문자열을 쓴다(es "4 Pilares" vs 사전 "Cuatro Pilares"). 사전만 재서 판정하면 계획서처럼 5개 로케일을 오판한다.
- 🔴 **탭 칸 폰트는 10.36px** — 루트 폰트가 유동이라 `0.6875rem` 이 11px 가 아니다.
- 🔴 계측기 `--target=source` 는 `/i18n/<loc>.json` 때문에 서빙 루트가 2개여야 한다. 하나면 전 키가 플레이스홀더로 렌더돼 **12개 로케일 전부 가짜 파손**이 나온다(실제로 겪음, 지금은 fail-closed 로 막힌다).
- Git Bash 가 `--routes=/` 를 경로로 바꾼다 → `MSYS_NO_PATHCONV=1` 접두.

## 검증

```
npm run verify:locale-text-fit && npm run verify:guard-wiring
MSYS_NO_PATHCONV=1 npm run measure:locale-text-fit -- --routes=/ --target=source --viewports=360x800 --out=.tmp/ltf
npm run build && npm run measure:locale-text-fit -- --routes=/,/points/ --out=.tmp/ltf-dist   # dist 축 미검증
```

## 모르는 것

- **App Router 탭바** `.cd-mnav__label`([styles/mobile-bottom-nav.css:125](styles/mobile-bottom-nav.css#L125))는 **미측정**. dist 빌드가 필요해 이번 세션에서 못 돌렸다. 셸 탭바와 칸 폭이 다를 수 있으니 PR-2 착수 시 `--target=dist` 로 먼저 잰다.
- `.cd-direct-payment-option--secondary` 의 `line-clamp:1` 이 의도된 압축인지(ko 도 잘린다).
- 계획서가 지목한 오역 2건(de `payment.directModal.subtitle.directOnly`, fr `featurePreview.paywall.unlockDesc`)은 길이가 아니라 뜻 문제 — 별도 판단 대상.
