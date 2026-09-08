---
status: active
updated: 2026-09-08
next: "12개 전문가 상담의 다기기 실측을 끝낸 뒤, 작명 상담의 입력·무료 초안·유료 결과 재열람 흐름을 조사하고 별도 UI/UX 개선을 시작한다."
---

# 전문가 상담 프리미엄 UX 확장

## 왜

사용자는 Code Destiny의 전문가 상담을 결제·권한·결과 생성 로직은 그대로 둔 채, 주제별 고급 상담소 경험으로 개선해 달라고 요청했다. 우선순위는 운명의 업, 베다점, 신년운세 연도 선택이며 최종 범위는 12개 전용 상담 화면이다.

## 지금 상태

- 활성 워크트리: `D:\Development\code-destiny-expert-consulting`, 브랜치 `codex/expert-consulting-premium`; PR은 아직 만들지 않았다.
- 베다점: 별빛 사원 WebP, 방사형 차트 대신 달빛 아스트롤라베 장식, 가치 카드, 폼 앵커/모바일 CTA를 추가했다.
- 운명의 업: 카르마 정원 WebP, 인라인 전역 헤더 숨김 규칙 제거, AppChrome의 자체 화면 등록, 가치 카드/폼 앵커/모바일 CTA를 추가했다.
- 운명의 업 히어로: CSS 방사형 도식·글리프·상태 배지를 텍스트 없는 달빛 카르마 정원 WebP로 교체했다. 360px·데스크톱에서 배경 로드와 가로 오버플로 없음을 확인했고, 프로필 불러오기 버튼의 터치 영역을 44px로 보정했다.
- 신년운세: 기존 히어로는 유지하고 연도 칩의 선택 상태·직접 입력 상태·상태 문구만 강화했다.

## 남은 작업

- [ ] 실기기 또는 CDP에서 12개 화면을 360px, 390px, 430px 및 데스크톱으로 실측한다. CTA가 safe-area와 하단 내비게이션을 덮지 않고, 모든 입력이 44px 이상 터치 영역이면 완료다.
- [ ] 숙요 궁합은 회귀 없이 유지되는지 실제 첫 화면과 재열람 진입만 확인한다.
- [ ] 신규 화면별 mock 로그인/비로그인에서 이용권·월정석·단건 결제 선택 UI를 확인한다. 실제 결제와 외부 LLM 호출은 금지한다.
- [ ] 모든 후속 수정 뒤 이 문서의 `updated`/`next`를 갱신하고, 전부 끝나면 `status: done`으로 바꾼다.

## 다음 UX 확장 — 나머지 전문가 상담

### 대상과 우선순위

1. **실측 우선** — 인생의 책, 자미두수, 점성술, 사랑의 비밀, 나크샤트라, 초융합, 운명의 섬, 운명의 찻집, 네오 전략실의 첫 화면·폼 앵커·재열람 진입을 360px·390px·430px·데스크톱에서 확인한다.
2. **정보 우선순위 정리** — 첫 화면에서는 상담의 주제, 무엇을 받는지, 입력 시작 행동만 빠르게 이해되게 한다. 각 체계의 전문 용어 설명과 긴 소개문은 폼 뒤 또는 상세 안내로 보낸다.
3. **행동 통일** — 공통 프레임의 `ExpertValueCards`와 `ExpertStickyCta`를 유지한다. CTA는 기존 폼 앵커만 가리키고, 실제 제출·결제 버튼은 해당 기능의 원래 소유 컴포넌트에 남긴다.
4. **체계별 개성 보존** — 인생의 책·사랑의 비밀·찻집은 연이의 따뜻한 결을, 자미두수·나크샤트라·초융합·네오는 해석 근거와 전략성을 살린다. 한 화면의 팔레트나 아트를 다른 상담에 기계적으로 복사하지 않는다.

### 공통 완료 기준

- CTA·입력·선택 컨트롤은 44px 이상이며, 고정 CTA는 safe-area와 하단 내비게이션을 가리지 않는다.
- 모바일 첫 화면은 가로 오버플로가 없고, 결과·재열람 진입과 폼 앵커가 유지된다.
- `PriceBadge`, `runBillingCoinGate`, `usePaidResume`, 기존 제출 handler와 결과 라우트를 바꾸지 않는다.
- mock 로그인/비로그인에서 이용권·월정석·단건 결제 선택 UI만 확인한다. 실결제·외부 LLM·운영 DB를 호출하지 않는다.

## 다음 UX 확장 — 훈민정음 작명소

### 현행 정본과 범위

- 진입: `app/naming-ai/page.tsx` → `NamingAiRouteClient.tsx` → `NamingAiClient.tsx`
- 결과·재열람: `app/naming-ai/result/NamingAiResultClient.tsx` 및 `retryHandoff.ts`
- 유료 게이트: `NamingAiClient.tsx`의 기존 `runBillingCoinGate`, `usePaidResume`, `PriceBadge`

### 개선 목표

1. **입력 흐름을 작명 순서로 보이게 한다.** 출생 정보 → 성씨·작명 목적 → 원하는 결·후보 조건 → 무료 초안 → 프리미엄 상세 결과의 순서를 명확히 한다. 이미 입력한 값과 프로필 카드에서 채워진 값은 덮어쓰지 않는다.
2. **무료와 유료의 경계를 투명하게 만든다.** 무료 초안에서 확인 가능한 후보·분위기와 프리미엄 결과에서 확인하는 용신 검증·한자 조합·소리오행·수리 분석을 구분해 설명한다. 기존 가격·이용권·월정석·단건 결제 문구 및 데이터 소스는 그대로 쓴다.
3. **이름 후보 비교를 읽기 쉽게 만든다.** 이름 자체, 발음·의미, 사주 보완 방향, 주의할 점을 짧은 계층으로 제시한다. 길흉·인생 결과를 단정하거나 공포를 조장하지 않는다.
4. **결과 재열람의 맥락을 보존한다.** 결제 후 결과, PDF 또는 저장 기능, 재시도·재열람 계약은 UI 개선 중에도 기존 동작을 그대로 유지한다.

### 작명 상담 금지 사항

- 작명 UI 변경을 이유로 사주 계산, 한자 후보 풀, 결과 생성, 결제·환불·이용권 로직을 수정하지 않는다.
- ‘무료 제공’, ‘무제한’, ‘평생’, 성공·개명 효과 보장 같은 정책 또는 결과 보장 문구를 추가하지 않는다.
- 아기 이름·개명·상호 등 목적별 조건을 하나의 입력값으로 뭉개거나, 사용자가 이미 고른 후보를 지우지 않는다.

### 작명 상담 검증

```powershell
npm run typecheck
npm run verify:paid-gate-ui
npm run verify:ai-consultation-flows
npm run verify:handoff-contract
npm run check:fast -- --plan
```

- UI 변경 뒤에는 360px·390px·430px·데스크톱에서 입력, 무료 초안, 유료 게이트 진입 직전, 결과 재열람을 mock으로 확인한다.
- `app/naming-ai`의 실제 사용자 흐름과 충돌하지 않는 한, 공통 모바일 래퍼 대신 작명 화면 소유 CSS에서만 시각 문제를 고친다.

## 이번 작업 인수인계

- [x] 표시 전용 공통 프레임을 인생의 책·자미두수·점성술·사랑의 비밀·나크샤트라·초융합·운명의 섬·연이·네오까지 확장했다. 기존 이미지, 컨셉, 폼 제출, `PriceBadge`, 결제 게이트는 유지한다.
- [x] 모든 신규 CTA는 기존 폼으로 이동하는 앵커이며 실제 제출·결제 로직을 호출하지 않는다.
- [x] `typecheck`, `verify:paid-gate-ui`, `verify:ai-consultation-flows`, `verify:handoff-contract`, `verify:mobile-detail-nonintrusive`, `verify:mobile-detail-render`, `verify:hero-contrast`를 통과했다.
- [ ] 390x844 렌더 검증과 현재 로컬 화면의 오버플로 검사는 통과했다. 12개 화면의 360px·390px·430px 런타임 실측 완료는 여전히 남아 있다.
- [ ] 이번 세션에서 CUA viewport capability로 운명의 업 360px·데스크톱은 실측했으나, 나머지 11개 상담 화면과 390px·430px 실측은 여전히 남아 있다.
- [ ] `check:ui`는 기존 `config/sitemap-lastmod.json` 드리프트에서 중단되므로 이번 UX 작업에서 사이트맵은 건드리지 않는다.

## 정본 예시

- [app/karma-destiny-ai/KarmaDestinyAiClient.tsx](../../app/karma-destiny-ai/KarmaDestinyAiClient.tsx) — 기존 `runBillingCoinGate`, `usePaidResume`, 결과·재열람 흐름을 소유한다.
- [app/vedic-ai/VedicAiClient.tsx](../../app/vedic-ai/VedicAiClient.tsx) — 베다점의 기존 결제·생성 흐름을 소유한다.
- [app/components/expert-consulting/ExpertConsultationFrame.tsx](../../app/components/expert-consulting/ExpertConsultationFrame.tsx) — 표시 전용 공통 컴포넌트다.
- [app/new-year-ai-consultation/NewYearAiClient.tsx](../../app/new-year-ai-consultation/NewYearAiClient.tsx) — 연도 선택 상태를 소유한다.

## 함정

- `ExpertStickyCta`는 실제 제출·결제를 하지 않는 폼 이동 앵커다. 기존 제출 버튼, `PriceBadge`, `runBillingCoinGate`, `usePaidResume`를 대체하거나 이름을 바꾸지 말 것.
- `KarmaDestinyAiClient.tsx` 내부의 나머지 `style jsx`는 기존 화면 계약이다. 이번에는 전역 헤더 숨김 블록만 제거했고, 전체 기계적 CSS 모듈 이전은 별도 범위다.
- 이미지 두 장은 CSS background로 불러오며 폴백 색상/그라데이션이 존재한다. 파일 크기를 160KB 이상으로 키우지 말 것.
- 전체 `check:fast`는 현재 수정 범위 밖의 `config/sitemap-lastmod.json` 드리프트로 중단된다. 사이트맵 생성은 이 UX 갈래에서 실행하거나 포함하지 말 것.

## 검증

```powershell
npm run typecheck
npm run verify:paid-gate-ui
npm run verify:ai-consultation-flows
npm run verify:handoff-contract
npm run check:fast -- --plan
```

직전 실행 결과: `typecheck`, `verify:paid-gate-ui`, `verify:ai-consultation-flows` 통과. `check:fast`는 사이트맵 드리프트에서 중단. 모든 AI 흐름 검증은 mock이며 실결제·실 LLM은 실행하지 않았다.

## 모르는 것

- 실제 프로덕션 하단 내비게이션의 앱 웹뷰 safe-area 값은 로컬 mock 브라우저와 다를 수 있다. 360px·390px·430px 실기기 또는 CDP 실측이 필요하다.
- 나머지 9개 상담 화면의 현재 사용자 노출 순서와 개별 전환 KPI는 코드에서 확인되지 않았다. 디자인 확장 시 구조를 먼저 재조사하고, 기존 이미지가 좋은 화면에는 신규 자산을 추가하지 않는다.
