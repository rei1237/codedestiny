---
status: active
updated: 2026-08-30
next: 로그인한 스테이징 세션에서 차트 응답의 `pipeline` 을 읽어 AUTH·ARCHIVE_LOOKUP 을 확인한다 (계산 구간은 아래에서 이미 배제됐다)
---

# 휴먼 디자인 유료 리포트 — 생성 복구 · 대기 씬 · 차트 병목

## 왜

> "휴먼 디자인 유료 리포트를 불러올때 애니메이션이 있었으면 하고 초기에 차트를 불러올때 너무
> 시간이 걸리는 것으로 볼때 병목이 있으니 해소되어야하며, 결제 이후에 리포트 생성이 안되는
> 심각한 버그가 있으므로 원인 파악 후 제대로 생성되도록 수정해줘"

## 지금 상태

- 요청 3건(생성 복구 · 대기 씬 · 차트 병목)은 코드상 전부 처리돼 `main` 에 있다.
- 일일 상한 결함도 처리됐다 — `/generate` 가 `ai:<svc>:generate(:daily)` 자기 버킷을 쓴다
  (일일 600 = 60리포트 × 서버 웨이브 상한 10, 분당 30). 리포트 1건은 이제 `/start` 예산 1건만
  먹는다. `/generate` 가 `/start` **별칭**인 5개 서비스(ziwei-ai·life-book-ai·love-secret-ai·
  ziwei-island-ai·sukuyo-compatibility-ai)는 그대로 `start` 버킷에 남는다.
- AI 라우트 우회도 닫혔다 — `aiActionFromPath` 가 미분류에 `""`(= 즉시 통과) 대신 기본 버킷
  `other` 를 돌려준다. 새 버킷 4종(`batch` 90 · `basis` 30 · `read` 100 · `unlock` 10)은
  경로별 호출 빈도를 재서 정했고, 기존 분류 79개 경로의 버킷은 하나도 안 바뀌었다.
- `/api/fortune/**` 는 이 작업의 대상이 아니었고, 2026-08-30 실측(`origin/main` db5f8a4ee)으로
  **별도 계층이 있음**을 확인했다. catch-all(`worker/index.js:1458`)이라 `enforceAiRouteSecurity`
  는 안 타지만, LLM 에 닿는 경로는 전부 `resolvePaidRouteAuth` 로 401 을 먼저 내고
  (`worker/routes/fortune.js:6636-6735`) Gemini 앞에 결제 증거 검사가 선다
  (`findAIPromptPaidAccessEvidence`, `:4545`). `saju-ai-consultation/basis` 는 LLM·DB·과금 0.
  비로그인 LLM 노출도 없다 — `GUARDIAN_FORTUNE_GUEST_LIMIT = 0` 이라 게스트 생성이 항상 막힌다
  (`worker/lib/guardian-fortune-usage.js:15`·`:290`). **없는 것**은 분당 상한·일일 AI 예산·
  소프트블록·페이로드 상한뿐이고, 결제가 앞을 막으므로 열린 문이 아니라 심층방어 공백이다.

## 남은 작업

- [ ] **`pipeline` 의 AUTH · ARCHIVE_LOOKUP 판독** (남은 유일한 병목 후보). 차트 결과 화면
      하단에 이미 렌더된다(`app/human-design/HumanDesignClient.tsx:637`). 로그인한 스테이징
      세션이 필요해 이번 세션에서는 못 읽었다. 판정 기준은 그대로 300ms.
      🔴 **계산 구간은 이미 배제됐다** — 2026-08-30 node 실측(`worker/lib/human-design-ephemeris.js`
      직접 호출, 루프백 성력 서버): 콜드 `PERSONALITY=74ms · DESIGN_SEARCH=1ms · DESIGN=0ms`,
      웜 `total 1~2ms`. 즉 콜드 Swiss 초기화 74ms 가 전부고 나머지는 0에 가깝다. 그래서
      **순차 `await` 병렬화는 이득이 없고**(웜 1ms), `EPHE_FILES` 축소도 콜드 아이솔레이트의
      2,097KB 전송분(HD가 안 쓰는 `seas_18.se1`+`sefstars.txt` = 358KB, 17%)에만 걸린다 —
      공용 모듈이라 위험 대비 이득이 작다. 재현: 위 모듈을 `onStage` 와 함께 4회 연속 호출.
- [ ] **씬 렌더 육안 확인 (미검증)**. `next dev` 가 이 저장소에서 깨져 있어 실제 모습을 못 봤다.
      CSS 토큰 존재는 대조했다. 스테이징에서 ① 생성 화면 목록의 "작성 중" 4줄, ② 차트 로딩 중
      세 점, ③ `prefers-reduced-motion` 켠 상태에서 **목록 18줄이 안 사라지는지**를 본다.
- [ ] 🔴 **켜진 적 없는 rate limit** (위 감사에서 나온 별건). `/api/fortune/**` 의 유일한 상한인
      `enforceGuardianFortuneRateLimit`(`worker/routes/fortune.js:6236`)은
      `GUARDIAN_FORTUNE_RATE_LIMIT_ENABLED` 가 `"true"` 일 때만 도는데, 그 키가
      `worker/wrangler.toml`·`wrangler.staging.toml` 양쪽 `[vars]` 에 **없다**
      (`config/env.contract.json:777` 의 `required_in: []`; 테스트·문서 참조 0건). `git log -S` 상
      최초 기능 커밋 `8b0d6bea5` 부터 꺼진 채였다 — 의도적 비활성화가 아니라 배선 미완이고
      원칙 10 의 fail-open 형태다. 🔴 **플래그만 켜면 안 된다**: 호출부 `:6349` 가
      `let result; try {` **밖**이라 `incrementRateLimit` 의 `connectDb` 실패가 아래 한국어 503
      계약(`SERVICE_TEMPORARILY_UNAVAILABLE` + `retryable`)을 못 타고 영문 503 으로 샌다.
      순서: ① 호출부를 try 안으로 ② 양쪽 `[vars]` 에 플래그 ③ 두 wrangler 를 대조하는 가드.

## 정본 예시

- 웨이브 계약 상수: `worker/lib/human-design-report-contract.js:49`
- 버킷 분류기 · 이어짓기 서비스 목록: `worker/lib/security/index.js` 의
  `WAVE_GENERATE_SERVICE_KEYS` · `AI_DAILY_BUDGETS` · `aiActionFromPath`
- 그 목록을 라우트 소스에서 전수 대조하는 가드: `scripts/verify-worker-security-guards.mjs`
- 버킷 계약 테스트: `__tests__/worker/security.ai-route-buckets.test.js`
- 새 가드 ⑧절: `scripts/verify-human-design-report.mjs` 의 "⑧ 생성 화면 · 차트 인계 · 계측"

## 함정

- 🔴 **경과 시간으로 진행률을 칠하지 않는다**(요구사항 22). 생성 화면의 "작성 중"은
  `HD_REPORT_SECTION_CONCURRENCY` 에서 나온다. 가드가 두 수를 **값으로** 대조한다.
- 🔴 **차트 인계(`app/human-design/_lib/chart-handoff.ts`)는 표시 전용**이다. 결제 상태·이용권·
  `reportId` 를 넣는 순간 클라이언트가 고칠 수 있는 값이 유료 판정에 닿는다. 가드가 막는다.
- 🔴 **모션 감소는 끄는 게 아니라 최종 상태로 앉힌다.** `animation: none` 만 두면 등장
  키프레임의 `opacity: 0` 이 남아 항목이 사라진다.
- 🔴 계측을 넓히려고 공용 `worker/lib/swiss-ephemeris.js` 에 워밍업 export 를 뚫지 말 것 —
  사주·서양점성술·베딕이 함께 쓴다.
- `verify:public-mirror-fresh` 가 `.ignore` 하나만 들고 실패하면 윈도우 개행 위양성이다
  (`git diff .ignore` 가 비어 있는지로 판별).

## 검증

```
npm run verify:human-design-report      # ⑧절 26건 포함
npm run verify:worker-security-guards   # 버킷 분류를 라우트 소스에서 전수 대조
npm run hd:snapshot:check               # 차트 경로를 건드렸으면 필수 (33케이스)
NODE_OPTIONS=--experimental-vm-modules npx --no-install jest --runInBand --testEnvironment node __tests__/worker
node --test __tests__/ui/human-design-report.static.test.js __tests__/ui/human-design-immersive.static.test.js
```

## 모르는 것

- 차트 초기 로딩에서 **AUTH · ARCHIVE_LOOKUP · ARCHIVE 가 프로덕션에서 몇 ms 인지**. 계산 구간은
  위에서 실측으로 배제했지만 이 셋은 Mongo·인증이라 node 로는 못 잰다.
- `/generate` 일일 600 이 실사용에서 넉넉한지. 서버 상한(10웨이브)에서 역산한 값이고 실제
  소진 로그를 본 적은 없다 — 429 신고가 오면 `AI_DAILY_BUDGETS.generate` 부터 본다.
