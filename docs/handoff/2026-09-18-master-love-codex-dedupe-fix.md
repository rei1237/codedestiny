---
status: active
updated: 2026-09-20
next: "인연의 서 항목(작업 1·2)은 [2026-09-19-master-love-codex-partial-chapters.md](2026-09-19-master-love-codex-partial-chapters.md) 로 닫혔다 — 앞구간 절단과 한 장 소진 영구 정지를 수정해 운영(bd144f4e64a4)까지 승격했다. 여기 남은 것은 **③카카오페이 대기 문구 변경을 사용자가 모바일 실기기에서 확인** 하나다."
---

# 인연의 서 2장 이후 미생성 수정 · 카카오페이 대기 안내 정정 인수인계

이전 작업: [2026-09-17-master-love-codex-chapter1-only.md](2026-09-17-master-love-codex-chapter1-only.md).
이번 작업 결과는 `main` `b6149bab1`(머지 커밋)에 있다. 운영 승격은 하지 않았다.

## 무엇이 문제였나 (코드로 확인, 운영 DB 미조회)

`runCodexWaveInternal`은 웨이브마다 4장을 병렬로 쓰고, 앞 장과 겹치는 문장을 `dedupeChapterAgainst`로 잘라낸 뒤 다시 판정했다. 두 가지가 어긋나 있었다.

1. **중복 판정 키 불일치.** `dedupeCodexBody`는 문장마다 `paidReportBody`를 적용했는데, 이 함수는 `제N장…`·`1. …`로 시작하는 70자 이하 줄을 제목으로 보고 지운다 → 그런 문장은 키가 비어 **제거되지 않았다**. 반면 `hasRepeatedReportPassage`는 같은 문장을 반복으로 **잡았다**. 몇 번을 다시 써도 불합격이다.
2. **하한이 중복 제거 후 본문에 적용.** 실측 출력이 minChars의 76~110%라, 공통 근거 문장 몇 개만 잘려도 `codexChapterFloor`(×0.7) 아래로 떨어졌다.

두 경로 모두 `errors[장].code = LLM_OUTPUT_REPEATED`로 시도를 소모하고, 3회째에 `generation_failed + reviewRequired`가 된다. 락(`acquireBatchLock`)·크론 필터·클라이언트(`retryable:false`)가 모두 이 상태를 건너뛰므로 **영구 정지**였고, 화면은 1장부터 빈틈 없는 구간만 보여 주므로 2장이 막히면 3장 이후가 저장돼도 보이지 않았다.

## 이번에 한 것

| 커밋 | 내용 |
| --- | --- |
| `6a3cbe2de` | `reportSentenceKey`(paid-report-quality.js)를 만들어 `dedupeCodexBody`와 `hasRepeatedReportPassage`가 **같은 문장 키**를 쓰게 했다. 중복 제거 후 본문은 `codexDedupedChapterFloor`(minChars×0.5)로 판정하고, 모델 원문은 기존 `codexChapterFloor`(×0.7)를 계속 요구한다. 제거 뒤에도 반복이 남으면 지금처럼 실패(fail-closed). 재현 테스트 2건 + 단위 테스트 2건. |
| `4e589d650` | 10분 크론(`runMasterLoveCodexRecovery`)이 이 버그로 닫힌 세션을 **1회** 자동 재개한다. 조건: `generation_failed` + `GENERATION_BUDGET_EXCEEDED` + 소진된 장의 마지막 오류가 **전부** `LLM_OUTPUT_REPEATED` + 환급 없음 + `deliveryMeta.dedupeReopenedAt` 없음. 틱당 최대 3건, 조건부 원자 갱신으로 해당 장 `attempts`·`failures`·`errors`를 지우고 `reviewRequired:false`, `status:"generating"`, `dedupeReopenedAt` 표식을 남긴다(무한 재개 방지). `updatedAt`은 건드리지 않아 같은 틱에 바로 회수된다. |
| `1ee633c6a` | 결제 대기 안내가 사실과 다른 자동 복귀를 약속하지 않게 정정. KAKAOPAY "카카오톡에서 결제를 승인한 뒤, 이 브라우저로 돌아오면 자동으로 이어집니다.", CARD "카드사·간편결제 앱에서 인증을 마친 뒤 …". ko·en·ja·zh-CN·zh-TW 저작(`i18n/authored/paymentWait-01.json`), 나머지 7개 로케일은 영어 복사, `i18n-merge-authored --core`로 사전 병합, `sync:public` 미러. |
| `b7c2eb3a7` | `checkout-entry.js` 변경에 따라 독립 정적 페이지 24개 + `app/layout.js`의 런타임 캐시 핀을 `build-1a5b15f0b71b`로 갱신(verify:payment-choice-parity 요구), layout 변경으로 무효화된 sitemap lastmod 원장 재생성. |

## 검증 (전부 실행·통과)

- `npx jest --runInBand __tests__/worker/master-love-codex __tests__/worker/saju-paid-delivery-recovery` → 212 passed
- `node --test __tests__/ui/{new-year,ziwei-deep}-paid-delivery.behavior.test.js __tests__/ui/paid-report-*.behavior.test.js __tests__/ui/master-love-codex-*.test.js` → 94 passed
- `npm run check:fast` → exit 0 (jest 277 suites / 3890 tests, paid-gate-suite 포함)
- `npm run verify:payment-choice-parity`, `verify:payment-copy-dictionary` → PASS
- 머지 후 `sync:public` 재실행, 미러 드리프트 0
- 과금 LLM 호출·운영 DB 조회·실결제 **0건**. 재현은 전부 mock provider.

재현 테스트는 수정 전 코드에서 `reviewRequired:true`로 실패하는 것을 먼저 확인한 뒤 기대값을 바꿨다.

## 카카오페이 — 고치지 못하는 부분

모바일 일반 브라우저에서 카카오톡 앱 승인 뒤 브라우저로 **자동 복귀시키는 것은 웹에서 불가능**하다(카카오톡·OS 층). PortOne `appScheme`은 자체 네이티브 앱 웹뷰 전용이라 해당 없고, `windowType` 등 PG 파라미터는 과거 결제창 미표시 회귀 때문에 손대지 않았다. 복귀 뒤 이어받기(재개 티켓·주문 폴링·visibilitychange 재개)는 이미 갖춰져 있어, 이번에는 **안내 문구를 사실에 맞게** 바꾼 것이 전부다. 사용자 실기기 확인이 필요하다.

## 남은 위험

- 중복 제거 후 하한이 minChars×0.5로 낮아져, 공통 문장이 많은 장은 이전보다 짧게 전달될 수 있다. 모델 원문 하한(×0.7)과 `assertCodexChapterQuality`는 그대로다.
- 크론 재개는 세션당 1회뿐이다. 재개 후에도 3회를 소진하면 다시 `reviewRequired`로 닫히고, 그때는 사람이 봐야 한다(`reviewNeeded` 카운터가 크론 로그에 찍힌다).
- 운영 데이터로 원인을 확인하지 않았다. 코드 경로와 mock 재현으로만 특정했으므로, 운영에서 여전히 멈추면 다른 원인(웨이브 타임아웃·근거 계약)일 수 있다.

## 범위 밖 (보고만, 미착수)

- `CodexSeal` 하단 CTA → 내 서재 교체(이전 인수인계 작업 2).
- 결제 복귀 URL에 이전 `paymentId` 쿼리·`#fragment`가 남은 채 다음 `redirectUrl`이 만들어질 가능성(추정, 미검증).
- 셸(`index.html`)은 PC에서 결제창을 열 때 주문 폴링을 시작하지 않는다(결제 동결 함수).
- 전용 카카오페이 채널 타일의 운영 활성 여부 미확인.
- `config/payment-freeze.json`의 `worker/routes/billing.js` `maxLines`를 6909 → 6350으로 낮추는 로컬 변경이 검사 실행마다 되살아난다. 이번 작업에서는 매번 되돌렸고 커밋하지 않았다(다른 세션의 미커밋 변경으로 보인다).
