# 10. 법률 검토 질의서 — 3단계(LEGAL REVIEW REQUIRED)

현재 상태: 이 문서는 법적 판정을 내리지 않는다. [07 개인정보](07-personal-data-inventory.md)·[09 신청 사실](09-inicis-application-facts.md)이 코드로 확인한 사실과 그 사실이 만드는 미해결 질문을 정리해, 법무 검토자(사내 담당자 또는 외부 자문)에게 그대로 넘길 수 있는 형태로 묶은 것이다. 여기 적힌 "권고"는 없다 — 각 항목은 사실 1개 + 그 사실이 여는 질문 1개다.

- 측정일: 2026-09-18. 근거 파일·줄번호는 이 시점 main 기준.
- 관련 문서: [07 개인정보](07-personal-data-inventory.md) §4·§5·§6, [09 신청 사실](09-inicis-application-facts.md) §7·§8
- 이 문서가 다루지 않는 것: 사업자 정보·MID 일치, 예상 해외 거래금액, 사고 대응 담당자 지정 — [09](09-inicis-application-facts.md) §8의 OWNER INPUT REQUIRED 항목이며 운영자가 채운다.

## 1. 개인정보처리방침 — 국외 이전

**사실**: 한국어 정본(`app/privacy-policy/PrivacyPolicyContent.jsx`, 시행일 2026-08-25)에 "국외 이전"·"국외이전"·"국외로 이전" 문구가 0건이다. 방침에 없는 처리자 후보로 카카오페이(결제 채널), Google Gemini(LLM, 운세 프롬프트에 출생 정보 포함 — `worker/lib/astrology-ai-prompt.js:120-128`), Cloudflare Workers AI(LLM 폴백), MongoDB(호스팅 리전 미확인), Resend(메일 발송), Google Analytics(gtag)가 코드에서 확인된다. ([07](07-personal-data-inventory.md) §4)

**질문**: 위 처리자 중 무엇이 개인정보보호법상 "위탁"·"제3자 제공"·"국외 이전"에 해당하는가. 국외 이전에 해당하는 항목이 있다면 방침에 이전받는 자·목적·항목·보유기간을 명시해야 하는가, 그리고 MongoDB 호스팅 리전을 먼저 확인해야 판단 가능한가.

## 2. 개인정보처리방침 — 보호책임자

**사실**: "보호책임자"·"책임자" 문구가 정본에 0건이다. "12. 개인정보 문의" 절(`:203`)은 있으나 담당자 성명·직책·연락처를 특정하지 않는다. ([07](07-personal-data-inventory.md) §4)

**질문**: 개인정보 보호책임자 지정·명시가 현재 규모(회원 수·처리 항목)에서 법정 의무인지, 의무라면 방침에 어떤 형식(성명/직책/부서, 연락처)으로 넣어야 하는지.

## 3. 번역 처리방침 — 시행일·내용 불일치

**사실**: 번역본(en·ja·zh·zh-TW, `lib/legal/legalContent.ts:391,398,439,487,535`) 시행일이 2026-08-19로 한국어 정본(2026-08-25)보다 오래됐다. 영문판은 "Your mobile number is a required field at sign-up"이라 적어, 가입 경로별로 휴대폰 수집 시점을 나눈 한국어 정본과 내용이 다르다. ([07](07-personal-data-inventory.md) §5)

**질문**: 번역본을 한국어 정본과 같은 시행일·같은 내용으로 맞추는 것이 규정 준수를 위해 필요한 절차인지(단순 오역 수정이 아니라 시행일 표기 자체가 법적 의미를 갖는지), 번역 갱신 전에 해외 결제를 여는 것이 문제가 되는지.

## 4. 영문 환불정책·청약철회 안내

**사실**: 구매 확인 메일의 청약철회 안내는 제목과 전문 링크 줄만 한·영 병기이고 본문 문장은 한국어 정본 그대로다(`worker/payments/receipt-email.js:161-166`, `lib/legal/refund-policy-rows.js`). 환불정책은 이용약관 §12에 있고, 서버에 남기는 환불 동의 기록(`worker/payments/policy-versions.js` `buildRefundConsentRecord`)의 `termsVersion`도 이 §12의 시행일을 가리킨다. ([07](07-personal-data-inventory.md) §5, [05](05-fulfillment-and-evidence.md) §4)

**질문**: 해외 고객에게 전자상거래법상 청약철회 고지를 본문까지 완전한 영문으로 제공해야 하는지, 아니면 현재처럼 제목·링크만 병기하고 본문은 링크된 정책 페이지(번역본)로 안내하는 방식으로 충분한지. 충분하지 않다면 메일 본문 자체를 다국어화해야 하는가.

## 5. 참고용 — 이미 READY로 확인된 사실 (재확인 목적)

법적 판정과 무관하게 사실관계 자체는 코드로 확인됐다. 검토 중 전제로 삼아도 되는 사실이다.

| 사실 | 근거 |
|---|---|
| 카드번호·CVC·유효기간을 저장하는 필드가 없다 | `worker/lib/models.js:39-122` 필드 전수, [07](07-personal-data-inventory.md) §1 |
| 결제창에 주소·국가·배송 정보를 넘기지 않는다(디지털 콘텐츠) | `lib/payment/portone.ts`·`app/points/PointsClient.tsx` 전수 grep, [07](07-personal-data-inventory.md) §2 |
| 결제 위탁사(포트원·KG이니시스)는 이미 방침에 명시돼 있다 | `app/privacy-policy/PrivacyPolicyContent.jsx:112,115` |
| 구 결제 경로 로그에 원문 IP·UA가 TTL 없이 남는다(범위 밖 결함, 별도 트랙) | `worker/routes/payments.js:554,609`, [07](07-personal-data-inventory.md) §3 — 이 문서 §1의 국외 이전 판단과는 별개 사안이다 |

## 6. 검토 후 처리 순서

1. 위 1~4에 대한 법률 의견을 받는다.
2. 방침·번역본·메일 본문 수정이 필요하면 각각 별도 변경으로 다룬다(코딩 원칙: 삭제·리네임은 별도 변경, 문안 수정도 결제 임계 문서라 동결 절차 대상일 수 있다 — `docs/context/payment-gating.md` 확인).
3. 수정 후 [09 신청 사실](09-inicis-application-facts.md) 8번·12번 문항과 §7·§8 판정표를 갱신한다.
4. `FOREIGN_CARD_ENABLED`를 켜는 것은 이 3단계와 무관하게 [02](02-overseas-card-implementation.md) §7 체크리스트 10개 + PG 승인이 모두 끝난 뒤에만, 별도 1회 승인으로 진행한다.
