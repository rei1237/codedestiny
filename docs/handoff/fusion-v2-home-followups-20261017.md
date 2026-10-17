---
status: active
updated: 2026-10-17
next: "P0-1 — verify-fusion-fortune-live.mjs에 v2 옵션을 넣고 호출 0 계획 출력까지 만든 뒤, 실호출 1회는 사용자 승인을 받는다"
---

# 초융합 v2 · 꿀꿀 홈 2차 — 후속 과제

## 왜

사용자 요청(2026-10-17): "후속과제들 우선 순위 정해서 작업할 인수인계 문서 남겨서 다른 세션에서 진행가능하도록해"
원 작업은 초융합 v2(체계 6장 + 분야 8장, 마스터 화자)와 홈 시그니처 띠·질문 카테고리 복구다.

## 지금 상태

- 본 작업은 main `0bf02cd58`에 들어갔다(주요 커밋 `159c40eef`). staging 검증을 통과했고, 운영 승격 런 39002766773을 실행했다.
- 아직 실제 Gemini로 v2를 생성해 본 적이 없다. 운영의 첫 실주문이 첫 실측이 된다.
- 롤백 스위치: Worker env `FUSION_PREMIUM_V2_ENABLED=false`면 새 주문을 v1으로 만든다(`worker/lib/fusion-fortune.js:1477`).

## 남은 작업 (우선순위 순)

### P0 — 유료 배달 안전

- [ ] **1. v2 실호출 검증 경로**
  - `scripts/verify-fusion-fortune-live.mjs`는 v1(9콜, 30,000자) 기준이고 v2 옵션이 없다.
  - `--version=v2`를 추가한다. 14그룹, 분야 그룹은 flash 모델로 돈다.
  - 판정 기준:
    - 강등이 0건이거나, 강등이 있더라도 `domain_chapter_missing`만이다.
    - 단계별 벽시계 시간이 데드라인 안이다.
    - wave 수가 20 이하다.
  - 완료 판정: 플래그 없이 실행해 계획만 출력하는 것까지 만든다. `--live` 1회는 **사용자에게 1회 한정 승인을 받은 뒤** 돌린다.
- [ ] **2. 분야 장이 빠진 주문의 복구**
  - 현재 동작: 분야 장이 빠지면 강등(`degraded`) 상태로 배달된다(`worker/lib/fusion-fortune.js:582`, `:636`).
  - 문제: `worker/lib/fusion-fortune-recovery-task.js`는 버려진 주문만 다시 돌린다. 이미 완료된 강등 주문의 빠진 장은 다시 만드는 경로가 없다.
  - 할 일: 완료됐지만 `domain_chapter_missing`인 주문을 찾아 빠진 분야 그룹만 재생성해 붙이는 경로를 만든다. 크론이나 관리자 수동 실행 중 하나다.
  - 완료 판정: mock 테스트에서 빠진 장 1개가 채워지고 나머지 장은 바이트 단위로 그대로다.

### P1 — 배포 흐름

- [ ] **3. `verify:mobile-journeys` 간헐 실패**
  - main CI에서 매번 다른 폭(360, 430px)에서 "browser back left body scroll locked"로 실패한다. 로컬에서는 24/24 통과한다.
  - 원인: `scripts/verify-mobile-journeys.mjs:104`가 고정 220ms만 기다린다.
  - 할 일: 고정 대기를 조건 대기(`waitForFunction`: `body.style.overflow !== "hidden"`, 상한 시간 지정)로 바꾼다.
  - 완료 판정: CI 3회 연속 초록. 단, 실제로 스크롤 잠금이 풀리지 않는 회귀는 여전히 잡아야 한다.

### P2 — 화면·검사 정합

- [ ] **4. 320/360px 헤더 겹침**
  - "꿀꿀 운세"와 "로그인" 글자가 겹친다. 캡처: `D:\Development\captures\home-luxe-20261017\phase2\360-light-first.png`
  - 이번 작업 전부터 있던 문제다.
  - 완료 판정: 320, 360, 390px에서 겹침이 없고 홈 버튼이 44px 이상이다.
- [ ] **5. PDF 분량 검사가 v1 기준**
  - `scripts/verify-fusion-fortune-pdf.mjs:88`이 여전히 18,000자 이상을 단언한다.
  - 할 일: v1 기준은 그대로 두고 v2 fixture 검사를 추가한다.
  - 분량은 느슨한 목표다. 전달 실패로 이어지는 하한을 만들지 않는다.

### P3 — 정리 · 결정 필요

- [ ] **6. 고아 i18n 키 3개**
  - `i18n/authored/shellRuntime-67.json`의 `shellRuntime.f3707`, `f3712`("2만 자 이상"), `f3772`("본문 20,000자 이상")
  - 코드에서 쓰는 곳이 없다.
  - authored 파일과 `public/i18n` 12개 언어에서 함께 지운 뒤 `npm run i18n:check`로 확인한다.
  - 같은 맥락의 주석 1곳: `app/fusion-fortune/fusion-fortune.module.css:63`의 "2만 자"
- [ ] **7. (사용자 결정) 질문 카테고리에서 뺀 유료 질문 4개**
  - 홈 질문 카테고리를 단순하게 만들면서 아래 4개를 뺐다. 원본은 `git show e76391603^:index.html`이다.

    | 질문 | 가격 키 | 링크 |
    |---|---|---|
    | `marriagePartner` | `yeongnyangi-saju-mackerel` | `/yeongnyangi/?question=partner#questions` |
    | `marriageClash` | `love-code` | `/saju/love-simulation/` |
    | `careerTurn` | `destiny-compass-life-voyage` | `/destiny-compass/` |
    | `futureYear` | `new-year-ai-consultation` | `/new-year-ai-consultation/` |

  - 질문 행의 긴 설명(`.s`)도 뺐다.
  - 되살릴지 사용자에게 묻는다. 되살리면 질문을 `scripts/design/build-home-funnel.mjs:68`의 `QUESTION_CATEGORIES`에 넣는다(가격 가드는 같은 파일 115행에서 자동 적용).

## 정본 예시

- v2 그룹과 화자: `worker/lib/fusion-fortune-prompt.js` (`FUSION_SECTION_GROUP_SPECS`)
- v2 목표 분량: `lib/fusion-premium-report.js` (`FUSION_PREMIUM_TARGETS_V2`)

## 함정

- 페르소나 문구를 시스템 프롬프트에 넣으면 Gemini 컨텍스트 캐시가 깨진다. 그룹별 user prompt 끝에만 넣는다.
- 무성(10대 중반)은 연애, 결혼, 건강 장의 화자로 쓰지 않는다.
- v1 스키마(`FUSION_FORTUNE_RESPONSE_SCHEMA`)는 레거시 프롬프트가 통째로 직렬화한다. 그래서 건드리지 않는다.
- 운영 DB 조회와 실호출은 매번 사용자 승인을 받는다(`docs/context/delivery-and-ci.md`).

## 검증

```
node scripts/verify-fusion-fortune-premium.mjs && node scripts/verify-fusion-fortune-premium-v2.mjs
npm run verify:fusion-fortune-delivery-floor && npm run verify:fusion-fortune-pdf
node scripts/design/verify-home-funnel.cjs   # 정적 서버로 public/ 를 띄운 뒤
npm run check:fast -- --base=origin/main
```

## 모르는 것

- 운영에서 v2의 실제 그룹별 소요 시간, wave 수, 강등률. P0-1을 실행하거나 운영 DB를 조회해야 알 수 있고, 둘 다 승인이 필요하다.
- P0-2 복구를 크론으로 할지 관리자 수동으로 할지. 사용자에게 묻는다.
