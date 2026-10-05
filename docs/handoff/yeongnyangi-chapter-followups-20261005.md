---
status: active
updated: 2026-10-05
next: "후속 과제 5번(다른 자미 상품에 사업운 로직 미적용): worker/yeongnyangi/fortune/ziwei/derived.ts 와 ziwei-ai 템플릿·심층 리포트의 자미 근거 경로를 비교한다."
---

# 영냥이 챕터 확장 후속 과제 인수인계

이전 세션(581c5dd9, 2026-10-03~05)은 영냥이 챕터 확장을 **운영 반영까지 끝냈다.** 이 문서는 그 작업 중 발견했지만 범위 밖이라 보고만 한 결함·부채를 다음 세션이 이어서 처리하도록 정리한 것이다. 항목마다 독립 커밋으로 처리한다.

## 첫 행동

1. `CLAUDE.md` 확인 → `git branch --show-current`·`git status`. 루트 체크아웃에 다른 세션 미커밋 파일이 있으면 `scripts/create-safe-worktree.ps1` 로 워크트리를 만든다(호출할 때 `2>&1` 를 붙이지 않는다 — git stderr 가 Stop 오류가 되어 중단된다).
2. `git fetch origin` 후 아래 앵커 줄 번호를 origin/main 기준으로 다시 확인한다(이 문서의 줄 번호는 `f30acbafb` 기준).
3. 영냥이 AI·DB 작업이므로 [ai-and-db](../context/ai-and-db.md) 와 [yeongnyangi-ask](../context/yeongnyangi-ask.md) 를 먼저 읽는다.

## 이미 끝난 것 (다시 하지 않는다)

- 운영 반영: 1차 `2710b06f2`(Release run 37190726210) — 사주 파생(오행 과다·십성 성격·이동수/해외운·연애/결혼운·건강 근거), 자미 사업운(재백·자녀·전택·관록 + 궁간 비화)·건강, 베다·점성술 파생, 전달 계약 분량 하한 `minimumChars×0.5`.
- 커밋 7(`15c769bb4`, 건강 장 질병 단정 차단 HEALTH_RULES)·8(`1d415f6cd`, 상담 메뉴 7개)은 다른 세션의 `d4a2c8a19` 운영 승격(run 37258689540)에 포함돼 운영 반영됐다.
- 설계 문서: `docs/design/yeongnyangi-chapter-expansion.md`.
- 골든 1회(사주 개인 연어·광어·참치 49장, gemini-2.5-flash, 658.2원, 위반 0, 재시도 0): 원문 `d:\tmp\yeongnyangi-golden-20261004\golden-full.md`, 요약 `summary.json`, 원시 `state-raw.json`. **로컬 파일이며 레포에 없다.** 커밋 7·8 이 들어간 6691a4160 트리로 생성했다.

## 후속 과제 (추천 순서)

### 1. 연어 건강 장 계절 사실 오류 — 고객 품질, 우선
- 골든 fixture(1998-02-28 출생, 寅월=봄)의 연어 7장 본문: "불 기운이 강한 **여름철에 태어나**…너는 **봄의 시작과 함께**…" — 한 문단 안에서 계절이 모순된다(`golden-full.md` 206행).
- 추정 원인(미검증): 사주 facts 에 출생 계절 이름이 없고 `seasonalBalance`(조후, `worker/yeongnyangi/fortune/saju/runtime.ts:119`)의 '따뜻함·건조' 신호만 있어 모델이 계절을 지어낸다. `healthBasis` 는 `worker/yeongnyangi/fortune/saju/index.ts:73` 에서 만든다.
- 방향: 월지→계절(寅卯辰 봄, 巳午未 여름, 申酉戌 가을, 亥子丑 겨울)을 facts 에 결정적으로 넣고, 건강 장 focus 에 "계절은 근거의 값만 쓴다"를 명시한다. 품질 게이트로 계절 불일치를 잡을 수 있으면 거부가 아니라 해당 문장 제거로 처리한다(원칙 17).
- 검증: 파생 단위 테스트 + invariance(`YEONGNYANGI_INVARIANCE_PRINT=1`, 바뀐 사주 행만). 과금 실호출은 별도 1회 승인 없이는 하지 않는다.
- **결과(2026-10-05, `2521ebc10`)**: 추정 원인은 틀렸다 — 실측하니 `seasonalBalance.season='봄'` 은 이미 근거에 있었고, 모델이 `type:'warm'` 을 여름 출생으로 읽었다. ① `healthBasis.climate.birthSeason` + "따뜻함·건조함은 계절이 아니다" 규칙(`worker/lib/saju-derived-signals.js`) ② `correctNatalClaims` 가 월지 계절과 다른 "○○(철)에 태어나/태생" 문장을 제거(참 계절을 함께 말하는 설명·완곡·일반론·상대 문장은 유지). invariance 123행 중 사주 11행 requests 만 변경. 실호출 재확인은 하지 않았다(다음 골든 때 확인).

### 2. 근거 밖 문장 가지치기가 많은 장
- 골든에서 근거 밖 사실로 잘린 문장이 많은 장이 있었다(예: 참치 t25 에서 `V7_FOREIGN_FACT` 21문장). 분량은 통과했지만 모델이 근거 밖 내용을 많이 쓴다는 뜻이다.
- `state-raw.json` 에서 장별 제거 수를 집계해 상위 장의 focus·refs 를 보강한다. 거절 조건을 늘리지 않는다.
- **결과(2026-10-05, `bdc69c62b`)**: 모델 문제가 아니라 감사 오탐이었다. 원본 초안을 재감사해 기록과 일치(FOREIGN 117·ANCHOR_REPEAT 66)를 확인했고, 잘린 문장은 거의 전부 그 장이 소유한 기둥·세운·월운·대운 사실의 십신 해석이었다(예: t24 "2028년 식신", 자녀 장 시주 상관). 십신 용어가 `tenGods.<slug>`·`tenGodProfile` 에만 묶여 있던 것을 `.pillarDetails.`·`.tenGodsByPillar.`·`.majorLuck.`·`.yearlyLuck.`·`.monthlyLuck.` 소유에도 허용(`reading-v7-quality.ts` `TEN_GOD_CARRIERS`) → 같은 초안 재감사 FOREIGN 117→7. 남은 7은 단일 십신 장이 다른 십신을 말한 진짜 위반. focus·refs 는 바꾸지 않았다. 남은 관찰: ANCHOR_REPEAT 66(시기 장의 일간 반복 등)은 설계 규칙대로 둠 — 다음 골든에서 분량 영향이 크면 재검토.

### 3. 모바일 상담 메뉴 CSS (기존 결함, UI)
- 영냥이 운세 화면의 상담 종류 버튼 그룹(`kindChoices`, 390px): ① 한국어가 음절 단위로 줄바꿈된다(`word-break: keep-all` 누락 추정) ② 설명이 한 줄인 버튼은 내용이 가운데로 몰린다.
- [design-canon](../context/design-canon.md) 을 먼저 읽고, headed 브라우저로 화면을 띄워 확인한다.
- **결과(2026-10-05, `e34842876`)**: 390px 실측으로 두 증상 모두 확인 — 5개 도메인 단어 중간 줄바꿈 25곳(`불/러요` 등), 한 줄짜리 설명 버튼만 내용이 5~7px 아래로 밀림. `.kindChoices button` 에 `align-content:start; word-break:keep-all; overflow-wrap:anywhere`(같은 파일 `.fusionChoices` 관용구) → 0곳·전 버튼 위 여백 13px·320px 가로 넘침 0. 범위 밖 관찰(보고만): 영냥 신점 카드 "인연/의 흐름", 언어 안내 "재/열람에도" 단어 중간 줄바꿈.
- 부수 발견: `check:fast` 가 CSS 한 줄에 약 20분 걸렸다. ① 스크래치 `.tmp/` 가 gitignore 밖이라 미분류로 fail-closed → 결제 게이트 스위트 ② `app/**` 편집 때마다 재생성되는 `config/sitemap-lastmod.json` 이 `^config/` shared 로 critical. `.tmp/` 무시 + 원장 예외(`scripts/lib/verification-plan.mjs`)로 같은 변경은 standard.

### 4. 점성술 광어·참치 `aspects.none-conjunction` 담당 장 없음 (기존 결함)
- ft 등급에 `aspects.conjunction` 소유 장이 없고 none 사실에 폴백 레벨이 없어 원장에서 미소유로 남는다. '.houseRulers.' 접두 사실과 ledger unknown fact 경고도 같은 축에서 함께 본다.
- 위치: `worker/yeongnyangi/fortune/astrology/`, `worker/yeongnyangi/fortune/reading-v7-ledger.ts`.
- **결과(2026-10-05, `4b3ce1e4d`·`b01d884a4`)**: ① 합이 하나도 없는 차트에서만 생긴다(실측한 실제 차트 4개는 모두 합이 있어 미발생, 실제 빈도는 미측정). 합을 지운 합성 context 로 광어·참치 미소유 `[aspects.none-conjunction]` 재현 → none 사실에 2단계 태그(애스펙트 계열 셋)를 붙여 목차상 첫 애스펙트 장(긴장)이 소유. 실제 합은 지금처럼 행성 장으로 간다. ② unknown fact 경고(`saju.monthlyLuck.*` 128건)는 운영 결함이 아니라 invariance 테스트가 `snapshot.analysis` 를 그대로 써서(운영은 `service.ts` `snapshotAnalysis` 가 시기 행렬 재적용) 생긴 하네스 불일치 → 테스트가 `snapshotAnalysis` 를 쓰게 해 경고 0, 123행 중 사주 연어 2행 requests 해시만 갱신. ③ `'.houseRulers.'` 는 품질 감사의 의도된 용어 허용 접두(하우스 주인은 어느 행성·하우스든 될 수 있음)이고 원장 소유는 테스트가 이미 확인 — 손대지 않음.

### 5. 다른 자미 상품에 사업운 로직 미적용
- 재백·자녀·전택·관록 + 궁간 비화 사업운은 영냥이 전용 `worker/yeongnyangi/fortune/ziwei/derived.ts` 에만 있다. ziwei-ai 템플릿·심층 리포트는 미적용. 공용 엔진 반환값을 바꾸면 다른 상품 프롬프트·비용이 흔들리므로 상품별 파생으로 붙인다.
- 레거시 자미 money 선택자: `worker/yeongnyangi/fortune/consultation-kinds.ts:73` (`palaces[관록궁,재백궁,전택궁]` — 사업운 메뉴와 겹침 정리 필요 여부 판단).

### 6. 사주 엔진 의심 (실측 필요, 엔진 축)
- 도충이 거의 항상 성립하는 것으로 보임, 비견 집계에 일간이 포함되는 것으로 보임. 둘 다 추정이다. 고치기 전에 여러 명식으로 실측하고, 메모리 `fortune-engine-facts`(KASI 데이터 오류 등) 과 외부 만세력으로 대조한다.

### 7. 테스트·도구 부채
- 비용 테스트(`__tests__/ui/yeongnyangi-reading-v7.test.mjs`)가 예방 장(`worker/yeongnyangi/fortune/prevention.ts:73` `withPreventionReading`, 광어·참치 +1장)을 세지 않는다. 광어 +1장을 시도했다가 예방 장 포함 시 ask 비율 .1041 > .1 로 기각한 이력이 있다.
- 가끔 실패: `sync-main-freshness`(단독 실행 16/16 통과), `tarot-year-premium`.
- `scripts/yeongnyangi-v7-golden.mjs` 의 live 모드는 Phase 4 이어하기 전용으로 잠겨 있다(135·152·153행 부근). 새 골든을 돌리려면 1회 실행 모드를 정식으로 추가하는 편이 낫다(이전 세션은 스크래치 실행기로 대체했고 그 파일은 삭제됨).
- 영냥이 Browser Shadow 가 `f68e081a1`(리뷰 초대 배너)부터 `settleApiFixture 'Fixture checkpoint timed out'` 으로 실패. shadow 라 게이트는 아니다.
- 작은 부채: ledger 주석 "flag-off" 낡음, 정적 장 수 표기(당시 `page.tsx:171` 로 기록했으나 f30acbafb 에서 줄이 이동해 위치 재확인 필요 — `git grep -n "장" app/yeongnyangi`), `Library.tsx` koOnly id 표시, signals 라벨, 시간 미상 참치의 timing 소유, timing·spouse 가지치기, fusion 파생 사실 미연결.

## 규칙 메모

- 과금 LLM 실호출은 정확한 1회 승인 후에만. 실행하면 생성 본문 자체를 사용자에게 보고하고 전체 원문 파일 경로를 준다.
- 운영 승격은 명시적 1회 요청 때만. 승인 뒤 main 에 다른 세션 코드가 올라오면 범위를 다시 묻는다. 확인과 dispatch 는 한 명령.
- 각 항목이 끝나면 이 문서의 해당 절에 결과(SHA)를 적고, 전부 끝나면 `status: done` 으로 닫는다.
