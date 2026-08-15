# 인수인계 — 숙요 궁합 AI 의 중복 생성 창 닫기

> 이 문서만 읽고 시작할 수 있게 쓴다. 작성 2026-08-15.
> 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라. 이 문서의 줄번호도 그때의 값이므로 먼저 grep 으로 재확인한다.

---

## 1. 왜 하는 작업인가

사용자 요구 원문:

> "llm 호출해서 나오는 관련 기능들의 토큰 사용량을 가장 효율적으로 최적화시켜줘"
> (방침 결정: **출력 분량 유지, 낭비만 제거** / **단계별 PR**)
>
> "1. 캐시 배선 (vedic-ai·찻집) 문제부터 일단 해결하고 ukuyo 서버 중복 생성 창은 심각한 문제이므로 해결하는데 컨텍스트 제한에 걸리면 다른 세션에 넘길 수 있도록 문서로 정리해줘"
>
> "그리고 재시도도 2회이면 충분할것 같다"

즉 이 작업은 **사용자가 "심각한 문제"로 지목해 직접 지시한 항목**이다. 캐시 배선과 재시도 축소는 이미 끝났고(§2), 남은 것은 이 문서의 주제 하나다.

### 문제의 실체

`worker/routes/sukuyo-compatibility-ai.js` 의 `handleStart` 는 이 순서로 돈다:

```
startLocks 확인 (인메모리)          ← 같은 isolate 안에서만 유효
  → findOne({ userId, idempotencyKey })   ← 없으면 생성 진행
  → 결제/이용권 확인
  → LLM 생성 (그룹 5개 + 요약 1개 = 6회, 60~100초)
  → create({...})                          ← 여기서 처음 문서가 생긴다
```

`findOne` 과 `create` 사이 **60~100초가 통째로 중복 생성 창**이다. 그 사이에 들어온 같은 `idempotencyKey` 요청은 `findOne` 에서 아무것도 못 찾고 그대로 생성을 한 번 더 시작한다.

`startLocks` 는 인메모리 Map 이라 요청이 다른 isolate 로 갈리면 무력하다. unique index `{ userId, idempotencyKey }` 는 **DB 쓰기만** 막고, 그 시점엔 이미 6회의 LLM 호출 비용이 지불된 뒤다. 즉 중복키 에러는 돈을 아껴 주지 않는다.

**한 번의 중복 = LLM 6회 = 이 라우트에서 가장 비싼 낭비다.**

---

## 2. 이미 끝난 것 — 다시 하지 말 것

| PR | 내용 | 상태 |
|---|---|---|
| **#644** | 사주 프롬프트 중복 제거 (내부 프롬프트 96,068 → 59,377자, -38.2%) | 열림 (`MERGEABLE/CLEAN`) |
| **#645** | **sukuyo 클라이언트** 이중 제출 가드 (`submitLockRef`) | 열림 |
| **#646** | vedic·찻집 캐시 배선 + `cache.minChars` 저장 가드 + `attempts: 2` 4곳 | 열림 |
| #643 | 찻집 병렬 섹션 (별건, 캐시버스트 충돌 해소함) | 열림 |

🔴 **#645 가 이미 클라이언트 쪽 이중 제출을 막았다.** 이 문서의 작업은 **서버 쪽** 구멍이다 — 클라이언트가 한 번만 보내도 네트워크 재시도·새로고침·다른 기기에서 같은 `idempotencyKey` 가 다시 오면 여전히 뚫린다. 두 작업은 겹치지 않는다.

🔴 **#646 에서 `sukuyo-compatibility-ai.js` 의 `attempts: 2` 를 2곳 추가했다.** 그래서 **#646 머지 후 이 파일의 줄번호는 아래 표보다 약 4줄 밀린다.** 줄번호를 믿지 말고 grep 으로 찾을 것.

머지는 **사용자가 한다.** 이 문서의 작업도 브랜치 → PR 까지만 하고 멈춘다.

---

## 3. 남은 작업 — 정확한 대상

### 3-1. 스키마 (`worker/lib/models.js`)

현재 `sukuyoCompatibilityAiConsultationSchema` (main 기준 `:1237-1263`):

```
찾는 법: grep -n "const sukuyoCompatibilityAiConsultationSchema" worker/lib/models.js
```

- **`status` 필드가 없다.** `generationError` 도 없다.
- required 필드: `userId` · `idempotencyKey` · `personA` · `personB` · `sukuyoResult`(하위 `personAShuku`·`personBShuku`·`relationType` 모두 required) · `relationshipType` · `topic` · `accessType`
- unique index: `{ userId: 1, idempotencyKey: 1 }` (`:1261`)

**할 일**: `status`(enum `generating`/`completed`/`failed`, 기본 `generating`)와 `generationError`(String, default null) 추가.

> ⚠️ `personB` 가 `required: true` 인데 라우트는 `normalized.consultationType === "compatibility"` 가 아니면 `personB: null` 로 직렬화한다(`serializeConsultation` 근처). seed 를 미리 만들 때 이 required 가 걸리는지 **반드시 확인**하고, 걸리면 required 를 푸는 대신 seed 에 실제 계산값을 넣는 쪽을 먼저 검토한다 — 계산(`calculation`)은 LLM **이전에** 끝나므로 `sukuyoResult`·`personA`·`personB` 를 seed 에 채울 수 있다. 스키마의 required 를 푸는 것은 다른 경로의 데이터 무결성을 낮추므로 최후 수단이다.

### 3-2. 라우트 (`worker/routes/sukuyo-compatibility-ai.js`)

```
찾는 법:
  grep -n "startLocks" worker/routes/sukuyo-compatibility-ai.js
  grep -n "SukuyoCompatibilityAiConsultation.findOne" worker/routes/sukuyo-compatibility-ai.js
  grep -n "SukuyoCompatibilityAiConsultation.create" worker/routes/sukuyo-compatibility-ai.js
```

main 기준 위치(±4줄, #646 머지 후 밀림):

| 위치 | 지금 하는 일 | 바꿀 것 |
|---|---|---|
| `:26` | `startLocks` 선언 (인메모리 Map) | 그대로 둔다 — 같은 isolate 의 즉시 중복은 이게 가장 싸게 막는다 |
| `:1776` | `if (startLocks.has(lockKey)) return startLocks.get(lockKey)` | 그대로 |
| `:1780` | `findOne` → `if (existing) return json({ ok:true, consultation: serializeConsultation(existing), reused:true })` | **`status` 를 분기**: `completed` 면 지금처럼 반환, `generating` 이고 신선하면 **202**, `failed`/오래된 `generating` 이면 재생성 진행 |
| `:1787` 부근 | `resolveStartAccess` (결제/이용권) | 그대로 — seed 는 **결제 확인 후에** 만든다 |
| 계산 완료 직후 | (없음) | **여기에 seed `create` 를 넣는다** (`status: "generating"`) |
| `:1846` | 생성 후 `create({...})` | **`updateOne`/`save` 로 바꾼다** (seed 를 완성본으로 채움) |
| `:1873` | `return json({ ok:true, consultation: serializeConsultation(created) })` | 그대로 (동기 경로는 계속 완성본을 반환) |

**핵심 설계 판단 — 반드시 지킬 것**: seed 를 먼저 만들면 그 사이의 중복 요청이 `findOne` 에서 **빈 상담문**을 발견한다. 지금처럼 `serializeConsultation(existing)` 을 그대로 돌려주면 **사용자가 빈 결과를 받는다.** 그래서 `status` 분기가 seed 도입과 **한 커밋에** 들어가야 한다. 하나만 하면 회귀다.

### 3-3. 클라이언트 계약 (`app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx`)

- `/api/sukuyo-compatibility-ai/result` **GET 엔드포인트는 이미 있다** (라우트 `:2022`, `if (method === "GET" && path === "/result")`). 폴링 인프라를 새로 만들 필요는 없다.
- 하지만 **클라이언트가 202/폴링을 처리하는 코드는 찾지 못했다**(`grep -n "202\|status === \"generating\"\|poll"` → 0건). 즉 현재는 동기 계약으로 추정된다.
- 🔴 **`추정` 표시다. 실제로 클라이언트가 202 를 어떻게 다루는지 직접 확인한 뒤 진행할 것.** 확인 없이 서버만 202 를 뱉게 바꾸면 유료 기능이 죽는다.

**선택지 두 갈래 — 사용자에게 물어볼 것**:

- **(A) 서버만 고친다 (권장)**: seed + `status` 분기까지만 넣고, 중복 요청에는 202 대신 **기존 동기 응답을 유지**하되 진행 중이면 잠시 대기 후 완성본을 반환하거나, `reused` 응답에 `status` 를 실어 클라이언트가 무시해도 깨지지 않게 한다. 클라이언트 변경 없음 → 회귀 위험 최소.
- **(B) astrology-ai 처럼 202 + 폴링으로 전환**: 정본에 가장 가깝지만 클라이언트 계약 변경이 함께 필요하다.

어느 쪽이든 **결제는 이미 끝난 상태**라는 점을 잊지 말 것 — 사용자가 결과를 못 받는 경로를 새로 만들면 안 된다.

---

## 4. 정본 예시 — 이걸 그대로 베껴라

**`worker/routes/astrology-ai.js:1655-1678`** (main 기준). seed 생성 + 중복키 처리 + 202 반환이 한 덩어리로 들어 있다:

```js
    status: "generating",
    generationError: null,
  };

  if (existing) {
    await AstrologyAiConsultation.updateOne({ id: existing.id }, { $set: { ...seed, updatedAt: now } });
  } else {
    try {
      await AstrologyAiConsultation.create(seed);
    } catch (error) {
      if (error?.code === 11000) {
        const duplicate = await AstrologyAiConsultation.findOne({ userId: auth.userId, idempotencyKey }).lean();
        if (duplicate?.status === "completed") return json(publicSession(duplicate));
        return json({ ok: true, sessionId: duplicate?.id || sessionId, status: "generating", message: "…" }, { status: 202 });
      }
      throw error;
    }
  }
```

**`worker/routes/vedic-ai.js:1440-1452`** — `status` 분기의 정본. **신선도 창**을 두는 것이 핵심이다(죽은 `generating` 문서가 재생성을 영원히 막지 않도록):

```js
  if (existing?.status === "completed" && existing.inputHash === normalized.inputHash) {
    return json({ ok: true, consultation: consultationPayload(existing.toObject()) });
  }
  // 진행 중 생성에 대한 재-POST는 재생성하지 않고 202로 안내(폴링 대상).
  // 신선도 창 = 차트 계산 + 초기 180s + 품질 재시도 180s + 마진.
  if (existing?.status === "generating" && Date.now() - new Date(existing.updatedAt || existing.createdAt).getTime() < 420000) {
    return json({ ok: true, sessionId: existing.id, status: "generating", message: "…" }, { status: 202 });
  }
```

sukuyo 의 신선도 창은 이 라우트의 실제 예산으로 계산할 것 — 그룹 타임아웃 + 요약 + 마진. `SUKUYO_*_TIMEOUT_MS` 계열 상수를 grep 해서 근거로 삼는다. **420000 을 그냥 베끼지 말 것.**

---

## 5. 이 레포 고유의 작업 규칙

- **머지는 사용자가 한다.** 브랜치 → 커밋 → push → PR 까지만.
- `main` 직접 push 불가(브랜치 룰셋). 로컬 프로덕션 배포도 불가.
- **격리 워크트리에서 작업할 것.** 동시 세션이 작업 디렉터리를 공유해 미커밋 변경이 남의 커밋에 휩쓸린 실사고가 있다. 기존 워크트리 목록은 `git worktree list`.
- 정적 셸(`index.html` + 미러)을 건드렸다면 `npm run sync:public` 으로 캐시키를 재스탬프하고 **같은 PR 에** 담는다. (이 작업은 셸을 건드릴 일이 없다.)
- 🔴 **DB 스키마 변경이므로 PR CI 가 `critical` 티어로 돈다**(`scripts/lib/change-risk.mjs` 의 `deepRequired`). 전체 테스트 + 배포 설정 가드가 전부 돈다 — 시간이 걸리는 게 정상이다.
- 🔴 **실제 LLM 호출 금지.** mock 정본은 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입) · `scripts/verify-workers-ai-fallback.mjs`(키 제거). `--live` 플래그 사용 금지.
- `config/payment-freeze.json` 등재 파일을 건드렸다면 `node scripts/verify-payment-freeze.mjs --update` 로 매니페스트를 갱신해 **같은 커밋에** 담는다.

---

## 6. 검증 명령

```bash
npm run typecheck
npm run lint
npm run test:jest                      # 150 suites / 1,466 tests (2026-08-15 기준 전부 통과)
node scripts/verify-payment-freeze.mjs
node scripts/verify-paid-feature-billing-policy.mjs
node scripts/verify-ai-prompt-billing-policy.mjs
node scripts/verify-llm-generation-resilience.mjs
```

스키마를 건드렸으므로 아래도 함께:

```bash
npx jest __tests__/worker/user-model-single-source.static.test.js
npm run test:jest -- __tests__/worker/db
```

새 테스트를 하나 추가할 것을 권한다: **`findOne` 과 `create` 사이에 두 번째 요청이 들어와도 LLM 호출이 6회를 넘지 않는다**를 mock 으로 단언. 이게 이 작업의 성공 조건 그 자체다. jsdom/mock 하네스에서 **응답을 즉시 resolve 하면 in-flight 가드가 죽어 오탐**이 나므로, mock 에 지연을 넣어야 한다.

---

## 7. 이 작업 밖이지만 알아 둘 것

- **`lib/llm-client.ts:159-170` `resolveGeminiEndpoint()` 버그**: `apiEndpoint` 를 함께 주지 않으면 모델 오버라이드가 무효다(URL 에 `gemini-2.5-flash` 가 하드코딩). 영향 6곳: `celestial-harmony.js:641` · `oracle.js:167` · `yoga-guru.js:357` · `dream.js:1293` · `fusion-fortune.js:656` · `guardian-fortune-llm.js:112`. **미조치**.
- **`.gitattributes` 의 `merge=cachebust` 목록에 `public/zh-tw/index.html` 이 빠져 있다.** 한 줄 추가 건. **미조치**.
- **`sukuyo-compatibility-ai.js` 의 `attempts: 2` 와 cap 불일치**: base 8,000 / cap 12,000 인데 `attempts: 2` 면 잘림 재시도가 1회뿐이라 `8,000 × 1.3 = 10,400` 으로 cap 에 도달하지 못한다(`structured-consultation.js` 의 `baseTokens × (1 + 0.3 × truncationRetries)`). 실측 잘림률을 본 뒤 cap 을 10,400 으로 낮추거나 base 를 올릴 것. **미조치**.
- **아직 안 한 큰 최적화 2건** (사용자 승인 필요):
  - 섹션별 JSON 슬라이싱 — 정본은 `worker/routes/life-book-ai.js:1140-1170` 의 `pickSajuSlice`. 대상: `vedic-ai.js` · `new-year-ai.js` · `sukuyo-compatibility-ai.js` · `astrology-ai.js` · `fortune.js`. 입력 50~75% 추가 절감 **추정**.
  - 불변 블록을 프롬프트 선두로 옮겨 Gemini implicit caching 활성화 — 사주 기준 공통 접미사 **100,092자**(실측)가 지금은 전액 캐시 대상 밖이다. 접두사는 240자뿐.

## 8. 효과 측정

```bash
npx wrangler tail --format json > llm.log
node scripts/report-llm-token-usage.mjs llm.log
```

`lib/llm-client.ts` 의 `[llm token_usage]` 로그를 라우트별로 집계한다. `providerCallCount`·`cacheHit`·`duplicateBlocked` 필드가 이미 있어 중복 차단 효과가 그대로 보인다. 전후 동일 방식 재실행이 이 스크립트의 설계 용도다.

🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
