# 인수인계 — LLM 토큰 최적화에서 남은 개별 항목 5건

> 이 문서만 읽고 시작할 수 있게 쓴다. 작성 2026-08-15.
> 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라. 줄번호는 그때의 값이므로 먼저 grep 으로 재확인한다.

---

## 0. 왜 이 문서가 있나

사용자 요구 원문:

> "llm 호출해서 나오는 관련 기능들의 토큰 사용량을 가장 효율적으로 최적화시켜줘"
> (방침: **출력 분량(결제 계약) 유지, 낭비만 제거** / **단계별 PR**)
>
> "남은 문제를 다른 세션에 넘기기 위해 문서에 정리해"

큰 축은 처리했고(§1), 아래 5건은 **각각 작지만 독립적이고 서로 무관**해서 한 PR 로 묶기에 부적절하다. 항목마다 완결되게 적었으니 **원하는 것부터 골라 하나씩** 하면 된다.

---

## 1. 이미 끝난 것 — 다시 하지 말 것

| PR | 내용 | 상태 |
|---|---|---|
| #644 | 사주 프롬프트 중복 제거 — 내부 프롬프트 96,068 → 59,377자 (-38.2%), JSON 덤프 80,846 → 47,105자 | **머지됨** |
| #645 | sukuyo 클라이언트 이중 제출 가드(`submitLockRef`) | **머지됨** |
| #647 | sukuyo 서버 중복 생성 창 인수인계 문서 | **머지됨** |
| #646 | vedic·찻집 캐시 배선 + `lib/llm-cache.ts` 의 `cache.minChars` 저장 가드 + `attempts: 2` 4곳 | **머지됨** |
| #648 | 사주 프롬프트 불변 접두사 선두 배치(공통 접두사 240 → 61,548자) + JSON 슬라이싱 인수인계 문서 | **머지됨** |

**별도로 넘긴 큰 작업 2건 — 이 문서와 독립이며 둘 다 미해결이다:**

- [sukuyo-duplicate-generation-window.md](sukuyo-duplicate-generation-window.md) — 서버측 중복 생성 창(중복 1회 = LLM 6회)
- [llm-prompt-json-slicing.md](llm-prompt-json-slicing.md) — 계산 JSON 을 섹션이 쓰는 만큼만 싣기

**확인 완료해 제외한 것**: thinking 토큰. `lib/llm-client.ts:456` 이 `thinkingConfig` 를 항상 보내고 `:139-145` `resolveThinkingBudget` 이 미지정 시 **0(OFF)** 을 반환한다. 프로덕션에서 양수/dynamic 으로 옵트인하는 호출자는 0건이다. **여기서 더 아낄 것이 없다.**

---

## 2. 【A】 모델 오버라이드가 무효다 — 단가 절감안을 막고 있음

### 문제 (2026-08-15 실측 확인)

`lib/llm-client.ts:159-170`:

```ts
function resolveGeminiEndpoint(request: LLMRequest, model: string): string {
  const providedEndpoint = String(request.apiEndpoint || request.endpoint || "").trim();
  if (!providedEndpoint) return `${GEMINI_ENDPOINT}`;   // ← model 인자를 통째로 무시한다
  ...
}
```

`GEMINI_ENDPOINT`(`:77-79`)는 `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent` 로 **모델명이 URL 에 하드코딩**돼 있다. 즉 `apiEndpoint` 를 함께 주지 않으면 `resolveGeminiModel()` 이 해석한 모델은 **로그와 응답 메타에만** 반영되고 실제 호출은 언제나 `gemini-2.5-flash` 로 나간다.

### 영향 — `model` 을 주고 `apiEndpoint` 는 안 주는 호출자 6곳 (전수 확인)

| 파일:줄 | 넘기는 값 |
|---|---|
| `worker/routes/celestial-harmony.js:641` | `firstEnvText(env, ["CELESTIAL_HARMONY_GEMINI_MODEL", "GEMINI_MODEL", "PREMIUM_GEMINI_MODEL"])` |
| `worker/routes/oracle.js:167` | `clean(env.GEOMANCY_GEMINI_MODEL)` |
| `worker/routes/yoga-guru.js:357` | `clean(env.YOGA_GURU_GEMINI_MODEL)` |
| `worker/routes/dream.js:1292` | `firstDreamPsychoModel(env)` |
| `worker/lib/fusion-fortune.js:656` | `model` (= `env.FUSION_FORTUNE_LLM_MODEL`, `:636`) |
| `worker/lib/guardian-fortune-llm.js:110` | `config.model` |

**검색 범위**: `worker/` · `lib/` 의 `*.js`/`*.ts` 전체. `apiEndpoint` 를 실제로 넘기는 호출자는 **0곳**이다(매치는 `worker/lib/gemini.js:98` 의 통과 코드와 `lib/llm-client.ts` 내부뿐).

### 왜 지금까지 안 드러났나

로그에는 오버라이드된 모델명이 그대로 찍힌다(`resolveGeminiModel` 결과가 로그·메타로 감). 그래서 env 를 바꾸고 로그를 봐도 바뀐 것처럼 보인다.

### 고치는 법

`resolveGeminiEndpoint` 의 첫 분기에서 하드코딩 URL 을 반환하는 대신, **해석된 `model` 로 URL 을 조립**한다. 아래 분기가 이미 `/models/<model>:generateContent` 를 만드는 로직을 갖고 있으니 그 형태를 기본 경로에도 쓰면 된다.

🔴 **주의 — 이건 단순 리팩터가 아니라 동작 변경이다.** 지금까지 6개 라우트가 env 값과 무관하게 `gemini-2.5-flash` 로 돌고 있었으므로, 고치는 순간 **env 에 값이 들어 있던 라우트는 즉시 다른 모델로 나간다.** 고치기 전에 프로덕션 env 에 위 6개 키가 실제로 설정돼 있는지부터 확인하고, 설정돼 있다면 그 값이 지금 의도한 모델인지 사용자에게 물어라. 모르는 채로 고치면 조용한 모델 교체가 된다.

### 왜 중요한가

**"일부 라우트를 더 싼 모델로 내린다"는 단가 절감안이 현재 코드로는 env 만으로 불가능하다.** 이 항목은 절감 그 자체가 아니라 **절감 수단을 되살리는 작업**이다.

### 검증

```bash
npm run test:jest
node scripts/verify-llm-generation-resilience.mjs
node scripts/verify-workers-ai-fallback.mjs
```
`lib/llm-client.ts` 는 `worker/` 밖이지만 워커가 임포트하므로 PR CI 는 `critical` 로 돈다.

---

## 3. 【B】 `.gitattributes` 의 캐시버스트 merge driver 목록에 `zh-tw` 누락

### 문제 (2026-08-15 확인)

`.gitattributes` 의 `merge=cachebust` 등록 목록은 이렇게 끝난다:

```
public/en/index.html                merge=cachebust
public/ja/index.html                merge=cachebust
public/zh/index.html                merge=cachebust
```

**`public/zh-tw/index.html` 이 없다.** 그런데 `sync:public` 은 이 파일도 만든다(`scripts/sync-legacy-static-to-public.mjs` 출력: `Locale landing pages: /en, /ja, /zh, /zh-tw/index.html`), 그래서 브랜치가 갈리면 이 파일에도 `?v=build-<hash>` 충돌이 생긴다.

2026-08-15 의 PR #643 리졸브에서 실제로 충돌 파일 목록에 `public/zh-tw/index.html` 이 있었다. 그때는 내용 차이가 없어 넘어갔다.

### 고치는 법

`.gitattributes` 에 한 줄 추가:

```
public/zh-tw/index.html             merge=cachebust
```

### 함께 알아 둘 것 — 이게 GitHub 에서는 안 먹는다

merge driver 는 **로컬 git 설정**(`git config merge.cachebust.driver`, `scripts/setup-git-merge-drivers.mjs` 가 `npm install` 의 `prepare` 로 등록)에만 존재한다. **GitHub 서버에는 없다.** 그래서:

- 로컬 `git merge-tree --write-tree origin/main <branch>` → 충돌 없음(exit 0)
- GitHub PR 판정 → `CONFLICTING/DIRTY`

이 불일치가 셸을 건드리는 PR 이 둘 이상 열릴 때마다 재발한다. **해법은 로컬에서 `git merge origin/main` 한 뒤 push 하는 것**이고, 그러면 GitHub 은 이미 병합된 상태를 본다. 이 사실을 어디에도 안 적어 두면 다음 세션이 매번 다시 알아낸다 — 이 문서가 그 기록이다.

### 검증

없다(설정 파일). 다음번 셸 충돌 때 `public/zh-tw/index.html` 이 자동 해소되는지로 확인한다.

---

## 4. 【C】 sukuyo 의 `attempts: 2` 와 `capTokens` 가 어긋난다

### 문제 (2026-08-15 계산 확인)

PR #646 이 `worker/routes/sukuyo-compatibility-ai.js` 의 그룹 호출에 `attempts: 2` 를 넣었다. 그런데 토큰 스케일식은 `worker/lib/structured-consultation.js:73-74`:

```js
const scaled = Math.round(Number(baseTokens) * (1 + 0.3 * truncationRetries));
const maxOutputTokens = cap > 0 ? Math.min(cap, scaled) : scaled;
```

`truncationRetries` 는 잘림이 날 때만 오른다. `attempts: 2` 면 최대 1회이므로:

```
base 8,000 × (1 + 0.3 × 1) = 10,400   ← cap 12,000 에 도달하지 못한다
```

즉 **cap 12,000 은 이제 도달 불가능한 값**이다. `attempts: 3` 이던 시절에는 `8,000 × 1.6 = 12,800 → cap 12,000` 으로 딱 맞았다.

### 왜 남겼나

사용자가 "재시도도 2회면 충분할 것 같다"고 결정했고 그건 그대로 맞다. 다만 **cap 이 이제 거짓말을 한다** — 코드를 읽는 사람은 12,000 까지 늘어난다고 믿게 된다. 어느 쪽으로 맞출지는 **실측 잘림률**을 봐야 정할 수 있어 남겼다.

### 고치는 법 (둘 중 하나, 실측 후 선택)

- **잘림이 드물면**: `capTokens` 를 10,400 으로 낮춰 코드가 사실을 말하게 한다.
- **잘림이 잦으면**: `baseTokens` 를 올린다(예: 9,300 → 재시도 시 12,090). 🔴 **`baseTokens` 인상은 출력 토큰 상한을 올리는 것이므로 비용이 는다** — 사용자 승인 사항이다.

실측 방법은 `[llm token_usage]` 로그의 `finishReason` 분포와 `structured-consultation` 의 재시도 로그를 보는 것이다(§6).

### 검증

```bash
npm run test:jest
node scripts/verify-llm-generation-resilience.mjs
```

---

## 5. 【D】 JSON 스키마를 프롬프트 텍스트로 보내고 있다 (Gemini 네이티브 미사용)

### 문제 (2026-08-15 확인)

`worker/lib/fusion-fortune-prompt.js:348`:

```js
`응답 JSON 스키마(이 키만):\n${JSON.stringify(responseSchema)}`,
```

이 줄이 `userPrompt` 배열에 들어가 프롬프트 본문으로 나간다(`:352` 가 `{ systemPrompt, userPrompt, responseSchema }` 를 반환하지만, `responseSchema` 필드는 라우트의 그룹 보정·mock 계약용이다).

그리고 `lib/llm-client.ts` 의 요청 바디(`:447-458`)에는 `generationConfig.responseSchema` 가 **없다** — `maxOutputTokens` · `temperature` · `responseMimeType` · `thinkingConfig` 뿐이다. 즉 Gemini 의 네이티브 구조화 출력(structured output)을 전혀 쓰지 않고, 스키마를 매 호출 입력 토큰으로 지불하고 있다.

### 고치는 법

`lib/llm-client.ts` 의 `generationConfig` 에 `responseSchema` 를 옵션으로 실을 수 있게 하고(`responseMimeType: "application/json"` 과 짝), 호출자가 스키마를 넘기면 프롬프트 텍스트에서는 뺀다.

🔴 **주의**:
- `responseSchema` 는 **Workers AI 폴백 경로에는 그대로 못 넘긴다.** `buildWorkersAiInput`(`:414-428`)이 쓰는 것은 `response_format: { type: "json_object" }` 이고 스키마를 받지 않는다. 폴백에서는 프롬프트 텍스트 스키마가 여전히 필요할 수 있다 — **양쪽을 다 만족시키는 설계인지 먼저 확인할 것.**
- Gemini 네이티브 스키마는 지원 타입이 제한적이라(중첩·oneOf 등) 기존 스키마가 그대로 통과하지 않을 수 있다.
- 절감 규모를 **먼저 재라**: `JSON.stringify(pickSchema(group.keys)).length` × 그룹 수. 재보지 않고 착수하지 말 것.

### 왜 남겼나

절감 규모를 실측하지 않았고(**미검증**), 폴백 경로와의 상호작용 설계가 필요하다. 같은 패턴이 다른 프롬프트 빌더에도 있는지 전수 확인도 안 했다.

---

## 6. 【E】 토큰 집계 사각지대 2곳

### 문제 (2026-08-15 확인)

`scripts/report-llm-token-usage.mjs` 는 `lib/llm-client.ts` 가 찍는 `[llm token_usage]` 줄을 파싱한다. 스크립트 자신의 주석(`:17-19`)이 사각지대를 명시한다:

- `lib/tarot/mindscan-reading.mjs` (1,183줄) — `requestMindscanGeminiOnce:822` 가 `fetch` 로 Gemini 를 **직접** 부른다
- `lib/tarot/love-reading-llm.mjs` (325줄) — `requestLoveReadingGeminiOnce:154` 도 마찬가지

두 경로 모두 `thinkingConfig: { thinkingBudget: 0 }` 이 이미 들어가 있고(`:841` / `:173`), 잘림 재시도에서만 토큰을 올린다(`:914` / `:310`, 상한 24,000). 즉 **최적화 상태 자체는 나쁘지 않다.** 문제는 **비용이 집계에 안 잡힌다**는 것이다.

### 왜 중요한가

최적화 전후 비교를 `report-llm-token-usage.mjs` 로 하는데, 이 두 기능은 표에 아예 없다. "어느 라우트가 큰가"를 판단할 때 실제보다 작아 보인다.

### 고치는 법 (둘 중 하나)

- **(권장) 두 경로를 `callGeminiText`/`callLLM` 으로 통합** — 계측·캐시·폴백 체인·재시도를 전부 공짜로 얻는다. 다만 두 파일이 자체 타임아웃·잘림 재시도·`fetchImpl` 주입(mock 검증용)을 갖고 있어 그 계약을 깨지 않아야 한다. `scripts/verify-mindscan-reading.mjs` 가 `fetchImpl` 주입으로 돌아가므로 **그 검증기가 통과하는지가 성공 조건**이다.
- **(최소) 두 파일에 같은 형식의 `[llm token_usage]` 로그만 추가** — 집계에는 잡히지만 캐시·폴백은 여전히 없다.

### 검증

```bash
node scripts/verify-mindscan-reading.mjs      # 🔴 --live 를 붙이지 말 것
node scripts/verify-llm-token-usage.mjs
npm run test:jest
```

---

## 7. 권장 착수 순서

1. **【B】 `.gitattributes` 한 줄** — 5분, 위험 0. 다음 셸 충돌을 하나 줄인다.
2. **【C】 sukuyo cap 정합** — 실측 후 한 줄. 코드가 거짓말하는 상태를 끝낸다.
3. **【A】 모델 오버라이드** — 절감 그 자체는 아니지만 **다른 모든 단가 절감안의 전제**다. 🔴 착수 전에 프로덕션 env 6개 키 상태를 사용자에게 확인할 것.
4. **【E】 집계 사각지대** — 이후 최적화의 측정 정확도를 올린다.
5. **【D】 네이티브 스키마** — 절감 규모를 먼저 재고 판단.

큰 작업 2건([sukuyo 중복 창](sukuyo-duplicate-generation-window.md) · [JSON 슬라이싱](llm-prompt-json-slicing.md))은 이 목록과 별개이며, 절감 규모는 그쪽이 훨씬 크다.

---

## 8. 이 레포 고유의 작업 규칙

- **머지는 사용자가 한다.** 브랜치 → 커밋 → push → PR 까지만. `main` 직접 push 는 브랜치 룰셋이 막는다.
- **격리 워크트리에서 작업할 것** — 동시 세션이 작업 디렉터리를 공유해 미커밋 변경이 휩쓸린 실사고가 있다(`git worktree list`).
- `worker/`·`lib/llm-client.ts` 를 건드리면 **PR CI 가 `critical` 티어**로 돈다(전체 테스트 + 배포 설정 가드).
- 🔴 **실제 LLM 호출 금지.** mock 정본은 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입) · `scripts/verify-workers-ai-fallback.mjs`(키 제거). **`--live` 플래그를 임의로 쓰지 말 것.**
- 🔴 **출력 분량 상수를 건드리지 말 것** — 결제 계약이다.
- 🔴 **`buildSajuAISectionPrompt`(`worker/routes/fortune.js`)의 배열 순서(불변 접두사 → 가변 접미사)를 뒤집지 말 것** — PR #648 이 만든 것이고, 뒤집으면 6만자가 암묵 캐싱 대상에서 빠진다.
- 🔴 **캐시를 새로 배선할 때는 `cache.minChars` 를 함께 준다** — `withLLMCache` 의 저장 조건이 `!truncated` 뿐이라, 분량 미달 응답이 TTL 30일 동안 굳어 재생성이 같은 실패를 반복한다(PR #646 이 이 가드를 추가했다).

## 9. 효과 측정 (공통)

```bash
npx wrangler tail --format json > llm.log
node scripts/report-llm-token-usage.mjs llm.log
```

`lib/llm-client.ts:289-312` 의 `[llm token_usage]` 를 라우트별로 집계한다. `providerCallCount` · `cacheHit` · `duplicateBlocked` · `cachedContentTokenCount` 가 이미 실려 있다. 전후 동일 방식 재실행이 이 스크립트의 설계 용도다. **로그 형식(`emitTokenUsageLog`)을 바꾸면 파서도 함께 고쳐야 한다.**

🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
