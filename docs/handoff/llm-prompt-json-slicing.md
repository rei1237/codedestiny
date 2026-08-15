# 인수인계 — 프롬프트 JSON 덤프를 섹션이 쓰는 만큼만 싣기

> 이 문서만 읽고 시작할 수 있게 쓴다. 작성 2026-08-15.
> 🔴 근거를 못 찾으면 추측하지 말고 사용자에게 물어라. 줄번호와 수치는 그때의 실측값이므로 먼저 재확인한다.

---

## 1. 왜 하는 작업인가

사용자 요구 원문:

> "llm 호출해서 나오는 관련 기능들의 토큰 사용량을 가장 효율적으로 최적화시켜줘"
> (방침: **출력 분량(결제 계약) 유지, 낭비만 제거** / **단계별 PR**)
>
> "그리고 이제 나머지 큰 최적화 2건도 진행해줘"

"큰 최적화 2건" 중 **하나(프롬프트 접두사 캐싱)는 PR #648 로 끝났고**, 이 문서는 **나머지 하나**다.

### 왜 이번 세션에서 끝내지 않았나

이 작업은 지금까지의 최적화와 성격이 다르다. 앞의 것들은 **사본·반복·무효 호출**을 지웠고 모델이 받는 정보는 그대로였다. 이 작업은 **모델이 실제로 보는 데이터를 줄인다.** 잘못 자르면 유료 상담의 근거가 사라지고, 그 실패는 조용하다(분량은 채워지는데 내용이 얕아진다).

게다가 **사주 5그룹에는 `evidenceRefs` 선언 자체가 없다**(§3-1). 즉 "어느 그룹이 어느 계산 루트를 쓰는가"를 새로 설계해야 하고, 그건 명리 도메인 판단이다. 남은 컨텍스트로 시작하면 그 판단을 근거 없이 채우게 된다.

---

## 2. 이미 끝난 것 — 다시 하지 말 것

| PR | 내용 | 상태 |
|---|---|---|
| #644 | 사주 프롬프트 중복 제거 — 내부 프롬프트 96,068 → 59,377자 (-38.2%) | **머지됨** |
| #645 | sukuyo 클라이언트 이중 제출 가드 | **머지됨** |
| #647 | sukuyo 서버 중복 생성 창 인수인계 문서 | **머지됨** |
| #646 | vedic·찻집 캐시 배선 + `cache.minChars` + `attempts: 2` 4곳 | 열림 |
| #648 | 사주 프롬프트 불변 접두사 선두 배치 (공통 접두사 240 → 61,548자) | 열림 (이 문서가 그 PR 에 함께 들어간다) |

🔴 **#644 가 이미 JSON 덤프를 80,846 → 47,105자로 줄였다.** 그건 같은 객체를 두 번 직렬화하던 것을 없앤 것이고, 이 문서의 작업은 **남은 47,105자를 섹션별로 자르는 것**이다. 중복 제거는 끝났으니 다시 찾지 말 것.

🟡 **별개의 미해결 인수인계**: [sukuyo-duplicate-generation-window.md](sukuyo-duplicate-generation-window.md) (서버측 중복 생성 창). 이 문서와 독립이다.

---

## 3. 실측 — 무엇이 얼마나 큰가

측정 방법: `worker/routes/admin.js` 의 `buildAdminSajuResultFromEngine` 으로 엔진 계산값을 만들고 `worker/lib/saju-ai-prompt.js` 의 `buildSajuAIPromptWithDomain` 을 직접 호출. **LLM 호출 0회, 과금 0.**
고정 입력: `홍길동 / M / 1990-03-15 09:30 / 서울`, 질문 `"제가 올해 이직해도 될까요"`, domain `career`.

```js
// 재현 스크립트 (그대로 node -e 로 실행 가능)
const ROOT = 'file:///d:/Development/code-destiny';
const admin = await import(ROOT + '/worker/routes/admin.js');
const sp = await import(ROOT + '/worker/lib/saju-ai-prompt.js');
const profile = { name:'홍길동', gender:'M', birthDate:'1990-03-15', birthTime:'09:30', birthPlace:'서울', calendarType:'solar' };
const q = '제가 올해 이직해도 될까요';   // 🔴 빈 질문은 ensureValidQuestion 이 INVALID_QUESTION 으로 던진다
const r = admin.buildAdminSajuResultFromEngine(profile, { question: q, domain: 'career' });
const b = sp.buildSajuAIPromptWithDomain({ sajuResult: r, question: q, domain: 'career', profileOverride: profile });
const fs = b.factSnapshot;
console.log(Object.keys(fs).map(k => k + '=' + JSON.stringify(fs[k]).length).join(' '));
```

### 사주 — 그룹 프롬프트 61,927자의 구성

| 덩어리 | 실측 | 비고 |
|---|---:|---|
| `[분석 데이터(JSON)]` 덤프 전체 | **47,105** | `fortune-question-prompt.js` 의 `safeJsonBlock(snapshot)` |
| ├ `factSnapshot` | 19,622 | |
| │ ├ **`majorStructures`** | **12,937** | 이 안에서 |
| │ │ ├ **`earthStorageOpenings`** | **9,853** | 🔴 **단일 최대**. 대운·세운별 고(庫) 열림 이벤트 배열 |
| │ │ ├ `hiddenStemExposures` | 1,838 | |
| │ │ ├ `gyeokguk` | 800 | factCard 의 "10. 격국" 으로도 나간다 |
| │ │ └ `twelveLifeStages` · `doChung` · `interactions` | 339 | |
| │ ├ `luck` | 2,888 | |
| │ ├ `fixedTenGodTable` | 1,102 | factCard 의 십성 확정표로도 나간다 |
| │ └ `hiddenStemsByBranch` · `pillars` · `tenGodDistribution` 등 | ~1,700 | |
| ├ `sajuResult`(원본) | 13,136 | |
| └ 나머지(profile · advancedFactors 등) | ~14,300 | `advancedFactors` 는 이 프로필에서 2자였다 — **프로필/도메인에 따라 크게 달라진다.** 다른 입력으로도 재볼 것 |
| `factCard` (별도, JSON 아님) | 1,492 | 프롬프트에 산문/표로 이미 들어간다 |

**`earthStorageOpenings` 9,853자가 `factCard` 에는 없다.** 즉 모델은 이 데이터를 JSON 으로만 받는다. 그룹 5개에 전부 실리므로 **한 상담에 49,265자**를 차지한다.

### 절감 상한 (추정)

`earthStorageOpenings` 가 정말 필요한 그룹이 `timing_flow`(시기) 하나뿐이라면 나머지 4그룹에서 빼서 **-39,412자/건**. 다른 큰 덩어리까지 그룹별로 가르면 그 이상. 🔴 **"필요한 그룹이 하나뿐"은 아직 검증되지 않은 가설이다.** §4 가 검증 방법이다.

### 다른 라우트 (미실측 — 착수 시 같은 방법으로 잴 것)

`vedic-ai.js`(`compactChartForPrompt` + `buildVedicKnowledgeContext`) · `new-year-ai.js`(`JSON.stringify(fortuneData)` 전량) · `sukuyo-compatibility-ai.js` · `astrology-ai.js`(`JSON.stringify(chart)` 전량). 각각 그룹/섹션 수만큼 곱해진다.

---

## 4. 방법 — 무엇을 근거로 자를지 판정하는가

### 4-1. 정본은 하나다

**`worker/routes/life-book-ai.js:1140-1170`** 의 `pickSajuSlice`. 15개 섹션이 계산 JSON 전량을 반복 전송하던 것을 막은 코드이고, 주석이 그 이유를 그대로 적어 두었다:

```js
// 섹션이 실제로 참조하는 루트만 추린다. 계산 JSON 전량을 15번 반복 전송하면 입력 토큰이 15배가 되고
// TTFT 도 그만큼 늘어나 웨이브가 엣지 예산을 넘긴다.
const SECTION_SAJU_BASE_ROOTS = Object.freeze([
  "yearPillar", "monthPillar", "dayPillar", "hourPillar",
  "dayMaster", "fiveElements", "strength", "seasonalBalance", "calculationMeta",
]);

function pickSajuSlice(sajuResult, evidenceRefs = []) {
  if (!sajuResult || typeof sajuResult !== "object") return sajuResult;
  const roots = new Set(SECTION_SAJU_BASE_ROOTS);
  for (const ref of evidenceRefs) {
    const root = evidenceRefRoot(ref);
    if (root) roots.add(root);
  }
  const slice = {};
  for (const root of roots) {
    if (sajuResult[root] !== undefined) slice[root] = sajuResult[root];
  }
  return slice;
}
```

구조가 핵심이다: **모든 섹션이 공유하는 base roots** + **그 섹션이 선언한 `evidenceRefs` 가 가리키는 루트**. base 가 있어 아무 섹션도 명식 기본을 잃지 않는다.

### 4-2. 사주에는 선언이 없다 — 이게 진짜 작업이다

`worker/lib/saju-ai-prompt.js` 의 `SAJU_AI_SECTION_GROUPS`(`:37~93` 부근) 각 그룹은 이 필드만 갖는다:

```
key · label · chapters[{no,title}] · minChars · maxChars · guide
```

**`evidenceRefs` 가 없다.** 그러니 이 작업의 절반은 "그룹마다 어떤 계산 루트가 필요한가"를 선언하는 것이다.

5개 그룹: `answer_core` · `structure_reading` · `life_domains` · `timing_flow` · `strategy_action`
(`grep -n "key: \"" worker/lib/saju-ai-prompt.js | head -20` 로 확인)

### 4-3. 판정 근거 — 추측하지 말고 이걸 봐라

1. **각 그룹의 `guide` 문자열과 `chapters[].title`** 이 그 그룹이 무엇을 쓰는지 말해 준다. 예: `structure_reading` 의 guide 는 *"확정표에 적힌 십성만 써서 구조를 읽고, 오행의 과한 곳과 부족한 곳이…"* → `fixedTenGodTable`·`elementDistribution` 이 필요하고 `earthStorageOpenings` 는 아닐 가능성이 높다.
2. **`buildEvidenceRuleLines(buildSajuAnalysisBasis(factSnapshot))`** (`saju-ai-prompt.js` 하단, `worker/lib/fortune-reasoning-contract.js:84`) 가 **근거 표를 사용자 화면에도 내보낸다.** 여기서 참조되는 필드는 **절대 자르면 안 된다** — 자르면 화면의 근거 패널과 본문이 어긋난다.
3. **`validateSajuMyeongsikTenGodText(text, factSnapshot)`** 가 서버 검증에서 factSnapshot 을 쓴다. 이건 프롬프트가 아니라 **검증 경로**이므로, 프롬프트에서 자르더라도 검증에는 원본 factSnapshot 이 그대로 가야 한다. **두 경로를 혼동하지 말 것.**
4. 확신이 안 서면 **자르지 말고 남긴다.** 이 작업에서 안 자른 것은 비용이고, 잘못 자른 것은 사고다.

### 4-4. 권장 진행 순서

1. **사주 하나만 먼저** 한다. 5개 라우트를 동시에 건드리지 않는다.
2. 가장 큰 덩어리(`earthStorageOpenings` 9,853자) **하나만** 그룹별로 가른다. 전면 슬라이싱보다 먼저 이 한 조각으로 효과와 위험을 잰다.
3. 실측(§3 스크립트)으로 전후 크기를 보고, `verify:saju-ai-section-plan` 으로 계약을 확인한 뒤 PR.
4. 사주가 안정되면 `vedic-ai` → `astrology-ai` → `new-year-ai` → `sukuyo-compatibility-ai` 순으로 같은 패턴을 옮긴다. **라우트당 PR 하나.**

---

## 5. 이 레포 고유의 작업 규칙

- **머지는 사용자가 한다.** 브랜치 → 커밋 → push → PR 까지만.
- `main` 직접 push 불가(브랜치 룰셋). 로컬 프로덕션 배포 불가.
- **격리 워크트리에서 작업할 것** — 동시 세션이 작업 디렉터리를 공유해 미커밋 변경이 휩쓸린 실사고가 있다(`git worktree list`).
- `worker/` 변경이라 **PR CI 가 `critical` 티어**로 돈다(전체 테스트 + 배포 설정 가드). 시간이 걸리는 게 정상이다.
- 🔴 **실제 LLM 호출 금지.** mock 정본은 `scripts/verify-mindscan-reading.mjs`(`fetchImpl` 주입) · `scripts/verify-workers-ai-fallback.mjs`(키 제거). `--live` 사용 금지.
- 🔴 **출력 분량 상수를 건드리지 말 것** — `SAJU_AI_MIN_RESULT_CHARS`(11,500), 그룹별 `minChars`/`maxChars` 는 결제 계약이다.
- 🔴 **`saju-ai-prompt.js` 의 챕터 `title` 문자열은 한 글자도 못 바꾼다** — 서버 검증(`fortune.js` `SAJU_AI_REQUIRED_CHAPTER_PATTERNS`)·클라이언트 렌더러(`js/saju-engine.js` `_sajuPromptChapterTitle`)와의 계약이다.
- 🔴 **`buildSajuAISectionPrompt` 의 배열 순서(불변 접두사 → 가변 접미사)를 뒤집지 말 것** — PR #648 이 만든 것이다. 뒤집으면 6만자가 암묵 캐싱 대상에서 빠진다.

---

## 6. 검증 명령

```bash
npm run typecheck
npm run lint
npm run test:jest                                   # 150 suites / 1,466 tests (2026-08-15 전부 통과)
node scripts/verify-saju-ai-section-plan.mjs        # 93 checks — 그룹별 챕터 커버리지 + "모자란 섹션만 재생성"
node scripts/verify-saju-ai-consultation-recovery.mjs
node scripts/verify-health-report-regression.mjs
node scripts/verify-llm-generation-resilience.mjs
node scripts/verify-ai-prompt-billing-policy.mjs
node scripts/verify-payment-freeze.mjs
```

다른 라우트로 넘어갈 때는 그 라우트의 flow 검증기도 함께: `verify-vedic-ai-flow` · `verify-astrology-ai-flow` · `verify-new-year-ai-flow` · `verify-astrology-sectioned-generation`.

### 효과 측정

```bash
npx wrangler tail --format json > llm.log
node scripts/report-llm-token-usage.mjs llm.log
```

`lib/llm-client.ts` 의 `[llm token_usage]` 로그를 라우트별로 집계한다. 전후 동일 방식 재실행이 이 스크립트의 설계 용도다.

---

## 7. 함께 알아 둘 것 (이 작업 밖, 미조치)

- **`lib/llm-client.ts:159-170` `resolveGeminiEndpoint()`** — `apiEndpoint` 를 함께 주지 않으면 URL 에 하드코딩된 `gemini-2.5-flash` 가 그대로 쓰여 **모델 오버라이드가 무효**다. 영향 6곳: `celestial-harmony.js:641` · `oracle.js:167` · `yoga-guru.js:357` · `dream.js:1293` · `fusion-fortune.js:656` · `guardian-fortune-llm.js:112`. 더 싼 모델로 내리는 단가 절감안이 현재 코드로는 불가능하다.
- **`.gitattributes` 의 `merge=cachebust` 목록에 `public/zh-tw/index.html` 누락.** 한 줄 추가 건.
- **`sukuyo-compatibility-ai.js` 의 `attempts: 2` 와 cap 불일치** — base 8,000 / cap 12,000 인데 `attempts: 2` 면 잘림 재시도 1회로 `8,000 × 1.3 = 10,400`, cap 에 도달하지 못한다. 실측 잘림률을 본 뒤 조정.
- **`prompt` 안에 JSON 스키마를 문자열로 넣는 곳** — `worker/lib/fusion-fortune-prompt.js:326,348` 의 `responseSchema` 는 `generationConfig.responseSchema` 가 아니라 프롬프트 텍스트다. Gemini 네이티브 스키마로 옮기면 입력 토큰이 준다. **미검증**.

🔴 **근거를 못 찾으면 추측하지 말고 사용자에게 물어라.**
