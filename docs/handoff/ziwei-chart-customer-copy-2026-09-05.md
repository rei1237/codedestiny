---
status: active
updated: 2026-09-05
next: PR #1583 이 머지되면 main 에서 새 브랜치를 따고, 코드보다 먼저 PR3 모바일 IA 목업 아티팩트를 발행해 승인받는다
---

# 심화 자미두수(`/ziwei/chart`) 고객 문구·모바일 UX 개편

## 왜

"심화 자미두수가 고객 대상이 아니라 개발 문서처럼 보이고 모바일 UI/UX 도 부족하다. 급선무는 문구·내용을 고객 대상 심화 설명으로 바꾸는 것." (2026-09-05)
결정: 카피 PR 먼저 → 모바일은 목업 승인 후 / 해석 문장은 한국어 유지, 라벨만 5로케일 / 궁별 장문은 접이식 / 유료 PDF 패널은 범위 밖.

## 지금 상태

- PR1(문장·라벨 고객화, 레이아웃 불변) = **PR #1579 머지됨**.
- PR2(선택 궁 패널 → 챕터 산문 아코디언) = **PR #1583 열림, 사용자 머지 대기**. 로컬 게이트 전부 통과(문구 가드·리포트 흐름·상담 품질·모바일·대비·배선·로케일 키·typecheck·lint·sitemap·check:quick). CI 결과는 PR 에서 확인.
- PR3 미착수. 계획 원문: `C:\Users\user\.claude\plans\snappy-stargazing-breeze.md` §PR3.

## 남은 작업

- [ ] **PR3** — 코드 전에 목업 아티팩트(375/960px, 상태 스펙, 색 토큰, 합성색 대비) → 승인 → 구현. 구현 시 `scripts/verify-ziwei-chart-customer-copy.mjs:16` 의 `TODO(PR3)` 격자 폰트 검사를 켜고 검사 수 단언에 넣는다.
- [ ] PR2 가 머지된 뒤 마지막 `main` 에서 `npm run check:critical` 한 번(원칙 9 — 삭제 #1569 와 PR2 가 다른 PR 로 나뉘었다).
- 판정: PR3 는 375px 가로 오버플로 0, 격자 글자 12px 이상.

## PR2 가 남긴 것 (PR3 가 딛고 갈 지점)

- `app/_lib/ziwei-deep-reading.ts` `export splitZiweiDeepCategories(fullText): {title, body}[]` — 🔴 절 분리 정본. 화면이 `### N.` 정규식을 따로 들지 말 것.
- `AdvancedZiweiSectionV2.tsx` 선택 궁 패널 = 리드 → 8절 아코디언(`openSections` 상태, 궁 바꾸면 `[0]` 리셋) → 용어 칩 → 지금/이번 주/이번 달. 개관·마스터플랜은 0절이라 통짜 산문으로 떨어진다.
- 용어 칩은 `worker/lib/fortune-glossary.js` 의 `system: "ziwei"` 20항목 중 본문에 실제로 나온 것만. 모듈 상단 `ZIWEI_GLOSSARY_ENTRIES` 한 벌.
- 결과 캐시 `RESULT_CACHE_KEY` 는 v9 유지(저장 형태 불변).
- 삭제 예정이던 `ZiweiMasterPlan.tsx`·`ZiweiRemedyChecklist.tsx` 는 **#1569 에서 이미 제거됨** — `deletion-auditor` 3면 0건 확인. 할 일 없음.

## 정본 예시

- 문장 빌더 `app/components/ziwei/_lib/advanced-ziwei-reading.ts`, 라벨 `advanced-ziwei-copy.ts`(새 키는 EN 상수 + ko/ja/zh-CN/zh-TW 5블록 전부)
- 아코디언 짝: `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx` `kdai-chapter`

## 함정

- 가드 검사 1은 빌더 출력만 본다. 챕터 산문은 `ziwei-deep-reading.ts` `validateZiweiDeepReading` 이 검증하므로 가드에 다시 넣지 않는다.
- `__tests__/ui/paid-result-locale-copy.test.js` 는 jest 가 무시한다 → `node --test`.
- `check:quick` 이 `rss.xml`·`public/rss.xml`·`insights/rss.xml`·`public/insights/rss.xml` 의 `lastBuildDate` 와 `.ignore` 줄끝을 건드린다 — 범위 밖이므로 커밋 전에 `git checkout --` 로 되돌린다.
- CRLF 패치·workers-og 로컬 빌드 실패는 메모리 `patch-crlf-files-with-a-node-script`·`local-build-worker-fails-workers-og-missing`.
- `normalize-ziwei-input.ts:185-254` ko 경고 문장에 "계산/데이터" 가 남아 있다(범위 밖, 미수정).

## 검증

```
npm run verify:ziwei-chart-customer-copy
npm run verify:ziwei-deep-report-flow
npm run verify:ziwei-deep-counseling-quality
npm run verify:mobile-detail-nonintrusive
npm run verify:guard-wiring
npm run verify:hero-contrast
npm run typecheck && npm run lint
npm run sitemap:generate && npm run verify:sitemap-drift
node --test __tests__/ui/paid-result-locale-copy.test.js
npm run check:quick
```

## 모르는 것

- PR3 결과 화면 계측: `measure:mobile-routes` 는 입력 화면만 잰다. 폼 입력 뒤 캡처 방법은 미검증.
- PR2 아코디언·용어 칩의 실제 모바일 렌더는 **브라우저로 확인하지 않았다**(실측은 절 분리·데이터 개수까지). 용어 칩이 궁에 따라 최대 16개라 375px 에서 2~3줄이 될 것으로 추정 — PR3 목업에서 확정한다.
- 셸 타일 액션이 `paid-feature-registry.js` 의 `premium-ziwei` 별칭으로 남아 있는데 타일은 "명반 무료" 표기 — 정리 여부는 사용자 판단.
