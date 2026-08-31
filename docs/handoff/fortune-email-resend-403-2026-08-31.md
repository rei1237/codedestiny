---
status: active
updated: 2026-08-31
next: "🔴 PR #1382 머지 → 프로덕션 승격 순서다 — 알림 코드가 프로덕션에 없어서 그전의 밤 크론 관측은 판정을 못 낸다(2026-08-31 사용자 보류). 승격 뒤 첫 22:00Z 크론에서 텔레그램 알림 유무로 판정한다."
---

# 운세 이메일 — 일일 크론이 발송을 **시도조차** 안 한다

## 🔴 진단 정정 (2026-08-31)

**403 폭풍은 없었다.** 이 문서의 이전 판이 세운 "Resend 가 403 을 돌려준다"는 전제는 틀렸다. 실측:

- Resend `/emails` 읽기 전용 목록(limit=100, `has_more:false`): 2026-08-01 ~ **2026-08-19 22:00:28Z**
  일일 운세 메일이 매일 `delivered`, **그 이후 한 건도 없다**. 실패가 아니라 **시도가 0**이다.
- Resend `/domains`: `code-destiny.com` `status=verified`(ap-northeast-1, 2026-07-25 생성).
  계정 API 키는 1개뿐(`CODEDESTINYMAIL`, 2026-08-04) → "키가 다른 계정 소속" 가설도 죽는다.
- 프로덕션 DB `code_destiny`: 유일한 활성 구독자 문서가 `lastSentAt = updatedAt = 2026-08-19T22:00:28.442Z`,
  `lastMailError:""`, `lastMailErrorAt:null` → **12일간 문서가 아예 쓰이지 않았다.** 루프에 닿았다면
  성공이든 실패든 이 셋 중 하나는 움직인다. DB 안의 유일한 403 기록은 해지된 문서의 2026-07-25 것이다.

→ 고장 지점은 Resend 가 아니라 **`0 22 * * *` 일일 분기 안, 발송 이전 단계**다.

## 배제된 것 (다시 재지 말 것)

- Cloudflare 크론 트리거 `0 22 * * *` · `*/10 * * * *` 둘 다 등록돼 있고 배포는 최신(2026-08-30T16:38Z).
- `wrangler tail` 로 17:50:14Z `*/10` 실행 성공 확인(`payments-v2-reconcile` 200, `connectDb` OK).
  10분 크론 분기는 살아 있다 — 죽은 건 일일 분기뿐이다.
- 일일 분기가 동적 import 하는 6개 모듈은 전부 정상 평가되고, 크론이 쓰는 모델 쿼리도 구독자 1명을 돌려준다.
- 워커 시크릿에 `RESEND_API_KEY` 와 레거시 `EMAILAPI_KEY` 가 **둘 다** 있다(값은 못 읽는다).

## 🔴 남은 작업

### 1. 🔴 프로덕션 승격 — 관측의 전제 (2026-08-31 보류 중)

알림 코드는 머지됐지만 **프로덕션에 안 나갔다.** 승격 전까지 밤 크론을 봐도 아무것도 판정되지 않는다.

```
GET https://code-destiny.com/api/version → gitSha 1e747a9e5 (2026-08-31 06:26Z 실측)
git merge-base --is-ancestor ad75e0a5a 1e747a9e5 → NO   # ad75e0a5a = 알림 PR #1371
```

마지막 승격은 `workflow_dispatch` 2026-08-30T17:53Z(`1e747a9e5`)이고 알림 PR 은 **그 다음 커밋**이다.
이후 실행은 전부 `push`/`schedule`(스테이징)이며 `worker/wrangler.staging.toml` 의 `crons = []` 라
**일일 크론은 프로덕션에서만 돈다.** 사용자가 2026-08-31 에 "진행 중 작업이 있어 대기"로 보류했다.

### 2. 승격 뒤 다음 일일 실행을 관측한다

일일 태스크가 **던지면** 텔레그램으로 한 통이 나간다(`worker/lib/cron-failure-alert.js`).

🔴 그런데 그 알림에는 사각이 둘 있었고, **PR #1382 가 메웠다.** 승격 대상에 이 PR 이 들어가야 한다.

- ⓐ 일일 분기의 동적 `import` 6개가 실패 포착 블록 **밖**에 있었다. 하나라도 던지면 `scheduled` 가
  통째로 거절되고 `failures` 배열은 만들어지지도 않는다 — 알림이 붙어 있어도 아무것도 안 나간다.
  이제 태스크마다 지연 로더라 **로드 실패도 실행 실패와 같은 실패로** 센다.
- ⓑ 대상 조회가 비면 `runDailyFortuneTask` 가 조용히 정상 반환해 "던지지 않았다"가 "일했다"로 읽혔다.
  이제 요약을 돌려주고 호출부가 **발송 0 · 건너뜀 0** 실행을 무위 실행으로 알린다.

- **알림이 오면** 그 사유가 곧 원인이다(연결 타임아웃·모듈 오류·구독자 0 등).
- **알림도 없고 발송도 0이면** 태스크가 던지는 게 아니라 **크론 이벤트가 핸들러에 도달하지 않는 것**이다.
  그때 볼 곳은 Cloudflare 대시보드의 Workers Logs · Cron Triggers 실행 이력.
- 직접 보려면 21:55Z 부터: `wrangler tail code-destiny-web --format json`
  🔴 `--format json` 출력은 NDJSON 이 아니다 — 줄 단위로 파싱하면 68KB 를 읽고도 0건이 나온다.
- 🔴 Workers Logs 는 PR #1381 이 `[observability] enabled = true` 로 설정에 고정했다(양쪽 toml).
  그전에는 대시보드 토글뿐이라 아무도 상태를 추적하지 못했다. **이것도 승격돼야 적용된다.**

**유력 가설(미검증)**: 발송 루프 이전의 `connectDb`/`find` 에서 던진다. 구독 문서가 12일간 손대지지
않은 것과 08-29 관측에서 추가 서브리퀘스트가 ~3건뿐이었던 것이 이와 맞는다. Smart Placement 를
프로덕션에 켠 2026-08-20T18:12Z 가 첫 침묵 실행 직전이라 시간상 인접하지만, 같은 소켓 경로를 쓰는
10분 크론이 멀쩡한 것이 이 가설을 약화시킨다. ⓐ 가 메워졌으므로 이 가설의 참·거짓은 승격 뒤
첫 알림이 직접 말해 준다.

### 3. 발신 도메인을 바꾸게 되면 (현재는 불필요)

`EMAIL_FROM`(별칭 `RESEND_FROM`)이 `config/env.contract.json` 에 등재돼 있어 코드 수정 없이 바꾼다.
🔴 `[vars]` 에 넣으면 `worker/lib/resend.js` 의 `DEFAULT_EMAIL_FROM` 폴백이 죽는다.
🔴 `--only-key` 없이 시크릿을 동기화하면 프로덕션 27개를 덮어쓴다.

## 알고 있어야 할 계약

- `sendEmail` 반환의 `configError` = 401 · 403 · 키 누락 · 발신자/도메인을 지목한 422.
  **수신자별 실패(5xx·잘못된 `to`)는 아니다** — 이 경계가 무너지면 일시적 실패 한 건이 그날 발송을 죽인다.
- 알림 채널은 텔레그램(SNS 일일 발행과 같은 봇). **크론 실행 1회당 최대 1건**, 10분 크론에는 안 붙인다.
- 회귀 가드: `__tests__/worker/cron-failure-alert.test.js` · `resend-config-failure.test.js` ·
  `daily-fortune-provider-config-abort.test.js` · `payments-v2.receipt-email.test.js`.

## 하지 말 것

- 🔴 발송 검증에 실메일을 쓰지 말 것. `npm run diag:resend-domains` 가 무발송 진단이고, `--live` 는 1회 한정 허락이 필요하다.
- 🔴 Resend 계정/도메인/키를 다시 의심하지 말 것 — 위에서 전수로 배제했다.
- 새 크론을 만들지 말 것 — `worker/wrangler.toml` 의 `crons` 는 수정 금지 대상이다.
- 별도 "이탈 유저 재방문 메일"과 혼동하지 말 것: `docs/handoff/reengagement-email-blocked-2026-08-28.md`.
