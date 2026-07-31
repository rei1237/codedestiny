# 동일 AI 상담 파이프라인 기능 진단 (Phase 4)

> 2026-08-01 · 운명의 지도 프리미엄 리뉴얼(#214·#230)의 마지막 단계.
> **코드는 수정하지 않았다.** 발견과 우선순위만 적는다.

## 범위

`worker/routes/` 에서 유료 LLM 상담을 수행하는 11개 라우트 + 신규 `destiny-compass-ai`.
축: 프롬프트 구조 / 상담 품질 / 전달 방식 / 파싱·Retry / 폴백 안전장치 / 로딩 UX / 접근성.

## 정량 스캔

| 라우트 | 줄수 | `fallbackToWorkersAI` | `fallbackMinChars` | 전달 문턱 | `clampSyncLlmTimeoutMs` |
|---|---|---|---|---|---|
| ziwei-ai | 2422 | – | 3 | 변수 | 4 |
| astrology-ai | 1742 | 4 | 1 | 400 | 2 |
| vedic-ai | 1569 | – | 1 | 400 | 2 |
| love-secret-ai | 1514 | – | 1 | – | 2 |
| sukuyo-compatibility-ai | 1879 | – | 2 | 400 | 2 |
| new-year-ai | 2416 | – | 2 | 400 | 3 |
| karma-destiny-ai | 2133 | – | 2 | 400 | **0** |
| life-book-ai | 2972 | – | 1 | 400 | 3 |
| **pet-saju-ai** | 381 | **1** | **0** | **기본 40** | **0** |
| master-love-codex | 909 | – | **0** | – | **0** |
| nakshatra-ai | 1245 | – | 2 | – | 2 |
| destiny-compass-ai (신규) | 620+ | 1 | 1 | 400 | 3 |

---

## P1 🔴 pet-saju-ai — 폴백을 켜고 문턱을 주지 않았다

**확정.** `worker/routes/pet-saju-ai.js` `generateNarration()`:

```js
fallbackToWorkersAI: true,   // 296행 — fallbackMinChars 없음
...
if (!ai?.ok || !hasRenderableLlmText(ai.text)) return null;   // 304행 — 기본 40자
```

CLAUDE.md 🔴 규칙("폴백을 켠 유료 라우트는 `fallbackMinChars` 를 반드시 함께 준다") 위반이다.
영향 SKU 두 개: `pet-saju-ai-consultation`(₩5,000), `pet-compatibility-ai`(₩5,000).

**왜 위험한가**: Workers AI 폴백은 실측상 목표 분량의 60~77% 에서 스스로 멈춘다(CLAUDE.md).
문턱이 없으면 그 짧은 응답이 `hasRenderableLlmText` 기본 40자만 넘겨 **정상 결제 결과로 전달**되고,
라우트의 재시도·환급 경로가 아예 돌지 않는다. 다른 유료 라우트는 전달 문턱을 400자로 잡는데 여기만 40자다.

**제안**: `fallbackMinChars: Math.round(baseTokens * 0.4)` 수준의 문턱 + 전달 판정을 `{ minChars: 400 }` 으로.
관례는 "그 기능의 최소 분량 상수 × 0.4".

---

## P2 🔴 한국어 리터럴 검증 + 로케일 탈출구 부재 (후보)

무료 `/narrate` 에는 이 문제가 **주석으로 이미 기록**되어 있다
(`worker/routes/destiny-compass.js` "라벨 포함·금지어 두 검사는 한국어 출력에만 성립한다 …
비-ko 에서는 모델이 정상적으로 답해도 매번 UNFAITHFUL → 언어 전환이 무력화된다").

같은 구조가 유료 라우트에 남아 있다. 유료에서 터지면 결과 열화가 아니라 **생성 실패·환불**이다.

| 라우트 | 한글 리터럴 정규식 | `getAmbientAiLocale` 탈출구 |
|---|---|---|
| new-year-ai | 37 | 0 |
| astrology-ai | 23 | 0 |
| ziwei-ai | 21 | 0 |
| karma-destiny-ai | 21 | 0 |
| vedic-ai | 15 | 0 |
| sukuyo-compatibility-ai | 11 | 0 |

⚠️ **후보다.** 정규식 개수만 셌고, 각각이 실제로 *차단 판정*에 쓰이는지는 개별 확인이 필요하다
(단순 문자열 치환·포맷팅용이 섞여 있을 수 있다). 확인 순서는 위 표의 위에서부터.

**참고 구현**: `worker/lib/destiny-compass-report-contract.js` `validateCompassSection()` 의
`if ((getAmbientAiLocale() || "ko") !== "ko") return issues;` — 길이·형식 검사만 남기고 언어 의존 검사를 건너뛴다.

---

## P3 상투구 가드가 어느 라우트에도 없다

`조심하세요` · `신중하세요` · `좋은 일이 생깁니다` · `노력하세요` 를 막는 검증이
**11개 라우트 전부 0건**이다. 사용자가 이번에 지적한 "조언이 일반적이다" 는 나침반만의 문제가 아니었다.

유일한 사례가 이번에 만든 `destiny-compass-report-contract.js` 의 `STOCK_PHRASE` 정규식이다.
공용 모듈(`worker/lib/fortune-reasoning-contract.js`)로 올려 전 라우트가 쓰게 하는 것이 자연스럽다.

## P4 근거 고정 규칙 미적용 5곳

`buildEvidenceRuleLines`(확정값 표 밖의 별·행성·수치 창작 차단)를 쓰는 곳은
ziwei · astrology · vedic · sukuyo 넷뿐이다.
**love-secret · new-year · karma-destiny · life-book · master-love-codex · nakshatra · pet-saju** 는 미적용.
이 라우트들의 출력은 확정값과 어긋나도 걸러지지 않는다.

## P5 `clampSyncLlmTimeoutMs` 미적용 3곳

`karma-destiny-ai` · `pet-saju-ai` · `master-love-codex`.
동기 생성인데 엣지 100초 컷 방어가 없다. pet-saju 는 기본 45초라 당장은 안전하지만
`PET_SAJU_PROVIDER_TIMEOUT_MS` 로 늘리면 무방비가 된다.
🔴 **세 라우트 모두 `scripts/verify-llm-generation-resilience.mjs` 의 clamp 검사 목록에도 없어
게이트가 잡지 못한다** — 목록 등록이 먼저다.

---

## 나침반이 새로 도입한 것 (다른 기능이 가져갈 만한 것)

1. **체계별 독립 해석 → 종합** — 웨이브 A 는 자기 체계 근거만 받아 한 전통 안에서 추론하고,
   웨이브 B 가 일치·불일치를 함께 짚는다. 한 프롬프트에 전부 넣는 기존 방식보다 근거가 또렷하다.
2. **근거 화이트리스트 + id 조인** — 모델은 근거 `id` 만 지목하고 서버가 실제 항목·★을 조인한다.
   모델이 근거를 창작할 수 없다.
3. **★는 서버 결정론 산출** (`dataQuality × weight`). 모델이 별점·확률을 만들지 못하게 막는다.
4. **미산출 계(系) 용어 차단** — 라그나·다샤·나크샤트라·ASC·트랜싯·신살.
   "계산하지 않은 것을 아는 척하지 않는다" 를 정규식으로 강제.
5. **두 웨이브 동기 전달** — SSE 없이 체감 속도를 만든다(폴링은 이 레포에서 폐기됨).

## 권장 순서

1. **P1 pet-saju-ai** — 돈이 걸려 있고 수정이 두 줄이다.
2. **P5 verify 목록 등록** — 게이트가 못 잡는 상태부터 없앤다.
3. **P2 로케일 탈출구** — 라우트별 실사용 확인 후 위에서부터.
4. **P3 상투구 가드 공용화** — `fortune-reasoning-contract.js` 로.
5. **P4 근거 고정 규칙 확산** — 분량이 커서 기능별로 나눠서.

## 확인하지 못한 것

- 프론트 로딩 UX·모바일·접근성은 **라우트 단위 정적 스캔만** 했다. 각 기능 화면을 실제로 열어 본
  비교는 하지 않았다(범위·시간). 필요하면 별도로 요청할 것.
- P2 의 정규식이 실제 차단 판정에 쓰이는지는 라우트별 코드 확인이 남아 있다.
