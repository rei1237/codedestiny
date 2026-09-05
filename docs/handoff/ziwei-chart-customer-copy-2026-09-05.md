---
status: active
updated: 2026-09-05
next: main 에서 새 브랜치를 따 PR2(선택 궁 패널을 챕터 산문 아코디언으로)를 시작한다
---

# 심화 자미두수(`/ziwei/chart`) 고객 문구·모바일 UX 개편

## 왜

"심화 자미두수가 고객 대상이 아니라 개발 문서처럼 보이고 모바일 UI/UX 도 부족하다. 급선무는 문구·내용을 고객 대상 심화 설명으로 바꾸는 것." (2026-09-05)
결정: 카피 PR 먼저 → 모바일은 목업 승인 후 / 해석 문장은 한국어 유지, 라벨만 5로케일 / 궁별 장문은 접이식 / 유료 PDF 패널은 범위 밖.

## 지금 상태

- PR1(문장·라벨 고객화, 레이아웃 불변) = **PR #1579 머지됨**(2026-09-05, main `d9b6bf4ee`). 스테이징 자동 배포 대상.
- PR2·PR3 미착수. 계획 원문: `C:\Users\user\.claude\plans\snappy-stargazing-breeze.md` §PR2·§PR3.

## 남은 작업

- [ ] **PR2** — `app/_lib/ziwei-deep-reading.ts:1159` `splitCategoryBodies` 를 `export function splitZiweiDeepCategories(fullText): {title, body}[]` 로 승격. `app/components/AdvancedZiweiSectionV2.tsx:1472-1482` 선택 궁 패널을 ① `summary[]` 리드 ② 8절 아코디언(첫 절만 열림, 본문 `components/fortune/AiResultProse.tsx:95`) ③ `remedies/actionItems` · `routine7Days/routine30Days` 로 교체. 용어 툴팁은 `components/fortune/GlossaryTerm.tsx:22` + `worker/lib/fortune-glossary.js:73 describeTerm`, 대상 20개는 계획 §PR2. 재구현 금지.
- [ ] PR2 삭제: `app/components/ziwei/ZiweiMasterPlan.tsx`·`ZiweiRemedyChecklist.tsx` — 2026-09-05 `git grep` 0건(자기 파일 제외). `deletion-auditor` 3면 확인 후 삭제.
- [ ] PR2 캐시: 저장 형태 불변이면 `AdvancedZiweiSectionV2.tsx:82` v9 유지, 챕터 생성기 문구를 건드리면 v10.
- [ ] **PR3** — 코드 전에 목업 아티팩트(375/960px, 상태 스펙, 색 토큰, 합성색 대비) → 승인 → 구현. 구현 시 `scripts/verify-ziwei-chart-customer-copy.mjs:16` 의 `TODO(PR3)` 격자 폰트 검사를 켜고 검사 수 단언에 넣는다.
- 판정: PR2 는 선택 궁 패널에 스코프 칩·밝기 카운트·키워드 슬라이스가 없고 8절이 렌더되며 가드 + `verify:mobile-detail-nonintrusive` 통과. PR3 는 375px 가로 오버플로 0, 격자 글자 12px 이상.

## 정본 예시

- 문장 빌더 `app/components/ziwei/_lib/advanced-ziwei-reading.ts`, 라벨 `advanced-ziwei-copy.ts`(새 키는 EN 상수 + ko/ja/zh-CN/zh-TW 5블록 전부)
- 아코디언 짝: `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx` `kdai-chapter`

## 함정

- 가드 검사 1은 빌더 출력만 본다. PR2 챕터 산문은 `ziwei-deep-reading.ts:1202` `validateZiweiDeepReading` 이 이미 검증하므로 가드에 다시 넣지 않는다.
- `__tests__/ui/paid-result-locale-copy.test.js` 는 jest 가 무시한다 → `node --test`.
- CRLF 패치·workers-og 로컬 빌드 실패는 메모리 `patch-crlf-files-with-a-node-script`·`local-build-worker-fails-workers-og-missing`.
- `normalize-ziwei-input.ts:185-254` ko 경고 문장에 "계산/데이터" 가 남아 있다(범위 밖, 미수정).

## 검증

```
npm run verify:ziwei-chart-customer-copy
npm run verify:ziwei-deep-report-flow
npm run verify:ziwei-deep-counseling-quality
npm run verify:guard-wiring
npm run verify:hero-contrast
npm run typecheck && npm run lint
npm run sitemap:generate && npm run verify:sitemap-drift
node --test __tests__/ui/paid-result-locale-copy.test.js
```

## 모르는 것

- PR3 결과 화면 계측: `measure:mobile-routes` 는 입력 화면만 잰다. 폼 입력 뒤 캡처 방법은 미검증.
- 셸 타일 액션이 `paid-feature-registry.js` 의 `premium-ziwei` 별칭으로 남아 있는데 타일은 "명반 무료" 표기 — 정리 여부는 사용자 판단.
