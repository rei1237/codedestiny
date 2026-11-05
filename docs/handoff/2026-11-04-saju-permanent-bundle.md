---
status: active
updated: 2026-11-06
next: 패밀리 기존 구매자 적용, 공지·시행일, 상품명 확정 및 Play 등록 확인 후 재승격 게이트를 재측정한다.
---

# 사주 영구 묶음 (무료 만세력 + 29,000원 평생 소장)

## 왜

사주를 만세력 무료와 유료 묶음 하나로 정리했다. `saju_lifetime_bundle`(사주 전체 풀이 평생 소장)은 29,000원, 290코인, 앱 SKU `cd_content_tier_19`인 출생 기반 영구 해금이다. 상품 규칙과 키 목록은 `docs/context/payment-gating.md`의 "2026-11-04 사주 영구 묶음"과 `worker/lib/saju-bundle-policy.js`가 정본이다.

## 지금 상태

- Task 1~7 구현, 최종 리뷰 수정, main 재통합이 브랜치 `wt/saju-permanent-bundle-20261104`에 커밋되어 있다. main push와 프로덕션 승격은 아직 하지 않았다.
- 통합 기준점은 머지 커밋 `d55298499`(부모 `377413e52`, `2a3293fd0`)다. 그 뒤 origin/main이 더 앞서 갔다면 push 전에 다시 합친다. 충돌은 `config/sitemap-lastmod.json`, `vedic-astrology.html`, `public/vedic-astrology.html` 세 파일이었고, main 쪽을 받은 뒤 `npm run sitemap:generate`로 다시 만들었다.
- 되돌리기: 통합 뒤 묶음 변경을 `git revert`한다. 이미 산 묶음 권리 행은 남으므로, 판매만 멈출 때와 권리까지 다룰 때를 나눠 사용자에게 먼저 묻는다.

## 사람이 직접 할 일

### Play Console `cd_content_tier_19` 등록

`docs/pricing/PLAY_CONSOLE_TASKS.md`와 `docs/play-console-submission-values.md`를 따른다. 등록 전까지 앱에서 이 상품만 503(티어 미등록)으로 막힌다. 웹 결제는 영향이 없다. 폐기 SKU는 재사용하지 않는다.

앱 사용자는 이 등록 전까지 개별 판매가 닫힌 키도 묶음도 살 수 없으므로, **프로덕션 승격 전에 등록을 끝내는 편이 맞다.** 순서가 바뀌면 그동안 앱 안에서 사주 유료 풀이 판매가 멈춘다.

## 알려진 한계

### 공개 JS로 볼 수 있는 내용

서버 배달로 옮긴 것은 원국 풀이와 대운 등 묶음 본문이다. 아래는 브라우저 계산이나 공개 파일로 남아, 코드를 뜯으면 결제 없이 볼 수 있다. 화면 잠금은 있지만 기술적 차단은 아니다.

- 뇌구조: 브라우저 계산 카드와 `hd-copy.generated.js`(휴먼 디자인 해석 문구)
- 재미 콘텐츠: 로또 리포트, 테토·에겐 등 브라우저 계산 카드
- 일반 문장: `sajuElementReading` 3문장, `public/i18n`의 `sajuReading` 원소 단위 문장

매출에 영향이 보이면 서버 배달로 옮기는 후속 작업을 잡는다.

### 균일가와 합칠 때

이 통합 시점 main에는 `worker/lib/light-fortune-catalog.js`가 없어 교집합을 확인하지 못했다. 균일가를 합치는 사람은 `light-fortune-catalog`와 `SAJU_BUNDLE_SALE_CLOSED_KEYS`의 교집합이 비어 있는지 먼저 확인한다. 비어 있지 않으면 합치지 말고 멈춰서 사용자에게 보고한다.

## 승격 후 2주 지표

승격 직전 2주를 기준선으로 잡는다. 아래 기준값은 구현 쪽 제안이고 사용자가 확정하지 않았다.

| 지표 | 보는 것 | 되돌림 검토 기준(제안) |
| --- | --- | --- |
| `/saju` 유입 | 세션 수 | 기준선 대비 30% 이상 감소가 7일 지속 |
| 결과 이탈 | 무료 결과 화면에서 다음 행동 없이 떠난 비율 | 기준선 대비 10%포인트 이상 악화 |
| 묶음 구매 | 구매 수, 결과 화면 대비 구매 전환 | 2주 누적 구매가 0건에 가까움 |
| 매출 | 사주 관련 합계(묶음 + 상담 등 회당 상품) | 2주 합계가 기준선보다 30% 이상 감소 |

- 판매 차단 오류(409 `PRODUCT_SALE_ENDED` 뒤 묶음 안내가 안 열림, 묶음 결제 후 본문 미표시)는 수치와 상관없이 즉시 확인한다.
- 되돌림은 사용자 결정이다. 기준에 닿으면 수치와 함께 보고한다.

## 검증에서 남은 것

- `scripts/verify-saju-reading-personas.mjs`: `public/`을 직접 띄우고 `/api/*`와 Swiss 요청을 막아 실제 해금 함수로 확인한다. 360·390·430·1440 모두 통과. 1440에서 `/js/swisseph-loader.js` 요청이 한 번 나오지만 막혀 실행되지 않으며, 누가 요청하는지는 추적하지 못했다.
- `scripts/design/verify-compact-home.cjs`: 새 플래그 `--bundle-only`로 묶음 단정만 보면 통과한다. 인자 없이 돌리면 `image too small 360`(`.cd-concern__card-media` 폭 130 미만)에서 실패한다. 홈 개편 후의 디자인 단정이고 묶음과 무관하며 약화하지 않았다. 이 단계 뒤 홈 디자인 단정은 미검증이다. 이 가드의 묶음 단정은 표시 전용 고정값이라 `isTileKeyUnlocked` 덮어쓰기를 그대로 쓴다.
- `scripts/design/verify-destiny-anatomy-browser.cjs`: 저장 프로필과 실제 해금 함수로 연다. 20케이스, defects·errors 없음.
- `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`, `yeongnyangi-consultation-kinds.test.mjs`, `__tests__/worker/saju-section.test.js`: 로컬에서 판정하지 않았다. 정적 import 그래프가 Swiss에 닿거나 스텁 없이 불러올 수 있어 CI에 맡긴다.
- 실결제 흐름은 운영에서 확인한 적 없다. 서버 권리 판정은 워커 테스트가 맡는다.
- 자미·서양 차트는 브라우저에서 모달을 열어 보지 않았다(Swiss WASM 실행 가능성). 판매 종료 키에 차트 키가 없다는 것과 Next 경로 응답까지 확인했다.

## 승격 전 결정 필요

- **React 유료 경로의 런타임 고정값:** `app/_lib/billing-client.ts`의 `PAID_SERVICE_RUNTIME_SRC`는 `build-c8aed3a8017e`에 고정되어 있고 브랜치의 `destiny-profile` 해시와 다르다. React 유료 경로가 오래 캐시된 이전 버전을 불러올 수 있다. 이 파일은 통째로 결제 고정 대상이라 바꾸지 않았다. 바꾸려면 사용자 승인이 필요하다.
- **이용권 소진 임계 10→30코인:** 묶음이 1,000원 항목 3종을 이용권 대상에서 빼면서 대상 최저가가 30코인이 되어 `verify:pass-tier-policy`가 실패했고, 가드가 요구하는 값으로 맞췄다. 잔여 10~29코인 이용권은 이제 소진으로 끝난다(그 잔여로 열 수 있는 항목은 이미 없다). 고객 체감이 있는 변경이라 사용자 확인이 필요하다. 해당 잔여 이용권 수는 운영 DB를 보지 않아 모른다.
- **약관:** `dcc5dbec3`의 약관에 묶음 제외 조항이 없다. 금액 구간과 모순은 아니지만(29,000원 > 20,000원 구간), 패밀리 꿀단지의 "1회 정상 판매가 상한 없음 … 고가 상품도 이용" 문구에 명시 제외가 없다. 사용자·법무 판단이 필요하다.

## 결제 코드 변경 (main 대비)

`_cdRunDirectKrwCheckout`, `billing.js`, `payments.js`는 묶음 브랜치에서 실제로 바뀌었다. 목록과 `alreadyUnlocked` 범위 근거는 `docs/context/payment-gating.md`의 "main 통합 뒤 달라진 점"에 있다. 주문 없는 `alreadyUnlocked` 응답을 해금으로 받는 처리는 묶음과 판매 종료 키로만 좁혔다.

**줄 수 상한 인상, 사용자 승인 필요 (I6):** `config/payment-freeze.json`의 상한을 `worker/routes/billing.js` 6494→6513, `worker/routes/payments.js` 3804→3817로 올렸다. 최종 수정 단계에서는 상한과 고정 구간을 더 바꾸지 않았다.

## 관찰 (고치지 않음)

- main의 `cdSignatureConsultPopup`(`js/core/home-funnel.js`, `f7ddbba01`)이 1.5초 뒤 `?action=cdOneStepFreeSajuEntry` 입력 폼 위에도 뜬다. 입력 중인 사람을 가리므로 확인이 필요하다.
- `#run-btn` Playwright 클릭이 간헐적으로 시간 초과한다. 계산 오버레이가 덮어서라는 것은 추정이고 원인은 확인하지 못했다(프로브 4회 재현 안 됨). 가드는 `TimeoutError`만 기록하고 넘긴 뒤 결과 대기로 판정한다.
- 판정 보류 화면의 게이지는 굵은 "신약 · 억부 점수 -7점 (판정 기준 30점)"을 그대로 보여 판정처럼 읽힐 수 있다. main 원본도 판정 보류 아래 같은 게이지를 넣는다(`js/core/saju/reading-rich.js:354-356`). 묶음이 만든 차이는 아니고 main 화면을 띄워 비교하지는 않았다.
- `shellRuntime.f2343`은 무료 힐링 타로(`app/tarot/healing/page.tsx:101`)에서만 쓴다. 사주 범위 문구가 아니어서 고치지 않았다.

- 묶음 안 구성요소 이름 "라이트 사주 풀이"(`index.html`, `bundle-offer.js`, reading-personas `summaryTitle`)와 `app/components/activation/SnuWelcome.tsx:127`의 "라이트 사주와 대운부터", `.pf-coin-amount`의 "묶음 29,000원" 한국어 고정이 남아 있다.

## 뒤로 미룬 항목

- 문구: 마케팅 초안의 "무료 사주"(`instagram-captions.md:14`, `threads-queue.json:135,144`, `threads-week01.md:101`, `week01.json:20`), `lib/seo/siteSeo.ts:164,176`, en `rpt_dopamineCard.faq.1`.
- 번역: vi·hi·es·fr·de·nl·ms 혼합 언어 카드, hi·nl·ms 묶음 전용 키의 영어 잔류, 손번역은 원어민 검수 전, `CLAIMS_FREE_RE`에 일부 비한국어 표현 없음, `saju.bundle.*` i18n 없음.
- 제품 결정: 천원 페이지 제목 "천원 운세·천원사주" 유지, 영냥이 가격 메모, 묶음 상품명 표기 3종(사주 전체 풀이 묶음·사주 영구 묶음·평생 소장).
- 최종 리뷰 minor 미처리: 궁합 상대가 포함된 신원의 묶음 소유 불일치(`worker/payments/entitlements.js:143`, 클라이언트 도달 미확인), 열림 헬퍼 2벌(`js/saju-engine.js`, `reportDashboard.js`, 둘 다 실패 시 닫힘), `bundle-offer.js`의 키 목록·가격 수동 사본, 묶음 해금 뒤 미구매 출생으로 바꿀 때 `natal.gods` 잔류, `startProfileSave` 빈 폼 12초 폴링 뒤 안내 소실.
- 그 외 Task별 소소한 항목은 `.superpowers/sdd/2026-11-04-saju-permanent-bundle/progress.md`의 `minor (deferred)` 줄에 있다.

## 2026-11-06 운영 대조

11월 6일 사후 감사에서 운영 Pages·Worker fcb82a1e6, 가격 29,000원 및 약관 제외 조항 누락을 확인했다. 판매 종료 18키와 라이트 65키의 교집합은 0개다. 시행 결정을 기다리는 동안 판매·권리 규칙과 약관은 유지한다. 승격 전 14일과 승격 후 14일의 /saju 유입, 결과 이탈, 묶음 구매, 사주 매출, 상품별 구매 수·매출과 이용권별 생성 비용·한도 소진율을 같은 기준으로 비교한다. 이후 되돌림은 소유자가 판단한다.
