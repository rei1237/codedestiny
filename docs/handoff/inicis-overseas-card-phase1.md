---
status: done
updated: 2026-09-17
next: 1단계는 끝났다. 2단계 중 정책 링크·CS 진입점은 2026-09-18 에 끝나 docs/handoff/inicis-overseas-card-phase2-20260918.md 로 넘어갔다(그 문서가 최신 상태이며 머지가 남아 있다) — 남은 것은 영문 결제정보와 서버측 환불 동의 기록이고, 이 문서의 "2·3단계로 넘기는 것"·"플래그 ON 선결 조건"과 docs/payment/inicis-overseas-card/02·09 는 계속 유효하다
---

# KG이니시스 해외카드 특약 대비 — 1단계 구현 (C1~C9)

권장: 주력 모델(Opus 5) / effort max. 🔴 RED(결제·인증·DB·법적 고지 축)이고, 위험·검증·롤백 선보고(아래 계획의 "RED 사전 보고 7항목")는 이미 사용자 승인을 받았다.

## 왜

KG이니시스 해외카드 특약(기존 MID 추가형, 승인·정산 KRW) 심사 13문항에 **실제 구현과 일치하는 답**을 내야 한다. 없는 기능을 있는 것처럼 보고하지 않고, 서버에서 강제하며, 국내 결제를 깨지 않는다. 원 요청(13문항·§0~§32) 원문은 트랜스크립트 `C:\Users\user\.claude\projects\d--Development-code-destiny\24f3649a-4df3-4a0e-9fa6-863538208a03.jsonl` 의 첫 사용자 메시지다.

## 지금 상태

- **1단계 완료(2026-09-17).** C1~C9 를 워크트리에서 구현·mock 검증·커밋하고 main 에 머지해 push 했다. `FOREIGN_CARD_ENABLED` 는 어디에도 설정하지 않았고(OFF) 운영 승격도 하지 않았다. 최종 판정은 **PG APPROVAL REQUIRED** 다([09 신청 사실](../payment/inicis-overseas-card/09-inicis-application-facts.md)).
- 커밋: C1 `9dcbadb63` 결제창 고지 문구 · C2 `2f858e731` 비회원 차단 회귀 테스트 · C3 `5def9f385` 정책 모듈·env 계약 · C4 `db9a98d64` 서버 판정·주문 스냅숏 · C5 `111a4ed28` 클라이언트 fail-closed 게이트 · C6 `539da91b0` 주문 시점 정책 버전 · C7 `73215eb42` 미이행·대조 실패 알림 · C8 `af7bfaefc` storeId 대조 · C9 `f7aaf1db4` 문서 01~09. 머지는 `d822fd5db`(main `b6149bab1` 위 `--no-ff`)다.
- 검증 출력·변이 4종 결과·NOT TESTED 목록은 [08 테스트 결과](../payment/inicis-overseas-card/08-test-results.md)에 있다. 머지 트리에서 `npm run check:fast` 는 exit 0 이었다(paid-gate-suite 통과 88 / 실패 0, jest 280 suites / 3954 tests).
- 머지 방식: 공유 체크아웃(`D:\Development\code-destiny`)에 다른 세션의 미커밋 변경이 있어 그 체크아웃은 건드리지 않았다. 워크트리에서 origin/main 을 detached 로 받아 머지 커밋을 만들고 `git push origin HEAD:main` 했다. 충돌은 정적 페이지 24개의 `checkout-entry.js`·`pass-verdict.js` 핀과 sitemap 원장뿐이었다. 핀은 합친 코어에서 다시 유도했고 `sync:public` 도 다시 돌렸다(상세는 머지 커밋 메시지).
- CI(`d822fd5db`): `CI required` success(PR CI 잡 6개 실패·스킵 0) · `Gift transaction integrity` · `Paid Flow Gates` · `Secret Scan` · `Business Identity Gate` · `AI Locale Gate` · 워치독 2종 모두 success. 스테이징 배포 워크플로도 success 였고, 스테이징 화면 검증은 하지 않았다(선택).
- 공유 체크아웃의 미커밋 `config/payment-freeze.json`(F24, `worker/routes/billing.js` maxLines 6909→6350)과 같은 값이 C5 로 이미 main 에 들어갔다. 그 변경의 주인이 로컬 변경을 정리한 뒤 `git pull --ff-only` 해야 한다. 이 세션은 손대지 않았다.

## 남은 작업

- [x] C1~C9 커밋 9개. 커밋마다 "검증 (전부 mock)" 명령이 통과했고, 변이 4종이 가드·테스트를 실제로 실패시켰고, 08 에 실제 실행 출력을 넣었다.
- [x] 머지 전 main `git status` 확인. F24 가 남아 있어 공유 체크아웃 대신 워크트리에서 머지 커밋을 만들어 push 했다. 머지 후 `npm run sync:public` 재실행 결과(핀 갱신, 4회째 변경 0)는 머지 커밋에 들어 있다.
- [x] push 후 `CI required` 통과 확인(위 CI 줄). 운영 승격과 `FOREIGN_CARD_ENABLED` 켜기는 하지 않았다.
- 2단계(영문 결제정보·CS 진입점·정책 링크 UI)와 3단계(환불·개인정보 법무 대조, LEGAL REVIEW REQUIRED)는 별도 세션에서 한다(아래 "2·3단계로 넘기는 것"). 플래그 ON 은 "플래그 ON 선결 조건" 순서를 따른다.
- "모르는 것"의 OWNER INPUT REQUIRED 항목은 그대로 남아 있다. 범위 밖 결함은 "범위 밖 결함 (보고만)" 절에 있으며 이번에 고치지 않았다.

## 재개 절차

```powershell
Set-Location 'D:\Development\code-destiny'
git branch --show-current
git status --short
git pull --ff-only
powershell -File scripts/create-safe-worktree.ps1 -Slug inicis-overseas-card-p1
```

워크트리 안에서 `npm run setup:git` 을 먼저 실행한다. jest 는 `npx --no-install jest …` 로 돌린다.

## 정본 예시

- 플래그 관례(문자열 `"1"` 만 ON): `worker/payments/gifts.js:56-60`
- 전달 성공 후에만 표식을 CAS 로 찍고 5초 타임아웃을 거는 방식: `worker/payments/receipt-email.js:46-74`

## 함정

- C5 는 동결 region `_cdRunDirectKrwCheckout` 을 바꾼다. `node scripts/verify-payment-freeze.mjs --update` 의 diff 는 그 sha 1줄(+ `worker/routes/billing.js` maxLines 자동 하향 1줄)이어야 한다. 다른 줄이 바뀌면 멈추고 보고한다.
- `checkout-entry.js?v=` 핀 13곳 중 `sync:public` 이 자동으로 바꾸는 곳은 일부뿐이다(계획 "핀 규칙"). 하나라도 빠지면 캐시된 구 코어가 해외카드 파라미터를 계속 붙여 D2 를 어긴다.
- `worker/routes/billing.js`·`worker/routes/payments.js` 는 성장 상한에 걸려 있다. 한 줄도 늘리면 안 된다.
- 결제 알림에 `worker/lib/telegram.js` 를 쓰지 않는다. chatId 가 없으면 공개 채널 `TELEGRAM_CHAT_ID` 로 간다.
- C8 storeId 비교는 PortOne 응답에 `storeId` 가 **있을 때만** 한다. 실제 응답 형식은 mock 으로 확인할 수 없으므로 08 에 NOT TESTED 로 적는다.

## 모르는 것 (추측해서 채우지 않는다 — OWNER INPUT REQUIRED)

- ~~운영 워커 알림 채널 설정 여부~~ — **해소(2026-09-18)**. `wrangler secret list`(프로덕션 `code-destiny-web`) 실측: `ADMIN_FEEDBACK_EMAIL` 등록됨, `FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL` 미등록. 오너 확인: 수신 이메일은 `admin@code-destiny.com`, Discord·Slack 은 쓰지 않기로 한 결정(결함 아님). 상세: [06 §4](../payment/inicis-overseas-card/06-customer-support-and-incident-response.md#4-담당자온콜).
- **남음** — 결제 사고 1차 담당자·온콜 대응 시간·개인정보 유출 대응 절차(문서 06 §4 "남은 질문"에 오너가 답하면 바로 닫히는 형태로 질문·기록 위치를 정리해 뒀다), 해외카드 예상 거래금액(문서 09, 근거 데이터 없음), 신청서 사업자 정보와 `lib/site-policy-config.js` `BUSINESS_IDENTITY` 의 일치 여부, 운영 `GIFTS_ENABLED` 활성 여부를 모른다.
- KG이니시스 특약 승인 여부를 모른다. 이 계획은 "처리중(미승인)"(D2)을 전제로 한다. 승인 소식이 오면 계획의 "플래그 ON 선결 조건" 순서를 따른다.

## 검증

- 구현 커밋마다: 아래 계획 "검증 (전부 mock)" 절.
- 마지막 1회: `npm run verify:billing-pass-policy` · `npm run verify:payment-legal-copy` · `node scripts/run-paid-gate-suite.mjs` · `npx --no-install jest __tests__/worker/payments-v2 __tests__/billing/checkout-entry.test.js`
- 이 문서 자체: 작성 세션에서 `npm run verify:handoff-contract` 가 통과했다(157개 문서). 코드 변경이 없어 다른 검사는 돌리지 않았다.

---

> 아래는 2026-09-17 사용자가 승인한 계획 전문이다. 원본은 `C:\Users\user\.claude\plans\portone-glittery-babbage.md` 이다. 옮기면서 세 가지만 바꿨다. 첫 줄의 모델 권장은 위로 옮겼다. 제목은 한 단계씩 내렸다. 최종 계획과 충돌하는 "(폐기) 설계 초안" 절은 뺐다.

## KG이니시스 해외카드 심사 대비 — 계획

### Context

KG이니시스 해외카드 특약(기존 MID 추가형, 승인·정산 KRW)은 2026-08-20 신청 후 레포 최신 기록(2026-09-09) 기준 **처리중**이다.
심사 13문항(판매상품·객단가·제공기간·결제 URL·내외국인 구분·비회원 차단·회원 인증·해외 CS·사고대응·해외배송·배송추적·개인정보·예상 거래액)에
**실제 구현과 일치하는 답**을 내야 하고, 없는 기능은 만들어 보고하지 않는다. 결과물: 코드(서버 강제) + mock 테스트 + 회귀 검사 + `docs/payment/inicis-overseas-card/01~09`.

**상태(09-17)**: 조사·설계·사용자 결정(D1~D4) 완료 → 아래 "최종 구현 계획 C1~C9" 가 정본. 부록은 문서 01~09 작성 때 인용할 실측 근거. 구현은 새 세션·워크트리에서.

### 실측 사실 (메인 세션 직접 확인)

| # | 사실 | 근거 |
|---|---|---|
| F1 | 해외카드 노출 bypass `P_RESERVED:["global_visa3d=Y"]` 가 **조건 없이 항상** 실린다(플래그·상품·로그인 판정 없음) | `js/core/checkout-entry.js:344-346`; 래퍼 `index.html:21102-21105` `_cdPortoneBypass`·`js/destiny-profile.js:3073-3076` `_dpPortoneBypass`; 결제 호출부 `index.html:23461`(동결 영역)·`js/destiny-profile.js:5645`·`app/points/PointsClient.tsx:4549`·`lib/payment/portone.ts:436`(임포터 0) — 09-17 재grep |
| F2 | 가드가 bypass **존재**를 단언한다(없애면 실패) | `scripts/verify-portone-single-payment-regression.mjs:368-390`, `__tests__/billing/checkout-entry.test.js:518-533` |
| F3 | 🔴 **P0** 승인 전인데 11개 비한국어 로케일 결제창 고지가 "International cards (VISA · Mastercard · JCB · Diners) are accepted" 라고 단정한다. **프로덕션 `https://code-destiny.com/i18n/en.json` 에서 실제 서빙 중(2026-09-17 확인)** | `js/core/checkout-entry.js:448-449`, `app/points/PointsClient.tsx:2689-2690`, `public/i18n/*.json` `payment.overseas.chargedInKrw` |
| F4 | 대조: PR #1850 의 CommerceDisclosure 문구는 "승인 상태에 따라 다르며 개통을 보장하지 않는다"로 신중함 | `lib/i18n/commerce-disclosure-copy.mjs:54` |
| F5 | 공개 결제 설정 `GET /config` = 무인증·Mongo 0회 계약. 해외카드 플래그 필드 없음 | `worker/payments/index.js:917-956`, `worker/lib/portone.js:286-323` |
| F6 | 주문 상태 응답에 이미 `recoveryRequired: paid && !ready`(결제됨·미지급 판정) 존재 | `worker/payments/index.js:882-902` |
| F7 | PortOne V2 `Card` = publisher·issuer(문자열 코드)·brand(LOCAL/MASTER/UNIONPAY/VISA/JCB/AMEX/DINERS)·type·ownerType·bin·number(마스킹). **"해외 발급" 전용 필드 없음** → 결제 후 해외카드 확정 판별은 문서상 불가(국내 발급 VISA 도 brand=VISA) | `@portone/server-sdk` `dist/generated/common/Card.d.ts`, `CardBrand.d.ts` (jsDelivr) |
| F8 | 기능 플래그 관례: `GIFTS_ENABLED` 는 toml·env 계약 어디에도 없고 `!== "1"` 이면 서버가 `paymentError` 로 차단(없음 = OFF, fail-closed) | `worker/payments/gifts.js:56-60` |
| F9 | 🔴 프로덕션 워커 텍스트 바인딩 한도 128 도달 기록 — 키 1개 추가로 배포 code 10055 실패(run 34751376669). 프로덕션 `[vars]` 56개 + 시크릿 | `scripts/verify-worker-config-parity.mjs:83-92`; 선례 02560ce64(자리 비우기) |
| F10 | 스테이징 설정은 별도 `worker/wrangler.staging.toml`; `STAGING_ONLY_KEYS` 로 프로덕션 유입 차단 | `scripts/verify-worker-config-parity.mjs:74-93` |
| F11 | 동결: index.html 3개 영역 + `_dpRenderStandalonePaymentChoice`, 통파일 `app/_lib/billing-client.ts`·`app/hooks/useCoinGate.ts`·`lib/payment/portone.ts`; 성장 상한 `worker/routes/{billing,payments}.js` | `config/payment-freeze.json` |
| F12 | 옆 세션이 main 체크아웃에서 쓰는 중(`config/payment-freeze.json` 미커밋 수정 포함) → 구현은 워크트리 필수 | `git status` 17:50 |
| F13 | `docs/payment/` 없음, 기존 관례는 `docs/payments/` | `ls` |

### 사용자 결정 (2026-09-17)

- D1 **3단계 분할.** 이번 세션 = P0 고지 문구 + 서버 강제 코어(플래그·상품 자격 정책·로그인 강제 검증·증빙 필드·결제 후 미이행 알림) + mock 테스트·회귀 + 문서 01~09(미구현은 NOT READY 로 정직 표기). 2단계 = 영문 결제정보·CS 진입점·정책 링크 현지화(UI). 3단계 = 환불·개인정보 문서 대조(LEGAL REVIEW REQUIRED)와 09 갱신.
- D2 특약 **아직 처리중(미승인)** → 프로덕션 플래그 OFF 유지, "accepted" 고지를 "being prepared" 로, `global_visa3d` 도 승인 전까지 미전송.
- D3 (정정 반영) **이용권·선물도 해외카드 대상에 포함.** 처음엔 "전부 제외"를 골랐으나 곧바로 "이용권하고 선물은 있어야" 로 정정했다. 해석: 사이트 판매 유지는 원래 전제이고, 정정 내용은 해외카드 결제 대상에 넣는 것이다. 대상 = 단건 디지털 콘텐츠 + 이용권 4등급(**30일 고정** — `worker/payments/index.js:292-297` 가 30일 외 요청 거부, 자동갱신 없음) + 선물(이용권 4등급만). 자격은 상품별 정책 표 한 줄로 끌 수 있게 둔다. 심사 문서에는 제공기간(이용권 30일)과 선물 수령기한(결제 +1년, `worker/payments/gifts.js:39-42`)을 사실대로 적고, "선불·양도 가능 상품(선물)"이라는 PG 위험 요인을 숨기지 않는다. (정정: 초기 메모의 "30일·1년형"은 틀림 — 현재 판매는 30일만.)

- D4 **결제 알림 채널 = 기존 제보 알림 채널 재사용**(09-17 선택). `ADMIN_FEEDBACK_EMAIL`(Resend)·`FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL` 을 읽는다 → 새 env 이름 0개, 바인딩 한도(F9) 무관. 공개 `TELEGRAM_CHAT_ID` 금지. 운영 값: 2026-09-18 `wrangler secret list` 실측으로 `ADMIN_FEEDBACK_EMAIL` 은 등록 확인, `FEEDBACK_DISCORD_WEBHOOK_URL`·`FEEDBACK_SLACK_WEBHOOK_URL` 은 미등록(없으면 `[pay-alert] unconfigured` 로그만, 켜려면 값 1개 = 바인딩 1자리). 2026-09-18 오너 확인: 수신 이메일 `admin@code-destiny.com`(`lib/site-policy-config.js` `SUPPORT_EMAIL`·`BUSINESS_IDENTITY.email` 과 동일), Discord·Slack 은 오너가 쓰지 않기로 함(의도된 상태, 결함 아님) → D4 알림 채널 항목 해소.

## 최종 구현 계획 — 1단계 (C1~C9)

**원칙** 서버가 판정하고 클라이언트는 전달만 한다. 모든 기본값은 닫힘. 프로덕션·스테이징 모두 `FOREIGN_CARD_ENABLED` 미설정(= OFF), ON 경로는 mock 으로만 검증.
**강제선** ① 주문 생성·prepare·confirm 전부 JWT 필수(C2 로 증명) ② 서버 판정이 열린 주문에만 해외카드 창 파라미터 전송(C3~C5) ③ PG 특약. **한계(문서 02 명시)**: 조작된 클라이언트가 SDK 에 파라미터를 직접 붙이는 것은 서버가 사전에 막을 수 없고, PortOne `Card` 에 해외 발급 필드가 없어(F7) 사후 확정 판별도 불가 → 추정 기반 자동 취소는 하지 않는다.

각 커밋은 단독 `git revert` 가능. 결제·접근을 바꾸는 C4·C5·C7·C8 은 `docs/PAYMENT_AND_ACCESS.md`, env 를 선언하는 C3 는 `docs/DEPLOYMENT_AND_INFRA.md` 를 **같은 커밋에서** 1~3줄 갱신(`docs/context/doc-precedence.md:24-37`).

#### C1 P0 결제창 고지 문구 (로직 0줄)
- `payment.overseas.chargedInKrw` 값만 교체: `public/i18n/ko.json:1680`, 나머지 11개 `:2179`. ko 폴백 `js/core/checkout-entry.js:449`·`app/points/PointsClient.tsx:2690`(CRLF → node 패치)은 ko.json 값과 글자까지 동일(`verify:payment-copy-dictionary`).
- 사실(KRW 승인·카드사 환율)은 유지하고 "사용할 수 있음/accepted"·브랜드명만 제거(현 문구 en.json:2179 확인). 문구에 `' " & < >` 금지(`checkout-entry.test.js:390` 원문 포함 단언). zh 두 문구 반대 자형 0자(설계 1 확인, 상한 `verify-payment-copy-dictionary.mjs:284-285`).

| 로케일 | 값 |
|---|---|
| ko | 결제는 원화(KRW)로 승인됩니다. 해외 발급 카드 결제는 준비 중이며 아직 이용이 보장되지 않습니다. 환전은 카드사 환율로 이루어집니다. |
| en | Payment is authorized in Korean Won (KRW). Payment with cards issued outside Korea is being prepared and is not yet guaranteed. Your card issuer applies its own exchange rate. |
| ja | 決済は韓国ウォン（KRW）で承認されます。海外発行カードでのお支払いは現在準備中で、ご利用いただけない場合があります。為替換算はカード会社のレートで行われます。 |
| zh-CN | 付款以韩元（KRW）授权。境外发行银行卡付款功能正在准备中，暂不保证可用。汇率由发卡机构确定。 |
| zh-TW | 付款以韓元（KRW）授權。海外發行信用卡付款功能正在準備中，暫不保證可用。匯率由發卡機構決定。 |
| de | Die Zahlung wird in koreanischen Won (KRW) autorisiert. Die Zahlung mit außerhalb Koreas ausgestellten Karten wird vorbereitet und ist noch nicht garantiert. Ihr Kartenherausgeber wendet seinen eigenen Wechselkurs an. |
| es | El pago se autoriza en wones surcoreanos (KRW). El pago con tarjetas emitidas fuera de Corea está en preparación y aún no está garantizado. Su entidad emisora aplica su propio tipo de cambio. |
| fr | Le paiement est autorisé en wons coréens (KRW). Le paiement par carte émise hors de Corée est en cours de préparation et pas encore garanti. Votre émetteur de carte applique son propre taux de change. |
| nl | De betaling wordt geautoriseerd in Koreaanse won (KRW). Betalen met buiten Korea uitgegeven kaarten wordt voorbereid en is nog niet gegarandeerd. Uw kaartuitgever hanteert zijn eigen wisselkoers. |
| vi | Thanh toán được ủy quyền bằng Won Hàn Quốc (KRW). Thanh toán bằng thẻ phát hành ngoài Hàn Quốc đang được chuẩn bị và chưa được đảm bảo. Đơn vị phát hành thẻ của bạn áp dụng tỷ giá riêng. |
| ms | Pembayaran dibenarkan dalam Won Korea (KRW). Pembayaran dengan kad yang dikeluarkan di luar Korea sedang disediakan dan belum dijamin. Pengeluar kad anda menggunakan kadar pertukaran sendiri. |
| hi | भुगतान कोरियाई वॉन (KRW) में अधिकृत किया जाता है। कोरिया के बाहर जारी कार्ड से भुगतान की सुविधा तैयार की जा रही है और अभी इसकी गारंटी नहीं है। आपका कार्ड जारीकर्ता अपनी विनिमय दर लागू करता है। |

- 가드: `scripts/verify-overseas-payment-notice.mjs` 에 "사전 12개 값 + ko 폴백 2곳에 `/VISA|Mastercard|JCB|Diners/i` 없음"(승인 전 지원 표기 기계 차단, 승인 후 의도적으로 해제). 테스트: `__tests__/billing/checkout-entry.test.js:395` 에 "준비 중" 포함·브랜드 부재 단언.
- `npm run sync:public` + **핀 규칙**(아래).

#### C2 비회원 차단 증명 — 로그인 강제 회귀 테스트 (운영 코드 0줄, 서버 변경 전에 기준선 고정)
- `__tests__/worker/payments-v2.context.test.js:285` 뒤, 기존 `call()`(:245-256)·`db.ctx.ops` 사용:
  - "모든 라우트 auth 는 none|required 뿐" — `index.js:1626` 이 `=== "required"` 비교라 오타 = 익명 라우트.
  - `test.each` required 13개(개수 하한 단언): 무 JWT → 401 `UNAUTHORIZED`·Mongo 0회. 다른 비밀키 서명 JWT → 401·Mongo 0회(`worker/lib/auth.js:659` verifyJwt).
  - 선물 7개(POST /claim, GET /sent·/received·/account·/g1, POST /g1/link·/g1/refund-request) 비로그인 401·Mongo 0회(`gift-routes.js:51-53`).
- 구 라우터 정적 단언 `scripts/verify-worker-security-guards.mjs:66-69` 옆: `worker/routes/billing.js` `handleCheckout`(:5996-6028) 안에서 `requireBillingAuth(`(:6010)가 `delegateToPayments(`(:6020)보다 앞 / `billing.js`·`payments.js` 에 `foreignCard`·`global_visa3d`·`P_RESERVED` 없음. 두 파일은 성장 상한(6349/6350·3652/3653)이라 한 줄도 안 늘림.

#### C3 정책 모듈 + env 계약 (호출부 없음)
- 신규 `worker/payments/foreign-card-policy.js`:
  - `FOREIGN_CARD_POLICY_VERSION = "2026-09-17-v1"`(`lib/payment/gift-policy.js:3` GIFT_POLICY_VERSION 형식)
  - `FOREIGN_CARD_REASON` = `ELIGIBLE`·`FLAG_OFF`·`AUTH_REQUIRED`·`PRODUCT_NOT_ELIGIBLE`·`CHANNEL_NOT_SUPPORTED`·`ORDER_SNAPSHOT_CLOSED`
  - `FOREIGN_CARD_PRODUCT_POLICY = { digital_content: true, membership_pass: true, membership_pass_gift: true }` — D3, 한 줄을 false 로 바꾸면 그 유형만 꺼짐
  - `isForeignCardFlagEnabled(env)` = `String(env?.FOREIGN_CARD_ENABLED ?? "") === "1"` (`gifts.js:57` GIFTS_ENABLED 와 같은 문자열 강제 비교)
  - `canUseForeignCard({ user, product, billingCountry, paymentChannel } = {}, { env } = {})` → `{ offered, reason, policyVersion }`. 순서: FLAG_OFF → AUTH_REQUIRED(`!user?.id`) → PRODUCT_NOT_ELIGIBLE(`Object.hasOwn` 조회, 이용권 `durationDays !== 30`) → CHANNEL_NOT_SUPPORTED(trim·소문자 값 `!== "card_general"` — 카카오페이·계좌이체·상품권 제외. 앱(Capacitor) 구분은 판정에 없음 → 플래그 ON 선결 조건) → ELIGIBLE. `billingCountry` 는 받되 판정에 쓰지 않는다(발급국 판별 불가, IP·locale·이름 추정 금지 — 주석·문서 02).
  - `narrowToOrderSnapshot(fresh, snapshot)`(현재 판정이 닫힘이면 현재 사유, 스냅숏이 열림이 아니면 `ORDER_SNAPSHOT_CLOSED`), `toForeignCardSnapshot(decision, now)` → `{ offered, reason, policyVersion, decidedAt }`
- `config/env.contract.json` 에 `ACCESS_STATE_ENABLED`(:142) 형식으로 `{"name":"FOREIGN_CARD_ENABLED","scope":"server","secret":false,"required_in":[],"targets":["worker"],"consumers":["worker/payments/foreign-card-policy.js"]}`. **wrangler toml 에 올리지 않음** → 바인딩 0. (근거: `env?.` 는 `env-parity.mjs:96` DIRECT_ACCESS 정규식 사각지대라 `GIFTS_ENABLED` 가 미선언으로 통과 중 — 선언이 정석, consumers 로 unused 검사 :264-266 통과)
- 테스트 신규 `__tests__/worker/payments-v2.foreign-card-policy.test.js`(접두사로 `test:worker:auth-payments` 자동 포함): 플래그는 문자열 "1" 만 ON(undefined·''·'0'·'true'·' 1' = FLAG_OFF, 숫자 1 은 문자열 강제로 ON — 관례 동일) / user·id 없음 AUTH_REQUIRED / 표 3유형만 offered / 표 밖·`constructor`·`__proto__` 불가 / 이용권 30일 외 불가 / card_general 외(transfer·kakaopay·gift_*·CARD·빈 값) 불가 / billingCountry(KR·US·빈 값·undefined)는 결과 불변 / narrowToOrderSnapshot 규칙.

#### C4 서버 판정 → 주문 스냅숏 → prepare 응답
- `worker/payments/orders.js` `createOrder`(:95, `$setOnInsert` :119, now :111)·`worker/payments/passes.js` `createPassOrder`(:92, :104, now :96): 인자 `foreignCard = null` → `foreignCard: foreignCard ? toForeignCardSnapshot(foreignCard, now) : null`. `createPayableOrder`(:322)·`createPayablePassOrder`(:188)는 input 을 그대로 넘겨 무수정. `deriveOrderId`(:84-89) 입력 불변 → orderId 결정성 유지. Mongo `$jsonSchema` 검증기 없음(설계 1 grep 0).
- `worker/payments/index.js` `/prepare`: :1087 의 `paymentMethod` 식을 :1059 직전에 한 번 계산 → `canUseForeignCard({ user:{id:userId}, product:{type:"digital_content"}, billingCountry:null, paymentChannel:paymentMethod }, { env })`(I/O 없음) → :1076-1088 `createPayableOrder({…, foreignCard: decision})`, :1097-1102 `toLegacyPrepareOrder(…, { foreignCard: narrowToOrderSnapshot(decision, order.foreignCard) })`.
- `handlePassPrepare`(:435 뒤 판정, :467 전달, :480-495 응답): product = `{ type: plan.productType, purchaseType, durationDays }`, GIFT 면 `membership_pass_gift` 행. 선물 prepare 는 이 GIFT 분기(`gift-routes` 는 사후 처리만).
- `worker/payments/compat.js` `toLegacyPrepareOrder`(:94) 옵션 → 키 `foreignCard: { offered: foreignCard?.offered === true, reason, policyVersion }`(billing-checkout 봉투 `data.order` :143-149 에도 실림).
- 건드리지 않음: `presentOrder`(정확 키 단언 `index.js:626-638`, `context.test.js:105-112`), `POST /orders`(:986-1007, 스냅숏 null = 닫힘 — 이 응답을 쓰는 requestPayment 호출부 없음).
- 판정 입력 `paymentMethod` 는 클라이언트 신고값(`index.html:23132`, `destiny-profile.js:4081`, `PointsClient.tsx:4408-4409` → `orders.js:145`, `passes.js:113`) → 판정은 "보내도 되는 상한"이고 클라이언트 `channelKeyName` 게이트와 AND. 같은 멱등키로 수단을 바꿔 재호출하면 저장·현재 중 하나가 어긋나 닫힘.
- 테스트: `payments-v2.prepare-compat.test.js` — `LEGACY_PREPARE_ORDER_KEYS`(:62-68, 초집합 검사 :86)에 추가 + 플래그 미설정 FLAG_OFF(문서 스냅숏 동일) / ON·card_general offered(policyVersion·decidedAt) / ON·transfer·kakaopay CHANNEL_NOT_SUPPORTED / 본문 `foreignCard`·`bypass`·`offered` 위조 무시 / 닫힌 채 생성된 주문은 ON 후 재호출도 ORDER_SNAPSHOT_CLOSED / 열린 주문도 OFF 로 내리면 즉시 FLAG_OFF / merchantUid = deriveOrderId 그대로 / billing-checkout 봉투에도 동일. subscription 테스트: SELF 응답·문서에 foreignCard. 선물 replica: GIFT 행 판정.

#### C5 클라이언트 fail-closed 게이트
- `js/core/checkout-entry.js:344` (머리주석 :330-343 갱신):
  `function portoneBypass(decision) { if (!decision || decision.offered !== true) return undefined; return { inicis_v2: { P_RESERVED: ["global_visa3d=Y"] } }; }`
  `checkout-entry.d.ts:238`(CRLF) 시그니처 `portoneBypass(decision?: { offered?: boolean } | null): {…} | undefined`.
- 호출부(세 곳 모두 `order` 가 같은 함수 스코프, 섀도 없음 — 설계 1 확인):
  - `index.html:21102-21106` 래퍼 `_cdPortoneBypass(decision)` → `api.portoneBypass(decision)`(`return null;`·`catch (` 유지, 가드 :263-272) — 비동결
  - `index.html:23461` `directPayFields.channelKeyName ? null : _cdPortoneBypass(order && order.foreignCard)` — **동결 region `_cdRunDirectKrwCheckout`**
  - `js/destiny-profile.js:3073-3077`·`:5645` 같은 패턴 — 비동결
  - `app/points/PointsClient.tsx:4549`(CRLF) `… ? null : checkoutEntry.portoneBypass(order.foreignCard)` + order 타입(:69-89)에 `foreignCard?: { offered?: boolean; reason?: string; policyVersion?: string } | null`
  - `lib/payment/portone.ts` 무수정(:436 무인자 → undefined, `bypass?:` :73 라 컴파일 OK)
- 가드 `scripts/verify-portone-single-payment-regression.mjs`: ⑤(:367-381) → 무인자·null·`{}`·`{offered:"true"}`·`{offered:1}` = undefined, `{offered:true}` = global_visa3d=Y 포함·원소 KEY=VALUE 꼴 / ⑥(:387-391) 채널 격리 마커 3개를 새 호출식으로 / 신규: 두 래퍼가 `api.portoneBypass(decision)` 로 인자 전달. `BYPASS_CALLERS`(:236-249)는 대입 줄 불변이라 무수정.
- 테스트 `__tests__/billing/checkout-entry.test.js:517-535`: describe "이니시스 bypass — 서버 판정이 열린 주문에만", 신규 "판정 없음·닫힘·truthy 위조 = undefined(승인 전 global_visa3d 미전송)", 기존 3건은 `{offered:true}` 전달.
- 동결: 워크트리에서 `node scripts/verify-payment-freeze.mjs --update` → diff 가 `_cdRunDirectKrwCheckout` sha 1줄(+ `billing.js` maxLines 자동 하향 1줄, F24)뿐인지 확인. 그 외 줄이 바뀌면 멈추고 보고.
- 배포 순서 무관: C5 가 먼저면 `order.foreignCard` 없음 → 미전송, C4 가 먼저면 현 동작.

#### C6 주문 시점 정책 버전 (증빙)
- 신규 `worker/payments/policy-versions.js` `ORDER_POLICY_VERSIONS = { terms: "2026-04-11", privacy: "2026-08-25" }` → `orders.js`·`passes.js` `$setOnInsert` 에 `policyVersions`. 주석·문서 05: "주문 시점 **게시** 버전, 동의 기록 아님"(환불정책은 약관 §12 라 terms 에 포함).
- 드리프트 테스트: `worker/routes/auth.js:90,92`·`app/terms-of-service/TermsContent.jsx:12`·`app/privacy-policy/PrivacyPolicyContent.jsx:14` `PRIVACY_POLICY_EFFECTIVE_DATE` 를 텍스트로 읽어 값 일치 단언. auth.js 무수정.

#### C7 결제 후 미이행·PG 대조 실패 감지 + 운영자 알림 (D4)
- `worker/payments/reconcile.js`: S1 재지급 시도마다 `$inc metadata.fulfillmentAttempts` / S2 `alertPaymentAnomalies`(A 미지급·B 대조 실패 — 아래 "설계 2 결과" 조건 그대로).
- `worker/lib/feedback-notify.js` 에 `notifyOperators(env, { subject, text })` export 추가 — 기존 `WEBHOOK_CHANNELS`·`postWebhook`·`sendEmail`·`escapeHtml` 재사용, `notifyNewFeedback` 동작 불변, throw 금지 관례 유지. 채널 0개면 `{ ok:false, error:"unconfigured" }`. **전달 판정 = `ok && !skipped` 인 채널 ≥1**(`sendAdminEmail` 은 수신자 없으면 `ok:true, skipped` 를 돌려주므로 그대로 쓰면 오판).
- 신규 `worker/payments/fulfillment-alert.js`: 본문 빌더(주문번호 뒤 8자·featureKey·유형·금액·경과·시도·실패 코드 / userId·이메일·전화·rawPortOne 금지 / Discord 1900·Slack 3000자 한도 안) + 5초 `withTimeout`(`receipt-email.js:65-74` 패턴). `worker/lib/telegram.js` import 금지.
- `worker/payments/index.js:1797`(월정석 정리 뒤·영수증 메일 앞) try/catch 호출, 크론 요약에 `alerts`. 표식은 전달 성공 후에만 CAS(타임아웃·실패면 다음 틱 재시도, 중복 알림은 허용).
- 테스트 신규 `__tests__/worker/payments-v2.fulfillment-alert.test.js`: A 대상(paid·30분+·미지급만) / B 는 `AMOUNT_MISMATCH`·`CURRENCY_MISMATCH`·`PAYMENT_ID_MISMATCH`·`STORE_ID_MISMATCH` 만(`PG_PAYMENT_NOT_PAID` 제외, `errors.js:95-101`) / 전달 후 재실행 무발송 / 24h 재알림·7회 후 중단 / 실패·타임아웃이면 표식 없음 / 채널 미설정이면 `TELEGRAM_CHAT_ID` 가 있어도 fetch 0회 / 이메일 수신자 없음(skipped)만 있으면 미전달 / 인자·본문에 userId·이메일·전화 없음 / 섹션 20건·길이 한도. reconcile 테스트: 실패마다 attempts 증가. 제보 알림은 기존 테스트 0개(`__tests__` grep) → `notifyNewFeedback`·`sendAdminEmail`·`postWebhook` 본문 무수정, 신규 export 만 테스트.

#### C8 storeId 대조 (국내 확정 경로의 유일한 변경, 단독 revert)
- `worker/payments/pg.js:76` 설정 객체 사용, :126 뒤 응답 `storeId` 가 **있을 때만** `PORTONE_STORE_ID` 와 비교 → 불일치 422 `STORE_ID_MISMATCH`(details 에 storeId 값 금지 — 시크릿 분류), 없으면 통과. `rawPortOne.storeIdCheck: "matched" | "absent"` 기록. `worker/payments/errors.js:100`(`PAYMENT_ID_MISMATCH`) 옆에 `STORE_ID_MISMATCH: { status: 422 }` 추가.
- 테스트 `payments-v2.db-pg.test.js`: 다르면 422·상세에 값 없음 / 없으면 통과·absent 기록 / 키 목록(:135-137) 갱신.

#### C9 문서 01~09 (아래 "문서 계획") + `docs/PAYMENT_AND_ACCESS.md:226` 절에 폴더 포인터. 08 은 C1~C8 실제 실행 출력으로 작성.

#### 핀 규칙 (checkout-entry.js 를 바꾸는 C1·C5 마다)
`npm run sync:public`(index.html:51·:20507, `index-inline-runtime.js:2290`, `uiBindings.js:116` 자동) → `app/layout.js:185`·정적 서비스 HTML 11개·그 public 미러(ifa-oracle.html, static/geomancy-oracle-v4.html 포함)의 `checkout-entry.js?v=` 를 index.html:51 새 값으로 수동 교체(선례 ec0a53e24). 빠뜨리면 캐시된 구 코어가 인자를 무시하고 항상 파라미터를 붙여 D2 위반. **dp 핀**(`app/_lib/billing-client.ts:465`, 통파일 동결·`verify-paid-gate-ui-regression.mjs:231` 고정)은 보류 — 구 dp 는 무인자 호출이라 새 코어에서 닫힘. 플래그 ON 준비 때 회전.

### RED 사전 보고 7항목
1. **관련 파일** — 서버 `worker/payments/{foreign-card-policy·policy-versions·fulfillment-alert(신규), index, orders, passes, compat, reconcile, pg, errors}.js`, `worker/lib/feedback-notify.js`, `config/env.contract.json` / 클라 `js/core/checkout-entry.js`(+`.d.ts`), `index.html`(동결 1곳), `js/destiny-profile.js`, `app/points/PointsClient.tsx`, `public/i18n/*.json` 12개, 정적 HTML 핀 / 가드 `scripts/verify-{portone-single-payment-regression, overseas-payment-notice, worker-security-guards}.mjs`, `config/payment-freeze.json` / 테스트 `__tests__/worker/payments-v2.*`, `__tests__/billing/checkout-entry.test.js` / 문서 `docs/payment/inicis-overseas-card/`, `docs/PAYMENT_AND_ACCESS.md`, `docs/DEPLOYMENT_AND_INFRA.md`.
2. **현재 구조** — 해외카드 창 파라미터가 조건 없이 전송(F1), 승인 전 "accepted" 고지가 운영 서빙(F3), 서버 판정·스냅숏 없음, 결제 후 미이행 알림 0, storeId 미대조, 비회원 차단은 구현돼 있으나 회귀 테스트 없음.
3. **원인** — 파라미터가 모든 이니시스 결제창에 고정 부착(설계 1: #1387), 고지 문구가 승인 전 확정형으로 작성, 알림 장치가 결제 축에 연결된 적 없음.
4. **변경 범위** — C1~C9. **하지 않음**: 국내 휴대폰 필수 완화, V2 레이트리밋, vedic·ziwei 환불 분기, 영문 결제정보·CS UI(2단계), 법무 문서(3단계), 플래그 ON, 운영 배포.
5. **회귀 위험** — C5: 운영 이니시스 결제창에서 해외카드 탭이 사라짐(D2 의도, #1387 이전 동작) → 카드·계좌이체·상품권·카카오페이 단건, 이용권 SELF/GIFT 결제창 열림 확인 필요. C8: PortOne 응답 storeId 형식이 env 값과 다르면 정상 국내 결제가 FAILED → "있을 때만" 비교, 구 경로 strict 비교 선례(`payments.js:978-987`), 단독 revert. C7: 공유 모듈 `feedback-notify.js` 에 export 추가(제보 알림 함수 불변), 크론 틱당 조회 2회 + 전달 성공 시 표식 CAS 최대 40회·채널당 HTTP 1회(5초 상한), try/catch 로 크론 본체 격리. C4: prepare 응답·주문 문서 키 1개 추가, 정확 키 단언 경로 미변경. C1·C5: 핀 누락 시 D2 위반.
6. **mock 검증** — 아래 "검증". 실결제·운영 DB 쓰기·과금 LLM 0회.
7. **롤백** — 커밋별 `git revert <sha>`. 새 필드(`foreignCard`·`policyVersions`·`metadata.fulfillment*`·`storeIdCheck`)는 판정에 읽히지 않거나 표식뿐이라 데이터 정리 불필요. C5 revert 는 "항상 전송"(현 운영 동작)으로 돌아가 D2 를 다시 위반하므로 국내 결제 장애 때만 쓰고 그 외엔 전진 수정. C8 revert = 비교 블록 제거.

### 검증 (전부 mock)
- 커밋마다 `npm run check:fast` + 해당 명령(아래 npm 스크립트·`scripts/run-paid-gate-suite.mjs` 전부 존재 확인 09-17):
  - C1 `verify:payment-copy-dictionary`·`verify:overseas-payment-notice`·`i18n:check`·`verify:public-parity` + checkout-entry jest
  - C2 `test:worker:auth-payments`·`test:gifts:replica`·`verify:worker-security-guards`
  - C3 `verify:env-parity`·`verify:worker-config-parity`·`test:worker:auth-payments`
  - C4 `test:worker:auth-payments`·`test:gifts:replica`·`check:payment`
  - C5 `verify:portone-single-payment`·`verify:payment-freeze`·`typecheck`·`verify:public-parity`·`verify:js-module-graph`·`check:critical`·`verify:paid-gate-ui`·`verify:payment-choice-parity`·`verify:payment-choice-single-instance` + checkout-entry jest
  - C6~C8 `test:worker:auth-payments`·`verify:payment-reconcile`·`verify:payment-concurrency-guards`
- 마지막 1회: `verify:billing-pass-policy`·`verify:payment-legal-copy`·`node scripts/run-paid-gate-suite.mjs`·`npx --no-install jest __tests__/worker/payments-v2 __tests__/billing/checkout-entry.test.js`.
- **가드가 무는지 변이 확인(확인 후 되돌림)**: `portoneBypass()` 무인자에서 파라미터 반환 → C5 가드·jest 실패해야 함 / en.json 에 브랜드명 복원 → C1 가드 실패 / 알림 모듈이 `TELEGRAM_CHAT_ID` 사용 → C7 테스트 실패 / 정책 표에 없는 유형 offered → C3 테스트 실패.
- 사용자 수동(선택, **결제 완료 금지**): 스테이징 모바일에서 위 결제창들이 열리고 해외카드 탭이 없는지, 비한국어 로케일 고지가 "준비 중"인지.
- mock 불가 → 08 에 NOT TESTED: 실제 해외카드 승인·3DS·BIN, 실기기·인앱 복귀, 실결제창 취소 코드, 실웹훅 간격, 카드사 환율, 메일·웹훅 실도달, 운영 알림 채널 설정.

### 문서 계획 (`docs/payment/inicis-overseas-card/`)
- 형식: H1 + "현재 상태: … 완료 보고가 아니다"(`docs/payments/payment-p0-incident-20260909.md:3` 관례). 본문 항목 상태는 READY / NOT READY, 최종 판정은 READY · OWNER INPUT REQUIRED · PG APPROVAL REQUIRED · LEGAL REVIEW REQUIRED. 시크릿·MID·사업자번호 **값** 금지(상수 위치만, `lib/site-policy-config.js` BUSINESS_IDENTITY).
- `01-current-payment-architecture` 부록 A·B 사실 · `02-overseas-card-implementation` 정책 표·판정 흐름·강제선·한계·플래그 ON 선결 조건 · `03-overseas-card-product-scope` 자격 표·가격 통계(부록 D)·30일·선물 1년·실물/배송 없음 · `04-customer-authentication` 이메일+비번·OAuth 필드·**본인인증 없음**·C2 테스트 근거·국내 휴대폰 필수 NOT READY · `05-fulfillment-and-evidence` PAID≠지급·재지급·C7 알림·스냅숏/정책 버전/storeIdCheck·카드번호·CVC 미저장·상품별 생성 실패 처리(2026-09-18 vedic·ziwei 카드 자동환불 배선 완료, C7 알림 채널 운영 설정은 오너 확인으로 해소 — 이메일 `admin@code-destiny.com`, Discord·Slack 미사용) · `06-customer-support-and-incident-response` 이메일 1채널·없는 24시간/전화 미기재·담당자·온콜 OWNER INPUT·Sentry 없음 · `07-personal-data-inventory` 수집 항목·PG 전송·로그 마스킹·방침 공백 LEGAL REVIEW REQUIRED · `08-test-results` 명령·출력·NOT TESTED · `09-inicis-application-facts` 13문항 답·운영 URL 만·스테이징 제출 금지·예상 거래액 `UNKNOWN — OWNER INPUT REQUIRED`.

### 플래그 ON 선결 조건 (문서 02·09 체크리스트)
PG 승인 확인 → 운영 바인딩 1자리 확보(F9) → 승인 범위 기준 고지 문구 재작성 + C1 브랜드 부재 가드 해제 → dp 핀 회전(동결 절차) → 국내 휴대폰 필수 해소(PG 필드 요건 확인) → ~~vedic·ziwei 생성 실패 환불/알림~~(완료, 2026-09-18) → ~~D4 알림 채널 운영 설정 확인~~(완료, 2026-09-18: 이메일 `admin@code-destiny.com`, Discord·Slack 미사용은 오너 결정) → V2 레이트리밋 결정 → 앱(Capacitor) 결제 경로에서 판정·파라미터 동작 확인(선물은 `X-CD-App` 차단 `gifts.js:57`, 해외카드 판정엔 앱 구분 없음) → 스테이징 확인 후 운영 1회 승인.

### 2·3단계로 넘기는 것
- 2단계(UI): 결제창 약관·환불·개인정보 링크와 영문 결제 문의 진입점은 2026-09-18 에 완료했다([2단계 인수인계](inicis-overseas-card-phase2-20260918.md)). **남은 것** — 영문 결제정보(이용권 모달 `PointsClient.tsx:4829-4874`·영냥이 `CheckoutClient.tsx:194-226`·선물 안내 한국어 하드코딩, 7개 로케일 `payment.directModal` 영어), 서버측 환불 동의 기록.
- 3단계(법무): 처리방침 국외이전·보호책임자·수탁사 누락, 영문 법무 시행일 낡음(`lib/legal/legalContent.ts`), 영문 환불정책, 09 갱신 — LEGAL REVIEW REQUIRED.

### 범위 밖 결함 (보고만)
탈퇴·비활성 계정 JWT 미검사(`worker/lib/auth.js:646-667`) · 웹훅 Failed/Cancelled 재조회 없음 · V2 `paid` 셀프 취소 400·7일 검사 없음 · 크론 실패 알림 공개 채널(`cron-failure-alert.js:39`) · 재지급 기아(`reconcile.js:56,74`) · reconcile 로그 전체 orderId(:69) · `payment-refund.js:401-419` userId 원문 로그 · 자동환불 V2 CAS 우회(:421-512) · 웹훅 10회 실패·`refund_failed` 무알림 · 결제 실패·웹훅 로그 원시 IP/UA TTL 없음(`models.js:551-552,579-580`) · `fortune.js:6040` "1~12개월" 낡은 문구 · 제보 알림 env 3종 env 계약 미등록 · `verify:doc-freshness` 2026-09-27 실패 예정.

### 재사용할 기존 구현
`deriveOrderId`(`orders.js:84-89`) · `createPayableOrder`/`createPayablePassOrder` · `toLegacyPrepareOrder`(`compat.js:94`) · 미지급 조건 `reconcile.js:46-49` · `maskId`(`worker/payments/log.js:13-17`) · 전달 후 CAS(`receipt-email.js:46-50`)·타임아웃(`:65-74`) · `WEBHOOK_CHANNELS`/`postWebhook`/`sendEmail`(`worker/lib/feedback-notify.js`, `worker/lib/resend.js`) · `getEnv`(`worker/lib/env.js`) · 플래그 관례 `GIFTS_ENABLED`(`gifts.js:56-60`) · env 계약 형식 `ACCESS_STATE_ENABLED`(`env.contract.json:142`) · 결제 테스트 목 `__tests__/fixtures/fake-payment-db.mjs` · 알림 HTML 이스케이프 `escapeHtml`(`feedback-notify.js:18`, 모듈 내부) · 커밋 되돌림 대상 원점 `4c6a9f965`(#1387, 해외카드 파라미터 배선).

### 전달 방식
1. 승인 직후 이 세션: `docs/handoff/inicis-overseas-card-phase1.md`(이 계획 전문) 작성 → **그 파일만** 커밋. 컨텍스트 125k+ 라 구현은 새 세션.
2. 새 세션 첫 문장: "`docs/handoff/inicis-overseas-card-phase1.md` 를 읽고 KG이니시스 해외카드 1단계 C1~C9 를 워크트리에서 순서대로 구현·검증·커밋한 뒤 main 에 머지하고 push 해줘."
3. 새 세션 시작: `git branch --show-current`·`git status`·`git pull --ff-only` → 다른 쓰기 세션이 있으면(09-17 현재 codex 워크트리·main 미커밋 변경 존재) `powershell -File scripts/create-safe-worktree.ps1 -Slug inicis-overseas-card-p1` → `npm run setup:git` → jest 는 `npx --no-install`.
4. 머지 전 main `git status`: `config/payment-freeze.json` 미커밋 변경(F24)이 남아 있으면 fast-forward 가 막히므로 그 변경의 주인(세션·사용자)에게 커밋 요청 — 공유 체크아웃에서 reset·stash·checkout 금지. 머지 후 `npm run sync:public` 재실행, 변경 있으면 커밋.
5. push 후 `CI required` 통과까지. 스테이징 검증은 선택, 운영 승격은 별도 1회 승인.

## 부록 — 실측 근거 (문서 01~09 작성 때 인용)

### §0 현황표 (13문항 + 핵심 축) — 위험도 🔴 높음·🟠 중간·🟢 낮음

| 항목 | 현재 상태 | 심사 위험도 | 필요한 수정 | 수정 파일 |
|---|---|---|---|---|
| 1 판매상품 | 디지털 콘텐츠만: 단건 171종(이용권 제외) + 이용권 4등급(30일) + 선물(이용권, 코드 기본 OFF). 실물 없음 | 🟠 운세 = PG 위험업종, 선물 = 양도 가능 선불 | 자격 표로 대상 명시 + 문서화 | 신규 정책 모듈, 문서 03 |
| 2 판매객단가 | 단건 171종 최저 ₩1,000·최고 ₩30,000·중앙 ₩5,000·평균 ₩9,392 / 이용권 포함 175종 최고 ₩149,000·평균 ₩10,593(09-17 node 실측). 판매 가중 평균 산출 불가(운영 주문 미열람) | 🟢 | 구현 후 `canUseForeignCard` 허용 집합 기준으로 재산출·"가중 불가" 표기 | 문서 03·09 |
| 3 서비스 제공기간 | 단건: 결제 확인 후 즉시 지급·생성(초 단위 보장 없음), 계정 귀속 재열람. 이용권 30일(재구매 연장). 선물 수령 결제+1년 | 🟠 선물 1년 | 사실 문구만 문서화 | 문서 03·05 |
| 4 결제 URL | 운영 `https://code-destiny.com` 무접두 경로. 스테이징은 청구액 치환 | 🟠 스테이징 오제출 | 운영 URL 목록 + 스테이징 제출 금지 명시 | 문서 09 |
| 5 내·외국인 해외카드 구분 | **서버 판정 없음.** 클라이언트가 이니시스 카드 결제에 `global_visa3d=Y` 를 항상 붙임. 국적 추정 없음(유지) | 🔴 | 서버 정책 함수 + 판정 전달 + 판정 없으면 미전송(fail-closed) | 정책 모듈, `worker/payments/index.js`·`orders.js`, `js/core/checkout-entry.js`, 호출부 3곳, 가드 2개 |
| 6 비회원 주문 차단 | 모든 주문 생성·확정 JWT 필수, 게스트 경로 없음(실측). 회귀 테스트 없음. 탈퇴 계정 JWT 미검사(범위 밖) | 🟢 구현 / 🟠 증명 부재 | 라우트 전수 401 회귀 테스트 | `__tests__/worker/` 신규 1개 |
| 7 가입 인증 방식 | 이메일+비밀번호(소유 확인 없음, 국내 휴대폰 필수) / Google·Naver·Kakao OAuth. 본인인증 없음 | 🟠 | "본인인증" 표현 없이 사실 기재 | 문서 04 |
| 8 해외고객 CS | 이메일 1채널, `/en/contact` 있음, 영문 결제·환불 문의 진입점·응답기한 없음 | 🟠 | 2단계(UI). 이번엔 NOT READY 표기 | 문서 06 |
| 9 사고대응 담당자 | 담당자·온콜 문서 없음. **결제 알림 0**, Sentry 없음 | 🔴 | 결제 후 미이행 감지·알림 + 담당자 OWNER INPUT | 크론 연결부, 알림 모듈, 문서 06 |
| 10 실물 해외배송 | 없음 | 🟢 | 배송 필드 만들지 않음 | 문서 03 |
| 11 배송추적 | 해당 없음 | 🟢 | — | 문서 03 |
| 12 개인정보 수집 범위 | 새 수집 없음. 결제 요청에 이름·이메일·국내번호만. 처리방침 국외이전·보호책임자 조항 없음, 영문판 낡음 | 🔴 방침 / 🟢 수집 | 인벤토리 문서 + LEGAL REVIEW REQUIRED(3단계) | 문서 07 |
| 13 해외카드 예상 거래금액 | 국가·로케일 저장 없음 → 근거 데이터 없음 | 🟢(정직 표기) | OWNER INPUT REQUIRED | 문서 09 |
| P0 결제창 고지 | 승인 전인데 11개 로케일이 "International cards … are accepted" 단정, 운영 서빙 중 | 🔴 | "준비 중" 문구로 교체 | `public/i18n/*.json` 11개 + ko 폴백 2곳 |
| 국내 휴대폰 필수 | 국내 번호 없는 해외 고객은 첫 카드결제 전 모달에서 막힘 | 🔴 | 이번 범위 밖(PG 필드 요건 확인 필요한 별도 RED) — NOT READY 표기 | 문서 04·09 |
| 결제 후 미이행 | 지급 실패 = `GRANT_PENDING`+크론 재지급(알림 없음). vedic·ziwei 생성 실패는 2026-09-18부로 카드 자동환불 배선 완료(astrology 와 동일 패턴) | 🔴 | C7 감지·알림(자동 환불 신설 없음)은 여전히 과제. C7 알림 채널 운영 설정은 2026-09-18 오너 확인으로 해소(이메일 `admin@code-destiny.com`, Discord·Slack 은 미사용) | `reconcile.js`·`fulfillment-alert.js`·`feedback-notify.js`, 문서 05·06 |
| 사기 방지 | V2 prepare·confirm 레이트리밋·반복 실패 탐지 없음 | 🟠 | 이번 범위 밖 — 문서 NOT READY + 플래그 ON 선결 조건 | 문서 02·05 |
| 통화·MID | KRW 고정 + 확정 시 KRW 대조, MID·키는 시크릿(하드코딩 없음) | 🟢 | 유지 | 문서 02·09 |

### 추가 실측 (18:00~18:15, 메인 세션)

| # | 사실 | 근거 |
|---|---|---|
| F14 | 런타임 bypass 호출부 3곳은 이미 null-safe(`if (bypass) requestData.bypass = …`). `lib/payment/portone.ts:436` 만 무조건 대입이나 **임포터 0**(가드 정본 파일, 런타임 경로 아님) | `index.html:23461-23462`(동결 `_cdRunDirectKrwCheckout` 23178~ 안), `js/destiny-profile.js:5645-5646`(비동결), `app/points/PointsClient.tsx:4549-4550`(비동결), grep `payment/portone` 0건 |
| F15 | 가드는 호출부 **표현식 문자열**을 고정한다: `"directPayFields.channelKeyName ? null : _cdPortoneBypass()"` 외 2개. 인자를 넘기면 마커 갱신 필요(채널 격리 속성은 유지) | `scripts/verify-portone-single-payment-regression.mjs:367-391`, `__tests__/billing/checkout-entry.test.js:517-535` |
| F16 | 고지 빌더 `buildOverseasChargeNoticeHtml({amountKrw, escape})` 는 ko 면 빈 문자열, 그 외 `payment.overseas.approx` + `payment.overseas.chargedInKrw`. 이용권 상점은 **별도 사본** 고지(`PointsClient.tsx:2674-2690`, 같은 키·같은 ko 폴백 단정 문구) | `js/core/checkout-entry.js:436-453`; `verify-overseas-payment-notice.mjs` 는 셸·React·독립 3렌더러만 빌더 호출 강제 |
| F17 | 사용자 노출 "해외카드 가능" 단정은 `payment.overseas.chargedInKrw` 한 키뿐(en.json 전수 grep). 나머지 `해외카드` 매치는 코드 주석 | grep `international\|overseas\|foreign\|visa\|jcb\|diners` en.json; 소스 전수 grep(주석만) |
| F18 | 선물 신규 구매는 **기본 꺼짐** — `GIFTS_ENABLED=1` 이 어느 toml 에도 없고 인덱스 확인 후에만 열린다. 프로덕션 시크릿 설정 여부는 값·목록 미확인 → 문서엔 "코드상 기본 OFF, 운영 활성 여부 OWNER INPUT REQUIRED" | `docs/payment-gifting.md:25-28`, `worker/payments/gifts.js:56-60` |
| F19 | 09-09 기록: "이용권도 자동갱신 없는 일회 구매", PG 담당자에게 "콘텐츠 단건결제 구조"로 문의 발송. → 이용권·선물 포함(D3)은 "자동갱신 없는 1회 결제" 설명과 충돌하지 않는다 | `docs/handoff/global-payment-readiness-20260909.md:15-20` |
| F20 | PortOne 도움말: 승인·정산 KRW, VISA·MASTER·JCB·DINERS, 결제창 언어 ko/en/zh, **결제창 방식만** 가능, 3D 인증. PC/모바일 차이·bypass 파라미터·해외발급 판별 필드는 **미기재** | help.portone.io/content/inicis-international (2026-09-17 WebFetch) |
| F21 | verify 스크립트 배선 확인: `verify:portone-single-payment`·`overseas-payment-notice`·`paid-gate-ui`·`payment-choice-parity`·`billing-pass-policy`·`worker-config-parity`·`payment-freeze`·`payment-choice-single-instance` 존재 | `package.json:200-307` |
| F22 | `checkout-entry.js?v=` 캐시 핀 13곳(index.html·app/layout.js·정적 서비스 HTML 11개) | grep |
| F23 | 이용권 판매는 **30일 단품만**: `resolvePassPlan` 이 `durationMonths !== 1` 이면 null("30일 단품만 판다(구 카탈로그와 동일)"), 구 billing 도 `durationMonths: 1`. 재구매는 `expiresAt` 을 연장(환불 시 되감기). `worker/routes/fortune.js:6040` 의 "1~12개월 달빛 이용권" 안내는 종료된 구 신청 경로의 낡은 문구(범위 밖 보고) | `worker/payments/passes.js:42-52,292-299`, `worker/routes/billing.js:4638`, `worker/lib/payment-refund.js:96-118` |
| F24 | main 체크아웃의 `config/payment-freeze.json` 미커밋 변경 = `worker/routes/billing.js` maxLines 6909→6350(검증기 자동 하향). 커밋된 값은 6909 → 워크트리에서 검증기를 돌리면 같은 diff 가 생김. 머지 때 main 쪽 미커밋 변경이 fast-forward 를 막을 수 있음 | `git diff config/payment-freeze.json` (09-17) |

### 에이전트 C 결과 — 인증·개인정보·CS·사업자 (요약, 원문 file:line 은 에이전트 보고)

- **가입·로그인**: 이메일+비밀번호(`worker/routes/auth.js` handleRegister·handleLogin) / OAuth Google(`openid email profile`)·Naver(`name email`)·Kakao(`profile_nickname account_email`) (`auth.js:1622,1635,1649`; 읽는 필드 `worker/lib/social-profile.js:10-46`) / 앱 전용 WebAuthn 재로그인(가입 수단 아님). **이메일 소유 확인·SMS/OTP·휴대폰 본인인증 전부 없음**(`worker/lib/models.js:51-53` 주석, 공급자 grep 0). `email_verified` 는 기존 계정 자동 연결 때만 검사(`auth.js:1842-1848`). 만 14세 판정은 자기 입력 출생연도.
- 🔴 **해외 이용자 결제 차단 요인**: 이메일 가입은 휴대폰 필수·국내 01X 만(`auth.js:2624-2628`, `worker/lib/validation.js:217,229`). 소셜 가입은 번호 없이 끝나지만 **첫 카드결제 전 결제용 번호 모달이 01X 만 받음**(`/me/payment-phone` `auth.js:3574,3587`; `app/_lib/payment-phone-prompt.ts:41-54`, 한국어 모달). 결제 요청에 구매자 번호 전송(`worker/payments/index.js:245-253`). → **국내 번호 없는 해외 고객은 지금 카드결제를 끝낼 수 없다.** 해외 번호 허용은 PG 필드 요건 확인이 필요한 별도 RED 변경(이번 범위 밖, 문서에 NOT READY + PG 확인 필요로 기재).
- **세션**: JWT 30m·refresh 14d(`worker/lib/auth.js:151,155`), V2 결제 API 는 JWT 필수 → 401 `UNAUTHORIZED`(`worker/payments/index.js:1626-1628`, `errors.js:50`).
- **User 모델**: locale·country·timezone·IP·UA 필드 없음. 동의 버전·시각 `legalConsents`(`models.js:78-89`, 버전 상수 `auth.js:90` "2026-04-11"·`:92` "2026-08-25"). 번호 AES-256-GCM.
- **국가·로케일**: 사용자 locale 미저장, `/api/geo` 호출 프론트 0. `lib/market-policy/market-policy-registry.js` 는 KR 만 켜짐·**런타임 호출자 0**(verify 전용). 문서상 국가 판정 순서: 사용자 선택 → PG 청구국 → 계정 → IP 참고(`docs/INTERNATIONAL_MARKET_LOCALIZATION.md:63-75`).
- **개인정보처리방침**: 한국어 정본 `app/privacy-policy/PrivacyPolicyContent.jsx`(시행 2026-08-25, 위탁 PortOne·KG이니시스 기재, 카드번호 미저장 명시). **국외이전·보호책임자 조항 없음**, 수탁사 누락(카카오페이·Cloudflare·MongoDB·LLM·Resend·GA). 영문판 `lib/legal/legalContent.ts:390-437` 은 시행일 2026-08-19 로 낡고 "mobile required at sign-up"(구 정책). 공개 법무 로케일 en/ja/zh/zh-TW 만.
- **약관·환불**: 한국어 `app/terms-of-service/TermsContent.jsx` §12(7일 철회·제공 전 환불·제공 후 제한·미제공 시 환불·중복결제·3영업일). 영문 `legalContent.ts:87-161`, `app/[locale]/refund-policy/page.js`(약관 재사용, 기계번역 고지, `REFUND_JURISDICTION_NOTES` en/zh null). 영수증 메일 철회 안내 한국어뿐(`worker/payments/receipt-email.js:162`).
- **CS**: 채널은 **이메일 하나**(`lib/site-policy-config.js` `SUPPORT_EMAIL`). `/contact-us` 는 mailto, 응답기한 "영업일 1~3일"은 한국어 페이지만, 결제·환불·미제공 문의 유형 없음. `/en/contact` 존재(:96 "No new response-time or language-support guarantee"). `/feedback` 로그인 필수·결제 문제 카테고리 있음·영어 UI 없음. 피드백 알림 Resend·Discord·Slack(`worker/lib/feedback-notify.js`).
- **사고대응**: 담당자·온콜·유출 대응 문서 없음. 텔레그램(`worker/lib/telegram.js`, `worker/lib/cron-failure-alert.js`)은 크론·SNS 실패만. **결제 장애·웹훅 이상 알림 0건**(worker/payments grep).
- **사업자 정보**: 정본 `lib/site-policy-config.js` `BUSINESS_IDENTITY`(푸터 공개값, CI 가드 `verify-business-identity`), 영문 푸터 `app/components/LocaleFooterHub.jsx` 노출. 문서 09 는 값을 옮겨 적지 않고 상수 위치 + "신청서 값과 일치 여부 OWNER 확인".
- **해외 집계**: payment·User·funnel 에 locale/country 없음 → §31 해외 예상 거래액 근거 데이터 **없음**(OWNER INPUT REQUIRED). GA4 이벤트에도 locale 파라미터 없음.
- 범위 밖 결함(보고만): 카카오 심사 문서와 코드 불일치, auth.js:5007-5015 주석 모순, 탈퇴 후 profileImage 등 잔존, 결제 실패·웹훅 로그 원시 IP/UA TTL 없음(`models.js:551-552,579-580`), 08-28 문서 §10 미성년자 결제 차단 P0 해소 미확인.

### 에이전트 A 결과 — 서버 결제 코어 (요약)

| 축 | 실측 | 근거 |
|---|---|---|
| PG·시크릿 | PortOne V2 REST 직접 호출. env 이름만: `PORTONE_API_SECRET`·`PORTONE_CHANNEL_KEY`·`PORTONE_STORE_ID`·`PORTONE_WEBHOOK_SECRET`·`MID`·`INIsignkey`·`INIAPIKEY`·`INIAPI_IV`·`PORTONE_KAKAOPAY_CHANNEL_KEY`. toml 0건(시크릿 주입) → MID 하드코딩 없음(§24) | `worker/lib/portone.js:5-137,296-306,335-423` |
| 스테이징 차이 | `APP_ENV=staging` + `PAYMENT_TEST_AMOUNT_KRW`(≥1000 이면 청구액 치환), 크론 없음 | `worker/lib/portone.js:49,61-73`, `worker/wrangler.staging.toml:114,130,332` |
| 주문 생성·인증 | 전부 JWT: `POST /api/payments/prepare`·`/api/billing/checkout`(→V2)·V2 `/orders`·이용권 prepare·선물 POST. 구 `routes/payments.js:1843`·`billing.js:5846-5863` 라이브·클라 호출 0. 무인증 = `GET /features`·`/config`·`POST /webhook`·선물 `/preview`·`/context`. **게스트 주문 경로 없음.** JWT 검사는 탈퇴·비활성 미확인 | `worker/index.js:1358-1407`, `worker/payments/index.js:94-97,904-1107,1473,1516-1519,1626-1628`, `worker/lib/auth.js:646-667` |
| 금액·통화 | 서버 상품표 결정, 클라 금액 불일치 400 `CLIENT_AMOUNT_MISMATCH`, 확정 시 재조회로 paymentId·paid·금액·KRW 대조 → 422+FAILED. storeId 대조는 보고에 없음 | `worker/payments/index.js:1030-1046,718-727`, `worker/payments/pg.js:75-135` |
| customer | 이름 없으면 "Code Destiny 고객", 이메일 형식 오류면 `buyer-…@code-destiny.com`, 전화 01x 만(그 외 빈 값). 주소·국가 없음 | `worker/payments/index.js:236-254` |
| DB | `Payment` 에 locale·UA·IP·country·동의 없음. 웹훅 payload TTL 없음. `autoIndex:false`. CF 국가 헤더 제거 | `worker/lib/models.js:296-380,562-587`, `worker/lib/db.js:914`, `worker/index.js:991` |
| 상태·지급 | 문서 단위 CAS, PAID→FAILED 불가, `entitlementGrantedAt` CAS. 지급 실패 = 200 `GRANT_PENDING`+로그, 자동환불 없음. 운영 `*/10` 크론 재지급(백오프)·PENDING 30분 만료. **스테이징은 복구 크론 없음** | `worker/payments/orders.js:13-18,136-479`, `worker/payments/index.js:598-610,761-857,1118-1127,1772-1840`, `worker/payments/reconcile.js:24-137` |
| 웹훅 | HMAC-SHA256·상수시간·24h·{provider,eventId} 유니크·Paid 는 재조회 후 확정·실패 시 재전송+크론 재처리. Failed/Cancelled 는 재조회 없이 반영(범위 밖 보고). 분쟁·차지백 이벤트 없음 | `worker/payments/webhook.js:30-292`, `worker/payments/index.js:1529-1559,1735-1762` |
| 카드 정보 | V2 rawPortOne 요약만(paymentId·status·amount·currency·payMethod·paidAt·receiptUrl). 구 경로는 PortOne 원본 전체 저장. 로그 민감키 제거·ID 뒤 8자 | `worker/payments/pg.js:27-38`, `worker/routes/payments.js:1525,1569,2698`, `worker/payments/log.js:13-26` |
| 환불 | 관리자 전액·부분(감사로그), PG 콘솔 전액취소 웹훅 → 환불·권한 회수. 셀프 취소는 V2 `paid` 주문에 400, 7일 검사 없음(범위 밖 보고) | `worker/routes/admin-orders.js:227-256`, `worker/payments/index.js:169-198`, `worker/routes/payments.js:2398-2597` |
| 알림 | **Sentry 없음.** Telegram 은 일일 크론 실패만, 결제 파일 호출 0 | `worker/lib/telegram.js:53,59`, `worker/lib/cron-failure-alert.js:26-61`, `worker/index.js:2018` |
| 사기 방지 | V2 prepare·confirm 레이트리밋 없음(구 라우터만 `enforceSensitiveEndpointSecurity`). 반복 실패 탐지 없음. orderId=`cd`+sha256(userId:idempotencyKey) 38자, 키 누락 시 `legacy-<UUID>` | `worker/lib/security/index.js:413-452`, `worker/payments/orders.js:84-192`, `worker/payments/index.js:1053-1057`, `worker/payments/gift-routes.js:27-36` |
| 영수증 | 10분 크론, 한·영 병기, 판매자 정보·KRW·약관 §12·환불 링크, 철회 본문만 한국어 | `worker/payments/receipt-email.js`, `lib/legal/refund-policy-rows.js:13-29` |
| 동결 여유 | `worker/routes/billing.js` 6349/6350, `worker/routes/payments.js` 3652/3653 → **두 파일 증가 금지**. worker/payments/ 비동결 | `config/payment-freeze.json:48-58` |

### 에이전트 B 결과 — 클라이언트 결제·복귀·이행·카탈로그 (요약)

| 축 | 실측 | 근거 |
|---|---|---|
| requestPayment | 셸 `index.html:23529`, dp 코어 `js/destiny-profile.js:5706`(App Router 유료 공용), 이용권·선물 `app/points/PointsClient.tsx:4566`, `lib/payment/portone.ts:448`(임포터 0). paymentId=`order.merchantUid`, 금액=`order.paymentAmount`, 통화 KRW. 카카오페이 `kakaopayChannelKey`, 결제수단 표(MOBILE 꺼짐) | `index.html:23388-23435`, `js/destiny-profile.js:5564-5568`, `PointsClient.tsx:4520-4530`, `js/core/checkout-entry.js:598-639` |
| 복귀·재개 | 단건 = 현재 URL+`portone_redirect=1`; 이용권 = `/points`+`portone_subscription_redirect=1`; 선물 = `/gift/complete?orderId=`. localStorage 재개 티켓 30분 + 서버 암호화 resume context(userId:requestId:featureKey, 결제 전 30분·후 7일). pageshow 복구는 destiny-profile 만 | `js/core/checkout-entry.js:1264-1323,1559-1586`, `worker/payments/resume-context.js`, `js/destiny-profile.js:4276-4284,4519,13240-13248`, `PointsClient.tsx:457,4484-4486` |
| 이행 | per_use `grantPurchaseEntitlement`, unlock `grantEntitlement`+`markUserFeatureUnlocked`(계정 귀속 재열람). astrology-ai·vedic-ai·ziwei-ai 생성 실패 → 카드 자동환불(2026-09-18 vedic·ziwei 배선 완료, 환불 시 같은 결제 문서 무료 재시도는 닫힘). fusion 은 같은 requestId 재시도. 결과는 로그인 후 재열람 | `worker/payments/index.js:826-844`, `entitlements.js:172,180`, `worker/lib/payment-refund.js:421-484` |
| 이용권 | standard ₩9,900·premium ₩29,900·vvip ₩59,000·family ₩149,000, 30일 고정, 자동갱신 없음(renew 스텁), 활성화 실패 = 503 재시도. 모달: KRW·30일 안내·환불 동의 체크박스 필수·**본문 한국어 하드코딩** | `lib/payment/pass-pricing.js:17-22`, `worker/payments/passes.js:5-6,52`, `worker/payments/index.js:292-297,492`, `PointsClient.tsx:4829-4874` |
| 선물 | 이용권 4등급만, `GIFTS_ENABLED` 게이트(운영값 미확인), 수령 1년, `/preview`·`/context` 무인증, 안내 한국어 | `lib/payment/gift-policy.js:4`, `worker/payments/gifts.js:39-60`, `worker/payments/gift-routes.js:51-53` |
| 영냥이 | direct_only 28개(₩1,000~₩30,000), 월정석·이용권 불가, 로그인+30회/60초, 동의 체크박스 없음, 한국어 하드코딩 | `worker/lib/paid-feature-registry.js:186-201`, `worker/payments/index.js:1209-1212,1332-1343`, `worker/routes/yeongnyangi.js:39-42`, `CheckoutClient.tsx:194-226` |
| 단건 결제창 | 3렌더러: 상품·금액·비한국어 해외 고지·"one-time card payment"·제공시점. **약관·환불·개인정보 링크·동의 체크박스 없음.** de/es/fr/hi/ms/nl/vi 는 `payment.directModal` 12~13키 영어 | `index.html:21750-21784`, `js/destiny-profile.js:12630-12661`, `app/_lib/billing-client.ts:1294-1338`, `public/i18n/en.json:1869,1915` |
| URL | 운영 `https://code-destiny.com`(API `api.code-destiny.com`·`/api/*`); 스테이징 `https://staging.code-destiny.com`(청구액 치환 → **제출 금지**). 결제 경로 `/points`·`/checkout`·`/astrology-ai`·`/vedic-ai`·`/ziwei-ai`·`/fusion-fortune`·`/yeongnyangi`·`/gift/*` + 정적 HTML 13개. `/en/...` 로케일 경로엔 결제 없음 | 탐색 보고 |
| 카탈로그 | `listBillingFeatures().legacyFeatureTable` 171개(이용권 제외) ₩1,000~₩30,000, unlock 47개 | `worker/lib/billing-feature-registry.js`, `worker/lib/paid-feature-registry.js:24,386-415` |

### 에이전트 D 결과 — 테스트 매핑·가격 통계·문서 가드 (요약)

- **문서 파일명(원문 확인)**: `01-current-payment-architecture` · `02-overseas-card-implementation` · **`03-overseas-card-product-scope`** · `04-customer-authentication` · `05-fulfillment-and-evidence` · `06-customer-support-and-incident-response` · `07-personal-data-inventory` · `08-test-results` · `09-inicis-application-facts` (.md). 01~08 은 원문에 내용 요구 없음(§0~§28 에서 도출), 09 는 템플릿 섹션 있음(신청 정보·상품·객단가 최저/대표/최고/산출근거·제공기간·URL·내외국인·비회원·인증·CS·사고대응·배송·개인정보·예상 거래액 `UNKNOWN — OWNER INPUT REQUIRED`). 원문 §32 F 라벨에 NOT READY 는 없음 → 문서 본문 상태로만 쓰고 최종 판정은 4라벨로.
- **§25 32개 시나리오 중 기존 테스트로 덮임**: 인증(`payments-v2.orders.test.js:93`, `prepare-compat:224`, `context:285`)·금액 변조/통화/없는 상품(`prepare-compat:210,240`, `db-pg:65,84`, `foundation:137-164`)·PG 실패·redirect 누락·새로고침·뒤로가기·웹훅 지연·중복(`webhook.test.js:132-184`, `webhook-events:179,210`, `webhook-replay:117,129`)·LLM 실패 환불(`card-single-payment-auto-refund:175`)·남의 주문(`context:323`, `confirm-compat:122`, `orders:284,369`)·중복 결제(`orders:73,101,155`). **공백** = 해외카드 정책 3종(허용·차단·위조)·미이행 알림·사용자 취소 전용·다른 기기 재열람 명시 테스트.
- **mock 불가(08 에 NOT TESTED)**: 실제 해외카드 승인·3DS, 해외 BIN, 실기기·인앱 브라우저 복귀, 실결제창 취소 코드, PortOne 실웹훅 간격, 카드사 환율, 메일 실도달, 스테이징 정가 승인(청구액 치환 `payments-v2.staging-test-amount.test.js:134`).
- **가격 세부**: per_use 124·unlock 47, 가격대 ₩1,000×6·3,000×26·5,000×63·7,000×1·10,000×47·20,000×11·30,000×17, direct_only 28. 별칭 중복 0, reason·가격 같은 3쌍(`paid-feature-registry.js:276-283`)은 문서에 주석만. 음원 트랙 ₩1,000(`lib/music-access-policy.js:5`)은 표 밖.
- **문서 가드**: 새 docs 프론트매터 불필요(handoff 만), 마크다운 린트 없음, gitleaks 이력 스캔 → 키·MID 값 금지. **결제 변경 커밋은 `docs/PAYMENT_AND_ACCESS.md` 동시 갱신 규칙**(`docs/context/doc-precedence.md:31,37`) → 226행 절에 새 폴더 포인터. `docs/payment/` 단수 경로는 원문 지정이라 그대로. 기존 `lib/market-policy/market-policy-registry.js` `canUseMarketForLivePayment` 는 워커 import 0 → 이번엔 연결 안 하고 02 에 관계만 기록.
- 범위 밖: `verify:doc-freshness` 가 기준 문서 신선도로 2026-09-27 부터 실패 예정(`scripts/verify-doc-freshness.mjs:12-17`).

### 설계 2 결과 — 미이행 알림·증빙·storeId (메인 세션 재검증 반영)

**실측 보강**
- 미이행 = `status:"paid"` + `entitlementGrantedAt` 없음(`worker/lib/models.js:316,364`). 중복 지급 방지 있음(`orders.js:473-479`, `executions.js:59-69`, `gifts.js:61-70`, `entitlements.js:73-153`). 재지급 크론(`reconcile.js:24-137`)은 무제한 재시도·시도 횟수·종결 상태·알림 없음. `/admin/orders` 조회 전용(`admin-orders.js:97-100`).
- 🔴 알림 채널: `sendTelegramMessage` 는 chatId 미지정 시 **공개** `TELEGRAM_CHAT_ID` 로 폴백(`worker/lib/telegram.js:59`) → 결제 알림 금지. 운영자 전용 채널은 `worker/lib/feedback-notify.js` 의 `ADMIN_FEEDBACK_EMAIL`(Resend, :143)·`FEEDBACK_DISCORD_WEBHOOK_URL`(:41)·`FEEDBACK_SLACK_WEBHOOK_URL`(:42)뿐인데 env 계약·toml·시크릿 동기화·docs·테스트 어디에도 없음 → **운영 설정 여부 미확인**. 모듈 관례: 하드코딩 수신 주소 금지(:141)·throw 금지(:6)·fetch 타임아웃 없음. Resend 키 `RESEND_API_KEY|emailapi`(`worker/lib/resend.js:45`), 영수증 메일이 같은 `*/10` 크론에서 동작(`index.js:1803`).
- 생성 실패: astrology(`astrology-ai.js:1506-1544`)에 이어 2026-09-18 vedic(`vedic-ai.js` `refundCardPaymentOnFailure`, catch 배선 :1608-1611)·ziwei(`ziwei-ai.js` `refundCardPaymentOnFailure`, catch 배선 :2541-2545)도 카드 단건 결제 자동환불을 붙였다(`autoRefundSinglePaymentDeliveryFailure` 재사용, astrology 와 같은 트레이드오프로 환불 시 같은 결제 문서 무료 재시도는 닫힘). mock 테스트로 확인: `__tests__/worker/vedic-paid-delivery.test.js`·`__tests__/worker/ziwei-paid-delivery.test.js` 에 카드=환불 호출/비카드(pass·monthly)=미호출 케이스 추가, 커밋 전 `refundCardPaymentOnFailure` 호출을 주석 처리해 새 테스트가 실패하는지 변이 확인 완료. READY.
- 증빙 있음: `merchantUid`=`impUid`(`orders.js:121,207`)·rawPortOne 요약·createdAt/paidAt·실행 상태/resultId(`index.js:888-899`)·가입 동의 `legalConsents`. **없음**: 주문 시점 약관 버전, 서버측 환불 동의(이용권 모달 체크박스는 클라 전용 `PointsClient.tsx:4859`), storeId 대조(`pg.js:94-126`; 구 경로는 strict `payments.js:978-987`).
- 버전 상수: `AUTH_TERMS_VERSION "2026-04-11"`(`auth.js:90`, 비export) = `TERMS_EFFECTIVE_DATE`(`TermsContent.jsx:12`), `AUTH_PRIVACY_VERSION "2026-08-25"`(`auth.js:92`) = `PRIVACY_POLICY_EFFECTIVE_DATE`(수동 동기화 주석 `PrivacyPolicyContent.jsx:12`). 환불정책은 약관 §12.

**설계 확정**
- S1 `reconcile.js:73-75` 재지급 시도마다 `$inc {"metadata.fulfillmentAttempts":1}`(무제한 재시도 유지).
- S2 `alertPaymentAnomalies(db,{notify,now,limit:20})` (`reconcile.js`, 미지급 조건 :46-49 를 `unfulfilledClause()` 로 추출 공유).
  A 미지급: paid·결제 30분+·미지급·(미알림 또는 마지막 24h+ & 7회 미만), paidAt 오름차순.
  B PG 대조 실패: failed·`failureStage:"pg-verify"`(`index.js:725` 만 설정)·30일 내·AMOUNT/CURRENCY/PAYMENT_ID/STORE_ID_MISMATCH, 주문당 1회.
  행 = 주문번호 뒤 8자(`log.js:13-17`)·featureKey·유형·금액·경과·시도·실패 코드. userId·이메일·전화·rawPortOne 제외. 표식(`metadata.fulfillmentAlert{lastAlertedAt,count}`·`metadata.verifyAlert{lastAlertedAt}`)은 **발송 ok 후에만** CAS(`receipt-email.js:46-50` 과 같은 이유).
- S3 신규 `worker/payments/fulfillment-alert.js`: 본문 빌더 + notifier(5초 타임아웃, `receipt-email.js:65-74` 패턴). 채널 미설정이면 fetch 0회·`[pay-alert] unconfigured` 로그·표식 없음. **공개 `TELEGRAM_CHAT_ID` 경로는 어떤 경우에도 타지 않는다(테스트 고정).** 채널 = D4.
- S4 `index.js:1797`(월정석 정리 뒤·영수증 앞) try/catch 호출, 크론 요약에 `alerts`(~7줄). 1틱 메시지 1개·HTTP 1회.
- S5 storeId 대조(**별도 커밋**): `pg.js:76` 설정 객체 사용, :126 뒤에 응답 `storeId` 가 **있을 때만** `PORTONE_STORE_ID` 와 비교 → 불일치 422 `STORE_ID_MISMATCH`(details 에 값 금지 — 시크릿 분류 `env.contract.json:1796-1798`), 없으면 통과하고 `rawPortOne.storeIdCheck:"matched"|"absent"` 기록. `errors.js:100` 코드 추가. 국내 확정 경로를 건드리는 유일한 변경.
- S6 증빙: 주문 생성(`orders.js:150-157`)에 `policyVersions:{terms,privacy}` — 워커 신규 상수 1개 파일, auth.js·JSX 두 곳과 텍스트 대조 테스트로 드리프트 차단(auth.js 무수정). 주석·문서 05 에 "주문 시점 게시 버전, 동의 기록 아님".
- 범위 밖(보고만): 크론 실패 알림 공개 채널(`cron-failure-alert.js:39`), 재지급 기아(`updatedAt` 미갱신·5분 백오프 `reconcile.js:56,74`), reconcile 로그 전체 orderId(:69), `payment-refund.js:401-419` userId 원문 로그, 자동환불 V2 CAS 우회(:421-512), 웹훅 10회 실패·`refund_failed` 무알림, V2 레이트리밋 부재(§17 NOT READY).

원 요청 원문(13문항·§0~§32): 트랜스크립트 `C:\Users\user\.claude\projects\d--Development-code-destiny\24f3649a-4df3-4a0e-9fa6-863538208a03.jsonl` 첫 사용자 메시지.
