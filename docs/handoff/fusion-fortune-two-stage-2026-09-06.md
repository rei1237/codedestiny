---
status: active
updated: 2026-09-06
next: Phase 1 PR 이 머지됐는지 `gh pr list --state all --search "fusion two-stage"` 로 확인한 뒤, Phase 2(UI/UX 고급화) 목업을 먼저 발행한다(CLAUDE.md 원칙 16).
---

# 초융합 운세 개선 — 2단계 생성(Phase 1) 이후

## 왜

사용자 요구: 초융합 운세 분량 ~20,000자 → **30,000~40,000자**, UI/UX 고급화, 모바일 최적화. 게이트 방식(Phase 0 진단 → 승인 → Phase 1~4). 데스크톱 레이아웃 불변, 6개 역술 엔진·`calculateLocalResult()`·`normalizeSaju.ts` 읽기 전용, 사용자 문자열은 12 로케일 인라인 테이블(하드코딩 금지), 저장 포맷 forward-fix only, 결제 실행 파일 범위 밖.

## 지금 상태

- Phase 0 진단·Gate 1 완료. 사용자 선택: **B. 2단계 요청** · 데스크톱 레이아웃 불변 · 이번 세션 Phase 1 만.
- Phase 1 구현 완료 — 브랜치 `worktree-fusion-two-stage`, PR 1개(커밋은 계획 단계별). 머지 여부는 `gh pr list` 가 정본.
- 실제 Gemini 호출 0회. 모든 수치는 mock 실측.

## 남은 작업

- [ ] **Phase 2 UI/UX 고급화** — 목업 아티팩트 발행 → 승인 → 구현. 데스크톱 1080/1160px·72ch 불변. 결과 스레드 렌더러 `app/fusion-fortune/FusionResultThread.tsx`.
- [ ] **Phase 3 모바일 최적화** — `verify:mobile-detail-nonintrusive` 통과 기준. 데스크톱 미디어쿼리 밖만 손댄다.
- [ ] **Phase 4 실검증** — 사용자 승인 하 `--live` **1회**, 5건 샘플(생시 유무 × 출생지 유무 조합 포함)로 총 글자·그룹당 소요·물타기 여부 확인. 판정 기준: 5건 모두 ≥30,000자·`degraded` 0건·단계당 120초 안.
- [ ] **후속(범위 밖 보고)**: ① 프롬프트 캐싱 미배선 — `createGeminiContextCache`(`worker/lib/gemini.js`)가 있으나 초융합 경로에 안 붙어 있다. 붙이려면 서버 컨텍스트를 프롬프트 앞으로 재배치해야 한다(절감 ₩30–50/건 추정). ② `visibleTextLength` 가 JSON 직렬화 길이라 이름과 의미가 어긋난다(`worker/lib/fusion-fortune-consultation.js`). 표시에 쓰이는 곳이 있는지 3면 grep 후 결정. ③ 관리자 프롬프트 랩이 그룹 수를 하드코딩하는지 **미검증**(`worker/routes/admin*.js` 에서 `FUSION_SECTION_GROUP_SPECS` 참조 0건, 범위 `worker/routes`·`worker/lib`).

## 정본 예시

- 단계·그룹 계약: `worker/lib/fusion-fortune-prompt.js` 의 `FUSION_SECTION_GROUP_SPECS`(`stage` 필드) · `fusionGroupsForStage` · `buildFusionStageOneDigest`
- 단계 오케스트레이션·`#s2` 예약·`STAGE_ONE_MISSING`: `worker/lib/fusion-fortune.js` 의 `generateFusionFortuneRequest`
- 클라이언트 단계 루프·자동 재개·이어서 생성: `app/fusion-fortune/FusionFortuneClient.tsx` 의 `runGeneration` · `continueGeneration`

## 함정

- 1단계 보관본은 `status: "partial"` 이라 **목록에 안 나온다**. `?requestId=` 조회만 상태 무관 — 자동 재개가 이 경로다. 목록 필터를 바꾸면 partial 이 노출된다.
- `retryable: true,` 바로 뒤에 `issues:` 가 와야 한다(UI 정적 테스트가 그 짝을 고정). 서버 실패 반환 순서를 바꾸지 말 것.
- `rememberPaidRequest(requestId, requestBody)` 가 소스에서 첫 `/api/fusion-fortune/generate/stream` 보다 **앞에** 있어야 한다(`verify:fusion-fortune-retry-payload`).
- 분량 문구를 바꾸면 12 로케일 + `__tests__/ui/fusion-fortune.static.test.js` + `docs/LLM_AND_AI_POLICY.md` 를 같이 바꾼다.
- 워크트리에 `node_modules` 없음 — jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node`, UI 는 `node --test`.

## 검증

```
npm run verify:fusion-fortune-quality && npm run verify:fusion-fortune-delivery-floor && npm run verify:fusion-fortune-reopen && npm run verify:fusion-fortune-retry-payload && npm run verify:fusion-fortune-pdf && npm run verify:fusion-fortune-stage-flow && npm run verify:guard-wiring
node --test __tests__/ui/fusion-fortune.static.test.js
```

## 모르는 것

- 실제 Gemini 가 그룹당 4,200자 목표를 얼마나 채우는지(mock 은 36,687자). Phase 4 의 `--live` 1회로만 알 수 있다 — 사용자에게 승인을 받는다.
- Phase 2 의 "고급화" 기준(참고 디자인·톤)이 정해지지 않았다. 목업 전에 사용자에게 묻는다.
