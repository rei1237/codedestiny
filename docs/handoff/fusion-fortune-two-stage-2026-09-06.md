---
status: active
updated: 2026-09-06
next: 🔴 **6차 실호출 완료(2026-09-06 08:55Z, 승인 1회 소진) — 판정 ②는 닫혔고 ④가 새 사유로 열렸다.** `qualityTier: full`(5차의 `degraded/length` 소멸 → ⓧ 상한 60,000 이 실측으로 증명됨) · `fallbackGroups: ['verdict']` 라 `generationSource=gemini_partial`(④ 실패). 원인은 **verdict 묶음 `closing_depth` 2연속**(`closingMessage` 732·662 / 임계 800, `finalVerdict` 는 두 물결 모두 **0자**). ⓓ `repeated_sentence` 오반려 0. 🔴 `unsafe_phrase` **3번째 오탐**(`타인의 요구에 무조건 응하거나`) — 핸드오프가 예고한 전환 트리거가 발동했다. 다음 세션 첫 문장: **"6차에서 드러난 verdict `closing_depth`(빈 `finalVerdict`)와 `unsafe_phrase` 3번째 오탐 중 어느 쪽부터 손댈지 정해 주면 그 한 축만 고친다."**
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
- 실제 Gemini 실호출 **5회차까지 완료**(전부 2026-09-06, 매번 1회 한정 승인). 그 외 모든 수치는 mock 실측이다.

## 남은 작업

- [x] **Phase 2 UI/UX 고급화** — 위 "지금 상태". 로케일 12개 중 ko·en·ja·zh-CN·zh-TW 만 저작, vi·hi·es·fr·de·nl·ms 는 영어 복사(배치 번역 후속).
- [x] **Phase 3 모바일 최적화** — 도크·시트·섹션 헤더 줄바꿈·푸터 2열·좁은 화면 여백 4종(≤430px). 로케일 5키는 ko·en·ja·zh 저작, 나머지 7개는 영어 복사.
- [ ] 🔴 **Phase 4 실검증 — 6회 돌렸다. 6차에서 ①②③ 충족·④ 만 실패**(2026-09-06). 5차의 ②(`degraded/length`)는 ⓧ 로 닫혔고, ④ 는 verdict `closing_depth` 라는 **새 사유**로 열렸다. 하네스 `scripts/verify-fusion-fortune-live.mjs`(npm `verify:fusion-fortune-live`, 플래그 없으면 호출 0으로 계획만 출력). 재현: `node --env-file=<리포 루트>/.env.local scripts/verify-fusion-fortune-live.mjs --live --dump`. 사용자 지시로 조합 전수(45회) 대신 **대표 1건**(`생시O 장소O`)만 돌렸다 — 조합 커버리지는 mock `verify:fusion-fortune-delivery-floor` 가 맡는다.
  - 2차 실측(구조화 출력 **전**, `--dump`): 호출 11회 · 35.4초 · 27,093자 · `gemini_partial` · fallback saju·ziwei·tarot · 탈락 8건(`missing_key_points` 5 · `parse_failed` 1 · `section_depth` 2). 🔴 **탈락 6건이 분량이 아니라 JSON 형태였다** — 섹션 객체가 `{title, content}` 뿐이고 `keyPoints` 키를 통째로 빠뜨렸다.
  - 3차 실측(구조화 출력 **후**, 2026-09-06 04:36Z, 대표 1건): 호출 8회 · 28.5초 · 27,017자 · `gemini_partial` · fallback saju·tarot · 탈락 4건. **Gemini 가 스키마를 그대로 수용했다(400 없음)** — 되돌릴 이유가 사라졌다.
    - ✅ `missing_key_points` 5→0, `parse_failed` 1→0. 8회 전부 `[title|content|keyPoints]` + kp3, `droppedKeys` 없음.
    - ⚠️ `section_depth` 2→3 이고 **미달 폭이 커졌다**: saju 3,189→2,860 · tarot 3,258→2,967(임계 3,600). sukuyo 도 5,469→3,933. 🔴 **제약 디코딩이 본문을 줄인다는 사전 예측이 실측으로 확인됐다.**
    - 🆕 `unsafe_phrase` 0→1(tarot 보완, 3,879자로 분량은 해결됨). **오탐이었다** — `무조건적으로 수용하기보다`가 `FORBIDDEN` 의 `무조건` 에 부분 일치. **PR #1675 머지 완료**(4차에서 다른 형태로 재발 — 아래 4차 실측): `무조건`·`반드시`·`100%` 만 같은 문장 안에 부정·완화가 뒤따르지 않을 때 걸리게 했고, 창은 기존 `OVERCLAIM_GAP` 을 재사용해 문장·필드 경계를 넘지 않는다. 나머지 항목은 그대로 부분 일치다.
  - 🆕 **4차 실측**(2026-09-06 07:12Z, `origin/main` `d943a5dad`, 대표 1건, 승인 1회 소진): 호출 8회 · **55.2초** · 1단계 29,520자 · `gemini_partial` · fallback astrology·tarot · 탈락 4건. 덤프 `_tmp_fusion-live/2026-09-06T07-12-00-773Z/`.
    - ✅ **목표 분량 서술자(#1660)가 먹혔다** — saju 2,860→**4,279** · tarot 2,967→3,242 · ziwei 5,542 · vedic 5,390 · sukuyo 5,129 · astrology 4,069(임계 3,600·목표 4,200). `section_depth` 탈락 3→**1**(tarot 3,242 만 미달).
    - 🔴 **astrology w1 `parse_failed` — 반복 루프.** 응답 18,171자가 `당신의 모든 것이 멋집니다. 당신의 모든 것이 좋습니다.` 류 동어반복으로 채워지다 `maxOutputTokens`(8,460)에서 잘려 JSON 이 안 닫혔다. **목표 분량 압박의 부작용으로 추정**(미검증 — 서술자 도입 전 3차에는 없던 항목이다).
    - 🔴 **astrology w2 `unsafe_phrase` 재발 — `무조건적인 사랑을 추구하는 경향`.** 분량은 4,444/3,600 으로 충족했는데 이것 하나로 묶음이 폴백됐다. `무조건적`은 성향 서술이라 완화어가 뒤따르지 않아 #1675 의 창으로는 안 걸러진다 → `무조건(?!적)` 로 수정(이 세션 PR).
    - 판정 ③(단계당 ≤120초)만 충족. ①②④ 는 1단계 물타기 감지 시점에 중단해 **미검증**(2단계 미실행).
  - 4차 대응(구조화 출력 **후**의 분량 미달을 겨냥, PR #1660 머지 완료, **실호출로 효과 확인**): 스키마 서술자를 `lengthDirective()` 하나로 모으고 최소치 옆에 **목표치(최소×1.2)** · 미달 시 반려 · 요약 금지를 함께 박았다(`worker/lib/fusion-fortune-prompt.js`). 그 한 문자열이 프롬프트 본문 스키마와 Gemini `description` 양쪽으로 흐른다. 목표치는 기존 `targetChars`(4,200~4,300)와 같은 수준이라 그룹 프롬프트의 "그룹 합계" 줄과 어긋나지 않는다. 🔴 서술자에 `무조건`·`반드시` 를 넣지 않는다 — FORBIDDEN 이라 모델이 되받아 쓰면 자기 응답이 `unsafe_phrase` 로 반려된다(테스트가 고정).
  - 판정 기준 ③(단계당 ≤120초)만 충족. ① 총 ≥30,000자 · ② `degraded` 0 은 물타기를 감지한 시점에 중단해 **미검증**(2단계 미실행).
  - 🆕 **5차 실측**(2026-09-06 08:04Z, `origin/main` `14cd1d460`, 대표 1건, 승인 1회 소진): 호출 11회 · 1단계 54.5초 + 2단계 41.6초 · **총 51,203자** · `generationSource=gemini` · **`fallbackGroups` 0** · `qualityTier: degraded` · 사유 `length`. 덤프 `_tmp_fusion-live/2026-09-06T08-04-31-076Z/`.
    - ✅ **2단계가 처음으로 실행됐다** — 4차까지 미검증이던 판정이 여기서 갈렸다: ① 51,203 ≥ 30,000 ✅ · ③ 단계당 ≤120초 ✅ · ④ `generationSource=gemini` ✅ · **② `degraded` 0 만 실패**.
    - ✅ **`section_depth` 탈락 0**(임계 3,600): saju 4,069 · tarot 5,102 · astrology 5,789 · ziwei 7,257 · vedic 5,314 · sukuyo 4,247 · integration 5,511 · timingAndAction 6,279/2,600. 🔴 **ⓐ 의 트레이드오프(분량이 줄 것)는 나타나지 않았다** — 4차의 유일한 미달이던 tarot 이 3,242→5,102 로 올랐다.
    - ✅ `unsafe_phrase` 0 — #1681 이후 재발 없음(같은 표현이 응답에 다시 나왔는지 자체는 미확인).
    - 🔴 **ⓐ 실패 — astrology w1 `parse_failed` 재발.** 응답 16,243자가 4차와 **같은 형태**의 동어반복(`당신의 목표를 향해 나아가고, 당신의 꿈을 실현하는 데 집중하세요.` 류 블록이 그대로 되풀이)으로 채워지다 `maxOutputTokens` 에서 잘렸다. **프롬프트 문구로는 이 루프를 못 막는다는 것이 실측으로 확정됐다.** 다만 보완 물결 w2 가 6,095자로 성공해 **폴백은 0**이었다(4차에는 폴백됐다) — 대가는 호출 1회 + 35.8초다.
    - 🔴 **새 축: 총 분량이 상한을 넘었다.** `FUSION_FORTUNE_LENGTH.total.max` 는 46,000인데 51,203자다(`worker/lib/fusion-fortune-prompt.js:17`). 하한 미달과 **같은 `length` 사유로 묶여** 있어 `degraded` 로 강등되고 `FUSION_DEGRADED_NOTICE` 가 유료 사용자에게 붙는다 — 넘쳐서 품질 저하 고지가 나가는 상태다. 상한 주석은 "완충은 넉넉해야 한다"인데 목표 분량 서술자(#1660) 도입 뒤 실측이 그 완충을 넘겼다.
    - 🆕 verdict w1 `closing_depth`(closingMessage 511/800) → 보완 w2 954자로 통과. 🔴 **다만 w1·w2 둘 다 `finalVerdict 0/1,000자` 인데 w2 는 ok 로 통과했다** — action 묶음의 `visualization 0자` 도 같다. 빈 필드가 검증을 통과하는 구멍일 수 있다(**범위 밖·미확인**, 후속 과제).
  - 🆕 **6차 실측**(2026-09-06 08:55Z, `origin/main` `910ffb1c3` = PR #1696 머지본, 대표 1건, 승인 1회 소진): 호출 **12회** · 2단계 40.1초 · **총 51,314자** · **`qualityTier: full`** · `qualityIssues: ['cross_section_duplicate']` · `fallbackGroups: ['verdict']` · `generationSource=gemini_partial`. 덤프 `_tmp_fusion-live/2026-09-06T08-55-11-368Z/`.
    - ✅ **ⓧ 증명 완료 — 판정 ② `degraded` 0 이 닫혔다.** 5차와 사실상 같은 분량(51,203 → 51,314)인데 `degraded/length` 가 사라지고 `full` 이 됐다. 상한 46,000 → 60,000 이 유일한 차이다. ①(≥30,000) ✅ · ②(degraded 0) ✅.
    - ✅ **ⓓ 오반려 0** — `repeated_sentence` 탈락 0회. 정상 응답을 새 사유가 잡아먹지 않았다(**1건 표본**).
    - ✅ **astrology `parse_failed` 미재발** — 4·5차의 반복 루프가 이번엔 안 나왔다(astrology w1 이 7,274자로 한 번에 ok). 🔴 **고쳤다는 증거가 아니다** — 손댄 것이 없으므로 표본 변동으로 본다.
    - ✅ `section_depth` 탈락 0. saju 4,960 · tarot 4,766 · astrology 7,274 · ziwei 4,945 · vedic 5,153 · sukuyo 5,400 · integration 5,189 · timingAndAction 5,722/2,600.
    - 🔴 **④ 실패(새 사유) — verdict 묶음이 `closing_depth` 로 2연속 탈락해 폴백됐다.** w1 `closingMessage` 732/800 · w2 662/800 이고, **두 물결 모두 `finalVerdict` 가 0자**다. 5차에서 "빈 필드가 검증을 통과하는 구멍(범위 밖)"으로 적어 둔 바로 그 축이 이번엔 **다른 필드(`closingMessage`)의 근소한 미달로 드러났다** — `finalVerdict 0자` 자체는 이번에도 아무도 안 잡았다.
    - 🔴 **`unsafe_phrase` 3번째 오탐 — tarot w1**(`타인의 요구에 무조건 응하거나, 자신의 감정을 억압하는 습관입니다`). "미뤄야 할 것"을 설명하는 문장이라 완화어가 **앞**에 오고 뒤에는 없어 `FORBIDDEN_HEDGE_AHEAD` 창으로 못 걸러진다. 보완 물결 w2 가 4,766자로 통과해 폴백은 안 났지만 **호출 1회 + 15.5초**를 태웠다.
    - ⚠️ 1단계 소요는 tail 로 잘려 **미기록**. 개별 호출 최대 21.2초 · 2물결이라 판정 ③(≤120초)은 **충족 추정**(2단계 40.1초는 실측 충족).
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
- ~~분량 미달~~ **완전히 해소** — 선택지 ①(description 에 목표 분량, PR #1660). 4차에 하나 남았던 tarot 미달(3,242/3,600)도 5차에서 5,102자로 올라 `section_depth` 탈락이 0이 됐다. 선택지 ②③ 은 **쓸 일이 없어졌다**. 🔴 문제는 반대편으로 넘어갔다 — 아래 "총 분량 상한" 항목.
- ~~총 분량 상한 초과~~ **해결(ⓧ) — 6차 실호출로 증명 완료**(51,314자 · `qualityTier: full`). 아래는 근거: `total.max` 46,000 → **60,000**(5차 실측 51,203 의 1.17배). `verify:fusion-fortune-quality` 에 "상한이 5차 실측 위"를 고정했다. i18n 에 fusion 의 46,000 노출은 없었다(전수 확인: `public/i18n/*.json` 의 46,000 은 전부 마스터 러브 코덱스).
- ~~astrology 반복 루프~~ **대응 확정(ⓓ, 현행 유지 병행)** — ⓐ(프롬프트 문구, PR #1685)는 5차에서 실패로 판정됐지만 `section_depth` 탈락을 늘리지도 않아 **그대로 둔다**. ⓑ(`maxOutputTokens` 상향)·ⓒ(잘린 JSON 복구)는 **기각** — 잘림만 막고 반복은 못 막아 반복 원문이 유료로 배달될 위험이 오히려 커진다. 5차에서 관측된 형태(잘림 → `parse_failed` → 보완 물결이 다시 씀, 폴백 0, 대가 호출 1회+35.8초)는 손대지 않았다.
- 🔴 **ⓓ 를 넣을 때 드러난 정정** — 옛 기록의 "이미 있는 `hasRepeatedLongSentence` 를 묶음 단위로도 부르면 된다"는 **틀렸다**. 그 함수는 섹션마다 `Set` 으로 중복을 지운 뒤 **서로 다른 3개 섹션**을 요구해 한 섹션 안 반복은 값이 1이다. 그래서 `findFusionRepeatedSentenceField`(`worker/lib/fusion-fortune.js`, 60자·3회, 임계는 기존 `FUSION_DUPLICATE_MIN_SENTENCE` 와 전체 검증에서 그대로 가져옴)를 새로 만들어 `validateFusionFortuneGroup` 이 `repeated_sentence` 로 반려하게 했다. 🔴 이 변경이 막는 것은 **아직 관측되지 않은 쪽** — 반복하면서도 JSON 이 닫혀 모든 검사를 통과해 유료로 배달되는 응답이다. 🔴 짝으로 `buildFusionRepeatInstruction` 을 넣었다: 반복으로 반려된 묶음이 `failedGroups` 에 들어가 보완 물결에서 "목표에 크게 못 미칩니다 — 더 길게" 라는 **반대 지시**를 받던 것을 막는다.
- 🔴 `unsafe_phrase` 는 **부분 일치 표지 목록이라 구조적으로 오탐이 재발한다** — 2026-09-06 하루에 `무조건적으로 ~기보다`(#1675) · `무조건적인 사랑`(이 세션) 두 번 나왔다. 세 번째가 나오면 표지를 하나씩 깎지 말고 **`무조건`·`반드시`·`100%` 를 표지에서 빼고 단정 술어와의 공기(共起)로만 판정하는 쪽**을 검토한다. 🔴 **6차에서 세 번째가 나왔다**(`타인의 요구에 무조건 응하거나` — 회피 대상을 설명하는 문장) — **트리거 발동, 다음 세션의 후보 축이다.** 방향: 이 셋을 `FORBIDDEN`/`FORBIDDEN_HEDGEABLE`(`worker/lib/fusion-fortune.js:47`·`:74`)에서 빼고 기존 `OVERCLAIM_ASSERTION`(확실·분명·단정·결정·보장) 공기 판정에만 맡긴다. 🔴 대가는 **탐지력 하락**이므로 `__tests__` 의 고정 문구를 함께 갱신해야 하고, 승인 없이 하지 않는다.
- 🔴 **verdict 묶음 `closing_depth` — 6차의 ④ 실패 원인이자 유일한 열린 축.** 두 물결 모두 `closingMessage` 가 800자에 **68~138자 모자라** 탈락했고, 같은 응답의 `finalVerdict` 는 **0자인데 아무 사유도 안 붙었다**. 두 갈래다: ① 임계 근소 미달 → verdict 묶음에도 `lengthDirective()` 식 목표치(최소×1.2)를 `closingMessage` 에 붙인다(#1660 이 본문 섹션에서 먹혔던 수단) ② 빈 필드 구멍 → `finalVerdict`/`visualization` 이 0자여도 통과하는 검증을 막는다. 🔴 **②를 먼저 막으면 6차 응답은 더 크게 탈락한다** — 순서는 ①→② 이고, 어느 쪽도 실호출 재승인 없이는 효과를 못 잰다.
- 대표 1건 외 나머지 4조합(생시·장소 결측, 음력·도쿄)의 실호출 거동은 **미검증**.
- Phase 2 레일·Phase 3 도크 모두 브라우저에서 눈으로 확인하지 않았다(정적 검증·타입·린트만). 스테이징 배포 후 ① 데스크톱 `lg` 이상에서 sticky·차례 이동, ② 360/390/430px 에서 도크가 패널에 갇히지 않는지·시트 열림/스크림 탭 닫힘·좌상단 `.cd-feature-nav` 와 겹치지 않는지 본다.
