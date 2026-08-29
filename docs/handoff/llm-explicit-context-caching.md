---
status: active
updated: 2026-08-15
next: "§4 남은 작업 — 명시적 컨텍스트 캐싱 배선. 🔴 검증은 mock 으로 한다(과금 실호출 금지)"
---

# 인수인계 — Gemini 명시적 컨텍스트 캐싱으로 입력 비용 55% 줄이기

> 이 문서만 읽고 시작할 수 있게 쓴다. 작성 2026-08-15.
> 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라. 줄번호는 그때의 값이므로 먼저 grep 으로 재확인한다.

---

## 1. 왜 하는 작업인가

사용자 요구 원문:

> "llm 호출해서 나오는 관련 기능들의 토큰 사용량을 가장 효율적으로 최적화시켜줘"
> (방침: **출력 분량(결제 계약) 유지, 낭비만 제거** / **단계별 PR**)
>
> "니가 직접 돌리는것을 허가할테니까 최적화 작업을 실측해서 정확하게 마무리해줘"

그 허가로 **실호출 실측**을 했고, 그 결과 **지금까지의 계획 두 개가 모두 최선이 아니었다**는 것이 드러났다. 이 문서가 실측이 가리키는 답이다.

---

## 2. 이미 끝난 것 — 다시 하지 말 것

| PR | 내용 | 상태 |
|---|---|---|
| #644 | 사주 프롬프트 중복 제거 (96,068 → 59,377자) | 머지됨 |
| #645 | sukuyo 클라이언트 이중 제출 가드 | 머지됨 |
| #646 | vedic·찻집 캐시 배선 + `cache.minChars` + `attempts: 2` | 머지됨 |
| #647 | sukuyo 중복 생성 창 인수인계 문서 | 머지됨 |
| #648 | 사주 프롬프트 불변 접두사 선두 배치 | 머지됨 |
| #649 | 낡은 문서 4건 정정 | 머지됨 |
| **#652** | **sukuyo 서버 중복 생성 창 (시드+202+폴링)** | **머지됨** |
| #655 | `.gitattributes` zh-tw + 이 실측 기록 | 열림 |

🔴 **#648 을 되돌리지 말 것.** 접두사 선두 배치는 이 작업의 **전제**다 — 공통 접두사가 한 덩어리로 앞에 모여 있어야 그걸 통째로 캐시에 넣을 수 있다. 다만 **#648 만으로는 절감이 0이다**(§3 실측).

---

## 3. 실측 — 무엇을 근거로 이 결론에 왔나

측정 방법: `buildSajuAISectionPrompt` 로 프로덕션과 동일한 그룹 프롬프트 5개를 만들고, Gemini REST 를 직접 호출해 `usageMetadata.cachedContentTokenCount` 를 읽었다. **유료 라우트를 타지 않으므로 결제·DB 부작용 없음.** 총 14회, 약 $0.09.

### 3-1. 암묵(implicit) 캐싱은 웨이브1에서 0%다

| 조건 | prompt | cached | |
|---|---:|---:|---|
| 첫 호출 | 26,054 | 0 | |
| 직후 재호출 | 26,060 | 0 | |
| **병렬 5회 (프로덕션 형태)** | 28,003~ | **0/5** | 🔴 |
| +30초 | 26,064 | 0 | |
| +90초 | 26,180 | 7,165 | 27.4% |

**90초는 지나야 걸리고 그마저 27%다.** 사주 웨이브1은 5개 병렬로 ~40초에 끝나므로 **한 상담 안에서 할인이 0이다.**

### 3-2. 명시적(explicit) 캐싱은 99% 걸린다 — 병렬에서도

```
캐시 생성: 공통 접두사 61,463자 → 25,733 토큰
C1 answer_core       prompt=25,964  cached=25,733 (99.1%)
C2 structure_reading prompt=25,970  cached=25,733 (99.1%)
C3 life_domains      prompt=25,974  cached=25,733 (99.1%)
C4 timing_flow       prompt=26,090  cached=25,733 (98.6%)
C5 strategy_action   prompt=25,984  cached=25,733 (99.0%)
합계 129,982 중 128,665 캐시 (99.0%)
```

### 3-3. 비용 (사주 상담 1건, 입력만)

`gemini-2.5-flash`: 입력 $0.30/M · **캐시 입력 $0.075/M** · 캐시 저장 $1.00/M·시간

| | 계산 | 입력 비용 |
|---|---|---:|
| **현재** | 130,014 × $0.30/M | **$0.0390** |
| **명시적 캐싱** | 생성 25,733 × $0.30/M = $0.0077<br>+ 캐시분 128,665 × $0.075/M = $0.0096<br>+ 고유부 1,317 × $0.30/M = $0.0004<br>+ 저장 25,733 × $1/M × (60s/3600s) = $0.0004 | **≈ $0.0177** |

**절감 ≈ 55%, 프롬프트 내용 무변경 → 품질 위험 0.**

🔴 **단가는 2026-08-15 기준 공개가를 인용한 것이고 직접 확인하지 않았다(미검증).** 절감 *비율*은 실측된 토큰 수에서 나오므로 단가가 바뀌어도 방향은 같다.

---

## 4. 남은 작업 — 정확한 대상

### 4-1. `lib/llm-client.ts` — 캐시 생성/참조 지원

```
찾는 법:
  grep -n "GEMINI_ENDPOINT\|resolveGeminiEndpoint\|body: Record<string, unknown>" lib/llm-client.ts
```

- 요청 바디 조립부(현재 `:447~466`)에 **`cachedContent` 를 실을 수 있게** 한다. Gemini 는 `body.cachedContent = "cachedContents/<id>"` 한 줄이면 된다.
- 캐시 생성/삭제 헬퍼를 추가한다. 엔드포인트는 `https://generativelanguage.googleapis.com/v1beta/cachedContents`(POST/DELETE), 바디는
  `{ model: "models/gemini-2.5-flash", contents: [{ role: "user", parts: [{ text: prefix }] }], ttl: "300s" }`.
- 🔴 **`LLMRequest` 에 `cachedContent?: string` 를 추가하되 Workers AI 폴백 경로에는 넘기지 말 것** — `buildWorkersAiInput`(`:414~428`)은 이 개념이 없다. Gemini 실패로 폴백이 뜨면 **접두사를 다시 본문에 실어야** 하므로, 캐시를 쓰는 호출자는 폴백용 전체 프롬프트도 함께 갖고 있어야 한다.

### 4-2. `worker/routes/fortune.js` — 사주 웨이브1에 배선

```
찾는 법:
  grep -n "buildSajuAISectionPrompt\|runSectionGroup\|Promise.all(SAJU_AI_SECTION_GROUPS" worker/routes/fortune.js
```

현재 `:482` 가 `Promise.all(SAJU_AI_SECTION_GROUPS.map(runSectionGroup))` 다. 그 **앞에서** 캐시를 만들고, 각 그룹에는 접미사만 보낸다.

🔴 **접두사/접미사를 런타임에 문자열 비교로 구하지 말 것.** `buildSajuAISectionPrompt`(`:283~`)가 이미 `// ── 불변 접두사` / `// ── 여기부터 가변 접미사` 로 배열을 두 구획으로 나눠 놓았다(#648). **그 함수가 `{ prefix, suffix }` 를 반환하도록 바꾸고** 기존 호출자는 `prefix + "\n\n" + suffix` 로 합쳐 쓰게 하는 것이 정본 형태다. 문자열 최장공통접두사 계산은 그룹이 하나뿐일 때·보강요청이 붙을 때 조용히 틀린다.

### 4-3. 반드시 지킬 안전장치

1. **캐시 생성 실패는 절대 상담을 실패시키지 않는다.** 실패하면 지금처럼 전체 프롬프트를 그대로 보낸다(폴백). 🔴 결제가 끝난 경로다.
2. **최소 토큰 요건** — 명시적 캐싱은 모델별 최소 토큰이 있다(2.5 Flash 기준 1,024). 접두사가 그 미만이면 캐시를 만들지 말고 그냥 보낸다.
3. **TTL 과 삭제** — `ttl: "300s"` 로 짧게 잡고 웨이브가 끝나면 DELETE 한다. 저장 비용이 시간당 과금이라 방치하면 절감분을 갉아먹는다. 🔴 삭제 실패는 삼킨다(TTL 이 안전망).
4. **웨이브2(보강)도 같은 캐시를 재사용**한다 — `runSectionGroup` 이 `repairLines` 를 붙여 재호출하는데, 그건 **접미사**에 들어가므로 캐시가 그대로 유효하다.
5. **Workers AI 폴백 경로에서는 캐시를 쓰지 않는다**(§4-1).

### 4-4. 다른 라우트로 넓히기 전에

같은 병렬 팬아웃이 6곳 더 있다(`vedic-ai` `astrology-ai` `new-year-ai` `sukuyo-compatibility-ai` `ziwei-ai` `love-secret-ai`). 🔴 **사주부터 하고 실측한 뒤에 넓혀라.** 이유:

- 이들은 **가변 → 불변 → 가변 샌드위치**라 접두사가 짧다(`vedic-ai.js:990~1010` 확인). 캐시에 넣으려면 **#648 과 같은 재배치가 먼저** 필요하다.
- 절대 크기가 작다 — **숙요 실측: 5그룹 합계 22,033자, 공통 접두사 133자**로 사주(309,858자/61,548자)의 1/14 다. 최소 토큰 요건(1,024)에 못 미칠 수도 있다.
- `vedic-ai` · `astrology-ai` · `new-year-ai` 의 절대 크기는 **미측정**이다.

---

## 5. 정본 예시 — 이 형태를 그대로 쓸 것

캐시 생성 → 참조 → 삭제의 최소 형태(실측에 쓴 것과 동일):

```js
// 생성
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${apiKey}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "models/gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prefix }] }],
    ttl: "300s",
  }),
});
const cache = await res.json();        // cache.name === "cachedContents/<id>"

// 참조 — 본문에는 접미사만 싣는다
body.cachedContent = cache.name;

// 삭제
await fetch(`https://generativelanguage.googleapis.com/v1beta/${cache.name}?key=${apiKey}`, { method: "DELETE" });
```

🔴 **`model` 은 `models/` 접두사가 붙어야 하고, 캐시를 만든 모델과 호출 모델이 같아야 한다.**

---

## 6. 이 레포 고유의 작업 규칙

- **머지는 사용자가 한다.** 브랜치 → 커밋 → push → PR 까지만. `main` 직접 push 는 룰셋이 막는다.
- **격리 워크트리에서 작업할 것** — 동시 세션이 작업 디렉터리를 공유해 브랜치가 바뀌는 일이 실제로 있었다(2026-08-15).
- `worker/` · `lib/llm-client.ts` 를 건드리면 **PR CI 가 `critical` 티어**로 돈다.
- 🔴 **실호출 금지가 기본이다.** 이 문서의 실측은 사용자가 **그 1회 한정**으로 허가한 것이며 다음 세션으로 연장되지 않는다. 구현 검증은 mock 으로 한다.
- 🔴 **출력 분량 상수를 건드리지 말 것** — 결제 계약이다.

---

## 7. 검증 명령

```bash
npm run typecheck
npm run lint
npm run test:jest
node scripts/verify-llm-generation-resilience.mjs
node scripts/verify-workers-ai-fallback.mjs    # 폴백 경로가 캐시 없이도 도는지
npm run build:worker && npm run verify:worker-size
```

**추가할 테스트**: 캐시 생성이 실패해도 상담이 정상 완료된다(전체 프롬프트 폴백). mock 으로 `cachedContents` POST 를 500 으로 만들고 최종 결과가 나오는지 단언한다. **이게 이 작업의 안전 조건 그 자체다.**

---

## 8. 효과 측정

```bash
npx wrangler tail --format json > llm.log
node scripts/report-llm-token-usage.mjs llm.log
```

`lib/llm-client.ts` 의 `[llm token_usage]` 에 `cachedInputTokens` 가 이미 실려 있다(`:307`). 로그 게이트 `LLM_PROVIDER_CALL_LOG` 는 **기본 ON** 이다(`:231`, `"0"/"false"/"off"` 일 때만 꺼짐) — 별도 설정 불필요.

🔴 **tail 은 그 창 동안 실제 트래픽이 있어야 잡힌다.** 2026-08-15 측정 때 1,580줄을 받았지만 그 안에 LLM 호출이 0건이어서 집계가 비었다. 유료 AI 기능이 실제로 쓰이는 시간대에 돌려야 한다.

🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
