# 종합 사주 풀이 — 해금 후 미표시 근본 수정 + 분량 증량

- status: **PR 대기** (PR [#1957](https://github.com/rei1237/codedestiny/pull/1957), 브랜치 `fix/saju-summary-unlock-render-and-depth`, 커밋 `ff1937209`)
- worktree: `D:/Development/code-destiny-wt/saju-summary-unlock` (베이스 `fae066f1a`)
- 다음 세션 첫 문장: **"PR #1957 의 필수 CI 상태를 확인하고, 통과했으면 머지 순서를 사용자에게 보고한다."**

## 사용자 요청

> 사주 분석 화면의 종합 사주 풀이가 해금 되었는데도 표시가 간헐적으로, 대부분은 안되는 심각한 버그가 있는데
> 정확한 원인 파악 후 확실히 표시되도록해주고 … 분량을 최고의 명리학자로서 2배는 늘리도록 … 급하므로 바로 프로덕션까지 승격한다.

추가 발화 2건:
- "모바일에서는 현재 잘나오는것 같은데 데스크탑에서 나오지 않으니까 이 정보를 참조해서 제대로 고쳐줘" — 이 한 줄이 원인 특정의 결정타였다.
- **"25,810자로도 충분하므로 이대로 진행해줘"** — 증량 범위를 여기서 닫았다. 계획서의 28,000자 목표·신규 3장은 **철회됐다.**

## 원인 (실측 확정)

`js/fate-scroll-reveal.js` 의 IntersectionObserver 가 비율 임계값(7%)만 봤다. 해금 본문이 배달되면
`#summaryCard` 가 20,835px 로 커져 7% = 1,458px 이 보여야 등장하는데 데스크탑 뷰포트 900px
(rootMargin 뒤 850px)에서는 도달 자체가 불가능해 `opacity:0` 으로 굳었다. 잠금 상태에서는
`content-visibility:auto` 자리표시자(238px)라 7% = 17px 이 쉽게 채워진다 — 이 비대칭이 "간헐적"의 정체다.

## 한 일

| 축 | 내용 |
|---|---|
| 리빌 교착 | 비율 + 실제 보이는 픽셀(120px) 기준, `threshold:[0,0.07]`, scroll·resize 스윕 안전망 |
| 재잠금 | 메모리 전용 시각 latch (`index.html` 인라인 런타임) — 본문이 있는 게이트에만, 저장소·서버 무변경 |
| 렌더 보장 | `#summaryArea` 부재 시 fail-closed, 재시도 예산 3.2s → 20s, 초과 시 재확인 안내 UI |
| 게이트 우회 | `js/share.js` 테마 전환 경로를 `_cdSajuGateUnlocked('section_summary')` 로 감쌈 |
| 증량 | `summaryDepth` 15장 각 2단락 → 6단락. 15,071자 → **25,810자(1.71배)**, undefined 노출 0 |
| 문구 | 게이트 "A4 20페이지" → 30페이지 (셸 + `public/i18n/*.json` 11종) |

## 가드 (전부 변이로 무는 것 확인)

- `__tests__/ui/fate-scroll-reveal-tall-section.test.js` 신규 — 원본 코드에서 2건 모두 실패 확인
- `verify:saju-summary-browser` 모바일·데스크탑 두 셸 + 리빌 상태 단정, `package.json`·`pr-ci` `guards` 잡에 배선(고아 해소)
- `renderSummary` 호출부 전수 검사 `js/saju-engine.js` → `js/**`
- hold 하니스에 `mergeAccessStoreUnlocksIntoLegacyMap` 미러링

### 🔴 다음 세션이 알아야 할 함정

`verify:saju-summary-browser` 의 데스크탑 시나리오는 **이 버그를 결정적으로 재현하지 못한다.**
실측: 원본(버그) 코드로 되돌려도 EXIT=0 이다. 리빌은 `#resultPage` 가 보일 때 MutationObserver →
`onResultVisible` → rAF 2프레임 → `initReveal` 순으로 한 번만 초기화되는데, Playwright 의 클릭
자동 스크롤 때문에 하네스에서는 결과 본문이 생기기 **전에** 초기화가 끝나 `#summaryCard` 가 아예
관찰되지 않는다. 그래서 회귀를 무는 정본은 위의 jsdom 단위 테스트다. 브라우저 검증기는 폭(뷰포트
4종 × 셸 2종 × 해금 2경로)만 담당한다. 검증기를 "돌아간다"는 이유로 무는 가드로 취급하지 말 것.

## 남은 일

1. PR #1957 필수 CI 확인 → 머지 순서 보고. **머지는 사용자가 한다.**
2. 머지 SHA 40자리 고정 후 스테이징 확인(해금 계정 실화면 + 분량 실측).
3. **프로덕션 승격** — 사용자가 이번 요청에서 명시적으로 1회 승인했다. 스테이징 확인 통과 후에만.

## 범위 밖 (보고만, 별도 과제)

- `_cdResolveCurrentProfileIdForAccess()` 가 `''` 를 반환해 결제 직후 해금 기록이 실패하는 경로 — 결제 축.
- `mergeAccessStoreUnlocksIntoLegacyMap` 이 `snapshot.confirmedUnlocks` 를 읽지 않는 브리지 누락.
- `js/core/access-store.js:20` 의 `'saju.daewunAnalysis'` 오타(실제 키는 `saju.daeunAnalysis`).
- `generateDetailedAdvice` 의 비대칭(`ganAdvice` 는 甲만 2단락, `tsAdviceFull` 은 비견만 2단락) — 값싼 증량 지점으로 남아 있다.
- `scripts/verify-saju-summary-browser.mjs` 가 인증 흔적을 심지 않아 `loadTileLocks`·`syncUnlocksFromServer` 가 첫 줄에서 return 한다 — 재잠금 기계 자체는 브라우저에서 한 번도 돌지 않는다.
