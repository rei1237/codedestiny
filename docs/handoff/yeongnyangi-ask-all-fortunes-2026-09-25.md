---
status: active
updated: 2026-09-25
next: "영냥이 '무엇이든 물어보기' 답변에, 상품 체계와 무관하게 꿀꿀 운세의 일진·월운·세운·숙요 일운·베다 판창가·수비학·타로 일일 카드를 근거로 넣는다. 대운은 계속 제외."
---

# 영냥이 자유질문에 꿀꿀 운세 전 체계 연동

다음 세션 첫 문장: 이 문서의 '꿀꿀 모듈' 표에서 워커 번들로 import 가능한 모듈부터 esbuild 로 실측한 뒤, `service.ts` 요청 생성 시점에 계산하는 설계를 먼저 공유하고 구현한다.

## 왜

> 영냥이 상담의 무엇이든지 질문하세요 부분에서는 대운을 제외한 모든 부분에 대해서 기존 꿀꿀 운세 로직을 활용해서 모든 운세로 정확하고 풍부하게 답변해주도록해 (2026-09-25)

확답받은 결정(AskUserQuestion, 2026-09-25):

- **체계 교차** — 어느 체계 상품이든 꿀꿀의 사주 일진·월운·세운, 숙요 일운, 베다 판창가, 수비학, 타로 일일 카드까지 근거로 쓴다.
- **대운은 제외** — 지금처럼. `majorLuck` 선택자와 대운 문구는 들어가지 않는다.
- **타로는 뽑은 당시로** (사용자 지시, 2026-09-25: "타로는 뽑은 당시로 해주길 바래") — 사용자가 실제로 뽑은 3장을 뽑은 날짜와 함께 그대로 근거로 쓴다. 서버가 새로 추첨하거나 오늘 날짜로 다시 계산하지 않는다. 뽑은 날이 오늘이 아니면 오늘의 카드처럼 말하지 않고 "N월 N일에 뽑은 카드"로 읽는다. 뽑은 기록이 없거나 3장을 다 뒤집지 않았으면 타로 근거를 빼고 진행한다.

## 현재 흐름 (실측)

- `worker/yeongnyangi/service.ts:101-109` — 질문형 종류(`kind.question`)이거나 종류가 없으면 1장(`manifest[0]`)이 질문에 먼저 답한다. 이때 `systems` 는 상품 체계 그대로, 근거는 `questionFactSelectors` 로 고른다.
- `worker/yeongnyangi/fortune/reading-manifest.ts:52-58` `questionFactSelectors` — 상품 체계의 계산 결과(`contexts[domain]`)만 쓴다. 질문 문구를 정규식으로 love·money·work 로 분류해 그룹을 더하고, `year` 그룹(사주는 `yearlyLuck`, `monthlyLuck`)을 붙인다. **다른 체계와 꿀꿀의 일일 로직은 쓰지 않는다.**
- 선택자 그룹 정의는 `reading-manifest.ts:44-49`. `current`·`next`·`overlap` 이 `majorLuck` 을 부르므로 새 선택에서 빠져 있어야 한다.
- 장 계획은 요청 생성 때 스냅샷에 저장된다 → 새 근거는 새 요청부터 적용되고 진행 중 주문은 그대로다.

## 꿀꿀 모듈 (후보)

| 근거 | 위치 | 비고 |
|---|---|---|
| 사주 일진 판정 | `worker/lib/saju-day-fortune.js:135` `judgeSajuDayFortune(natal, today)` | 워커 모듈 |
| 오늘의 사주 상세 | `worker/lib/today-saju-detail.js:236` `buildTodaySajuDetail({verdict, natal})` | 워커 모듈 |
| 일간별 오늘 지침 | `worker/lib/daily-stem-guidance.js:135` `buildStemGuidance(dayStem, today)` | 워커 모듈 |
| 체계별 일운(숙요·사주·점성·베다·자미) | `lib/lock-screen-daily-fortune.ts:348` `getDailyFortune(system, input, now)` | `@/lib/yeon/zodiac` 별칭 import — 워커 번들 해석 미검증 |
| 수비학 개인 일수 | `lib/numerology/personal-day.mjs` | 미검증 |
| 타로 일일 3장 | `lib/tarot/daily-three.mjs` | **결정적 추첨이 아니다**(실측): `newDailyReading` 이 `Math.random` 으로 22장을 섞고 `{date(KST), deck, picks, revealed}` 를 브라우저 localStorage `cd:yeoni:daily-three:v1` 에만 저장한다(`app/today/DailyTarot.tsx:44`). 서버는 재현 불가 → 요청 생성 때 클라이언트가 저장본(`revealed===3` 인 것만)의 날짜와 카드 3장(`picks.map(s=>deck[s])`)을 보내고, 서버는 `sharedDailyCards` 수준으로 검증해 스냅샷에 날짜와 함께 고정한다. 위 "뽑은 당시로" 결정 |
| 스위스 천문력 | `worker/lib/swiss-ephemeris.js` | 비동기·실패 가능 → 실패해도 상담이 멈추지 않게(코딩 원칙 17) |
| 오늘의 운세 데이터 | `lib/fortune/daily-data.ts` | `node:fs` import(:12) → **워커에서 못 쓴다** |

## 제약 (판정기가 무는 것)

- 근거 ID 는 `contexts` 에 실제로 있어야 한다 — 블록 `sources` 가 모르는 ID 면 `INVALID_EVIDENCE`. 새 근거는 컨텍스트 팩트로 넣고 ID 를 부여한다.
- 내부 ID·원시 필드가 본문에 새면 `INTERNAL_EVIDENCE_EXPOSED`. 사람이 읽는 이름은 `professionalEvidenceNames` 에 추가.
- 참치·퓨전이 아닌 등급은 본문에 용신·희신·대운·마하다샤·안타르다샤·삼방사정이 나오면 `TIER_SCOPE_VIOLATION`(`reading-quality.ts:107`). 교차 근거가 이 단어를 끌고 오지 않게.
- 질문 장 토큰: `providers/chapter.ts:223` 이 질문당 480자를 더하고 24576 을 넘으면 `CHAPTER_OUTPUT_BUDGET_EXCEEDED`. 근거가 늘면 프롬프트도 커진다 — 규칙 17 의 토큰 여유를 다시 잰다.
- 영감 모드(`saju_mackerel` v4, `service.ts:56`)는 별도 경로다.
- 과금 실호출 금지 — 답변 품질은 mock 과 픽스처로만 검증한다.

## 권장 설계 (다음 세션이 확정)

1. 요청 생성 시(`service.ts`, 요청 시계 기준 KST) 교차 근거를 한 번 계산해 `analysis.contexts` 에 체계별 일일 팩트로 저장한다. 실패한 체계는 빼고 진행한다. **타로만 예외** — 요청 시각에 계산하지 않고 클라이언트가 보낸 "뽑은 당시" 카드와 날짜를 그대로 저장한다(위 결정).
2. `questionFactSelectors` 가 질문형일 때 이 팩트를 상품 체계와 무관하게 선택한다. `majorLuck` 은 계속 제외.
3. 프롬프트 어휘(`professionalEvidenceNames`)와 기간 문구(`periodScope`)를 맞춘다.

## 테스트 위치

`__tests__/ui/yeongnyangi-question-sky.test.mjs`, `yeongnyangi-consultation-kinds.test.mjs`, `yeongnyangi-consultation.test.mjs`, `yeongnyangi-section-paragraphs.test.mjs`, 워커 jest `__tests__/worker/yeongnyangi-*.test.js`(`node scripts/run-mock-tests.mjs jest yeongnyangi`).

위험도 RED(유료 결과 경로). 결제·이용권은 건드리지 않는다.
