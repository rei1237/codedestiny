---
status: active
updated: 2026-10-15
next: "docs/handoff/2026-10-15-palm-reading-yeoni-human.md 를 읽고 '남은 작업'을 1번부터 순서대로 진행해. 로직(1~3)은 항목당 커밋 하나, 워커 테스트를 붙인다. 과금 LLM 실호출은 정확한 1회 승인 없이 하지 않는다."
---

# 손금 × 연이(인간 버전) — 라이트 UI·꾸밈 아트·판독 로직 개선

## 왜

사용자 원문: "추가로 손금 기능은 연이 인간 버전으로 해주고 ui/ux와 꾸미는 이미지도 연이 인간 버전으로 깔끔하고 라이트한 느낌으로 만들어주면 좋겠고 현재 손금 로직도 개선해주면 좋겠어. 이 세션에서 어려우면 인수인계로 넘겨"

2026-10-15 전문가 상담 캐릭터 작업(윤달·무성·서한비, 브랜치 `wt/expert-characters-20261015-180951`) 중에 들어온 요청이다. 범위가 세 겹이라 그 브랜치와 섞지 않고 넘긴다.

- **UI**: `app/palm-reading/PalmDestinyMain.tsx`(3,895줄)는 다크 동양풍이다. 라이트 테마로 바꾸려면 화면 전체를 다시 스타일해야 한다.
- **로직**: 유료(100코인) 워커 로직을 바꾸면 critical 티어 CI가 붙는다.
- **아트**: 새로 그려야 한다.

## 확정된 결정

- 기준 연이는 **소설 캐주얼 연이**(사용자 선택 "소설 캐주얼 연이 (추천)")다.
  - 정체성 참조: `public/images/novel/remaster/yeon/base.webp`. 꽃무늬 블라우스, 분홍 웨이브 머리, 꽃 장식이 특징이다.
  - 찻집 한복 연이(`public/images/master-profiles/yeoni-teahouse-*`)와 돼지 폼은 쓰지 않는다.
  - 기존 `masterProfiles.yeoni`(`components/fortune/master-profiles.ts`)는 찻집 한복 버전이다. 그래서 손금용 항목은 새 키로 따로 만든다.
- 새 아트는 실제 에셋(`yeon/base.webp`)을 첨부해 그리고, 원본과 나란히 놓고 비교한다.
- 표정 스프라이트는 `public/images/novel/remaster/yeon/`에 있는 것을 재사용한다.
  - 있는 파일: angry, base, cry, disappoint, fear, left, onigiri, right, sideL, sideR, sleep, smile
  - mood 매핑 제안(파일을 실제로 보고 확정할 것):
    - idle → base
    - greet → smile
    - thinking → sideL
    - reveal → right
    - caution → left
    - comfort → smile
    - error → disappoint
    - empty → sideR
  - 쓰지 않을 것: angry, cry, fear, sleep, onigiri. 상담 화면 톤과 맞지 않는다.
- 가격·결제·권한 흐름·결과 JSON 스키마는 바꾸지 않는다.

## 지금 상태 (2026-10-15 실측, 줄 번호는 이 날짜 기준)

- **라우트·클라이언트**: `app/palm-reading/`에 다음 파일이 있다.
  - `page.tsx`
  - `PalmReadingRouteClient.tsx`
  - `PalmDestinyMain.tsx`
  - `PalmLineOverlay.tsx`
  - `palm-hand-landmarks.ts`
  - `paid-result-recovery.ts`
  - `error.tsx`
- **엔진**: `lib/palm/`에 다음 파일이 있다.
  - `palm-map-engine.js`
  - `both-hands-comparison.js`
  - `palm-ui-state.js`
  - `interpretation-engine.ts`
  - `palm-narrative-mapper.ts`
  - 기타
- **워커**
  - `worker/routes/palm.js`
  - `worker/lib/palm-vision.js`: 비전 판독과 심층 상담 프롬프트
  - `palm-result-delivery.js`
- **가격**: 정본은 `worker/lib/paid-feature-registry.js:326`의 `palm-reading-general`이다. 100코인, 10,000원이다.
  - [2026-10-02 인수인계](2026-10-02-palm-reading-logic-and-token-cap.md)의 "50코인"은 지금 기준과 다르다.
  - 가격은 바꾸지 않는다.
- **결제 흐름**: `POST /api/palm/analyze` → `runBillingCoinGate` → `GET /api/palm/result`
  - 생성·저장은 결제 전에 끝난다. 의도된 설계다.
  - POST는 메타 정보만 돌려준다. 2026-10-03 0번 항목에서 이렇게 정했다.
- **테스트**
  - `__tests__/palm/{both-hands-comparison,palm-map-engine-requirements,palm-ui-requirements}.test.js`
  - `__tests__/worker/palm-paid-delivery.test.js`
  - `__tests__/ui/palm-paid-result-recovery.test.js`
- **verify 스크립트**
  - `scripts/verify-palm-flow.mjs`
  - `verify-palm-mobile-payment-recovery.mjs`
  - `verify-palm-dev-module-boundary.mjs`
  - `verify-crafted-palm.cjs`
- **상세 페이지**
  - 원고: `content/product-details/palm-reading/panels.cjs`
  - 히어로: `public/images/feature-details/palm-reading-hero-v2.webp`
  - 상세 카피: `index.html` `FEATURE_VISUAL_DETAILS['palm-reading']`(약 L37955)

## 남은 작업 (순서대로, 항목당 커밋 하나)

### 로직 — 먼저, 워커 테스트와 함께

- [ ] **1. 점수 예시값 앵커링 제거 + 채점 루브릭.**
  - `palm-vision.js:117`의 JSON 예시 `"scores": { "love": 75, "career": 80, ... }`와 `:131`의 `"palmCoverage": 0.85`가 실제 값처럼 복사될 수 있다.
  - 예시는 자리표시(`0-100`)로 바꾸고, 점수 구간별 판정 기준을 프롬프트에 둔다.
  - 판정 기준: mock 응답 고정 테스트가 예시값과 같은 점수를 "정상"으로 보지 않는다.
- [ ] **2. 과단정 규칙을 연이 캐논에 맞춘다.**
  - 원인 위치
    - `:55` 비전 시스템 프롬프트("최고 수준의 손금 판독 전문가")
    - `:606` 심층 상담 프롬프트("30년 경력의 손금 상담 전문가")
    - `:611` "~할 수도 있습니다 같은 애매한 표현 대신 ~하세요로 쓰세요"
  - 고치는 방향
    - 연이 캐논을 따른다(`worker/yeongnyangi/prompts/persona/yeoni.ts:5`: 공포 조장, 금전·건강 확정 예언 금지).
    - 관찰한 선은 분명하게 말하고, 결혼·인연(`:624`), 건강·활력(`:627`), 향후 변화(`:630`)는 가능성과 행동 제안으로 쓴다.
    - 18개 ■ 섹션 형식과 분량 계약은 그대로 둔다(10-02 5번).
  - 페르소나 블록은 `worker/lib/expert-character-personas.js` 방식으로 덧붙인다.
    - "30년 경력"과 `:611` 규칙이 페르소나와 충돌하니 함께 고친다.
    - 덧붙이는 방식: `resolveSystemPrompt` 결과 **뒤에** 붙이고, CMS 키를 `cms-prompt-defaults.js`에 등록한다.
- [ ] **3. 종결 부호 하나 때문에 심층 상담이 통째로 실패한다.**
  - 실패 경로
    - `palm-vision.js:694`는 본문이 `[.!?。？！]`로 끝나지 않으면 `null`을 돌려준다.
    - 그러면 `palm.js:546-547`이 `PALM_INTERPRETATION_INCOMPLETE`(503)를 낸다.
    - 결제 전 단계라 과금은 없지만, 사용자는 다시 시도해야 한다.
  - 고치는 방향: 전달 우선 원칙(CLAUDE.md 원칙 17)에 따라, 120자 이상이면 마지막 완결 문장까지 잘라 전달한다.
  - `PALM_CONSULT_FALLBACK_MIN_CHARS = 120` 리터럴은 유지한다(아래 함정).
- [ ] **4. 좌우 손 판정 3중 모순.**
  - 서로 다른 세 출처
    - 프롬프트는 "이 사진은 {왼손|오른손} 바닥입니다"라고 단정한다(`:159`).
    - 정규화는 모델의 `imageQuality.handSide`를 사용자 입력보다 우선한다(`:579`).
    - 클라이언트에는 MediaPipe `handedness`(`palm-hand-landmarks.ts:39`, `PalmDestinyMain.tsx:731`)가 따로 있다. 셀피 카메라는 좌우가 뒤집힌다는 점도 고려한다.
  - 고치는 방향: 셋을 비교해 불일치를 표시하고, 조용히 덮어쓰지 않는다.
- [ ] **5. 손바닥 판정 강화.**
  - 약한 지점
    - `:541`: 모델이 `palmDetected`를 빼도 선 키가 하나라도 있으면 `true`로 추론한다.
    - `palm.js:197`: 품질 게이트가 `qualityByImage || hasMajorLines`, 즉 OR다.
    - `PalmDestinyMain.tsx:520`: 클라이언트 `palmLikely`는 가로세로 비율(0.55–1.75)만 본다.
  - 판정 기준: 손이 아닌 사진 mock이 판독 결과로 이어지지 않는다.
- [ ] **6. 기본 문구가 유료 본문에 섞인다.**
  - `palm-vision.js:239` `minorLine`의 기본 요약(`:355` "결혼선을 분석했습니다.", `:357` "건강선을 분석했습니다." 등)이, 모델이 필드를 뺀 경우에도 본문에 들어갈 수 있다.
  - 기본값으로 채운 필드는 본문에서 빼고, "선별 불확실성"으로 심층 상담 입력에 넘긴다.
- [ ] **7. 서버가 locale을 무시한다.**
  - `worker/routes/palm.js`에는 `locale` 참조가 하나도 없다.
  - 오류 문구(`:58` 413, `:252` 400 외)와 두 프롬프트가 한국어로 고정돼 있다. 클라이언트 문구는 로케일별로 있다.
  - 한국어 기본값은 그대로 두고, 클라이언트가 보낸 locale을 받아 오류 코드별 문구와 출력 언어 메모를 정한다.
- [ ] **8. 오버레이 선과 판독이 어긋난다.**
  - 원인
    - 오버레이는 고정 비율 가이드(`PalmDestinyMain.tsx:606-614` `fromPalm(...)`) 주변을 샘플링해서 그린다.
    - 신뢰도 하한이 0.2로 묶여 있다(`:943` `Math.max(0.2, ...)`). 그래서 판독에서 "확인 안 됨"인 선도 화면에 그려질 수 있다.
  - 고치는 방향: 판독 결과에서 `detected:false`인 선은 그리지 않거나, 점선으로 구분한다.

### 아트 — 로직 다음

- [ ] **9. 새 아트.** 모두 `yeon/base.webp`를 첨부해 그리고, 원본과 나란히 비교한다. WebP q87–90.
  - 키아트 16:9·4:5: 밝은 정원이나 창가에서 손바닥을 들여다보는 장면
  - 촬영 가이드 스팟 일러스트
  - 상세 히어로 `public/images/feature-details/palm-reading-hero-v3-yeoni.webp`
    - v2는 덮어쓰지 않는다.
    - `docs/design/fortune-detail-art.jsonl`에 줄을 추가한다.
  - 마스터 초상 600x720(q87)·시트 1536x1024(q90)
    - `public/images/master-profiles/provenance.json`에 기록한다.
  - 말하기 프레임: base와 같은 캔버스·머리 위치

### 라이트 UI

- [ ] **10. 연이 정원 라이트 팔레트로 재스타일.**
  - 팔레트(`DESIGN.md` 「연이 정원 홈」 절)
    - 아이보리 `#fff9f4`
    - 분홍 표면 `#f8e4ea`
    - 주색 `#b53660`
    - 글자 금색 `#7e6028`
  - 글자 대비 4.5:1 이상. 가드는 `__tests__/ui/yeoni-garden-tokens.static.test.js`다.
  - 캐릭터 무대: `ExpertCharacterStage`를 재사용한다.
    - `src/features/expert-characters/types.ts`의 `ExpertCharacterKey`에 연이 키를 추가한다.
    - `yeoni.ts` 데이터 모듈을 둔다. `yun.ts` 패턴을 따르고, `enabled` 롤백 스위치를 둔다.
  - 무대 배치 위치
    - 업로드 안내
    - 촬영 가이드
    - 로딩: 실제 단계에만 연결하고, 시간 기반 가짜 진행은 만들지 않는다.
    - 오류: 기존 사실 문구 **앞에** 한 줄을 넣는다.
    - 결과 표지·끝맺음
  - `PalmLineOverlay.tsx`의 선 색을 라이트 배경에 맞춰 다시 잡는다.
  - 소설 말투 표지("꿀악!", 별점)는 UI 대사에서만 아껴 쓴다. 상담 본문에는 쓰지 않는다.
  - 공통 완료 기준([전문가 UX](expert-consulting-premium-ux-2026-09-08.md))을 지킨다: 44px 컨트롤, safe-area, 가로 넘침 없음.

### 마케팅·노출

- [ ] **11. 상세·허브·OG.**
  - 상세 원고(`panels.cjs`)의 히어로를 v3로 바꾸고 첫 패널 카피를 연이 훅으로 쓴다.
    - 렌더: `node scripts/render-crafted-detail.cjs palm-reading`
    - `FEATURE_VISUAL_DETAILS['palm-reading']`를 바꾼 뒤 `npm run sync:public`을 돌린다.
  - OG 이미지 교체: `app/palm-reading/page.tsx:39`가 동물상 이미지(`fuctionassets/ai%20animal.webp`)를 쓰고 있다.
  - 홈 타일 `index.html:16151`(`home.tiles.palmMapMeta`): 유료 상품인데 무료 배지 스타일 `tarot-tile__coin-badge--free`(초록)가 붙어 있다.
  - **🟡 결정 필요 — 마케팅 사실 불일치.**
    - 상세 카피(약 L37955)는 "상담 목적 6가지 중 하나를 골라 그 축으로 해석"이라고 말한다.
    - 실제 UI에는 목적 선택이 없다.
      - `PalmDestinyMain.tsx:1621` 상태의 setter는 `:1830`에서 기본값 `general`로 되돌릴 때만 쓰인다.
      - 결제 하위키도 `general` 하나로 고정돼 있다(`:232-236`).
    - 추천: 카피를 실제 동작에 맞춘다. 목적 선택 UI를 새로 만들 경우에도 `PALM_BILLING_SUB_FEATURE_KEY = "general"`은 유지한다.

## 함정 ([2026-10-02 인수인계](2026-10-02-palm-reading-logic-and-token-cap.md)에서 이어짐)

- `scripts/verify-palm-flow.mjs`는 소스 리터럴을 단언한다.
  - 비전 호출 블록의 `geminiParts: parts`, `fallbackToWorkersAI: false`
  - `PALM_CONSULT_FALLBACK_MIN_CHARS = 120`
- `verify-llm-generation-resilience.mjs`는 `palm-vision.js`의 LLM 호출부가 정확히 2개라고 센다. 페르소나를 붙여도 호출 수는 늘리지 않는다.
- `__tests__/fixtures/paid-non-llm-delivery-fixtures.mjs`는 `palm.js`의 주석 "구 palm-reading-ai-consult(별도 5,000원 과금)가 하던 일을 기본 분석에 통합했다"를 마커로 쓴다. 이 주석은 지우지 않는다.
- 비전은 `fallbackToWorkersAI:false`를 유지한다.
- `normalizeNarrativeBody`는 문장부호 없는 문단을 버린다. ■ 제목 줄 형식을 바꾸면 mock으로 확인한다.
- `worker/`를 고치면 CI가 critical 티어로 돈다.
- 과금 LLM 검증은 금지다. mock이 기본이고, 실호출은 정확한 1회 승인을 받은 뒤에만 한다.

## 검증

```
npm run verify:palm-flow
npm run verify:palm-mobile-payment-recovery
node scripts/verify-llm-generation-resilience.mjs
node scripts/verify-palm-dev-module-boundary.mjs
npx jest __tests__/palm __tests__/worker/palm-paid-delivery.test.js
node --test __tests__/ui/palm-paid-result-recovery.test.js __tests__/ui/yeoni-garden-tokens.static.test.js
node scripts/verify-crafted-palm.cjs   # 개발 서버 127.0.0.1:14330 필요
npm run check:fast -- --base=<시작 SHA>
```

- 수동 확인
  - mock 개발 서버에서 360/390/430/1440 폭을 본다.
  - 업로드·촬영 가이드·로딩·오류·결과·재열람 화면에서 무대 흔들림, 오버레이 대비, 44px CTA를 확인한다.

## 모르는 것

- 실제 운영에서 `:694` 종결 부호 때문에 실패하는 비율. `PALM_INTERPRETATION_INCOMPLETE` 로그로 확인한다.
- MediaPipe `handedness`가 셀피 미러링을 거친 뒤 얼마나 맞는지. 실기기 표본이 필요하다.
- 손금 심층 상담 프롬프트에 관리자 CMS 덮어쓰기가 있는지. 운영 CMS에서 확인해야 한다.
