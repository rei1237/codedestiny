---
status: blocked
updated: 2026-08-31
next: "착수하지 말고 먼저 §선결조건을 본다 — 일일 운세 메일 축이 살아난 뒤에야 갈래 A/B 중 하나를 사용자와 정하고 별도 세션에서 시작한다"
---

# 이탈 유저 재방문 이메일 — 착수 불가 진단서 (2026-08-28)

> 이 문서만 읽고 시작할 수 있게 쓴다. 마케팅 자동화 엔진 4개 PR 중 **재방문 이메일만 보류**됐고,
> 그 사유는 "안 했다"가 아니라 **지금 구조에서는 만들어도 0명에게 발송된다**는 실측이다.

## 한 줄 요약

`dailyFortuneSubscription` 안에는 **"이탈"이라는 상태가 존재하지 않는다.** 살아 있는 구독자는
매일 메일을 받고, 해지자는 법적으로 발송 대상이 아니다. 그 사이에 아무도 없다.

## 무엇을 하려 했는가

명세: *"가입 후 일정 기간 활동이 없는 유저에게 자동 이메일을 발송"*.

사용자 결정(2026-08-28): 전체 가입자가 아니라 **이미 옵트인한 구독자만** 대상으로 한다.
`userSchema` 에 마케팅 수신 동의 필드가 없어 전체 가입자 발송은 정보통신망법 제50조 위반이기 때문이다.

계획했던 대상 조건: `isActive:true && subDaily:false && unsubscribedAt:null`
= "구독은 살렸는데 일일 수신만 끈 사람".

## 왜 못 하는가 (실측)

**검색 범위**: `git grep -n "DailyFortuneSubscription\." -- worker scripts` + `git grep -n "subDaily" -- worker scripts app lib`
(최초 2026-08-28, **2026-08-31 재실측 — 결론 동일**)

이 컬렉션에 쓰는 곳은 **4군데뿐**이고, 그중 `subDaily` 를 정하는 곳은 위의 둘뿐이다.

| 위치 | 쓰는 값 |
|---|---|
| `worker/routes/subscriptions.js:124` (구독 신청) | `subDaily:true` · `isActive:true` · `unsubscribedAt:null` |
| `worker/routes/subscriptions.js:209` (구독 해지) | `isActive:false` · `subDaily:false` · `unsubscribedAt:<날짜>` |
| `worker/routes/subscriptions.js:27` (첫 메일 실패 기록) | `lastMailError` · `lastMailErrorAt` |
| `worker/lib/daily-fortune-task.js:422,538,561` (발송 추적) | `lastSentAt` · `lastMailError` · `lastMailErrorAt` |

그리고 `subscriptions.js:103` 은 `subDaily` 가 false 면 **400 으로 거절**한다.

→ `isActive:true && subDaily:false` 를 만드는 경로가 **없다.** 그 태스크는 항상 0명을 찾는다.

### 다른 후보들도 전부 막힌다

| 후보 | 왜 안 되는가 |
|---|---|
| `lastSentAt` 이 오래된 구독자 | 활성 구독자는 매일 크론이 메일을 보내므로 항상 "오늘"이다 |
| `updatedAt` 이 오래된 구독자 | `lastSentAt` 을 매일 `$set` 하므로 `timestamps:true` 가 매일 갱신한다 |
| `unsubscribedAt` 이 있는 사람(윈백) | 🔴 **위법.** 수신거부자에게 광고성 정보 전송 (정보통신망법 제50조 제2항) |
| `lastMailError` 가 쌓인 구독자 | "이탈"이 아니라 배달 실패다. 일일 크론이 이미 매일 재시도한다 |

## 🔴 선결조건 — 메일 축 자체가 지금 죽어 있다 (2026-08-31 추가)

일일 운세 메일이 **2026-08-19 22:00Z 이후 발송 시도 0건**이다. 원인은 Resend 가 아니라 일일 크론
분기 안쪽이고, 진단은 [docs/handoff/fortune-email-resend-403-2026-08-31.md](fortune-email-resend-403-2026-08-31.md)
가 정본이다. 아래 "이어서 하려면" 의 두 갈래는 모두 **그 축이 복구된 다음**에야 의미가 있다 —
같은 크론·같은 `sendEmail` 을 타므로, 지금 만들면 새 태스크도 조용히 0건을 낸다.

## 이어서 하려면 — 두 갈래

어느 쪽이든 **선행 작업이 있고, 그 선행 작업이 본체다.** 메일 발송 코드는 그 다음이고 작다
(`worker/lib/resend.js` 의 `sendEmail` 을 그대로 쓰면 된다 — `lib/email.ts` 를 새로 만들지 말 것).

### 갈래 A — 메일 클릭 계측부터 (옵트인 범위 유지, 법적 리스크 0)

1. 일일 메일 CTA 에 구독자별 토큰을 붙인다. 지금 링크에는 `utm_source=daily_email` 만 있고
   (`daily-fortune-task.js:388`) 누가 눌렀는지 남지 않는다.
2. 그 토큰을 받는 엔드포인트가 `lastClickAt` 을 찍고 원래 페이지로 302.
3. `dailyFortuneSubscriptionSchema`(`worker/lib/models.js:1972` 인접)에 `lastClickAt` · `lastReengagementAt` 추가.
4. 휴면 판정 = `lastClickAt` 이 N일 이상 과거. **데이터가 쌓여야 하므로 최소 수 주 뒤에나 발송 가능.**
5. 개인정보처리방침에 클릭 추적을 적을지 검토 필요(수집 항목·목적).

### 갈래 B — 가입자 동의 인프라 (명세가 원래 원한 것, 모수가 훨씬 크다)

1. `worker/lib/models.js` `userSchema` 에 `marketingConsent`(동의 시각·버전) · `lastActiveAt` 추가.
2. 가입 폼과 마이페이지에 **선택 동의** 체크박스. 🔴 기본 체크 금지.
3. 개인정보처리방침·이용약관 개정(수집 목적에 마케팅 활용 추가).
4. 로그인/주요 액션에서 `lastActiveAt` 갱신 — 어디서 찍을지 정하는 게 실제 설계 난점이다.
5. 그 다음에야 발송 태스크.

🔴 **결제·인증 스키마를 건드리므로 단독 PR · 별도 세션으로 할 것.**

## 덤으로 발견한 것 — 환영 메일도 이미 있다

`worker/routes/subscriptions.js:162` 가 **구독 신청 즉시** `sendSingleFortune()` 으로 첫 운세 메일을
보낸다. 명세의 "가입 환영 이메일"을 따로 만들면 같은 순간에 두 통이 나간다
(CLAUDE.md 원칙 6 — 이미 있는 장치를 감싸지 말 것). **만들지 말 것.**

## 어느 쪽이든 반드시 지킬 것

- 🔴 **야간 전송 금지** — KST 21:00~08:00 발송하지 않는다(정보통신망법). 기존 일일 크론은
  **KST 07:00** 이므로, 그 크론에 얹으면 **첫 실행이 곧 위법 발송이다.**
  `daily-fortune-task.js` 의 `getKstDateParts`(2026-08-28에 export 됨)로 시각을 확인해 스킵할 것.
- 🔴 제목에 `(광고)` 표기 — 영리목적 광고성 정보인 경우.
- `List-Unsubscribe` 헤더 + 본문 해지 링크 — `daily-fortune-task.js:360,399,414` 패턴 복제.
- 배치 상한·시간 예산 — `DAILY_FORTUNE_BATCH_LIMIT`(500) / `DAILY_FORTUNE_TIME_BUDGET_MS`(60000) 복제.
- 크론을 새로 만들지 말 것 — `worker/wrangler.toml` 의 `crons` 는 CLAUDE.md 규칙 4 수정 금지 대상.
  기존 일일 세트(`worker/index.js` 의 `tasks` 배열)에 얹는다.
- 새 env 키는 `config/env.contract.json` 에 등재 필수(`verify:env-parity` 가 `check:critical` 에 있다).
- 🔴 검증에서 **실제 발송 금지.** Resend 는 mock 으로. 야간 가드는 KST 22시를 주입한 테스트로 단언한다.

## 실패한 시도 (반복하지 말 것)

- `isActive:true && subDaily:false` 를 대상 조건으로 삼는 태스크를 작성하다 중단했다. 위 표대로
  그 조합을 만드는 코드 경로가 없다. **커밋하지 않았고 워크트리는 제거했다.**
- 별도 "가입 환영 메일" 템플릿을 계획했다가 취소했다 — `subscriptions.js:162` 가 이미 보낸다.

## 나머지 3개 PR

같은 명세의 ①③⑤ 는 전부 머지됐다. 상세는
[docs/handoff/marketing-automation-2026-08-28.md](marketing-automation-2026-08-28.md) 가 정본이다.
