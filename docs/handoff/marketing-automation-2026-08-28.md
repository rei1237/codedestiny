---
status: active
updated: 2026-09-01
next: §C-3 을 읽는다. 09-01 크론은 **두 채널 다 실패**했고 원인은 후보 2개(모듈 로드 · connectDb)로 좁혀졌지만 확정되지 않았다. 단계 표식 PR 을 머지 → 프로덕션 승격 → **09-02 07:00 KST 크론 1회**의 텔레그램 알림 문구에서 `stage=load` / `stage=connect_db` / `stage=send` 중 무엇인지 읽고 그때 고친다. 🔴 알림을 지우기 전에 그 한 줄을 복사해 둘 것 — 08-31 알림을 지워서 근거가 통째로 사라졌다. 별개로 **Threads 액세스 토큰이 죽어 있다**(§C-3) — 회전 전에는 threads 축이 매일 실패한다. 🔴 Threads 문안은 §C-4 에서 일간 10개 명리 브리핑으로 교체됐고(하이브리드), 토큰 회전 전에는 그것도 안 나간다.
---
# 마케팅 자동화 엔진 — 인수인계 (2026-08-28)

> 이 문서만 읽고 이어서 시작할 수 있게 쓴다.
> 🔴 **아래 "남은 작업"은 완료가 아니다.** 끝난 것과 안 끝난 것을 절대 섞어 읽지 말 것.

## ① 왜 하는 작업인가 (사용자 요구 원문)

> "너는 최고 수준의 풀스택 마케팅 엔지니어다. 현재 프로젝트에 유저 유입, 바이럴, 리텐션,
> 데이터 분석을 자동으로 수행하는 '마케팅 자동화 엔진'을 일괄 구축해줘."

명세는 5개였다: ①프로그래머틱 SEO ②동적 OG(`@vercel/og`) ③SNS 자동 포스팅(Vercel Cron)
④이탈 유저 재방문 이메일(Resend) ⑤통합 분석 + `useAnalytics()` 훅.

🔴 **명세서가 Vercel 전제로 쓰여 있었고 이 레포는 Cloudflare Pages(`output:"export"`) + Workers 다.**
사용자 결정(2026-08-28): **Cloudflare 방식으로 재설계** · 재방문 메일은 **기존 옵트인 구독자만** ·
SNS 는 **텔레그램 + 템플릿 문안** · **PostHog 미도입**.

후속 요구:
> "TELEGRAM_CHAT_ID는 My_codedestiny_bot으로 보이는데 맞는지 확인해주고 앞으로 자동 발행이 되도록 해줘"

## ② 이미 끝난 것 — 다시 하지 말 것

### 머지 완료된 PR 3개 (전부 `main` 에 있음)

| PR | 제목 | 핵심 산출물 |
|---|---|---|
| **#1233** | `feat(analytics): add useAnalytics() hook` | `app/hooks/useAnalytics.ts` · `verify:analytics-events` 에 ⑧⑨ 추가 |
| **#1235** | `feat(sns): publish a daily Telegram post from the existing cron` | `worker/lib/telegram.js` · `worker/lib/sns-daily-post-task.js` · `scripts/verify-sns-daily-post.mjs` |
| **#1237** | `feat(og): render share cards at request time from the worker` | `worker/routes/og.js` · `worker/lib/og-card.js` · `lib/seo/dynamicOgImage.ts` · `scripts/verify-og-route-contract.mjs` |

`main` HEAD 확인 시점: `3a438da15` (#1238 머지 직후). 세 PR 모두 그 아래에 있다.

### 함께 들어간 배선 (이미 되어 있다)

- `config/env.contract.json` 에 `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` · `SNS_DAILY_POST_ENABLED` 등재
- `scripts/sync-cloudflare-worker-secrets.mjs` 의 `SECRET_KEYS` 에 `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHAT_ID` 추가
- `.github/workflows/pr-ci.yml` fast 잡에 `verify:sns-daily-post` · `verify:og-route-contract` 배선
- `worker/index.js` 일일 크론 태스크 배열에 `["sns-daily-post", runSnsDailyPostTask]`
- `worker/lib/daily-fortune-task.js` 의 헬퍼 4개 export + `getTodayPillars(now = Date.now())` 시각 인자
- `app/robots.ts` 에 `PUBLIC_API_ALLOW_RULES = ["/", "/api/og"]`
- 의존성 `workers-og@^0.0.27`

### 프로덕션 인프라

- 🔴 **`TELEGRAM_BOT_TOKEN` 프로덕션 워커 시크릿 등록 완료** (2026-08-28).
  확인함: `npx wrangler secret list --name code-destiny-web --config worker/wrangler.toml` → 목록에 존재.
  **다시 넣지 말 것.**

### 봇 신원 (실측)

`getMe` 로 확인했다(읽기 전용, 발행 0건):

```
username : @My_codedestiny_bot
id       : 8594207284
이름     : 코드데스티니 홍보 봇
can_join_groups : true
getUpdates : 업데이트 0건, 대화 0곳
```

🔴 **사용자의 추정은 틀렸다.** `My_codedestiny_bot` 은 **봇 자신의 username** 이고
`TELEGRAM_CHAT_ID` 는 **봇이 글을 보낼 대상**(채널/그룹)이다. 서로 다른 값이다.

## ③ 남은 작업 — 정확한 대상과 개수

### A. 텔레그램 자동 발행 활성화 — 🔴 2026-08-28 후반 갱신 (시크릿 완료 / PR #1241 머지 대기)

**채널이 생겼다.** 아래는 전부 읽기 전용 API 실측이고 발행은 0건이다.

| 항목 | 실측값 |
|---|---|
| `getChat("@CodeDestiny_official")` | `400 chat not found` |
| 채널 | id **`-1004394943772`** · type `channel` · title `CodeDestiny_official` · username **`Codedestinyofficial`** |
| `getChatMember(8594207284)` | `status: administrator` · `can_post_messages: true` |

🔴 **`CodeDestiny_official` 은 채널 제목이지 chat id 가 아니다.** 공개 username 은 밑줄이 없는
`Codedestinyofficial` 이다. 제목을 그대로 넣으면 발행이 매일 `400 chat not found` 로 죽는데,
크론 로그를 보지 않으면 조용하다.

**① `TELEGRAM_CHAT_ID` — ✅ 프로덕션 워커에 등록 완료(2026-08-28). 다시 넣지 말 것.**
값은 숫자 ID `-1004394943772` 를 골랐다 — 채널 username 을 나중에 바꿔도 발행이 안 깨진다.
`npx wrangler secret list --name code-destiny-web --config worker/wrangler.toml` 로 확인했다.

🔴 **값이 `.env.local` 에는 없다**(규칙 4 로 에이전트가 그 파일을 못 쓴다). 그래서 파일을 거치지
않고 넣었다 — `getSecretValue` 가 `process.env` 를 먼저 보기 때문이다
(`scripts/sync-cloudflare-worker-secrets.mjs:322`):

```
TELEGRAM_CHAT_ID=-1004394943772 node scripts/sync-cloudflare-worker-secrets.mjs --dry-run --only-key=TELEGRAM_CHAT_ID
TELEGRAM_CHAT_ID=-1004394943772 node scripts/sync-cloudflare-worker-secrets.mjs           --only-key=TELEGRAM_CHAT_ID
```

🔴 **`.env.local` 에 이 줄을 남기는 것은 사용자만 할 수 있다.** 지금 값은 Cloudflare 쪽에만 있어서,
워커를 새로 만들거나 시크릿을 초기화하면 이 문서를 보고 다시 넣어야 한다.

**② `SNS_DAILY_POST_ENABLED` — 🔴 시크릿이 아니다. 이 문서의 이전 판이 틀렸다.**
`config/env.contract.json:1899` 이 `"secret": false` 이고 `SECRET_KEYS` 에도 없다. 그래서
아래 명령은 **아무 일도 하지 않고** `No usable secret values found in env files.` 만 찍는다:

```
npm run secrets:cf:worker -- --only-key=SNS_DAILY_POST_ENABLED   # ❌ 조용히 스킵된다
```

자리는 `worker/wrangler.toml` 의 `[vars]` 다(규칙 4 가 `[vars]` 추가는 허용).
**PR #1241** 이 그 한 줄 + 스테이징 짝(파리티 가드 때문) + `verify:sns-daily-post` 의 새 검사 ⑦
(선언된 값을 `isEnabled` 가 실제로 해석하는지 — `"enabled"` 같은 오타는 조용한 꺼짐이다)을 담았다.
**머지 대기 중이며, 머지되기 전에는 승격해도 발행이 시작되지 않는다.**

시크릿 동기화 스크립트 자체의 함정(그대로 유효):
🔴 `--only-key=` 는 **등호 필수**(`arg.startsWith("--only-key=")`). 공백형은 무시되고
**인자 없이 실행하면 프로덕션 시크릿 27개를 덮어쓴다.**
🔴 `--only-key` 는 `SECRET_KEYS` **배열 안에서 필터링**한다
(`scripts/sync-cloudflare-worker-secrets.mjs:468`). 배열에 없는 키는 조용히 건너뛴다 —
`No usable secret values found in env files.` 는 "값이 없다"는 뜻이 **아니다.**
🔴 `.env.local` 을 직접 읽지 말 것(권한 훅이 막고 규칙 5 대상).

`SNS_DAILY_POST_ENABLED` 는 `1`·`true`·`on`·`yes` 중 하나여야 켜진다
(`worker/lib/sns-daily-post-task.js:44`). 그 전에는 태스크가 DB 도 안 붙고 즉시 반환한다.

### B. 프로덕션 승격 — 🔴 순서 주의: PR #1241 머지가 **먼저**다

**스테이징은 검증 끝났고 프로덕션만 남았다**(2026-08-28 실측).

```
staging  /api/og -> 200 · image/png · 1200x630 · Cache-Control: public, max-age=31536000, immutable
prod     /api/og -> 404   (승격 전)
```

스테이징 응답에 `immutable` 이 그대로 살아 있다 = `_headers` 의 `/api/*` no-store 가 이 경로를
덮지 않는다는 것이 배포 환경에서도 확인됐다(⑤-1 참조).
머지는 스테이징까지만 자동이고 프로덕션은 수동 승격이다.

```
gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production
```

🔴 이 실행이 **곧 프로덕션 배포 행위**다(CLAUDE.md 규칙 3). 사용자가 그때 명시적으로
요청하지 않으면 실행하지 않는다. 허락은 **그 한 번**에 대한 것이고 다음 승격까지 이어지지 않는다.
🔴 이 승격에는 이 작업 말고도 그날 머지된 다른 PR(#1238·#1240 등)이 함께 나간다 — 사용자에게 알릴 것.

🔴 **PR #1241 을 머지하기 전에 승격하면 헛수고다** — `SNS_DAILY_POST_ENABLED` 가 `[vars]` 에
없는 워커가 나가고, 태스크는 매일 "꺼져 있다"만 찍는다. 순서는 **#1241 머지 → 승격**이다.
사용자는 2026-08-28 세션에서 이 승격을 명시적으로 승인했다(그 한 번에 대한 승인이다).

### C. 첫 발행 확인 — 🔴 2026-08-30 갱신: "왜 0건인가" 판정 완료, 확인 수단이 바뀌었다

A·B 는 끝났다(#1241 머지, 승격 완료 — 라이브 버전 바인딩에 `SNS_DAILY_POST_ENABLED="1"` + 텔레그램
시크릿 2개 실측). 크론은 기존 일일 트리거 `"0 22 * * *"` = **KST 07:00** 에 얹혀 있고 실제로
발화한다(GraphQL `workersInvocationsAdaptive` 08-28·08-29 22:00Z `success`). 그런데 채널 글은 0건.

**판정(2026-08-30 15:50~16:10Z 실측, 쓰기 0건):**

| 크론(UTC) | 라이브 버전 | `SNS_DAILY_POST_ENABLED` | 결과 |
|---|---|---|---|
| 08-28 22:00 | `1ff940bf` (#1241 머지 13분 **전** 빌드) | 없음 | "꺼져 있다" 정상 스킵 |
| 08-29 22:00 | `00932690` | `1` | 서브요청 17→20(시도 흔적)인데 발행 없음, **사유 기록 0** |

사유를 알 수 없었던 구조적 이유 셋: ① 태스크가 실패 시 `IdempotencyKey` 잠금을 **삭제**해 DB 흔적 0
(`idempotency_keys` 의 `cron:*` 문서 0건 실측) ② Workers Logs 꺼짐(`script-settings.observability: null`)
③ 실패 통보 채널 없음. 설정(시크릿·vars·크론·봇 권한 `can_post_messages:true`)은 전부 정상이라 **다시 만지지 말 것.**

**고친 것(이 문서와 같은 PR):** 실패를 `status:"failed"` + `responseRef:{error,status,at}` 로 남기고
같은 날 재시도는 failed 문서 재선점으로 연다(`worker/lib/sns-daily-post-task.js`). 관리자 수동 실행·상태
조회 `worker/routes/admin-sns.js` (`POST /api/admin/sns-daily-post/run`, `GET …/status`). 가드 ⑧⑨.

**2026-08-30 16:42Z 실행 결과(전부 사용자 허락 후):** ① Workers Logs `enabled:true` (이전 `null`) ② 승격 run 33322608571 success
③ `POST …/run` → `{"ok":true,"dateKey":"2026-08-31"}`, DB `success` + `responseRef.messageId: 2`, 채널 글 2번 확인.
→ 08-29 실패는 일회성이었고 설정 결함은 없다. 🔴 dateKey 가 이미 `2026-08-31`(KST)이라 **08-31 07:00 크론은 `already_posted` 로 정상 스킵**된다 —
첫 자동 발행 확인은 **09-01 07:00 KST**. 관리자 진입은 `POST /api/admin/entry/password` → 응답 `adminToken` 을 `x-admin-token` 헤더로.

**실행한 순서(기록용, 각각 허락 1회였다):**
1. Workers Logs 켜기 — `PATCH /accounts/e09010bfcee941c820b81640827974f0/workers/scripts/code-destiny-web/script-settings`
   본문 `{"observability":{"enabled":true}}` (wrangler OAuth 토큰, 출력 금지). 되돌림은 `false`.
   DB 에 못 남는 실패(예외·Mongo 연결)를 대시보드에서 보게 된다.
2. 프로덕션 승격(§B 명령).
3. `POST https://code-destiny.com/api/admin/sns-daily-post/run` (관리자 인증) — 🔴 **공개 채널에 실제 글이
   나간다.** `ok:true` 면 08-29 는 일회성이었던 것. `ok:false` 의 `error` 가 `chat not found` 면
   `TELEGRAM_CHAT_ID=-1004394943772 node scripts/sync-cloudflare-worker-secrets.mjs --only-key=TELEGRAM_CHAT_ID`
   로 재투입, 다른 사유면 그 사유대로.
4. 다음 크론(KST 07:00) 뒤 `GET …/status` 에 그날 `success` + `responseRef.messageId`, 채널
   `https://t.me/Codedestinyofficial` 에 글. 이틀 연속 확인하면 자동 반복 확정.

남은 미검증 용의자: 프로덕션 `TELEGRAM_CHAT_ID` 실값(시크릿이라 못 읽음) · 크론 컨텍스트 Mongo 연결 실패 ·
`waitUntil` 절단. 3번이 그것을 가른다. `already_posted` 는 그날 이미 성공했다는 뜻이라 정상.

부수 발견(범위 밖): `dailyfortunesubscriptions.lastMailError` = Resend `domain is not verified … 403`(07-25),
마지막 발송 08-19 — 운세 메일 축도 죽어 있을 가능성. 별도 작업.

### C-2. Threads(Meta) 축 — 🔴 2026-08-31 갱신: **승격 완료(`7d6cbbed7`)·토큰 등재 완료·첫 발행은 크론 위임(사용자 결정)**

SNS 발행이 텔레그램 단일 채널 → **텔레그램 + Threads 2채널**이 됐다. 2026-08-31 로 코드·vars 승격 완료
(프로덕션 `/api/version` = `7d6cbbed7`), `THREADS_ACCESS_TOKEN` 시크릿 등재 실측 확인(`wrangler secret list`).
크론은 프로덕션에서만 돈다(스테이징 `crons = []`). **첫 발행을 수동(`?channel=threads`)으로 하지 않고
다음 크론에 위임했다 — 사용자 결정(2026-08-31).** 즉 아래 "승격 뒤 실행 순서"의 1번(토큰)은 완료,
2번(수동 1회)은 건너뛰고 4번(크론 자동)으로 직행한다. 첫 자동 발행 검증은 09-01 07:00 KST.

- 콘텐츠: `worker/lib/threads-daily-content.js` — 루트 1 + 답글 3 체인(각 480자 클램프, 평문).
  원천은 `buildTodaySajuPublic`(날짜만으로 나오는 상세 사주 해설) + `ganji()`. **LLM 0회 · DB 0회.**
- 발행: `worker/lib/threads.js` — `POST me/threads`(컨테이너) → `POST me/threads_publish`, 2글째부터
  `reply_to_id` = 직전 발행 id. 토큰은 **POST 본문에만** 싣고 URL 을 로그에 남기지 않는다.
- 스위치는 **둘 다** 필요하다: `SNS_THREADS_POST_ENABLED`(양쪽 toml `[vars]`) **AND** `THREADS_ACCESS_TOKEN`
  (시크릿). 스테이징에는 토큰을 넣지 않는다 — 토큰 없으면 `skipped:"missing_threads_token"`.
- 잠금은 **채널별 독립**: 텔레그램 `keyHash = <dateKey>`(기존 문서 유지), Threads `<dateKey>:threads`.
  한 채널이 실패해도 다른 채널은 발행되고, 실패한 채널만 다음 실행에서 재선점된다.
- 🔴 **태스크가 이제 던진다** — 채널이 하나라도 실패하면 잠금에 사유를 기록한 **뒤** throw 해서
  `worker/index.js` 크론 래퍼의 기존 `notifyCronTaskFailures` 가 텔레그램으로 사람에게 올린다.
  위 §C 가 "사유 기록 0"이었던 구멍이 여기서 닫힌다. 텔레그램만 실패하던 날에도 이제 알림이 뜬다.
- 관리자: `POST /api/admin/sns-daily-post/run?channel=all|telegram|threads`(기본 `all`),
  `GET …/status` 는 채널을 나눠 보여준다(28건 = 14일 × 2채널).
- 가드: `npm run verify:sns-daily-post` (⑩~⑰ 추가, PR CI **fast 잡**이라 모든 PR 에서 돈다).

**승격 뒤 실행 순서 (각각 되돌릴 수 없는 외부 행위 — 사용자 허락 1회씩) — 🔴 상태(2026-08-31): 1=완료, 2=건너뜀(크론 위임), 4=대기(09-01 07:00 KST):**

1. `node scripts/sync-cloudflare-worker-secrets.mjs --only-key=THREADS_ACCESS_TOKEN`
   🔴 **등호 필수.** 인자 없이 돌리면 프로덕션 시크릿 27개를 전부 덮어쓴다.
   `.env.local` 의 `Thread_access_token` 을 별칭으로 집어 `THREADS_ACCESS_TOKEN` 이름으로 올린다
   (별칭 3곳: `worker/lib/env.js` · `config/env.contract.json` · 이 스크립트).
2. `POST /api/admin/sns-daily-post/run?channel=threads` **1회** — 🔴 공개 계정에 실제 글 4개가 올라간다.
   권한 오류가 나면 Meta 앱이 Live 모드인지·계정이 앱 테스터인지 확인한다(문서로 확정 못 한 부분).
3. `GET …/status` 에 `<dateKey>:threads` = `success` + `responseRef.ids` 4건.
4. 다음 22:00Z 크론에서 두 채널 자동 발행 확인.

**토큰 회전 런북 (60일 수명 · D-14 경고가 텔레그램으로 온다):**

경고는 `THREADS_TOKEN_ISSUED_AT`(양쪽 toml `[vars]`) 로부터 **46일**째부터 발행 성공·실패와 무관하게
매일 1건 나간다. 값은 사람이 지킨다 — 실제 발급일과 어긋나면 틀린 날 뜬다.

1. `GET https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=<현재 토큰>`
   → 새 60일 토큰. (발급 후 24시간이 지나야 호출된다.)
2. `.env.local` 의 `Thread_access_token` 을 새 값으로 교체 — 🔴 에이전트는 `.env*` 를 읽지도 고치지도
   않는다. 사람이 직접 바꾼다.
3. `node scripts/sync-cloudflare-worker-secrets.mjs --only-key=THREADS_ACCESS_TOKEN`
4. `THREADS_TOKEN_ISSUED_AT` 을 갱신일로 바꾸는 PR (양쪽 toml **같은 값** — 다르면
   `verify:worker-config-parity` 가 잡는다) → 머지 → 승격.

**아직 안 고친 것(사유 있음):** `worker/lib/daily-fortune-task.js:81` 의 `getTodayPillars` 가
연주를 `(y-4)%60` 달력 연도로 내 **입춘을 무시한다**(2026-01-02 실측: 병오 ↔ 정본 `ganji()` 는 을사).
현행 텔레그램 문안과 일일 운세 메일이 1/1~입춘 사이 틀린 연주를 말한다. Threads 문안은 정본을 쓴다.
같이 안 고친 이유는 그 함수가 **조사 중인 일일 운세 메일 본문**을 함께 만들어 관측이 오염되기 때문
([fortune-email-resend-403-2026-08-31.md](fortune-email-resend-403-2026-08-31.md)). 메일 원인 규명 뒤 별도 PR.

### C-3. 🔴 2026-09-01 — 첫 자동 발행이 **두 채널 다 실패**. 원인 후보 2개로 좁혔고 확정은 다음 크론 1회

사용자 보고: "또 발행이 안 된다"(실패 알림은 텔레그램으로 받았고 **읽고 지웠다** — 그래서 사유 원문이 없다).

**배제한 것(전부 실측 2026-09-01, 프로덕션 쓰기 0건):**

| 용의자 | 실측 | 판정 |
|---|---|---|
| 크론 미발화 | GraphQL `workersInvocationsAdaptive` 08-31T22:00Z 버킷 req=2(일일+`*/10`) sub=19 wall 6288ms status=success | 발화함 |
| 스위치 꺼짐 | 그 시각 라이브 버전 `27c7b62d…` 바인딩에 `SNS_DAILY_POST_ENABLED="1"`·`SNS_THREADS_POST_ENABLED="1"`·시크릿 3종 | 켜짐 |
| Mongo 자체 장애 | 같은 실행의 `monthly-credit-expiry`(`User.findOneAndUpdate`)가 `users.updatedAt` 을 22:00:39.216Z 로 갱신 | DB 는 붙었다 |
| 잠금 문서 TTL 소멸 | TTL 3일, `cron:sns-daily-post` 문서는 08-30 수동 실행 1건뿐(`success`, `messageId:2`) | 소멸 아님 |
| `[env.*]` vars 미상속 | `worker/wrangler.toml` 에 `[env.*]` 절 없음 | 해당 없음 |
| 순환 import TDZ | `sns-daily-post-task.js` ↔ `threads-daily-content.js` 를 esbuild ESM 번들로 묶어 로드·실행 성공 | 아님 |

**핵심 근거:** `runChannel` 은 **첫 동작이 Mongo 쓰기**이고 발행 실패조차 `failed` 문서를 남긴다.
그런데 `2026-09-01` 도 `2026-09-01:threads` 도 **0건**이다 → 채널 루프에 닿기 전에 죽었다.
그 앞은 ①`await import("./lib/sns-daily-post-task.js")` ②`await connectDb(env)` 둘뿐인데, 그때의
알림 문구는 양쪽이 **완전히 같았다**. 그래서 알림 한 통을 지운 순간 근거가 0이 됐다.

**이 PR 이 심은 것 (관측장치 — 사용자 지시 "관측장치부터 박아달라"):**
`stage=load`(worker/index.js `loadFailed`, 태스크 6개 전수) · `stage=connect_db`(task 의 connectDb try/catch) ·
`stage=send`(잠금 문서 `responseRef.stage` + 던지는 문구). 던지는 문구에 **성공한 채널도** 함께 싣는다.
가드는 `verify:sns-daily-post` ⑲(fail-closed, 음성 4종 실측 통과).
🔴 **한계(정직하게):** `stage=connect_db` 인 경우 DB 가 안 붙는 순간이라 **DB 사본은 물리적으로 불가능**하다.
그때의 지워지지 않는 사본은 Cloudflare Workers Logs 뿐이다(`enabled:true`, 08-30 에 켬).

**남은 별개 결함 — Threads 토큰이 죽었다.** `GET https://graph.threads.net/v1.0/me` →
`400 {"message":"API access blocked.","type":"OAuthException","code":200}` (2026-09-01, 로컬 IP 에서 측정 —
Cloudflare 엣지에서도 같은지는 **미검증**). `code 200` 은 `classifyThreadsError` 가 `permanent:true` 로 읽으므로
**재시도로 안 풀린다.** 회전 런북은 위 §C-2 의 4단계. 회전 전에는 threads 축이 매일 실패하고, 그 때문에
텔레그램이 성공해도 태스크는 통째로 던진다(그래서 이 PR 이 성공 채널을 문구에 넣었다).

**다음 사람이 할 일 (순서 고정):**
1. 이 PR 머지 → 프로덕션 승격(§B). 승격 전에는 관측장치가 안 돈다.
2. **09-02 07:00 KST 크론 1회** 뒤 텔레그램 알림의 `• sns-daily-post:` 줄을 **지우기 전에 복사**.
3. `stage=load` → 모듈 평가가 던진 것(런타임에서만 나는 실패). `stage=connect_db` → 크론 콜드 아이솔레이트에서
   6개 태스크가 동시에 `connectDb` 를 때리는 herd 를 의심한다(`worker/lib/db.js:872-900` — 공유
   `connectPromise` 를 **실패한 호출자마다 각자** null 로 만들고 `resetMongooseConnection()` 을 돌린다.
   🔴 **추정·미검증**이고 db.js 는 전 라우트 공용이라, 확정 전에 손대면 회귀 범위가 이 버그보다 크다).
   `stage=send` → 그날은 루프까지 닿은 것이고 사유가 문구와 잠금 문서 양쪽에 있다.
4. `GET /api/admin/sns-daily-post/status` 로 그날 두 채널의 `status`·`responseRef` 대조.

### C-4. 🔴 2026-09-01 — Threads 문안을 **일간 10개 명리 브리핑**으로 교체 (사용자 요구, 이 PR)

사용자 요구 원문: "일일 운세 + 각 일간에 어떤 글자가 있으면 좋다 / 어떤 십성이 있으면 좋다 —
최고의 사주 명리학자로서 프롬프트를 넣어서". 사용자가 고른 안 2개: **하이브리드 생성** · **오행 짝 5답글**.

**무엇이 나가는가.** 루트 1글 + 답글 5글 = 6글. 답글은 오행 짝(목·화·토·금·수)으로 일간 2개씩,
그래서 **매일 일간 10개가 전부** 나간다. 일간 한 줄의 형식:
`갑(甲) 편재·건록 | 좋은 십성 비견·겁재 | 좋은 글자 갑(甲)·을(乙)/인(寅)·묘(卯)` + 조언 한 문장.
요일 코너 링크는 답글 ⑤ 끝에 접어 넣었다(따로 두면 체인이 7글이 된다).

**역할 분담 — 여기가 이 설계의 전부다.**
- 계산은 언제나 [worker/lib/daily-stem-guidance.js](../../worker/lib/daily-stem-guidance.js) 가 한다(순수 함수, I/O 0).
  십성·지장간·십이운성·신살은 전부 **기존 정본 함수**(`tenGodFor`·`getTwelveLifeStage`·`getCheoneulBranches` 등)를
  다시 세운 것이라 워커 번들 증가분이 사실상 0이다.
- 문장만 [worker/lib/threads-ai-writer.js](../../worker/lib/threads-ai-writer.js) 가 Gemini 로 쓴다. 사실은 프롬프트에
  **박아 넣고**, 모델은 그걸 한국어로 옮기기만 한다. 모델이 그 일간의 사실에 없는 십성을 한 글자라도 쓰면
  **그 항목만** 버리고 정본 문장표(`TEN_GOD_LINE`)로 되돌린다. 스위치·호출·JSON·길이 어디서 실패해도 발행은 계속된다.

**🔴 실측으로 뒤집힌 규칙 하나.** 처음엔 "계열이 生하는 다음 계열"(비겁→식상→재성→관성→인성)로 좋은 글자를 냈는데,
그 축은 **오늘 천간의 오행 하나로 접혀서 일간 10개가 전부 같은 글자**를 받았다(갑자일 전부 병·정 / 사·오).
그러면 "각 일간에"라는 요구 자체가 죽는데 다른 검사는 전부 통과한다. 억부(抑扶) 축으로 바꿨고
(비겁·인성→식상 / 식상→재성 / 재성→비겁 / 관성→인성 — 비겁생식상·인수용식상·식상생재·득비리재·살인상생),
60갑자 전수 실측 최솟값이 **좋은 글자 3종 · 좋은 십성 4종**이다. 이 최솟값이 그대로 가드다.

**스위치.** `SNS_THREADS_AI_ENABLED`(두 toml `[vars]` 에 `"1"`). **끄면 결정론 문안으로 그대로 나간다** — 발행이 멈추지 않는다.
켜져 있으면 하루 1회 Gemini 호출이 발생한다(비용이 걱정되면 `"0"`). 코드 기본값은 꺼짐이다.

**가드.** `verify:sns-daily-post` 에 ⑳㉑㉒ 추가(⑩ 은 체인 길이를 `DAY_STEM_GROUPS` 에서 유도하도록 고침).
⑳ 은 60갑자 × 일간 10개를 **정본 `tenGodFor` 로 다시 유도해** 대조하고 위 붕괴 최솟값을 단언한다.
㉑㉒ 는 `generateImpl` 주입으로 **Gemini 실호출 0회**로 AI 경로를 밟는다. 음성 3종 실측 통과(붕괴 축 되돌리기 · 검증기 무력화 · 일간 짝 삭제).

**🔴 남은 것 — 이 PR 만으로는 아직 안 나간다.**
1. §C-3 의 `stage=` 관측 결과 확정과 **Threads 토큰 회전**(현재 `code 200 API access blocked`)이 **선행**이다.
   토큰이 죽어 있는 동안은 문안이 아무리 좋아도 threads 축이 매일 실패한다.
2. 머지 → 프로덕션 승격(§B) 전에는 이 문안이 안 나간다. 승격 뒤 첫 확인은
   `GET /api/admin/sns-daily-post/status` 의 `responseRef.aiModel` — 비어 있으면 그날은 결정론 문안이 나간 것이다.
3. `build:worker`·`verify:worker-size` 는 **로컬 미검증**(이 워크트리에 `workers-og` 가 설치돼 있지 않아 번들이 안 만들어진다). CI 가 돌린다.

### D. 재방문 이메일 (PR 4) — 보류

별도 진단서: [docs/handoff/reengagement-email-blocked-2026-08-28.md](reengagement-email-blocked-2026-08-28.md)
요약: `dailyFortuneSubscription` 에 "이탈" 상태가 **구조적으로 존재하지 않는다**
(`isActive:true && subDaily:false` 를 만드는 코드 경로가 없다). 착수 전 그 문서를 반드시 읽을 것.

## ④ 방법 — 무엇을 근거로 판정하는가

### chat_id 조회 (정본 스크립트)

`getMe` + `getUpdates` 만 부르는 읽기 전용 스크립트를 썼다. 토큰은 출력하지 않고 봇 ID 만 찍는다.
스크래치패드에 있고 세션과 함께 사라지므로 **필요하면 다시 만든다.** 핵심만:

```js
// .env / .env.local / .dev.vars 를 키 정규화(대문자·언더스코어)해서 읽는다
const token = env.TELEGRAM_BOT_TOKEN;
await fetch(`https://api.telegram.org/bot${token}/getMe`);      // 봇 신원
await fetch(`https://api.telegram.org/bot${token}/getUpdates`); // chat.id 후보
// 🔴 토큰을 절대 로그에 찍지 않는다. 봇 ID(토큰의 ':' 앞부분)만 공개 식별자다.
```

`getUpdates` 결과에서 `message|channel_post|my_chat_member` 의 `chat.id`·`chat.type`·`chat.username`
을 모아 보면 된다. **0건이면 봇이 아직 어디에도 안 들어가 있다는 뜻이지 실패가 아니다.**

### 배포 여부 판정

```
curl -s -o /dev/null -w "%{http_code}\n" "https://code-destiny.com/api/og?title=test&badge=saju"
```
`200` 이면 새 워커가 프로덕션에 나간 것, `404` 면 아직이다. 스테이징도 같은 방식으로
`https://staging.code-destiny.com/api/og?...` 로 본다.

## ⑤ 정본 예시 — 이 레포 고유의 함정 (전부 이번 세션 실측)

이 중 어느 것도 일반론이 아니다. 근거 파일·줄번호와 함께 남긴다.

1. 🔴 **`_headers` 는 `/api/*` 워커 경로에 적용되지 않는다.**
   `curl -sS -D - https://code-destiny.com/api/health` → 응답에 `proxy-revalidate` 도
   `CDN-Cache-Control` 도 없고 `worker/lib/http.js:22` 가 붙인 3-디렉티브 값만 나온다.
   `/api/*` 는 존 라우트로 독립 워커에 바로 가므로 Pages 를 안 거친다.
   ⚠️ 메모리 `headers-apply-to-worker-routes` 의 실측은 `public/_worker.js`(**Pages 워커**)
   경로였다 — 그건 여전히 맞고, 이건 **다른 경로**다. 둘을 섞지 말 것.

2. 🔴 **`lib/seo.v2.ts` 에 한 줄만 더해도 사이트맵 lastmod 118건이 밀린다.**
   `scripts/lib/sitemap-lastmod.mjs:367` 의 서명이 라우트의 **import 클로저 내용**을 해시하고,
   그 파일은 118개 페이지의 클로저에 있다. #1237 의 PR CI 를 실제로 막았고, 실패는
   **"Typecheck and lint"** 라는 엉뚱한 잡 이름으로 온다 — 스텝 이름은
   `gh api repos/rei1237/codedestiny/actions/jobs/<jobId> --jq '.steps[]|select(.conclusion=="failure")'`
   로 봐야 보인다. 해법은 공유 모듈 밖의 새 파일(`lib/seo/dynamicOgImage.ts`).
   `verify:og-route-contract` 의 ⑥ 가 이 재발을 막는다.

3. 🔴 **`workers-og` 의 HTML 파서는 `justify-content:space-between` 을 조용히 무시한다.**
   세로·가로 둘 다. 고정 폭·`flex-direction` 명시·축약형 제거를 각각 시도해 **로컬 렌더 4회**
   전부 같은 결과였다. `left`/`right`/`top`/`bottom` 은 정상 동작하므로 네 모서리를 못박는다
   (`worker/lib/og-card.js` 의 `buildOgCardHtml`).

4. 🔴 **화이트리스트 조회는 `Object.hasOwn` 이어야 한다.**
   `BADGES["__proto__"]` 는 `Object.prototype` 을 돌려주고 그건 truthy 라, 단순 조회면
   배지가 객체가 되어 카드에 `[object Object]` 가 찍힌다. 가드가 실제로 잡았다.

5. 🔴 **Write 툴이 정규식 리터럴 안 제어문자를 그대로 쓴다** → `file` 이 `data` 로 보고
   git 이 바이너리 취급해 diff 가 사라진다. `new RegExp("[\\u0000-\\u001f\\u007f]", "g")` 로 쓸 것.
   `verify:og-route-contract` 의 ⑩ 이 이걸 막는다.

6. **`wrangler dev` 는 `compatibility_date = "2026-05-02"` 를 아직 못 연다**(로컬 workerd 상한
   2026-05-01). 파일을 고치지 말고 CLI 로만 낮춘다:
   `npx wrangler dev --config worker/wrangler.toml --local --compatibility-date 2026-05-01`

7. **워크트리에 격리 `npm install` 을 하면 `next lint` 가 죽는다** — `@next/next` 플러그인이
   워크트리와 저장소 루트 양쪽에서 잡혀 ESLint 가 거부한다. 대안:
   `npx eslint --resolve-plugins-relative-to . --no-eslintrc -c .eslintrc.json <파일>`.
   CI(저장소 루트)에는 없는 문제다.

## ⑥ 이 레포 고유의 작업 규칙

- 🔴 **파일을 고치기 전 `EnterWorktree` 로 격리한다.** 기본 작업 디렉터리는 여러 세션이 공유한다.
- 🔴 **워크트리에 `node_modules` 가 없다.** 빌드가 필요하면 정션을 걸고
  (`New-Item -ItemType Junction`), 🔴 **지울 때는 링크부터 끊는다**(`cmd /c rmdir`) —
  안 그러면 공유 설치본을 지운다.
- 🔴 **`main` 직접 작업·직접 push 금지.** 브랜치 → PR → CI → **사용자가 머지**.
  이 문서를 포함해 무엇도 main 에 직접 커밋하지 않는다.
- 🔴 **프로덕션 배포는 `gh workflow run ... -f mode=production` 뿐이고 그때마다 명시적 허락이 필요하다.**
- 🔴 **`.env*` 는 읽지도 고치지도 않는다.** 값이 필요하면 레포 스크립트를 거친다.
- 🔴 **새 `verify:*` 는 같은 PR 에 CI 배선을 담는다** — `verify:guard-wiring` 이 즉시 실패시킨다.
- 🔴 **가드는 fail-closed** — 대상이 0개일 때 통과하면 가드가 아니다. 개수 하한을 단언한다.
- `styles/`·`js/`·`index.html` 을 고쳤으면 `npm run sync:public` 산출물을 같은 커밋에 담는다.
  (이번 작업에서는 해당 없음 — 셸을 건드리지 않았다.)
- CRLF 파일이 많다. Edit/sed 대신 **node 패치 스크립트 + 개행 개수 검산**을 쓴다.

## ⑦ 검증 명령

이 작업 범위에서 돌려야 하는 것:

```
npm run verify:sns-daily-post        # 텔레그램 발행 계약 (실제 발행 0회, fetch 주입)
npm run verify:og-route-contract     # OG 계약 10종
npm run verify:analytics-events      # GA4 + useAnalytics 훅 계약
npm run verify:guard-wiring          # 새 가드가 CI 에 배선됐는지
npm run verify:env-parity            # 새 env 키가 계약에 등재됐는지
npm run verify:sitemap-drift         # 🔴 app/·lib/seo 를 건드렸으면 반드시
npm run verify:worker-no-undef
npm run build:worker && npm run verify:worker-size
npm run typecheck
npm run test:jest && npm run test:node
```

마지막 PR 머지 후 `main` 에서 `npm run check:critical` 1회.

**2026-08-28 실측 기준선** (다음 세션이 회귀를 판정할 근거):

| 항목 | 값 |
|---|---|
| 워커 번들 | gzip **3.10 MiB** / raw 11.14 MiB / files 4 / 예산 10 MiB (31.0%) |
| ⚠️ | 무료 플랜 한도 3.00 MiB 를 넘었다 — **Workers Paid 해지 시 업로드 거부** |
| jest | 177 스위트 / 2007 테스트 |
| node --test | 555 테스트 |
| sitemap | URL 389개 |
| `verify:*` 총수 | 263개 (167 배선 / 96 사유선언) |

## ⑧ 근거를 못 찾으면 추측하지 말고 물어라

이번 세션에서 **계획의 전제가 실측으로 두 번 뒤집혔다.**

- 계획: "`_headers` 에 `/api/og*` 규칙을 추가한다" → 실측 결과 **불필요**했다.
- 계획: "재방문 메일 대상은 `isActive:true && subDaily:false`" → 그 조합을 만드는
  **코드 경로가 없어서** 대상이 0명이었다.

둘 다 문서·기억이 아니라 **직접 재서** 알아낸 것이다. 판정이 필요한데 근거가 없으면
`추정`·`미검증`으로 표시하고 사용자에게 묻는다. 특히:

- 프로덕션에 무언가를 쓰거나 배포하는 것
- 공개 채널에 글을 발행하는 것
- `.env*` · `package-lock.json` · `worker/wrangler.toml` 구조를 건드리는 것

이 셋은 **허락 없이 진행하지 않는다.**

## 부록 — 옮겨 둔 파일

`main` 을 pull 할 때 커밋 안 된 인수인계 초안 2개가 상류의 더 긴 버전과 충돌했다.
지우지 않고 옮겨 뒀다(로컬 188줄 vs 원격 1049줄 / 로컬 180줄 vs 원격 230줄 — 로컬이 옛 초안):

```
<스크래치패드>/untracked-handoff-backup/korean-calendar-migration-2026-08-27.md
<스크래치패드>/untracked-handoff-backup/ziwei-star-placement-2026-08-27.md
```

🔴 세션 스크래치패드는 세션과 함께 사라진다. 남겨야 할 내용이면 지금 옮길 것.
