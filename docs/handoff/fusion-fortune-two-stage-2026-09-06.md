---
status: active
updated: 2026-09-06
next: 구조화 출력은 **머지 완료**(PR #1641). 남은 분량 미달(임계의 79~82%)에 대해 선택지 ①(스키마 `description` 에 목표 분량을 박기)을 구현해 **PR #1660 열려 있고 CI 전부 통과, 사용자 머지 대기**. 🔴 이 변경이 실제로 분량을 올리는지는 **미검증** — 확인하려면 실호출 1회 승인이 필요하다(절대 규칙 1).
---

# 초융합 운세 개선 — 2단계 생성(Phase 1) 이후

## 왜

사용자 요구: 초융합 운세 분량 ~20,000자 → **30,000~40,000자**, UI/UX 고급화, 모바일 최적화. 게이트 방식(Phase 0 진단 → 승인 → Phase 1~4). 데스크톱 레이아웃 불변, 6개 역술 엔진·`calculateLocalResult()`·`normalizeSaju.ts` 읽기 전용, 사용자 문자열은 12 로케일 인라인 테이블(하드코딩 금지), 저장 포맷 forward-fix only, 결제 실행 파일 범위 밖.

## 지금 상태

- Phase 0 진단·Gate 1 완료. 사용자 선택: **B. 2단계 요청** · 데스크톱 레이아웃 불변 · 이번 세션 Phase 1 만.
- Phase 1 머지 완료(PR #1616, `c103aefed`).
- Phase 2 머지 완료(PR #1621, `5a4bbb1cd`) — 승인된 목업 https://claude.ai/code/artifact/34037354-3cbc-4fe2-8ec1-011cc2e7b8a4 (추천안: 우측 224px sticky 차례 레일 · 핵심 문장 = `keyPoints[0]` 재사용 · 섹션 한 번에 전부 펼침). 새 파일 `app/fusion-fortune/FusionResultRail.tsx`(차례·통계·진행선) · `app/fusion-fortune/_lib/reading.ts`(글자 수·읽는 시간, 서버 `countFusionFortuneVisibleText` 와 같은 방식). 레일은 `lg` 미만에서 숨고 진행선만 남는다. 2단계 대기 말풍선은 `stageTwoGenerating={loading}` 으로 켠다.
- Phase 3 구현 완료 — 브랜치 `worktree-fusion-phase3-mobile`, 승인된 목업 https://claude.ai/code/artifact/984802dc-3e8c-454e-a66f-d382e0dd6aaa (추천안: 하단 도킹 차례 바 + `<dialog>` 바텀시트 · 좁은 화면 여백만 조정 · 첫 섹션 자동 펼침 유지). 새 파일 `app/fusion-fortune/_lib/toc.ts`(차례 상태 단일 소유자 `useFusionToc`) · `app/fusion-fortune/FusionResultDock.tsx`(도크+시트, `lg:hidden`). 레일은 훅을 쓰도록만 바뀌었고 데스크톱 화면은 그대로다.
- Phase 3 머지 완료(PR #1627, `4b3560fe5`).
- 실제 Gemini 실호출 **1회 완료**(2026-09-06, 11회 호출). 그 외 모든 수치는 mock 실측이다.

## 남은 작업

- [x] **Phase 2 UI/UX 고급화** — 위 "지금 상태". 로케일 12개 중 ko·en·ja·zh-CN·zh-TW 만 저작, vi·hi·es·fr·de·nl·ms 는 영어 복사(배치 번역 후속).
- [x] **Phase 3 모바일 최적화** — 도크·시트·섹션 헤더 줄바꿈·푸터 2열·좁은 화면 여백 4종(≤430px). 로케일 5키는 ko·en·ja·zh 저작, 나머지 7개는 영어 복사.
- [ ] 🔴 **Phase 4 실검증 — 2회 돌렸고 모두 FAIL. 원인은 확정됐다**(2026-09-06). 하네스 `scripts/verify-fusion-fortune-live.mjs`(npm `verify:fusion-fortune-live`, 플래그 없으면 호출 0으로 계획만 출력). 재현: `node --env-file=<리포 루트>/.env.local scripts/verify-fusion-fortune-live.mjs --live --dump`. 사용자 지시로 조합 전수(45회) 대신 **대표 1건**(`생시O 장소O`)만 돌렸다 — 조합 커버리지는 mock `verify:fusion-fortune-delivery-floor` 가 맡는다.
  - 2차 실측(구조화 출력 **전**, `--dump`): 호출 11회 · 35.4초 · 27,093자 · `gemini_partial` · fallback saju·ziwei·tarot · 탈락 8건(`missing_key_points` 5 · `parse_failed` 1 · `section_depth` 2). 🔴 **탈락 6건이 분량이 아니라 JSON 형태였다** — 섹션 객체가 `{title, content}` 뿐이고 `keyPoints` 키를 통째로 빠뜨렸다.
  - 3차 실측(구조화 출력 **후**, 2026-09-06 04:36Z, 대표 1건): 호출 8회 · 28.5초 · 27,017자 · `gemini_partial` · fallback saju·tarot · 탈락 4건. **Gemini 가 스키마를 그대로 수용했다(400 없음)** — 되돌릴 이유가 사라졌다.
    - ✅ `missing_key_points` 5→0, `parse_failed` 1→0. 8회 전부 `[title|content|keyPoints]` + kp3, `droppedKeys` 없음.
    - ⚠️ `section_depth` 2→3 이고 **미달 폭이 커졌다**: saju 3,189→2,860 · tarot 3,258→2,967(임계 3,600). sukuyo 도 5,469→3,933. 🔴 **제약 디코딩이 본문을 줄인다는 사전 예측이 실측으로 확인됐다.**
    - 🆕 `unsafe_phrase` 0→1(tarot 보완, 3,879자로 분량은 해결됨). **오탐이다** — `무조건적으로 수용하기보다`가 `FORBIDDEN` 의 `무조건` 에 부분 일치(`worker/lib/fusion-fortune.js:47`, 검사 지점 489·687). 전 판에서는 같은 슬롯이 `missing_key_points` 로 먼저 떨어져 가려져 있었다.
  - 4차 대응(구조화 출력 **후**의 분량 미달을 겨냥, PR #1660, **실호출 미검증**): 스키마 서술자를 `lengthDirective()` 하나로 모으고 최소치 옆에 **목표치(최소×1.2)** · 미달 시 반려 · 요약 금지를 함께 박았다(`worker/lib/fusion-fortune-prompt.js`). 그 한 문자열이 프롬프트 본문 스키마와 Gemini `description` 양쪽으로 흐른다. 목표치는 기존 `targetChars`(4,200~4,300)와 같은 수준이라 그룹 프롬프트의 "그룹 합계" 줄과 어긋나지 않는다. 🔴 서술자에 `무조건`·`반드시` 를 넣지 않는다 — FORBIDDEN 이라 모델이 되받아 쓰면 자기 응답이 `unsafe_phrase` 로 반려된다(테스트가 고정).
  - 판정 기준 ③(단계당 ≤120초)만 충족. ① 총 ≥30,000자 · ② `degraded` 0 은 물타기를 감지한 시점에 중단해 **미검증**(2단계 미실행).
  - 원문 덤프: `_tmp_fusion-live/<타임스탬프>/`(`.gitignore` 의 `_tmp_*`, 커밋 안 됨). 호출 1회당 `.txt`(응답 원문) + `.json`(판정·키별 글자수/임계·`fields`·`droppedKeys`) + `summary.md` 표. 🔴 **워크트리를 지우면 같이 사라진다** — 실호출 재승인 없이 다시 못 만든다.
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
- 결과 패널 section 은 `overflow-clip` 이어야 한다 — `overflow-hidden` 으로 되돌리면 레일 sticky 가 죽는다. 레일·2단계 대기 말풍선은 `data-fusion-pdf-section` 밖에 둔다(PDF 캡처 제외).
- 차례 앵커는 `data-fusion-toc` + `id="fusion-toc-<key>"`(`ThreadRow` 의 `tocKey`). 진행률은 스크롤 높이가 아니라 항목 인덱스다(`content-visibility:auto` 때문).
- `check:quick` 이 `.ignore`·`rss.xml` 4개를 건드린다 — 커밋 전에 `git checkout --` 로 되돌린다.
- 도크는 결과 패널 안에 있지만 `position:fixed` 다 — 조상에 `transform`·`filter`·`contain` 이 생기면 그 순간 패널 안에 갇힌다(`overflow-clip` 만으로는 안 갇힌다).
- `<dialog>` 에 `display` 를 걸 때는 반드시 `[open]` 안에 둔다 — 저작자 스타일이 UA 의 `dialog:not([open]){display:none}` 을 이겨 닫힌 시트가 화면에 남는다(`.tocSheet` 주석).
- 🔴 **실호출 실패가 화면상 정상으로 위장된다** — 묶음이 검증에 걸려도 결정론 폴백이 목표 분량을 채워 배달하므로 글자 수만 보면 통과처럼 보인다. 진짜 신호는 `[fusion-fortune-llm-metric]` 의 `fallbackGroups` 와 `generationSource`. `context_fallback`(호출 자체가 안 됨 — 키·모델 설정)과 `gemini_partial`(호출은 됐고 묶음이 탈락)은 다음 행동이 다르다.
- 실호출은 반드시 `node --env-file=...` 으로 돌린다 — 셸에서 키를 뽑아 넘기면 `.env.local` 값의 따옴표가 그대로 값에 남아 전 묶음이 조용히 `context_fallback` 된다(2026-09-06 실사고).
- 워크트리에 `node_modules` 없음 — jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node`, UI 는 `node --test`.

## 검증

```
npm run verify:fusion-fortune-quality && npm run verify:fusion-fortune-delivery-floor && npm run verify:fusion-fortune-reopen && npm run verify:fusion-fortune-retry-payload && npm run verify:fusion-fortune-pdf && npm run verify:fusion-fortune-stage-flow && npm run verify:mobile-detail-nonintrusive && npm run verify:hero-contrast && npm run verify:guard-wiring
node --test __tests__/ui/fusion-fortune.static.test.js
```

## 모르는 것

- ~~`responseSchema` 공용 경로 영향~~ **해결** — 초융합만 옵션을 세우고, 옵션 없는 대조군 바디가 이전과 바이트 형태까지 같은 것을 전송 실측으로 확인했다(PR #1641). 끄는 지점은 `worker/lib/fusion-fortune.js` 의 `responseSchema` 한 줄.
- 🔴 형태를 고친 뒤 saju·tarot 분량 미달이 **남았고 더 나빠졌다**(79~82%). 선택지 ①(description 에 목표 분량)은 PR #1660 으로 **구현했으나 효과는 미검증** — 실호출 1회를 승인받아 4차 실측을 돌려야 판정된다. 남은 선택지: ② 보완 물결을 "이어붙이기"로 바꾸기(현재는 재작성이라 매번 짧아진다) ③ 임계를 실측 분포에 맞추기.
- `unsafe_phrase` 오탐(`무조건적으로` 가 `무조건` 에 부분 일치, `worker/lib/fusion-fortune.js:47`)은 아직 안 고쳤다 — 단어 경계나 부정 표현 확인이 필요하다.
- 대표 1건 외 나머지 4조합(생시·장소 결측, 음력·도쿄)의 실호출 거동은 **미검증**.
- Phase 2 레일·Phase 3 도크 모두 브라우저에서 눈으로 확인하지 않았다(정적 검증·타입·린트만). 스테이징 배포 후 ① 데스크톱 `lg` 이상에서 sticky·차례 이동, ② 360/390/430px 에서 도크가 패널에 갇히지 않는지·시트 열림/스크림 탭 닫힘·좌상단 `.cd-feature-nav` 와 겹치지 않는지 본다.
