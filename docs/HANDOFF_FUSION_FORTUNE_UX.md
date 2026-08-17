# 인수인계 문서 — 초융합 운세 UI/UX 개편 + 결제 후 생성 차단 버그 수정

> 작성일: 2026-08-17
> 대상 페이지: https://code-destiny.com/fusion-fortune/ (`app/fusion-fortune/**`)
> 작업 상태: **조사 완료 / 구현 전**. 이 문서는 다음 세션이 이어받아 작업할 수 있도록 설계 의도·버그 분석·검증 계획을 남긴다.

---

## 1. 작업 목표

1. **결제 확인 이후에도 생성이 안 되는 치명적 버그 수정** (최우선)
2. 초융합 페이지 UI/UX를 아래 컨셉으로 전면 개편
   - 첫 화면부터 "결과표"로 만들지 말 것
   - 핵심 비주얼: **「운명의 핵 (DESTINY CORE)」**
   - 5개 운세는 "카드"가 아니라 "관측소(5 ORACLES)"
   - 상품 가치는 **「융합 결과 (WHERE THE STARS AGREE)」**
   - 차별점은 **「충돌 (WHERE THE STARS DISAGREE)」**
   - **「인생 영역 (LIFE MAP)」** 중심 재통합
   - 최종 결과는 **「운명의 꽃 (DESTINY FLOWER)」** 연출
   - 컬러는 "거의 검은 남색 + 우주색" 통일, 각 운세는 작은 accent만

---

## 2. 결제 버그 분석 (수정 우선순위 1)

### 2.1 관련 파일 (조사 완료)

| 구분 | 파일 | 역할 |
|---|---|---|
| 클라이언트 결제 게이트 | `app/hooks/useCoinGate.ts` | `ensurePaidAccess` → `runPaidAccessGate({ requestId: input.requestId })` |
| 클라이언트 결제 런타임 | `app/_lib/billing-client.ts` | `runPaidAccessGate`, `runBillingCoinGate`, requestId 생성/관리 |
| 초융합 페이지 | `app/fusion-fortune/**` | FusionFortuneClient 등 |
| Worker 결제 증빙 검증 | `worker/lib/nakshatra-paid-access.js` | `verifyPerUsePayment({ userId, featureKey, coinPrice, requestId })` |
| Worker 초융합 라우트 | `worker/routes/fusion-fortune.js` | `buildFusionFortunePaidAccessResolver`, `handleFusionFortuneStreamRoute` |
| Worker 초융합 핵심 로직 | `worker/lib/fusion-fortune.js` | `generateFusionFortuneRequest`, `safeId = safeRequestId(requestId)` |
| 결제 산출물 스키마 | `worker/lib/models.js` | `Payment`, `PointHistory` (metadata.requestId 등), `MonthlyCreditLedger` |

### 2.2 결제 → 생성 흐름 (정상 동작 시)

```
1. 사용자 클릭
2. useCoinGate.ensurePaidAccess({ requestId })
   └─ billing-client.runPaidAccessGate({ requestId })
       └─ gateRequestId = input.requestId (게이트 호출당 1회 고정)
           └─ 결제 실행 (단건/코인/월정석/이용권)
               └─ 서버 원장에 requestId 가 메타로 저장됨
3. 생성 요청 (SSE /generate)
   └─ body.requestId = 위 requestId
       └─ worker verifyPerUsePayment 가 같은 requestId 로 증빙 조회
           └─ proven=true → 생성 진행
```

### 2.3 증빙 조회 방식 (worker/lib/nakshatra-paid-access.js)

`verifyPerUsePayment` 는 **requestId 를 DB 조회의 열쇠**로 사용한다 (클라이언트가 보낸 값을 신뢰하지 않음):

| 증빙 경로 | 조회 조건 | 비고 |
|---|---|---|
| 단건결제 (`findPaidPayment`) | `Payment` 문서에서 `requestId` / `idempotencyKey` / `merchantUid` / `impUid` 중 하나와 일치 | `status ∈ [paid, success, fulfilled]` |
| 코인·월정석 차감 (`findDeduction`) | `PointHistory` deduct 에서 `metadata.requestId` / `metadata.idempotencyKey` / `metadata.purchaseId` / `metadata.orderId` 중 하나와 일치 | `kind: "deduct"` |
| 월정석 원장 (`findMonthlyLedger`) | `findMoonstoneSpendEvidence` — MonthlyCreditLedger 에 `tokens: [requestId]` | 정본은 `worker/lib/moonstone-spend-proof.js` |
| 이용권 / admin | `User.findById` → `canUseByPass` / `familyQuota.eligible` / `role === "admin"` | 차감 기록이 없는 정상 경로 |

**판정 규칙:**
- `proven === true` → OK
- `proven === false` → 402 (결제 필요) → 생성 차단
- `proven === null` → DB 일시 장애 → **503 (재시도 가능), 절대 402로 바꾸지 말 것**

### 2.4 🔴 유력 원인 (확인 필요 항목)

**가설: 클라이언트가 결제 시 사용한 requestId 와 생성 요청 시의 requestId 가 서로 다르다.**

- `useCoinGate.ensurePaidAccess` 가 **호출하는 측에서 requestId 를 넘기지 않으면** `billing-client` 가 자체적으로 requestId 를 생성한다 (`resolvePaidFeatureInFlightKey` / `gateRequestId`).
- 초융합 페이지 컴포넌트가 `ensurePaidAccess` 호출 시 requestId 를 만들고, **이후 생성 요청(SSE) 때 별도 requestId 를 새로 만들어 보내면** worker 의 `verifyPerUsePayment` 가 결제 증빙을 못 찾아 `NO_RECORD` → proven: false → **402** 로 생성이 차단된다.

**확인해야 할 지점:**
1. `app/fusion-fortune/FusionFortuneClient.tsx` (또는 하위 컴포넌트) 의 submit 코드
   - `ensurePaidAccess({ requestId })` 에 requestId 를 넘기는가?
   - 생성 요청(`/api/fusion-fortune/generate` 또는 `/generate/stream`)의 `body.requestId` 에 **가장 최근 ensurePaidAccess 와 같은 값**을 넘기는가?
2. `billing-client.ts` 의 `runPaidAccessGate` 에서 requestId 미전달 시 생성 규칙
   - `gateRequestId = toText(input.requestId || activeAttempt.attemptId || inFlightKey)`
   - requestId 가 없으면 매 호출마다 달라지는 값이 될 수 있음
3. `runBillingCoinGate` / `resolvePaidFeatureInFlightKey` 의 requestId 생성 규칙

**수정 방향 (예상):**
- 초융합 페이지에서 `useRef` 로 **requestId 를 1회 생성**하고, `ensurePaidAccess` 와 이후 생성 요청 모두에 **같은 requestId 를 전달**
- 또는 `ensurePaidAccess` 의 반환값에 서버가 승인한 requestId 가 있다면 그것을 재사용

### 2.5 수정 시 반드시 지킬 규칙

- 결제 증빙은 서버가 DB 에서 읽은 문서로만 판정한다 (`billing-client` 주석 원칙).
- requestId 재시도 멱등성 유지: 같은 requestId 로 재시도 시 이중 과금 없어야 한다.
- `proven === null` (DB 블립) 은 **402 로 세탁하지 말 것**, 503 재시도로 표면화.
- 월정석 원장 증빙은 `worker/lib/moonstone-spend-proof.js` 하나만 참조 (사본 금지).
- 관련 테스트: `__tests__/worker/per-use-proof-roundtrip.test.js` (writer↔reader 왕복 고정), `npm run verify:paid-gate-ui`, `npm run verify:ai-prompt-billing-policy` 등.

---

## 3. UI/UX 개편 요구사항 (수정 우선순위 2)

### 3.1 금지 사항

- ❌ 첫 화면부터 운세별 결과 나열 ("그래서 뭐가 제일 중요한데?" 느낌)
- ❌ 운세별 강한 원색 대비 (사주=빨강, 자미두수=보라, 베다=노랑, 점성술=파랑, 숙요=초록 식의 "운세 박람회")
- ❌ 단순 원형 그래프 — "행성 궤도 같은 구조" 여야 한다

### 3.2 전체 구조 (12단계)

| # | 섹션 | 내용 |
|---|---|---|
| ① | INTRO | `YOUR DESTINY IS MORE THAN ONE STORY` / "초융합 운세 — 5개의 운세 체계가 당신의 운명을 동시에 읽었습니다." |
| ② | DESTINY CORE | 화면 중앙에 거대한 원형「운명의 핵」, 주변 5개 궤도(사주·자미두수·베다점·점성술·숙요점)가 회전. 분석 결과에 따라 궤도 밝기/속도 변화 |
| ③ | FUSION SCORE | `73 / 100` — "당신의 운명 에너지" |
| ④ | 5 ORACLES | "5개의 운명 관측소": ☯ 사주(THE ELEMENTS), 🌌 자미두수(THE DESTINY MAP), 🪐 서양 점성술(THE COSMIC SELF), 🕉 베다점(THE KARMA PATH), 🌙 숙요점(THE RHYTHM). 각각 클릭 시 해당 세계로 진입 |
| ⑤ | WHERE THEY AGREE | `WHERE THE STARS AGREE — 다섯 개의 운세가 동시에 가리키는 방향`. 예: "5개 중 4개가 2026년 하반기 인간관계의 확장" + 체계별 일치도 바 (사주 91%, 자미두수 84%, 베다점 76%, 점성술 89%, 숙요점 81%) |
| ⑥ | WHERE THEY DISAGREE | `⚡ WHERE THE STARS DISAGREE — 모든 운세가 같은 이야기를 하는 것은 아닙니다`. 예: 💰 재물 — 사주(안정적 축적) vs 자미두수(적극적 확장) vs 베다점(리스크 관리 필요) → **AI 종합 해석 하나** |
| ⑦ | LIFE MAP | `YOUR LIFE MAP` — ❤️ 연애 / 💰 재물 / 💼 직업 / 👥 인간관계 / 🧭 인생 방향 / 📅 2026년 흐름 (연도 연동). 점수 클릭 시 5개 체계가 어떻게 그 점수를 만들었는지 드릴다운 |
| ⑧ | TIME FLOW | 2026 → 2027 → 2028 흐름 |
| ⑨ | DESTINY FLOWER | 「운명의 꽃」 — 5개 체계가 각각 꽃잎 하나. 처음엔 닫힘 → 사주 완료=1번째 꽃잎, 자미두수=2번째 … 마지막 `🌸 DESTINY FUSION COMPLETE` 완전 개화 연출 |
| ⑩ | AI FINAL READING | "그래서 지금 당신에게 필요한 것은?" |
| ⑪ | ACTION GUIDE | DO / AVOID / WATCH |
| ⑫ | SHARE CARD | `MY DESTINY FUSION` 공유 카드 |

### 3.3 컬러/디자인 원칙

- 기본: **거의 검은 남색 + 우주색** (`#0a0e1a` 계열 추천) 으로 통일
- 5개 운세는 **작은 accent** 만 부여 (라벨/궤도 포인트 등 소량)
- "운세별 색 강하게" 금지
- 몰입형 React 운세 경험 규칙 준수: 공용 헤더·푸터·모바일 하단 내비게이션 **렌더하지 않음**, 페이지 안에서 홈·뒤로가기 이탈 제어 제공

### 3.4 데이터 구조 반영 필요 (worker 결과 → UI)

현재 결과 JSON 구조와 신규 UI 요구 섹션 간 매핑을 확인해야 한다:

| 신규 섹션 | 필요한 데이터 |
|---|---|
| ② DESTINY CORE | 5개 체계별 에너지/밝기 값, 융합 점수 |
| ③ FUSION SCORE | 0~100 단일 점수 |
| ④ 5 ORACLES | 체계별 요약: 주제(영문 태그), 설명, 수치형 속성 2~3개 (강점/변화성/안정성, 커리어/재물/관계 등) |
| ⑤ AGREE | 공통 신호 문장 + 체계별 일치도 % |
| ⑥ DISAGREE | 영역별 체계별 상충 의견 + AI 종합 해석 |
| ⑦ LIFE MAP | 영역(연애/재물/직업/인간관계/방향/성장)별 0~100 점수 + 체계별 기여 |
| ⑧ TIME FLOW | 연도별 흐름 문장 (2026~2028) |
| ⑨ FLOWER | 꽃잎 개화 진행 — 생성 단계(stage)와 매핑 가능 |
| ⑩ FINAL READING | 최종 종합 문장 |
| ⑪ ACTION GUIDE | DO/AVOID/WATCH 3분류 |
| ⑫ SHARE CARD | 대표 점수+핵심 문장 (og:image 유사 디자인) |

> 🔴 **확인 필요**: `worker/lib/fusion-fortune.js` 의 `FUSION_SECTION_GROUP_SPECS` 가 위 필드를 모두 생성하는지. 부족하면 프롬프트 스펙 확장과 폴백(`buildValidatedFusionFallback`) 갱신이 함께 필요하다. LLM 응답 구조 변경은 `app/fusion-fortune/FusionFortuneClient.tsx` 의 렌더러와 쌍으로 수정해야 한다.

---

## 4. 작업 순서 (권장)

1. **결제 버그 재현·원인 확정**
   - `app/fusion-fortune/FusionFortuneClient.tsx` 의 submit 흐름에서 requestId 전달 경로 확인
   - `billing-client.ts` 의 `resolvePaidFeatureInFlightKey` / `runPaidAccessGate` requestId 생성 규칙 확인
   - 버그 수정 (requestId 1회 생성 → 결제·생성 공용)
2. **버그 수정 검증** (아래 §5 참고)
3. **UI/UX 개편**
   - 먼저 fetch 데이터 ↔ 신규 섹션 매핑 확인 (안 되면 worker 프롬프트 스펙 확장)
   - 페이지를 12단계 섹션 컴포넌트로 재구성 (`app/fusion-fortune/` 내 신규 컴포넌트)
   - 컬러 팔레트 통일 (Tailwind 변수 또는 CSS 변수)
4. **검증**: §5 목록 실행
5. **배포**: 브랜치 → PR → CI → 머지 (운세 페이지 변경은 `standard` 티어 예상, 결제 흐름 포함 시 `critical` 가능성)

---

## 5. 검증 계획

### 5.1 결제 버그 수정 검증

- [ ] `npm run verify:portone-single-payment`
- [ ] `npm run verify:paid-gate-ui`
- [ ] `npm run verify:paid-feature-billing-policy`
- [ ] `npm run verify:ai-prompt-billing-policy`
- [ ] `npm run verify:billing-pass-policy`
- [ ] `npm test` (관련 테스트: `__tests__/worker/per-use-proof-roundtrip.test.js` 등)
- [ ] 실기기/로컬에서: 단건 결제 → SSE 생성 성공 → 결과 수신 확인
- [ ] 실기기/로컬에서: 결제 후 새로고침 → 같은 requestId 재시도 → **이중 과금 없이** 생성 성공 확인

### 5.2 UI/UX 검증

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build:cf` (standard 티어)
- [ ] 모바일(375px) / 데스크톱(1440px) 렌더 확인
- [ ] 결제 후 SSE 단계별 진행 → 운명의 꽃 개화 연출 타이밍 확인
- [ ] 한국어 인코딩: 변경 텍스트에 U+FFFD, `Ã`, `Â` 등 깨짐 문자 없는지 확인 (`npm run verify:entry-encoding -- --strict-core` 해당 시)

---

## 6. 변경 시 반드시 지킬 규칙 (AGENTS.md 요약)

- `main` 직접 push 금지. 브랜치 → PR → 머지가 곧 베타/프로덕션 배포 승인.
- 로컬에서 `wrangler deploy` 류 금지 (production-deploy-guard).
- 실결제/실 LLM/프로덕션 DB 쓰기는 명시 승인 없이 금지. 목/샌드박스/테스트 DB 만.
- `public/**/index.html` 미러는 직접 수정 금지 — root `index.html` 만 수정 후 `npm run sync:public`.
- 몰입형 React 운세 페이지는 공용 헤더·푸터·모바일 하단 내비 미렌더.
- UI/UX 신규 이미지 에셋은 repo-local WebP, 외부 핫링크 금지.
- 운세 시스템(사주·자미두수·베다·점성술·숙요)을 혼합하지 말 것 — 각 체계는 자기 설명만.
- 확정된 용어 유지: `이용권` `월정석` `단건 결제` — 새로운 사용자향 코인 결제 문구 도입 금지.

---

## 7. 아직 조사 안 된 / 확인 필요한 항목

| 항목 | 상태 |
|---|---|
| `app/fusion-fortune/FusionFortuneClient.tsx` 의 submit 코드 requestId 인자 | ❌ 미확인 — 버그 원인 확정을 위해 **최우선 확인** |
| `billing-client.ts` `resolvePaidFeatureInFlightKey` 동작 | ⚠️ 달 일부 확인 (requestId 생성/추출), 함수 본문 미확인 |
| `worker/lib/fusion-fortune.js` 결과 JSON 의 전체 필드 (신규 UI 12섹션에 필요한 데이터 커버리지) | ❌ 미확인 |
| `app/fusion-fortune/` 의 현재 컴포넌트 구조 (기존 UI 코드) | ❌ 미확인 — 개편 시 기존 로직 재사용 여부 판단 필요 |
| SSE stage 이벤트가 운명의 꽃 개화에 매핑 가능한지 | ❌ 미확인 (stage 종류 목록 필요) |
| SHARE CARD 의 og:image 등 공유 메타 처리 | ❌ 미확인 |

---

## 8. 롤백 경로

- 버그 수정·UI 개편은 전부 **기능 분기 브랜치**에서 진행. PR 머지 전이면 브랜치 삭제로 원복.
- 머지 후 문제 발견 시: 이전 정상 커밋 SHA 확인 → `git revert` (또는 롤백 PR). 워커/페이지 모두 같은 SHA 로 배포되는 원칙 유지.
- 결제 흐름 수정은 `docs/PAYMENT_AND_ACCESS.md` 및 결제 정책 3종 문서 확인 후 진행.