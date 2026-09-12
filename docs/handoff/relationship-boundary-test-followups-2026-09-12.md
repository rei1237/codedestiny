---
status: active
updated: 2026-09-12
next: scoreBoundary 의 죽은 gender 인자를 지운다 — 판단은 끝났고(아래 1번) 1줄 GREEN 이다. 되살리는 쪽을 택하려면 그건 제품 결정이라 먼저 물어야 한다.
---

# 「그 사람의 바람끼는?」 — PR #1949 이후 남은 것

## 왜

PR #1949(`1680301dd`, main 머지 완료)에서 결제 후 결과 미출력을 고치고 결과 화면을
전용 에셋 스토리텔링으로 바꿨다. 그 과정에서 **인접 결함으로 확인만 하고 손대지 않은
것들**을 모아 둔다. 아래 중 손댄 것은 없다. 이 문서 외 코드 변경 없음.

PR #1949 가 실제로 고친 것(참고용, 재조사 방지):

- 엣지 컷 — `baseTokens 24000 / capTokens 32000 / attempts 3` 에 `timeoutMs` 부재.
  섹션 5 + 프레임 1 병렬 호출로 분할(벽시계 = 합이 아니라 최댓값).
- 스테이징 LLM mock — `STAGING_LLM_MOCK_ENABLED=true` + `WORKERS_AI_ENABLED=false` 라
  JSON 픽스처가 문자열당 ~130자. 섹션당 2,000자 게이트를 **타이밍과 무관하게 100% 실패**
  시켰다. 섹션을 산문 모드로 돌려 해결.
- 동반 4건 — 라우터 누락 `await`, 실패 시 이용권/월정석 미복구, 생성 전 문서 미저장,
  죽어 있던 `/result` 폴링.

---

## 남은 작업

### [ ] 1. `scoreBoundary` 의 죽은 `gender` 인자 (우선순위 1 — 판단 완료)

`worker/routes/relationship-boundary-test.js:68`

```js
function scoreBoundary(saju = {}, gender = "") {
```

**판단: 구현된 적 없는 "성별 의존 점수"의 봉합선이다. 기능이 아니라 미완성 자국이다.**

실측 근거:

| 사실 | 근거 |
|---|---|
| 본문(`:69-87`)에서 `gender` 를 한 번도 읽지 않는다 | 점수 입력은 도화·홍염 신살, 합충형해 개수, `dominantTenGod` 뿐 |
| 호출부는 1곳이고 인자를 넘긴 적이 없다 | `:393` `scoreBoundary(saju)` |
| **최초 커밋부터 죽어 있었다** — 회귀가 아니다 | `git log -S"scoreBoundary"` → 커밋 1개(`e5b902809`). 그 시점에도 호출부는 `scoreBoundary(saju)` |
| 테스트 9곳 전부 1인자 호출 | `__tests__/worker/relationship-boundary-test.route.test.js:29,55,66,80,89,100,119,136` |

**그래서 무슨 기능이었나 — 성별로 점수를 갈랐어야 했다면, 지금 쓰는 신살로는 갈릴 수 없다.**

- 이 레포의 신살 정본 `worker/lib/saju-shinsal.js` 에 `gender`·`남녀`·`male|female` 은
  **0회**다. 도화는 일지·연지 지지만으로 산출하고(`:157`, `:493` `getPeachBlossomBranch`),
  도화+홍염 합산도 성별 무관이다(`:531-533`).
- 즉 **`gender` 를 그대로 넘겼어도 점수는 1점도 안 바뀐다.** 이 인자는 "넘기는 걸 깜빡한
  것"이 아니라 **받을 준비가 된 로직이 애초에 없는 것**이다.
- 레포에서 성별이 **숫자 점수를 실제로 움직이는 사주 사례는 단 1건**: `worker/routes/new-year-ai.js:586-594`
  — 남=재성 / 여=관성을 "인연 별"로 잡아 월별 연애 점수 ±1. 해석 분기로는
  `app/saju/animal-destiny/engine/localSajuCalculator.ts:3872-3881`(배우자성 십성 선택)이 있다.
  ⇒ 성별 의존 점수를 정말 넣는다면 **도화·홍염이 아니라 배우자성(남=재성/여=관성)** 축이어야 한다.
- 방증: 같은 주제를 다루는 love-secret-ai 의 「바람기와 마음이 흩어지는 조건」 프롬프트도
  축을 `"도화·홍염·재성/관성 구조"` 로 적고 있다(`worker/lib/love-secret-ai-prompt.js:172`).
  재성/관성까지 보라는 뜻이고, 그 둘을 **성별로 갈라 고르는** 것이 이 레포의 기존 방식이다.

**현재 설계는 그 자체로 일관적이다**(그래서 급하지 않다): 이 기능에서 `gender` 는 세 경로로만 흐른다.

1. 프롬프트 앵커 `[대상자 성별]` — `:179-182`, 6개 프롬프트 전부에 동일하게 들어간다
2. DB 저장 — `:404-408` `targetInfo` (`models.js:1905`)
3. 대운(간접) — `:402` `calculateLoveSecretAiSaju` → `life-book-ai-saju.js:612` `buildMajorLuck`.
   그 대운이 다시 앵커 `:180` 으로 프롬프트에 들어간다

**점수는 성별맹, 서사는 성별인지** — 그리고 결과 화면은 성별을 다시 렌더하지 않는다
(`publicResult` `:354-357` 이 `targetInfo` 를 내보내지 않는다).

**권장: 인자를 지운다. GREEN 1줄.**

```js
function scoreBoundary(saju = {}) {
```

지우는 이유는 "안 쓰니까"가 아니라 **거짓말을 하고 있기 때문**이다. 지금 시그니처는 점수가
성별을 본다고 광고하는데 실제로는 안 본다. 나중에 누군가 "인자를 안 넘기고 있네"라고
`scoreBoundary(saju, gender)` 로 고치면 **아무것도 안 바뀌는데 고쳤다고 믿는다.**

**됐다의 판정**: 인자 제거 후 라우트 테스트 11/11 유지. 호출부·테스트 모두 1인자라 수정 0곳.

🔴 반대로 **성별 의존 점수를 넣는 쪽은 GREEN 이 아니라 제품 결정 + RED** 다. 점수가 바뀌면
`grade`(43/65 경계) → 히어로 이미지 → **만원짜리 유료 결과**가 통째로 달라진다. 임의로 하지 말고
먼저 물을 것. 넣는다면 함께 손대야 하는 것: 점수식, 등급 경계 재보정,
`scoreFactors` 문구, `storyDirectionFor` 밴드, 라우트 테스트.

---

### [ ] 2. `verifyPerUsePayment` pass 분기의 `monthlySpendCoin` 이 복구되지 않는다 (RED, 이 기능 밖)

`worker/lib/nakshatra-paid-access.js:104` 의 pass 분기가 소비한 `monthlySpendCoin` 은
**어느 라우트도 되돌리지 않는다.** 같은 `requestId` 재시도는 재차감되지 않지만, 영구 실패 시
이용권 예산 1회가 소실된다.

PR #1949 가 넣은 `startServiceExecution`/`failServiceExecution` 환불은 **`transactionId` 가 있을
때만** 돈다. pass·admin 소스는 `transactionId` 가 없어(설계상) 이 경로를 안 탄다 — 즉 #1949 로
이 구멍이 막히지 않았다.

🔴 **범위 정정**: 이전 보고에서 "14개 라우트 공통"이라고 했는데 **과다 집계였다.** 실측
(`git grep -c "verifyPerUsePayment(" -- worker/routes/`):

| 실제 | 값 |
|---|---|
| 정의 | `worker/lib/nakshatra-paid-access.js:104` 1곳 |
| 라우트 호출부 | **8개 파일 10곳** — animal-totem, fortune, fusion-fortune, human-design-report, nakshatra-premium, nakshatra, relationship-boundary-test 각 1, tarot 3 |

**됐다의 판정**: 영구 실패 시 pass 예산이 되돌아오거나, 되돌리지 않는 것이 **의도라면 그 사유가
코드에 적혀 있다**. 10개 호출부 전부에서 같은 판정이 나야 한다(한 라우트만 고치면 안 된다).

---

### [ ] 3. 에셋 8장이 원본 해상도로 전송된다

`next.config.mjs:187` 의 `images.unoptimized: true` + `output:"export"` 때문에
`next/image` 가 리사이즈·srcset 을 **전혀 하지 않는다.** 실측 합계 **1,621,490 B**:

| 파일 | 바이트 |
|---|---|
| choice.webp | 315,850 |
| high.webp | 307,390 |
| tension.webp | 226,784 |
| attention.webp | 177,366 |
| medium.webp | 170,262 |
| low.webp | 162,804 |
| trust.webp | 133,990 |
| opening.webp | 127,044 |

비임베드 결과 화면은 히어로 1장(163~307KB) + 스크롤하며 챕터 5장(1.13MB)을 받는다.
`scripts/build-persona-avatar-assets.mjs` 선례대로 빌드 타임 480/768 변형을 만들면 모바일
전송량 60~70% 감소.

**됐다의 판정**: 빌드 산출물에 변형이 생기고 `srcset`/`sizes` 가 실제로 작은 쪽을 고른다
(네트워크 탭 실측). `scripts/verify-relationship-inline-browser.mjs` 의 `naturalWidth > 0` 단언 유지.

---

### [ ] 4. `verify:relationship-inline-browser` 가 게이트에 없다

PR #1949 에서 npm 스크립트로 배선하고 `scripts/verify-guard-wiring.mjs` 의
`UNWIRED_BY_DESIGN` 에 사유와 함께 선언했다(playwright 실브라우저 + 로컬 dev 서버 필요).
**지금은 사람이 기억해야만 돈다.**

게이트 승격은 사용자 승인 사항이다(CLAUDE.md CI gate scope). 승격을 원하면 승인만 받으면 되고,
그전까지는 **이 결과 화면이나 `reportDashboard.js` 의 iframe 높이 계약을 고쳤을 때 손으로
돌린다**:

```
npm run dev
npm run verify:relationship-inline-browser -- http://127.0.0.1:<포트>
```

🔴 포트를 가정하지 말 것. `scripts/dev-with-local-auth.mjs` 는 3107 이 아닌 포트로 뜬다
(이번 세션 실측 34076). dev 로그에서 실제 포트를 읽어 넘긴다.

---

### [ ] 5. `scripts/build-worker-dry-run.mjs` 가 linked worktree 에서 죽는다

`:6` 이 `resolve("node_modules/wrangler/bin/wrangler.js")` 로 **cwd 기준** 해석한다.
linked worktree 에는 `node_modules` 가 없어 `npm run check:fast` 가 `build:worker` 단계에서
`Cannot find module` 으로 멈춘다. CLAUDE.md 는 워크트리 작업을 기본으로 요구하므로
**구조적 충돌**이다.

이번 세션 우회(검증은 됐다): 부모 레포의 wrangler 를 직접 호출

```
node /d/Development/code-destiny/node_modules/wrangler/bin/wrangler.js deploy \
  --config worker/wrangler.toml --dry-run --outdir <scratchpad>
```

**됐다의 판정**: 워크트리에서 `npm run check:fast` 가 `build:worker` 까지 완주한다.
(레포 루트를 찾아 올라가거나 `require.resolve` 를 쓰면 된다.)

---

### [ ] 6. `love-secret-ai.js:1428-1429` 주석이 코드와 반대다

```
// 결제/이용권 확인·"생성중" 문서 기록이 끝난 이 시점에 즉시 202를 돌려주고,
// LLM 생성은 백그라운드(waitUntil)에서 완주한다.
```

실제 코드는 `:1511-1513` 의 `return await runGeneration();` 이고, 바로 그 자리 주석이
waitUntil 을 **쓰지 않는 이유**(공유 DB 연결 + Workers 요청 간 I/O 격리로 결과 고착)를 적고 있다.
커밋 `9850c890` 이 7개 라우트를 waitUntil → 동기로 되돌릴 때 안 지워진 잔재다.

🔴 **이 주석이 이번 조사의 출발 전제를 실제로 틀리게 만들었다.** 처음에 "202+폴링으로 가면
된다"고 판단했다가 실코드를 읽고 뒤집었다. 방치하면 다음 사람도 같은 데서 헛돈다.

**됐다의 판정**: 주석 삭제 또는 "되돌렸음" 명시. 코드 변경 없음(GREEN).

---

### [ ] 7. `fuctionassets/` 가 루트와 `public/` 양쪽에 있다

실측: 루트 `fuctionassets/` 23개 파일 2,453,586 B, `public/fuctionassets/` 554개 파일
13,184,240 B. 파일 수가 24배 차이나므로 **단순 미러가 아니다** — 어느 쪽이 정본이고 무엇이
빌드 산출물인지부터 확정해야 한다.

🔴 삭제 판단 전에 `deletion-auditor` 로 소스·테스트·verify 3면 확인할 것. 이 레포는 `.ignore`
때문에 **Grep 툴이 `public/` 미러를 못 본다** — "참조 0건"은 `git grep` 또는 `rg -uu` 로만
단언할 수 있다(이번 세션에 그 차이로 결론이 한 번 뒤집혔다).

---

## 하지 않은 것 / 하지 말 것

- **love-secret-ai 는 이 기능과 별개다.** PR #1949 는 love-secret-ai 파일을 한 줄도 건드리지
  않았다(6번의 주석 정리는 제외). 그쪽 「바람기와 마음이 흩어지는 조건」(`love-secret-ai-prompt.js:172`,
  field `wanderingRisk`)은 **의도된 구성이 맞고 그대로 둔다.** 프론트
  `app/love-secret-ai/result/love-secret-sections.ts:109` 의 `caution` 정규식(`바람기|흩어지는`)에
  걸려 제목을 유지한 채 렌더되고, 미매칭 섹션도 `insight` catch-all 로 흡수된다. 유실 경로 없음.
- **202 + `ctx.waitUntil` + 폴링으로 되돌리지 말 것.** 레포가 이미 두 번(`9850c890`, `b9a38d449`)
  되돌린 방향이다. 세 번째로 같은 장애를 재도입하게 된다.
- **`fallback()` 본문을 유료 결과로 내보내지 말 것.** 라우트 테스트의
  "does not replace an incomplete paid reading with a short canned result" 계약이 이것을 막고 있고,
  #1949 는 이 계약을 **약화하지 않고** 분할 후에도 성립하도록 유지했다.

## 스테이징 확인이 남아 있다

PR #1949 는 머지됐지만 **스테이징에서 실제 결제 → 결과 출력은 아직 확인하지 않았다**
(CLAUDE.md 2026-09-12 기준 스테이징 검증은 선택이고, 사용자가 요청하지 않았다).

원래 증상이 스테이징 전용이었으므로, 확인한다면 볼 것:

1. 이용권/월정석 결제 후 80초 내 200 + 5섹션 15,000자 이상
2. 스테이징은 mock 이므로 섹션 본문이 픽스처 문장 반복이어도 **정상** — 게이트 통과 여부만 본다
3. 실패 주입 시 503 + `message` + `generation_failed` 기록 + 환불 상태

```
npm run verify:staging -- --sha=1680301dd12491381045b354d45c24918221ac04
```
