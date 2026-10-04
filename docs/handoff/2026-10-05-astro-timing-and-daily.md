---
status: open
updated: 2026-10-04
next: "새 세션 첫 문장: docs/handoff/2026-10-05-astro-timing-and-daily.md 를 읽고 §0 시작 절차부터 진행하라."
---

# 점성술 2차 개편 — 쉬운 말·정확한 날짜·오늘의 별자리 운세·유료 연간 흐름

위험도: **RED** (결제 상품 신설·잠금 게이트). 권장 모델/effort: Opus · high.
선행 작업: [2026-10-04-astro-premium-redesign.md](2026-10-04-astro-premium-redesign.md) (done, main 954f4ceca) — 새 모듈 `js/core/astro/natal-reading.js` 와 "이전 해석 기록" 서랍이 이미 있다.

## 0. 시작 절차

1. `git fetch origin` → main 체크아웃에 남의 미커밋이 있으면 `scripts/create-safe-worktree.ps1 -Slug astro-timing` 으로 origin/main 기준 워크트리.
2. 이 문서 전체 + [payment-gating](../context/payment-gating.md) + [ai-and-db](../context/ai-and-db.md)(결정론이라 LLM 규칙은 참고만) 를 읽는다.
3. 세션 상태 파일에 §1 원문·§4 체크리스트를 옮긴다.
4. paid-gate-auditor 로 §3 결정(잠금 콘텐츠·`astro_yearly_transit`)의 정책 적합성을 먼저 판정받는다.
5. §4 1단계부터. 단계마다 검증→커밋, 안정 시점에 main 머지·push→CI.

## 1. 요청 원문 (2026-10-04 사용자)

> 서양 점성술 리딩 부분에서 설명이 너무 어려워 정확히 몇월, 특정 연도가 나와야하고 고객들은 연구자가 아니라 아무것도 모르는 사람이므로 풀어서 설명되어야한다. 차라리 이 부분은 유료로 하는게 나을것 같고 오늘의 운세 부분 ui와 내용도 오늘의 별자리 운세를 세부적으로 전문적인 기준으로서 봐줘야할것 같다. 그외에도 점성술사로서 니가 볼때 문제점들을 찾아서 개선해줄 계획을 세워서 새로운 세션에서 작업할 수 있도록해줘

첨부 스크린샷: 옛 엔진 "커리어 방향 - 어디서 가장 빛나는가" 블록. 칩 `MC 천정(10H) 염소자리 2°46'`·`Desc 하강궁(7H)`·`6H 처녀자리 0°0'`·`Saturn ♄ 물병자리 1°29'`, 본문 "태양 12H / 12H (체감: 무의식과 회복 / 큰 흐름: …)", "현실 조언 3가지: (1) 2주 단위…".
- 출처: `js/saju-engine.js:14334` (origin/main 2710b06f2 기준), `#astroDetailLayer` 안. 1차 개편 후 `#fr-astro-record`("이전 해석 기록", 닫힌 서랍) 안으로 들어갔다.
- 사용자가 본 화면은 **운영**일 가능성이 크다 — 1차 개편은 스테이징까지만 반영, 운영 미승격(승격은 별도 1회 승인).

## 2. 점성술사 관점 결함 (실측, origin/main 2710b06f2 줄 번호 — 착수 시 재확인)

1. **오늘의 운세가 오늘을 안 본다.**
   - "오늘의 방향" `astroImmersiveLine`(saju-engine.js:13976)은 출생 차트 `isActionMode` 2지선다 — 날짜가 바뀌어도 같은 문장.
   - 카테고리 점수(~13960)도 출생 차트 산술.
   - 오늘 하늘 `chartNow`(:12678, 폴백 :12687)는 목성 별자리 하나에만 쓰이고(~12705) 12개 고정문(~12747)으로 끝.
   - 달 위상(~12730)은 **출생** 위상인데 오늘처럼 보인다.
2. **트랜싯이 없다.** 오늘·올해 행성 → 출생 행성 각, 역행 정지일, 별자리 진입일, 보이드 문, 일·월식이 클라이언트에 0.
   - 서버 `worker/lib/astro-premium-generator.js:1344 buildAstroTransitInsights` 는 LLM 유료 PDF 전용(:1486).
3. **날짜·시기 계산이 틀리거나 흐리다.**
   - 옛 피르다리아: "잔여 약 N년"만, 낮 순서만 씀(밤 차트 무시).
   - 부기간 인덱스: `firdariaSubPlanet`(:12926)가 주기 행성부터 세지 않는다.
   - 프로펙션: `(now.getFullYear()-y) % 12`(:12980) — 생일 전이면 1년 틀림.
   - 월 단위 예보 0.
   - 정본: `natal-reading.js` `firdariaOf(sect, age)`(:172)·`profectionF`(:257)는 섹트·만 나이를 반영한다.
4. **용어가 연구자용.**
   - 이중 하우스 "12H / 12H (체감 / 큰 흐름)" = Placidus/Whole Sign 병기(`_friendlyHousePair` :13332, `_housePairText`·`_houseMeta`·`_houseDiffLine` 인근).
   - MC·Desc·도수 칩.
   - "현실 조언 3가지"는 모든 사람에게 같은 고정문.
5. **현대 룰러**(`chartRulerByAsc`) — 1차 모듈은 전통 룰러. 옛 블록과 새 층의 차트 룰러가 다를 수 있다.
6. 범위 밖(보고만):
   - `/fortune/today/` 별자리 문장 = `hashPick(date|sign)`(scripts/gen-daily.mjs:475).
   - 잠금화면 점성술 = `hashStr`(lib/lock-screen-daily-fortune.ts:202).
   - 봉인된 별의 방 가격 `cost*100` 클라이언트 계산, 액션 허브 "3,000원" 하드코딩.
   - 깊이 읽기 특정성 28.8%(행성 정의 10문장 공통).

## 3. 결정 (사용자 승인 2026-10-04 — 계획 승인으로 확정)

- **유료 범위**: 분야별(일·연애·돈·관계·건강) "언제" 상세 + 12개월 타임라인 = 유료 1상품.
  - 무료: 성향 요약(#asStory), 오늘의 별자리 운세, 올해 가장 큰 사건 1개의 "달"만.
- **결제 형태**: 잠금 콘텐츠(1회 해금 후 다시 보기, `unlock`).
  - 결정론 산출이라 회당 결제 대상이 아니다(payment-gating.md "고정 콘텐츠=잠금").
  - 상품 키는 기존 등록 `astro_yearly_transit`(worker/lib/paid-feature-registry.js:326, 30코인=3,000원). 가격 변경은 별도 승인.
- **생성 방식**: 결정론 + 쉬운 말 템플릿, **LLM 0**.
- **옛 서랍**: 삭제 0.
  - 서랍 안 이중 하우스·도수 문자열 → 쉬운 말.
  - 고정 "현실 조언"·"잔여 약 N년" → 새 모델 값(정확 연·월).
  - 시기 상세는 유료 타임라인으로 안내.
- **쉬운 말 기준**: 무료 층 본문에 하우스 번호·도수·약어(MC/Desc/ASC/H)·"체감/큰 흐름"·Placidus 노출 0. 근거는 "왜 이렇게 봤나요" 접힘 안에서만.
  - 문장 형식: "○○년 ○월 ○일~○월 ○일: 토성이 당신의 금성과 부딪혀요 — 관계에서 책임을 묻는 시기. 이렇게 하세요: …"

## 4. 단계 (각각 독립 커밋·롤백 단위)

- [ ] **1. 트랜싯 엔진** `js/core/astro/transits.js`(신규, UMD 순수 함수, today·위치 함수 주입, 배선 없음)
  - 위치 함수: 클라이언트 Swiss 어댑터 `calcAstroSwissChartOrThrow`(saju-engine.js:12260), 폴백 `AstroEngine.calcAll`.
  - 테스트는 `astronomy-engine`(node_modules 있음)으로 주입.
  - 오늘: 실제 달 별자리·위상·보이드 문 시작/끝, 빠른 행성(달·태양·수성·금성·화성) → 출생 행성 각(오브 표).
  - 기간(12개월): 느린 행성(목성·토성·천왕성·해왕성·명왕성) → 출생 태양·달·ASC·MC·금성·화성 각의 **정확일**과 오브 진입/이탈일.
    - 방법: 일 단위 스캔 + 이분법, 역행 재접촉 3회 처리.
    - 함께: 역행 정지일, 별자리 진입일, 일·월식(astronomy-engine `SearchLunarEclipse`·`SearchGlobalSolarEclipse` 사용 가능 여부 확인).
  - 오브·각 규칙은 `natal-reading.js` `aspectsOf`(:88)·서버 `worker/lib/swiss-ephemeris.js aspectBetween`(:453)과 일치시킨다.
  - 시간 모름: ASC·MC·하우스 대상 사건 제외(1차 모듈 규칙과 동일).
  - 테스트 `__tests__/ui/astro-transits.test.mjs`(node --test):
    - 2026~2027 공개 천문 사건(역행 정지·진입·식)을 외부 표와 대조, ±1일.
    - 날짜 주입별 결과 차이, 시간 모름 분기.
- [ ] **2. 옛 시기 계산 정정**: 만 나이(생일 기준), 밤 차트 피르다리아, 부기간 순서.
  - 옛 렌더러 값은 `natal-reading` 모델 값으로 대체하고, 표시 블록은 삭제하지 않는다.
  - 회귀 테스트: 생일 전/후, 낮/밤 차트.
- [ ] **3. 오늘의 별자리 운세(무료)** — `#asStory` 위 `as-today` 카드. 옛 `.astro-flow-card`/`astroImmersiveLine` 문장을 오늘 하늘 기반으로 교체.
  - 내용: 오늘 달 별자리·위상(실제)·보이드 시간, 오늘 가장 강한 트랜싯 3개를 쉬운 문장으로, 연애·일·돈·관계·컨디션 5줄.
  - 근거 접힘("왜 이렇게 봤나요")에만 행성·각 이름.
  - 점수는 근거 가중 합(결정론). 테스트: 날짜가 바뀌면 문장·점수가 바뀐다, 같은 날은 같다.
  - UI는 1차 개편 시각 언어(styles/astro-reading.css `as-*`, design-canon) 그대로. 대비 ≥4.5, 탭 ≥44, 13px 미만 0.
- [ ] **4. 올해·월별 흐름(유료)** — 12개월 타임라인, 월마다 1~3사건 + 행동 조언, 올해 프로펙션·피르다리아를 "올해의 주제"로, 분야별 "언제" 상세.
  - 게이트: 기존 `_astroCounselPaidGate`(saju-engine.js:33663) + `_cdGateBody`/`_cdFillGateBodyIfPending`(:27516/:27522, 잠금 중 본문은 DOM 밖 메모리)·`_astroCounselApplyPaidGates`(:33683) 패턴. 새 결제창 금지 — 기존 `unlockPremiumFeature` 경로만.
  - 무료 미리보기: 올해 가장 큰 사건 1개의 달.
  - 레지스트리: `astro_yearly_transit` 을 회당 결제 목록(:605-606)에서 잠금으로 옮긴다(동결 파일 → `node scripts/verify-payment-freeze.mjs --update` 동반 커밋).
    - REGISTRY_ONLY 픽스처(`__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs:438-439`)와 `__tests__/worker/paid-non-llm-delivery.test.js` 갱신.
    - `docs/payment-resume-audit/inventory.md:105-106`(미검증/CRITICAL) 상태 갱신.
    - `astro_monthly_transit` 은 손대지 않는다.
  - 서버 이용권 판정·3 렌더러 정합(index.html `_cdChooseServicePaymentMode`, app/_lib/billing-client.ts, js/destiny-profile.js)은 paid-gate-auditor 판정을 따른다.
- [ ] **5. 쉬운 말 정리**: 무료 층 + 옛 서랍 문자열.
  - `natal-reading` 금지어 테스트에 `H /`·`체감:`·`큰 흐름:`·`Placidus`·`MC `·`Desc` 추가(근거 접힘 제외).
  - 고정 "현실 조언 3가지" → 모델 기반.
- [ ] **6. 검증·머지**
  - verifier 4종을 하나씩: basic-fortune-library, mobile-detail-render, basic-consultation-entry-ux(뒤에 `git checkout -- artifacts/`), sukuyo-reading-house.
  - 결제 verify 7종(payment-gating.md): billing-pass-policy, portone-single-payment, paid-gate-ui, payment-choice-parity, checkout-pass-card, paid-feature-billing-policy, ai-prompt-billing-policy. 그리고 verify-per-use-never-unlocks, verify-paid-gate-price-coverage, verify-paid-gate-no-dead-end, verify-static-paid-gate-failsafe.
  - 커밋 전 paid-gate-auditor, `npm run check:fast`, main 머지·push, CI.
  - 스테이징 검증: 대형 결제 변경이므로 `npm run verify:staging -- --sha=<40자리>`. 운영 승격은 별도 1회 승인.

## 5. 검증 기준

- 천문: 외부 표 대조 ±1일, 이분법 정확일 ±1일.
- 날짜 변화: today 주입 2개로 오늘 카드 문장·점수가 다름, 같은 날 재실행은 동일.
- 쉬운 말: 무료 층 금지어 0(테스트), 문장 중복 0, 미치환 `{}` 0(1차 개편 🔴 MODE_LINE 사고 재발 방지 단언 유지).
- 결제(mock 만):
  - 잠금 상태에서 유료 본문 DOM 부재.
  - 해금 mock 후 채워지고, 재방문 시 다시 보기 가능.
  - 결제창 3선택 유지.
- 화면: 브라우저 프로브(360/390/1280, overflow 0·pageerror 0), visual-checker 판정, headed 라이브 뷰어로 사용자 검수.

## 6. 규칙·함정 (1차 개편에서 배운 것)

- 과금 LLM 호출 0, 실결제·운영 DB 0. python 금지. `taskkill /IM`·`Stop-Process -Name` 금지.
- 스크린샷은 visual-checker 로만 본다. verifier 는 하나씩 돌린다. `?v=` 는 손으로 쓰지 않는다(sync 가 내용 해시로 씀).
- 정적 셸·bFP 변경 뒤 `npm run sync:public` 수렴과 sitemap-drift 확인. 머지 충돌 시 `config/sitemap-lastmod.json` 은 theirs → sync:public → sitemap:generate.
- CDN 폰트 CORS 는 code-destiny.com 만 허용 → 127.0.0.1 프로브는 route.fetch + ACAO * 로 측정 환경에서만 패치.
- 요소 스크린샷이 고정 오버레이 밖이면 뒤 페이지를 찍는다 → 뷰포트를 섹션 높이+600 으로.
- vbfl :581 공유 수 2!==3 은 알려진 플레이크(재실행 통과).
- main 체크아웃의 남의 미커밋(index.html·public/*·marketing/*·rss·llms·.tmp/)은 건드리지 않는다.

## 7. 핵심 파일

- 신규: `js/core/astro/transits.js`, `__tests__/ui/astro-transits.test.mjs`
- 수정:
  - `js/core/astro/natal-reading.js` (build·render 연결, 금지어)
  - `js/saju-engine.js` (렌더러 :12664~, 오늘 카드·게이트 삽입)
  - `js/core/saju/basicFortunePresentation.js` (`astro()` 수집·라벨 5로케일)
  - `styles/astro-reading.css`
  - `worker/lib/paid-feature-registry.js` + `config/payment-freeze.json`
  - 결제 픽스처·테스트
  - `index.html` script 태그(sync 미러)
- 재사용: `natal-reading.js` `aspectsOf`·`firdariaOf`·W 공유 작성기, `_astroCounselPaidGate`·`_cdGateBody`, `calcAstroSwissChartOrThrow`, 서버 `aspectBetween`·`buildAstroTransitInsights`(로직 참고)
