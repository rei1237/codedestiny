---
status: active
updated: 2026-09-06
next: 🔴 **후속 ④(공백 폭주) 구현 완료 — 브랜치 `worktree-fusion-whitespace-runaway`, 사용자 머지 대기.** 서버 `normalizeFusionProseWhitespace`(수신 시점, `pickKeys` 뒤 · 검증 앞)와 클라이언트 `tidyFusionProse`(보관본 대비) 짝으로 접는다 — 상세는 §후속 ④ 처리. 🔴 **실호출 재검증은 안 했다**(mock·회귀 테스트만) — 다음 실호출 승인이 나면 `음력·도쿄·일과 돈` 조합을 다시 돌려 `full` 인지 본다. 남은 후속은 **③ 관리자 프롬프트 랩 그룹 수 하드코딩(미검증)** 하나다. 다음 세션 첫 문장: **"`worktree-fusion-whitespace-runaway` PR 이 머지됐는지 확인하고, 됐으면 후속 ③ 을 착수한다."** 8차 실측 수치(5조합 전수)는 아래 §남은 작업에 그대로 있다.
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
- 실제 Gemini 실호출 **8회차까지 완료**(전부 2026-09-06, 매번 1회 한정 승인. 8차만 한 승인으로 5조합을 이어서 돌렸다). 그 외 모든 수치는 mock 실측이다.

## 남은 작업

- [x] **Phase 2 UI/UX 고급화** — 위 "지금 상태". 로케일 12개 중 ko·en·ja·zh-CN·zh-TW 만 저작, vi·hi·es·fr·de·nl·ms 는 영어 복사(배치 번역 후속).
- [x] **Phase 3 모바일 최적화** — 도크·시트·섹션 헤더 줄바꿈·푸터 2열·좁은 화면 여백 4종(≤430px). 로케일 5키는 ko·en·ja·zh 저작, 나머지 7개는 영어 복사.
- [x] **레일·도크 육안 확인** — dev-preview 픽스처(PR #1704)로 로컬 렌더 후 판정. 통과 3 · **결함 3(미수정, 승인 대기)**. 상세는 §육안 판정.
- [x] **레일 결함 3건 수정 완료**(2026-09-06, 사용자 승인, dev-preview 로 재측정 — Gemini 0회·결제 0건). ① `.page` `overflow: hidden` → `clip`: 스크롤 4,918px 뒤 `aside` top **24px 고정**(옛 −4563), 조상 체인 `main` 이 `clip/clip`, 360/390/430 가로 오버플로 **0**. ② 🔴 **①의 결과가 아니었다 — 진단이 틀렸다.** 진행선은 레일 안이 아니라 결과 `section.relative` 기준 `absolute inset-x-0 top-0` 이라 ①을 고쳐도 스크롤하면 화면 밖이었다(실측 top −229). **레일 `aside` 첫 자식으로 옮겼다** — 스크롤 깊이와 무관하게 top 24px, 채움 25% 가 "읽은 위치 25%" 라벨과 일치. 좁은 화면 진행선은 도크가 그대로 든다(390 실측: 도크 채움 78/372, 레일 숨김). ③ 대기 행 `opacity-55` → `85`: 레일 **4.87:1** · 도크 시트 **5.51:1**(픽셀 실측, AA 4.5 통과). 레일·도크 두 파일 모두 같은 대기 행이라 함께 고쳤다.
- [x] 🔴 **Phase 4 실검증 — 7회 돌렸고 7차에서 ①②③④ 전부 충족**(2026-09-06). 5차의 ②(`degraded/length`)는 6차에 ⓧ 로 닫혔고, 6차에 열린 ④(verdict `closing_depth`)는 7차에 닫혔다. 🔴 **7차까지는 대표 1건 표본이었다** — 나머지 4조합은 **8차(`--samples=5`)에서 전수로 돌렸고 4/5 통과**다(아래 §8차 실측). mock `verify:fusion-fortune-delivery-floor` 가 조합 커버리지를 맡는다. 하네스 `scripts/verify-fusion-fortune-live.mjs`(npm `verify:fusion-fortune-live`, 플래그 없으면 호출 0으로 계획만 출력). 재현: `node --env-file=<리포 루트>/.env.local scripts/verify-fusion-fortune-live.mjs --live --dump`. 사용자 지시로 조합 전수(45회) 대신 **대표 1건**(`생시O 장소O`)만 돌렸다 — 조합 커버리지는 mock `verify:fusion-fortune-delivery-floor` 가 맡는다.
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
    - 🔴 **④ 실패(새 사유) — verdict 묶음이 `closing_depth` 로 2연속 탈락해 폴백됐다.** w1 `closingMessage` 732/800 · w2 662/800. **이것 하나가 유일한 원인이다.**
    - ✅ **정정 — "빈 필드 구멍"은 없었다(계측 버그였다).** 5·6차 덤프의 `finalVerdict 0자` · `visualization 0자` 는 `scripts/lib/fusion-live-dump.mjs` 의 `contentChars` 가 `.content` 만 보던 탓이다. 6차 w2 원문을 직접 파싱한 실측: `finalVerdict.rationale` **1,480자**(임계 1,000 통과) · `headline` 44자 · `systemVerdicts` 6개. 🔴 **5차 기록의 "빈 필드가 검증을 통과하는 구멍" 후속 과제는 철회한다.**
    - 🔴 **`unsafe_phrase` 3번째 오탐 — tarot w1**(`타인의 요구에 무조건 응하거나, 자신의 감정을 억압하는 습관입니다`). "미뤄야 할 것"을 설명하는 문장이라 완화어가 **앞**에 오고 뒤에는 없어 `FORBIDDEN_HEDGE_AHEAD` 창으로 못 걸러진다. 보완 물결 w2 가 4,766자로 통과해 폴백은 안 났지만 **호출 1회 + 15.5초**를 태웠다.
    - ⚠️ 1단계 소요는 tail 로 잘려 **미기록**. 개별 호출 최대 21.2초 · 2물결이라 판정 ③(≤120초)은 **충족 추정**(2단계 40.1초는 실측 충족).
  - 🆕 **7차 실측**(2026-09-06 09:40Z, 브랜치 `worktree-fusion-unsafe-phrase-cooccur` = PR #1702, 대표 1건, 승인 1회 소진): 호출 **12회** · 1단계 41.2초 + 2단계 42.1초 · **총 52,378자** · **`qualityTier: full`** · **`fallbackGroups: []`** · `qualityIssues: []` · `duplicateGroups: []`. 덤프 `_tmp_fusion-live/2026-09-06T09-40-25-267Z/`.
    - ✅ **판정 4개가 처음으로 동시에 충족됐다** — ①(≥30,000) · ②(degraded 0) · ③(단계당 ≤120초, 둘 다 실측) · ④(`generationSource=gemini` · 폴백 0). 하네스도 `PASS` 로 끝났다.
    - ✅ **`closingMessage` 수정 효과 확인** — w1 **818자** · w2 967자(6차 732·662). 서술자가 목표 720을 넘겨 받게 했다. 🔴 **다만 818 은 옛 임계 800 도 통과할 값이라, 이번 실행에서 임계 600 완화는 결과를 바꾸지 않았다** — 효과를 낸 것은 서술자 쪽이다. 완화는 여유이지 원인 제거가 아니었다.
    - ✅ **`unsafe_phrase` 탈락 0** — 공기 판정 전환(이 세션) 뒤 오반려 없음(**1건 표본**, 같은 표현이 응답에 다시 나왔는지는 미확인).
    - ✅ `section_depth` 최종 탈락 0. saju 4,027 · ziwei 6,874 · vedic 5,593 · sukuyo 6,967(w2) · astrology 4,058(w2) · tarot 4,263 · integration 6,159 · timingAndAction 6,053/2,600.
    - 🔴 **astrology w1 이 새 형태로 탈락 — 반복 루프가 아니라 조기 종료다.** 응답 780자 전체·본문 523/3,600자를 3.6초 만에 닫고 끝냈다(JSON 은 정상, `keyPoints` 3개). 4·5차의 `parse_failed` 반복 루프와 **정반대 형태**다. 보완 물결이 4,058자로 회복해 폴백은 0. sukuyo w1 도 3,378/3,600 으로 근소 미달 후 w2 6,967자. 🔴 **astrology 는 4·5차 반복 루프 · 6차 정상 · 7차 조기 종료로 매번 다르다 — 표본 변동으로 보고 손대지 않는다.**
    - 🔴 **새 후속 과제(확인됨) — `countFusionGroupChars` 가 `finalVerdict` 를 0자로 센다.** verdict w1 은 그룹 검증을 **통과했는데도**(`ok`) 보완 물결이 돌았다. 이유는 `worker/lib/fusion-fortune.js:672` 가 문자열이거나 `.content` 를 가진 값만 세는데 `finalVerdict` 는 본문이 `rationale` 에 있어 통째로 빠지기 때문이다. w1 합계 1,739+0+818+110 = **2,667 < 3,400×0.8 = 2,720** 으로 `shortGroups` 에 들어갔다. w2 는 2,982+0+967+134 = **4,083** 이고 하네스가 출력한 값과 정확히 일치해 **산술로 확인됐다**. 대가는 매 요청 호출 1회 + 18.5초다. ✅ **수정 완료(PR #1706)** — 아래 정정과 함께 본다. 🔴 **정정 — "모든 그룹의 재시도 문턱이 올라간다"는 틀렸다.** 9개 그룹의 `keys` 를 전수로 보면 본문이 `.content` 밖에 있는 키는 `finalVerdict` **하나뿐**이라(나머지는 문자열이거나 `.content` 객체, `visualization` 은 구조 데이터라 의도적으로 0자) 효과가 verdict 묶음 하나로 닫힌다. 그래서 `FUSION_GROUP_RETRY_RATIO`(0.8)·`targetChars`(3,400)는 건드리지 않았다 — 계수가 명세와 맞으면 3,400 은 minChars 합(1,400+1,000+600=3,000)과 정합한 값이다.
  - 🆕 **8차 실측 — 남은 4조합까지 5조합 전수**(2026-09-06 12:02Z, 브랜치 `worktree-fusion-cache-and-naming`, `--live --dump --samples=5`, 승인 1회로 5건). 덤프 `_tmp_fusion-live/2026-09-06T12-02-17-790Z/`(호출 54회). 하네스는 **`FAIL`** 로 끝났다 — 5건 중 1건이 강등됐다.
    - ✅ **4조합 통과**: `생시O 장소O` 53,342자(40.4+46.2초) · `생시O 장소X` 51,068자(21.2+38.9초) · `생시X 장소O` 49,948자(57.9+24.6초) · `생시X 장소X` 47,341자(21.7+32.8초). 넷 다 `qualityTier: full` · **`fallbackGroups: []`** · `generationSource=gemini` · 단계당 ≤120초. 🔴 **생시·장소 결측이 분량을 깎지 않는다는 것이 실측으로 확인됐다** — 결측 조합이 오히려 하한에 더 가깝지만(47,341) 하한 30,000 대비 여유가 크다.
    - 🔴 **`음력·도쿄·일과 돈` 1건 실패 — 143,230자 `degraded`(`length`).** 폴백 0·`generationSource` 정상인데 **상한 60,000 을 2.4배 넘겼다.** 원인은 덤프 `51-s2-integration-w1.txt`(100,611바이트): `integratedReading` 이 정상 산문을 쓴 뒤 **연속 공백 약 9만 자**를 붙이고 JSON 을 닫았다. 파싱·키·`keyPoints` 는 전부 정상이라 그룹 검증을 통과했고, `countFusionFortuneVisibleText` 가 그 공백을 그대로 세어 총량이 튀었다. **폭주 형태이지 설정·폴백 문제가 아니다** → 후속 ④.
    - ⚠️ 탈락 기록 5건(전체 54회 중): `section_depth` 3(saju 3,320·3,173 · sukuyo 1,130) · `parse_failed` 1(tarot) · **`unsafe_phrase` 1**(integration 보완 물결, 5,719자). 🔴 공기 판정 전환(#1702) 뒤 첫 `unsafe_phrase` 다 — 다만 최종 `fallbackGroups` 는 5조합 전부 0이라 **배달에는 영향이 없었다**(원문 미확인, 오탐 여부 **미판정**).
    - ✅ **PR #1706(verdict 글자 수) 실호출 재검증 — 효과 확인.** 덤프 `10-s2-verdict-w1.json` 의 `finalVerdict` 가 **1,902자로 세어진다**(옛 계수는 0자였다). `verdict.ok: true` 이고 묶음 합계가 5,000자대라 **분량 미달로 인한 보완 물결은 5조합 전부 0**이다. 🔴 다만 5조합 중 2건(`생시O 장소O`·`생시O 장소X`)에서 verdict 보완 물결이 돌긴 했다 — w1 이 `ok` 이고 합계가 임계(3,400×0.8=2,720)를 크게 넘겼으므로 **분량 축이 아니고**, 두 조합 모두 `cross_section_duplicate` 가 붙은 것으로 보아 중복 축으로 **추정**한다(미확정).
  - 원문 덤프: `_tmp_fusion-live/<타임스탬프>/`(`.gitignore` 의 `_tmp_*`, 커밋 안 됨). 호출 1회당 `.txt`(응답 원문) + `.json`(판정·키별 글자수/임계·`fields`·`droppedKeys`) + `summary.md` 표. 🔴 **워크트리를 지우면 같이 사라진다** — 실호출 재승인 없이 다시 못 만든다.
- [ ] **후속(범위 밖 보고)**: ~~① 프롬프트 캐싱 미배선~~ **완료(이 PR)** · ~~② `visibleTextLength` 이름·의미 불일치~~ **완료(이 PR)** — 상세는 아래 §후속 ①② 처리. ~~④ integration 묶음이 본문 뒤에 공백 약 9만 자를 붙여 분량 상한을 넘긴다~~ **해결(이 PR)** — 상세는 아래 §후속 ④ 처리. ③ 관리자 프롬프트 랩이 그룹 수를 하드코딩하는지 **미검증**(`worker/routes/admin*.js` 에서 `FUSION_SECTION_GROUP_SPECS` 참조 0건, 범위 `worker/routes`·`worker/lib`). ~~④ `countFusionGroupChars` 가 `finalVerdict` 를 0자로 센다~~ **해결(PR #1706)** — 어느 자리가 산문인지 정하는 `fusionKeyProse()` 하나를 세우고 분량 계수와 중복 판정(`fusionSectionProse`)이 **같은 표**를 보게 했다. 임계는 안 건드렸다(위 7차 기록의 정정 참조). 회귀 테스트 1건(`__tests__/worker/fusion-fortune.test.js`, mock): rationale 만 긴 verdict 묶음이 `shortGroups` 로 안 빠지는지 — 변이(`finalVerdict` 분기를 상수로 치환)로 무는 것을 확인했다. 🔴 실호출 재검증은 **안 했다** — 다음 실호출 승인이 나면 verdict 묶음 호출이 1회로 줄었는지 확인한다.

## 후속 ①② 처리 (2026-09-06, 이 PR)

**① Gemini 명시적 컨텍스트 캐시를 초융합 경로에 배선했다.** 짝으로 삼은 기존 구현은 `worker/routes/fortune.js:505-571`(`runSajuAISectionWaves`) — 같은 모양으로 **단계 시작 직전에 만들고 `finally` 에서 지운다**.

- 배선 전에 **막고 있던 것 둘**을 먼저 걷어냈다. 이게 이 작업의 본체다:
  - **systemPrompt 가 그룹마다 달랐다** — 분량 안내 문장에 `group.label` 이 박혀 있었다. `canUseGeminiContextCache`(`lib/llm-client.ts:639-649`)는 systemPrompt 가 캐시에 구운 값과 **한 글자라도 다르면 조용히 정가로** 보낸다. 그룹 이름을 빼 9묶음이 같은 문자열을 쓰게 했다(482자, 8차 덤프의 `systemChars` 와 일치).
  - **공유 블록이 프롬프트 중간·끝에 흩어져 있었다** — 캐시는 접두사 일치(`startsWith`)라 공유 블록이 **맨 앞**이어야 한다. `buildFusionSectionGroupPrompt` 가 공유 접두사를 먼저 내보내고 그 문자열을 `promptPrefix` 로 함께 반환하게 했다.
- 실측(mock, `_tmp_measure-prefix.mjs`): **1단계 접두사 4,573자 × 6묶음** · **2단계 접두사 9,672자 × 3묶음** + systemPrompt 482자 × 9. 캐시가 걸리면 이 (접두사+시스템) 약 **60,800자**가 정가 대신 캐시 단가로 청구된다.
- 🔴 **절감 추정치를 문서의 ₩30–50/건에서 낮춰 잡는다.** 캐시 단가가 입력의 25% 라고 보면 아낄 수 있는 것은 약 45,600자 상당이고, 이를 토큰·요금으로 환산하면 **대략 ₩10–20/건**이다. 🔴 **문자 수까지가 실측이고 원화는 추정이다**(이 세션에서 요금표를 다시 확인하지 않았다).
- **실패는 전부 무해하게 떨어진다** — 접두사가 `GEMINI_CONTEXT_CACHE_MIN_PREFIX_CHARS`(4,000) 미만이거나 캐시가 꺼져 있거나 생성이 실패하면 `createGeminiContextCache` 가 `null` 을 돌려주고(던지지 않는다) 예전과 **바이트가 같은 바디**가 나간다. 🔴 그래서 **깨져도 화면상 정상이다** — 그 조용한 실패를 잡는 것이 아래 가드다.
- 가드는 새 스크립트를 만들지 않고 `scripts/verify-fusion-fortune-quality.mjs` 에 넣었다(새 `verify:*` 는 package.json·워크플로 `paths` 배선까지 필요하다 — 원칙 10). 단계별로 ⓐ 접두사가 모든 그룹 userPrompt 의 실제 접두사인가 ⓑ systemPrompt 가 9묶음 동일하고 `buildFusionSectionSystemPrompt` 와 같은가 ⓒ 접두사가 4,000자 이상인가, 그리고 `runTwoStages` 로 ⓓ 단계당 POST 1·DELETE 1 · 9묶음 전부 캐시 핸들 수령 ⓔ **생성 실패를 흉내내면** 전 묶음이 `geminiCachedContent: undefined` 로 떨어지고 2단계가 그대로 `gemini` 로 배달되는가. 🔴 **네트워크는 `globalThis.fetch` 스텁으로 막았다** — 안 막으면 이 verify 가 실제 Google 로 나간다.
- 🔴 **무는 것을 변이로 확인했다**: 블록 순서를 뒤집자(`이 요청의 범위` 를 접두사 앞으로) 2건이 9묶음을 이름으로 지목하며 실패했다. **핸들 전달 검사(ⓓ)는 이 변이를 못 잡았다** — 잡은 것은 ⓐ 하나다.

**② `visibleTextLength` 가 이름대로 화면 글자 수를 담는다**(`worker/lib/fusion-fortune-consultation.js`). 옛 값은 `serialized.length`(JSON 직렬화 길이)라 키·따옴표·이스케이프까지 세어 **실측 +7%**(36,690자 결과가 39,325로 기록)였고, 그래서 클라이언트가 이 값을 못 쓰고 따로 셌다. 이제 서버·클라이언트가 같은 `countFusionFortuneVisibleText` 를 본다.

- 🔴 **문서 크기 상한(`FUSION_CONSULTATION_MAX_RESULT_CHARS`)은 일부러 `serialized.length` 로 남겼다** — 16MB 문서 한계를 막는 것은 직렬화 크기이지 화면 글자 수가 아니다.
- 🔴 **클라이언트는 여전히 서버 값을 쓰면 안 된다** — 2026-09-06 이전에 저장된 문서에는 옛(+7%) 값이 그대로 들어 있다. 이유를 `app/fusion-fortune/_lib/reading.ts` 머리주석에 적어 뒀다.

## 후속 ④ 처리 — 공백 폭주 (2026-09-06, 브랜치 `worktree-fusion-whitespace-runaway`)

**증상**: 8차 실호출의 `음력·도쿄·일과 돈` 에서 integration w1 이 정상 산문 뒤에 **연속 공백 약 9만 자**를 붙였다. 그룹 검증은 통과한다 — `validateFusionFortuneGroup` 이 깊이를 잴 때 `text(v, 50000)` 으로 **잘라서** 보기 때문에 꼬리가 애초에 안 보인다. 반면 `countFusionFortuneVisibleText` 는 원문을 그대로 세어 총 143,230자가 되고, `total.max`(60,000)를 넘겨 `degraded/length` → **30,000원짜리 결과에 품질 저하 고지**가 붙는다.

**고른 방향: 반려가 아니라 수신 시점에 접는다.** 공백에는 의미가 없어 접어도 잃는 것이 없고, 반려하면 **멀쩡한 산문을 버리고 Gemini 호출을 한 번 더 태운다**(회차 실측 15~36초). 반대로 상한만 올리는 것은 폭주를 배달하는 것이라 선택지가 아니다.

- **서버** `normalizeFusionProseWhitespace`(`worker/lib/fusion-fortune.js`) — CRLF 정규화 → 줄바꿈 아닌 공백 런을 한 칸으로 → 줄 앞뒤 공백 제거 → 빈 줄 3개 이상은 하나로 → `trim`. **문단 구분(빈 줄 하나)은 남긴다.** 적용 지점은 `runGroup` 의 `pickKeys` **직후 · 검증 직전** 한 곳뿐이라 검증·글자 수·보관본·화면이 전부 같은 문자열을 본다.
- 🔴 **접힌 양이 `FUSION_WHITESPACE_COLLAPSE_LOG_CHARS`(500) 이상이면 `console.warn("[fusion-fortune-whitespace-collapsed]", …)`** 로 남긴다 — 이 임계는 **판정이 아니라 관측용**이다(넘어도 반려하지 않는다). 폭주가 계속 나는지 로그로만 본다.
- **클라이언트** `tidyFusionProse`(`app/fusion-fortune/_lib/reading.ts`) — 서버와 **같은 규칙**의 짝이고, 막는 대상은 **이미 보관된 문서**다. 본문이 `whitespace-pre-wrap` 이라 옛 문서를 그대로 그리면 빈 공간 수천 화면분이 생기고 글자 수·읽는 시간·차례·PDF 가 함께 튄다. `FusionFortuneClient.tsx` 의 `setResult` 를 **결과가 상태에 들어가는 유일한 문**으로 감싸 4개 진입점(재오픈·dev-preview·1단계 부분·최종 스트림)을 한 번에 덮었다.
- 회귀 테스트 1건(`__tests__/worker/fusion-fortune.test.js`, mock): integration 응답 뒤에 공백 9만 자를 붙여도 `qualityTier: full` 이고 `countFusionFortuneVisibleText < total.max` 이며 폴백에 `integration` 이 없는지. **변이(정규화를 통과 함수로 치환)로 무는 것을 확인했다.**
- 🔴 **실호출 재검증은 안 했다** — 승인이 나면 `음력·도쿄·일과 돈` 을 다시 돌려 `full` 인지 본다.

## 정본 예시

- 단계·그룹 계약: `worker/lib/fusion-fortune-prompt.js` 의 `FUSION_SECTION_GROUP_SPECS`(`stage` 필드) · `fusionGroupsForStage` · `buildFusionStageOneDigest`
- 단계 오케스트레이션·`#s2` 예약·`STAGE_ONE_MISSING`: `worker/lib/fusion-fortune.js` 의 `generateFusionFortuneRequest`
- 클라이언트 단계 루프·자동 재개·이어서 생성: `app/fusion-fortune/FusionFortuneClient.tsx` 의 `runGeneration` · `continueGeneration`

## 함정

- 1단계 보관본은 `status: "partial"` 이라 **목록에 안 나온다**. `?requestId=` 조회만 상태 무관 — 자동 재개가 이 경로다. 목록 필터를 바꾸면 partial 이 노출된다.
- `retryable: true,` 바로 뒤에 `issues:` 가 와야 한다(UI 정적 테스트가 그 짝을 고정). 서버 실패 반환 순서를 바꾸지 말 것.
- `rememberPaidRequest(requestId, requestBody)` 가 소스에서 첫 `/api/fusion-fortune/generate/stream` 보다 **앞에** 있어야 한다(`verify:fusion-fortune-retry-payload`).
- 분량 문구를 바꾸면 12 로케일 + `__tests__/ui/fusion-fortune.static.test.js` + `docs/LLM_AND_AI_POLICY.md` 를 같이 바꾼다.
- 🔴 **레일 sticky 를 죽이는 `overflow` 는 한 곳이 아니라 조상 전체다** — section 과 `<main>`(`.page`) **둘 다** `clip` 이라야 산다(2026-09-06 수정 완료). 이 축을 손댈 때는 한 요소만 보지 말고 `aside` 의 조상 체인을 브라우저에서 전수로 읽는다 — `getComputedStyle(node).overflowX/Y` 를 부모로 올라가며 찍으면 어느 층이 범인인지 바로 나온다. 레일·2단계 대기 말풍선은 `data-fusion-pdf-section` 밖에 둔다(PDF 캡처 제외).
- 🔴 **결과 화면을 눈으로 보려면 `?preview=` 를 쓴다 — 실호출·결제 0** — `lib/dev-preview/fixtures/fusion-fortune.ts`(PR #1704). `?preview=success`(2단계 완성본) · `truncated`(1단계만 도착 = 대기 표시) · `failed`. `readDevPreviewState()` 가 `NODE_ENV === "production"` 이면 항상 `null` 이라 실사용 경로는 그대로다. 🔴 `next dev` 는 `--turbopack` 으로 띄운다 — webpack 은 `js/core/app-context.js` 의 `import.meta` 에서 죽는다(선행 결함, 이 축과 무관).
- 차례 앵커는 `data-fusion-toc` + `id="fusion-toc-<key>"`(`ThreadRow` 의 `tocKey`). 진행률은 스크롤 높이가 아니라 항목 인덱스다(`content-visibility:auto` 때문).
- `check:quick` 이 `.ignore`·`rss.xml` 4개를 건드린다 — 커밋 전에 `git checkout --` 로 되돌린다.
- 도크는 결과 패널 안에 있지만 `position:fixed` 다 — 조상에 `transform`·`filter`·`contain` 이 생기면 그 순간 패널 안에 갇힌다(`overflow-clip` 만으로는 안 갇힌다).
- `<dialog>` 에 `display` 를 걸 때는 반드시 `[open]` 안에 둔다 — 저작자 스타일이 UA 의 `dialog:not([open]){display:none}` 을 이겨 닫힌 시트가 화면에 남는다(`.tocSheet` 주석).
- 🔴 **실호출 실패가 화면상 정상으로 위장된다** — 묶음이 검증에 걸려도 결정론 폴백이 목표 분량을 채워 배달하므로 글자 수만 보면 통과처럼 보인다. 진짜 신호는 `[fusion-fortune-llm-metric]` 의 `fallbackGroups` 와 `generationSource`. `context_fallback`(호출 자체가 안 됨 — 키·모델 설정)과 `gemini_partial`(호출은 됐고 묶음이 탈락)은 다음 행동이 다르다.
- 🔴 **하네스 `--samples=N`(조합 전수)의 중단 규칙은 사유별로 다르다**(2026-09-06 수정, `scripts/verify-fusion-fortune-live.mjs`): `context_fallback` 은 키·모델 설정 문제라 표본과 무관 → **즉시 전부 중단**. `gemini_partial` 은 **1건 표본일 때만** 중단하고 다조합 모드에서는 계속 간다 — 안 그러면 첫 조합의 묶음 하나가 나머지 4조합을 통째로 못 돌게 하고 **승인받은 실호출 예산이 날아간다**.
- 🔴 **`verify:fusion-fortune-quality` 는 이제 `globalThis.fetch` 를 스텁한다** — 컨텍스트 캐시 배선을 검사하느라 `createGeminiContextCache` 를 실제로 부르기 때문이다. 이 파일에서 새 네트워크 경로를 늘릴 때 스텁이 `cachedContents` 외 호출을 던지게 돼 있으니, 던지면 **가드가 아니라 스텁을 먼저 본다**.
- 실호출은 반드시 `node --env-file=...` 으로 돌린다 — 셸에서 키를 뽑아 넘기면 `.env.local` 값의 따옴표가 그대로 값에 남아 전 묶음이 조용히 `context_fallback` 된다(2026-09-06 실사고).
- 워크트리에 `node_modules` 없음 — jest 는 `NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node`, UI 는 `node --test`.

## 육안 판정 (2026-09-06, 로컬 dev-preview · Gemini 0회 · 결제 0건)

수단: `?preview=success|truncated` → Playwright chromium 캡처(데스크톱 1440×1200 · 360/390/430×900) → `visual-checker` 판정.
🔴 캡처 이미지는 메인 세션에서 Read 하지 않는다(전체페이지 1장 ≈ 29,000토큰). 🔴 `content-visibility:auto` 때문에 뷰포트를 섹션이 통째로 들어갈 높이로 키워 찍는다 — 안 그러면 백지로 찍힌다.

**통과 3**

- ✅ **모바일 도크가 진짜 `position:fixed` 다**(이 축의 핵심 질문). 360/390/430 전부에서 수천 px 스크롤 뒤 `차례` 버튼 bbox 의 x 가 동일하고 y 드리프트 ≤6px — 결과 패널에 갇히지 않았다.
- ✅ **1단계 대기 표시**(`?preview=truncated`): 13항목 = 도착 10 + `2단계 · 생성 중` 헤더 + 대기 3(스피너·`대기` 배지). 완성본 시트의 13과 같은 수라 항목이 누락되지 않는다.
- ✅ **도크 상단 테두리가 실제 진행선이다** — 채움 66.9% 가 표시된 "남은 약 26분"(전체 78분)과 일치한다.

**결함 3 — 전부 수정·재측정 완료**(위 "남은 작업" 에 수치)

- ✅ **① 데스크톱 레일이 스크롤하면 사라졌다** — 조상 `main`(`.page { overflow: hidden }`)이 스크롤 컨테이너를 만들어 sticky 를 죽였다. `clip` 으로 고쳤고 가로 오버플로 회귀 없음.
- ✅ **② 데스크톱 진행선** — 🔴 ①의 결과라던 판정이 **틀렸다**. 진행선은 레일 밖의 `absolute` 요소였고, 레일 안으로 옮겨야 했다.
- ✅ **③ 대기 항목 대비 3.01:1** — 원인은 `opacity-55`(색이 아니라 합성 투명도)였다. `opacity-85` 로 4.87:1(레일)·5.51:1(도크 시트).

**범위 밖 관찰 1건**(고치지 않음): 도크의 섹션 라벨 줄이 중간 캡처 3장 모두에서 비어 보인다 — 스크롤 중 활성 키가 비는 순간인지 라벨 자체가 안 그려지는지 미확인.
- 🔴 **코드로는 재현 근거를 못 찾았다**(2026-09-06, 후속 ④ 세션에서 읽기만 함). `_lib/toc.ts:59` 의 `activeIndex = Math.max(0, findIndex)` 라 활성 키가 비어도 0번(`opening`)으로 떨어지고, `FusionResultDock` 의 `activeLabel = toc.items[toc.activeIndex]?.label || ""` 는 그 0번 라벨을 잡는다. `openingShortLabel` 은 **12 로케일 전부 정의돼 있다**(범위: `app/fusion-fortune/_lib/copy.ts`). 즉 빈 라벨이 나오려면 `items` 자체가 비어야 하는데 opening 은 무조건 들어간다. **캡처 쪽(폭 부족·클리핑)일 가능성이 남아 있어 손대지 않았다** — 다음에 볼 때 캡처가 아니라 브라우저에서 `data-fusion-toc` 활성 키를 직접 찍어 판정한다.

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
- ~~`unsafe_phrase` 오탐 재발~~ **대응 완료 · 7차 실호출로 오반려 0 확인**(PR #1702). `무조건`·`반드시`·`100%` 를 `FORBIDDEN` 에서 빼고, 이미 있던 `OVERCLAIM_ASSERTION`(확실·분명·단정·결정·보장 · 문장 안 · 부정 뒤따르면 면책)과의 **공기(共起)로만** 판정한다(`FORBIDDEN_ADVERB_PATTERNS`). `FORBIDDEN_HEDGE_AHEAD`·`FORBIDDEN_HEDGEABLE` 은 지웠다(3면 grep 참조 0). 🔴 **의도한 탐지력 하락을 테스트에 명시적으로 고정했다** — `이 시기에는 무조건 성과가 납니다` 처럼 단정 술어 없는 절대 단언은 **이제 통과한다**. 해로움이 큰 형태(`반드시 매수해라`·`상대는 반드시 돌아온다`·`결제해야 해결된다`·`병이 있다`)는 여러 낱말 항목이 그대로 부분 일치로 잡는다. 아래는 그 판단의 근거로 남긴다:
- 🔴 `unsafe_phrase` 는 **부분 일치 표지 목록이라 구조적으로 오탐이 재발한다** — 2026-09-06 하루에 `무조건적으로 ~기보다`(#1675) · `무조건적인 사랑`(이 세션) 두 번 나왔다. 세 번째가 나오면 표지를 하나씩 깎지 말고 **`무조건`·`반드시`·`100%` 를 표지에서 빼고 단정 술어와의 공기(共起)로만 판정하는 쪽**을 검토한다. 🔴 **6차에서 세 번째가 나왔다**(`타인의 요구에 무조건 응하거나` — 회피 대상을 설명하는 문장) — **트리거 발동, 다음 세션의 후보 축이다.** 방향: 이 셋을 `FORBIDDEN`/`FORBIDDEN_HEDGEABLE`(`worker/lib/fusion-fortune.js:47`·`:74`)에서 빼고 기존 `OVERCLAIM_ASSERTION`(확실·분명·단정·결정·보장) 공기 판정에만 맡긴다. 🔴 대가는 **탐지력 하락**이므로 `__tests__` 의 고정 문구를 함께 갱신해야 하고, 승인 없이 하지 않는다.
- ~~verdict 묶음 `closing_depth`~~ **대응 완료(이 세션, 사용자 지시 "기준을 너무 빡빡하게 두지 마")** — 원인은 하나였다: `closingMessage` 가 **분량을 검증하면서 스키마 서술자가 없는 유일한 필드**였다(`"string"` 한 줄). 모델이 목표를 못 받아 임계 바로 아래에서 멈췄다. 셋을 함께 고쳤다.
  - ① `closingMessage` 에 `lengthDirective()` 를 붙였다(목표 720자를 모델에 알린다).
  - ② `FUSION_FORTUNE_LENGTH.closingMessage` **800 → 600** — 맺음말은 새 근거를 꺼내지 않는 마무리 글이라 본문 섹션과 같은 잣대를 댈 자리가 아니고, 68~138자 모자란 정상 응답을 통째로 버려 결정론 폴백을 유료 배달하는 대가가 더 크다. 6차 실측 662·732 둘 다 통과한다.
  - ③ 그룹 명세의 `minChars` 리터럴을 계약 상수 참조로 바꿨다 — 이 값은 프롬프트의 "최소 N자" 줄로 흘러가므로 검증 상수와 벌어지면 모델이 검증과 다른 기준을 받는다.
  - 🔴 짝으로 `verify:fusion-fortune-quality` 에 **전수 가드**를 넣었다: 최소치를 재는 키를 스키마에서 세워 **서술자가 없으면 실패**시키고, 그룹 `minChars` 가 계약과 다르면 실패시킨다. 변이 2종(서술자 제거 · minChars 드리프트)으로 무는 것을 확인했다.
  - ✅ **효과 확인 완료 — 7차 실호출**(2026-09-06 09:40Z): `closingMessage` w1 **818자** · w2 967자 · `closing_depth` 탈락 0 · `fallbackGroups: []`. 🔴 **정정 — 임계 600 완화는 이번 실행에서 결과를 바꾸지 않았다**(818 은 옛 800 도 통과한다). 효과를 낸 것은 ① 서술자다. ②는 여유일 뿐 원인 제거가 아니었으므로, 되돌릴 이유가 생기면 ①을 남기고 ②만 되돌리는 것이 가능하다.
- ~~대표 1건 외 나머지 4조합(생시·장소 결측, 음력·도쿄)의 실호출 거동~~ **8차에서 5조합 전수 검증(4/5 통과)** — 생시·장소 결측 3조합은 전부 `full`·폴백 0, `음력·도쿄·일과 돈` 만 공백 폭주로 `degraded`(후속 ④). 수치는 위 §8차 실측.
- 🔴 **공백 폭주가 이 조합 고유인지 표본 변동인지 모른다** — `음력·도쿄` 조합은 이번이 첫 실호출이고 **1건 표본**이다. astrology 가 회차마다 다른 형태로 흔들렸던 전례(4·5차 반복 루프 · 6차 정상 · 7차 조기 종료)를 보면 조합 특성으로 단정할 근거가 없다.
- ~~Phase 2 레일·Phase 3 도크를 브라우저에서 눈으로 확인하지 않았다~~ **확인 완료(2026-09-06) — 아래 §육안 판정.** 스테이징을 기다리지 않고 로컬 dev-preview 픽스처로 봤다(실호출·결제 0).
