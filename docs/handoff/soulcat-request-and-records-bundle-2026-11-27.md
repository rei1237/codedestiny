---
status: in-progress
updated: 2026-11-27
next: 2 — 사용자 결정 대기(결정 8-보충, 추천 c). 단계 3·4 완료(368d6c31f8). 결정 후 2 → 5(pre-push·push·CI 1회)
---

# 영냥이 결제 requestId 서버 선생성 + /records/ 사주 묶음 노출

## 첫 행동
`git branch --show-current`·`git status`·`git fetch origin`. 이 워크트리(`D:\Development\codedestiny-worktrees\change-20261127-161248`, 브랜치 `wt/change-20261127-161248`)에서 이어 작업한다. 루트 체크아웃은 옆 세션 미커밋이 있어 손대지 않는다.

## 지금 상태
- 출발점: origin/main ffd712e694 (payment-leftovers 인수인계 종료 커밋).
- 원 문서: `docs/handoff/payment-leftovers-2026-11-27.md` 단계 8·9.

## 승인 상태 (2026-11-27 사용자 답, 원문 선택지)
- 결정 8: "(a) 서버가 먼저 요청 생성" — 결제 전에 서버가 YeongnyangiRequest 를 만들고 id(`yn-<64hex>`)를 돌려준다. 소유 검증은 그대로 둔다. 서버 형식 완화(b)는 기각.
- 결정 9: "보여준다" — `/records/` 에 라이트 사주 묶음(`saju_lifetime_bundle`, 정적 해금)을 목록으로 노출한다.
- 결정 10: "현행 유지" — CI 트리거 추가하지 않는다.
- 운영 승격: "지금은 배포 안 함". push 는 해도 되지만 production dispatch 는 별도 요청 때만.

## 작업 규칙과 함정
- RED: 구현 전 위험·검증·롤백을 한 번 보고하고 진행한다(이미 승인된 범위라 다시 묻지 않는다).
- 결제 검증은 mock 만. 실결제·운영 DB 쓰기·과금 LLM 호출 금지. DB 수선 금지.
- 결제 코드 수정 전·커밋 전에 paid-gate-auditor 를 쓴다. 동결 파일이면 payment-freeze 절차(`verify-payment-freeze`).
- 보관함 분리 유지: 꿀꿀운세 기록은 `/records/`, 영냥이는 `/yeongnyangi/library/`. 결정 9 는 꿀꿀운세 쪽 상품이므로 `/records/`. 다른 계정 기록 노출 금지, 저장 원본 재열람(추가 결제·LLM 없음). `docs/context/library-preservation.md` 를 먼저 읽는다.
- js/** 를 고치면 `npm run sync:public`, app/** 를 고치면 `npm run sitemap:generate`. js/core/checkout-entry.js·pass-verdict.js 를 고치면 21개 정적 페이지 + app/layout.js 의 core 런타임 캐시 핀을 손으로 갱신해야 한다(`verify-payment-choice-parity.mjs` 가 잡는다).
- sync:public 이 webp 11개를 재인코딩하는 잡음이 나면 그 파일만 되돌리고 다시 sync 한다.
- 알려진 기존 실패(범위 밖): `__tests__/worker/card-single-payment-auto-refund.test.js` 10건 — ziwei-ai-chart.js mock 에 FOUR_TRANSFORMATIONS 없음. 이것 때문에 check:fast 의 test:jest 가 실패하면 원인만 확인하고 넘어간다(고치지 않는다).
- 단계마다 check:fast → 커밋. 끝나면 `npm run check:pre-push` → `git push origin HEAD:main` → main CI 1회 확인.

## 설계 (조사 후 채운다)
- 8: 서버는 `yn-<64hex>` 이고 소유자의 YeongnyangiRequest 가 있어야 결제 requestId 를 받는다. SoulCat 클라이언트는 이를 만들 수 없다. 결제 시작 전에 요청 생성 엔드포인트(기존 것이 있으면 재사용 — 원칙 6·15)를 불러 id 를 받고, 그 id 로 결제를 시작한다. 실패 시 결제창을 열지 않고 다시 시도 안내(결과가 안 나오는 것이 최악 — 막다른 길 금지).
- 8 조사 결과(2026-11-27, 워크트리 075eff535d 기준 실측):
  - SoulCat 모드 진입: `app/checkout/CheckoutClient.tsx` `PreparedCheckoutClient` — `isSoulCatMode = !params.requestId`. startPayment 가 `yn-soulcat-<featureKey>-<slug(returnTo)>` 를 만들어 `runPaidAccessGate` 로 보낸다.
  - 서버 거절 위치: `worker/payments/orders.js:186-192` → `worker/yeongnyangi/payment-intent.js` `assertFortunePaymentIntent`(`/^yn-[a-f0-9]{64}$/` + 소유자 YeongnyangiRequest + featureKey·금액 일치 + `state==='CREATED'` + `GEMINIF_API_KEY`). 그래서 SoulCat 모드 단건 결제는 지금 항상 `INVALID_REQUEST` 로 막힌다.
  - 기존 요청 생성 경로: `POST /api/yeongnyangi/requests`(`worker/routes/yeongnyangi.js:140` → `worker/yeongnyangi/service.ts` → `repository.js createRequest`). 프로필·질문·상품으로 **CD 가 직접 생성할 상담 manifest 를 굳히는** 경로다. SoulCat 모드에는 featureKey·returnTo 만 있고 프로필·질문이 없어 그대로 재사용할 수 없다.
  - yn-<64hex> 요청의 결제 후 흐름: `worker/payments/index.js:965·996·1122` 가 결제 확정 시 `enqueuePaidConsultation`(YEONGNYANGI_QUEUE) 으로 **CD 쪽 LLM 생성**을 건다. `worker/yeongnyangi/recovery.js:124` cron 도 같은 패턴을 복구한다. `/yeongnyangi/library/` 목록(`routes/yeongnyangi.js:178`)도 YeongnyangiRequest 를 그대로 보여 준다.
  - SoulCat 쪽 소비: `worker/routes/yeongnyangi-entitlement.js`(index.js:1958) 가 미소비 Payment 증빙을 SoulCat 에 넘기고 `metadata.consumedBy` 로 소비 표식. SoulCat 은 자기 책을 따로 만든다.
  - 배포 현황: `worker/wrangler.toml` 에 `SOULCAT_SERVICE` 바인딩 없음(grep 0건), 레포 안에서 requestId 없는 `/checkout/?featureKey=…` 링크를 만드는 코드 0건(검색: app·worker·scripts, docs·public 제외). `worker/lib/soulcat-account.js` 주석도 "SoulCat production 이 아직 없는 프로덕션". 즉 SoulCat 모드는 현재 운영 유입이 없는 것으로 추정(외부 SoulCat 레포는 미확인).
- 8 막힘(🔴 승인 범위 밖 결정): (a) "서버가 먼저 요청 생성"을 그대로 하면 SoulCat 결제용 YeongnyangiRequest 는 manifest 없는 껍데기다. 이것이 yn-<64hex> 로 결제되면 위 큐·cron 이 CD 생성(과금 LLM)을 걸고, 영냥이 보관함에 빈 상담으로 뜨고, 환불·복구 경로도 이를 상담으로 다룬다. 막으려면 다음이 모두 필요하다:
  1. 새 공개 API 엔드포인트(예: `POST /api/yeongnyangi/soulcat-intents` — featureKey 만 받아 껍데기 요청 생성·id 반환). 기존 `POST requests` 는 프로필·질문이 필수라 재사용 불가.
  2. YeongnyangiRequest 에 "외부(SoulCat) 이행" 표식 필드 추가(models 스키마 추가 — DB 스키마 변경).
  3. 결제 코어 분기: `assertFortunePaymentIntent`(GEMINIF 키 요구 면제), `payments/index.js` 큐 enqueue 3곳, `recovery.js`, 보관함 목록, 환불 경로에서 이 표식을 제외.
  4. entitlement 소비 시 SoulCat requestId 와 이 요청의 연결 규칙.
  - 동결 파일(`config/payment-freeze.json`)은 index.html 의 단건 실행 영역만 잡아 이 변경과 겹치지 않는다(실측).
  - 선택지(추천 먼저):
    - **(c) 보류 + 막다른 길만 제거(추천)**: SoulCat production·바인딩·유입이 없으므로 서버 구조는 SoulCat 출시 때 SoulCat 쪽 계약과 함께 정한다. 지금은 SoulCat 모드 결제 버튼이 서버 거절로 끝나지 않게 "영냥이 방에서 상담을 먼저 골라 주세요" + 영냥이 방 링크로 안내만 한다(CheckoutClient 문구·링크, GREEN 수준). 이유: 유입 없는 경로에 결제 코어 분기 4곳과 스키마를 더하는 것은 위험 대비 이득이 없다.
    - (a1) 위 1~4 를 모두 구현(RED: 새 라우트 + 스키마 추가 + 결제 코어 분기). SoulCat 출시가 임박했을 때만.
    - (a2) SoulCat 모드에서도 프로필·질문을 받아 기존 `POST requests` 로 정식 상담 생성. CD 가 상담을 생성하고 SoulCat 도 책을 만들어 이중 생성·이중 과금 LLM 위험 — 비추천.
- 9: `/records/` 목록 소스에 `saju_lifetime_bundle` 해금 기록을 추가하고, 항목 클릭 시 기존 재열람 통로(홈 카드·사주 결과)로 연결한다.
- 9 구현(368d6c31f8):
  - `lib/records/service-registry.js` 에 `saju-bundle` 소스를 추가했다. `collection: content_entitlements`, `where: { featureKey: 'saju_lifetime_bundle', status: 'ACTIVE' }` 이고, 소유자는 공통 ownerQuery 로 고른다. `reopenHref` 는 홈 카드와 같은 `/ggulggul/?action=cdOneStepFreeSajuEntry&section=summaryCard` 다. model 이 아니라 collection 으로 둔 것은 record-library 테스트가 model 집합을 고정하기 때문이다.
  - `worker/lib/record-library.js`:
    - 상태는 `saved`(저장됨)로 표시한다.
    - 같은 계정 ProfileCard 를 `$lookup` 해서 "<이름> 프로필" 을 부제로 붙인다.
    - href·nativeHref 는 reopenHref 를 쓴다.
    - 상세는 `content = {}` 라 orderId·birthKey 를 내보내지 않는다.
  - `app/records/view/SavedRecordClient.tsx` 는 상세 직접 진입 시 nativeHref 로 replace 한다.
  - `reading-registry`·d.ts 를 맞추고 테스트 1건을 추가했다.
  - 스키마 변경·새 라우트·결제 코드 변경은 없다(읽기 전용).
- 9 남은 위험(후속, 미해결):
  - 목록 검색(q)에 걸리지 않는다. 제목을 저장하지 않기 때문이다.
  - 출생 기반 이관(PROFILE→BIRTH 복사, BACKFILL)으로 한 구매가 여러 줄로 보일 수 있다. 운영 분포는 보지 않았다.
  - 다시 보기가 현재 활성 프로필로 열린다. 다른 출생 프로필이 활성이면 잠긴 미리 보기가 보인다(재구매 화면 노출 가능, 자동 청구는 없음). 프로필 딥링크가 없다.
  - 해금 행은 ACTIVE 인데 연결 Payment 만 환불된 불일치면 목록에는 보이고 상세는 403 이다(fail-closed).
  - 서비스명과 제목이 둘 다 "라이트 사주 풀이" 로 두 번 나온다. 기존 제목 폴백 패턴과 같다.
  - `recordIndexPlan()` 에 content_entitlements 가 포함된다. 오프라인 계획이라 자동 실행되지 않는다.

## 단계
- [x] 1 결정 8 조사: SoulCat 결제 진입부, 서버 requestId 검증 위치, 기존 요청 생성 경로를 찾아 설계를 이 문서에 적는다. → 위 "8 조사 결과"·"8 막힘". 코드 변경 없음.
- [ ] 2 결정 8 구현 — ⛔ 보류: 새 엔드포인트·스키마 추가·결제 코어 분기가 필요해 승인 범위(a) 밖. 사용자에게 (c)/(a1)/(a2) 선택을 묻는다(추천 c).
  결정 8 구현 + mock 테스트 + paid-gate-auditor + check:fast → 커밋.
- [x] 3 결정 9 조사: /records/ 목록 소스와 묶음 해금 저장 위치, library-preservation 정책 대조. → 위 "9 구현"(조사 결과는 구현에 반영).
- [x] 4 결정 9 구현 + 테스트 + 모바일 너비 화면 확인(visual-checker) + check:fast → 커밋. → 368d6c31f8. 검증 결과:
  - record-library jest 33/33
  - records-reading·retention node 10/10
  - sitemap:generate
  - paid-gate-auditor PASS: payment-freeze 통과, --update 불필요
  - check:fast(critical): jest 의 기존 범위 밖 실패 card-single-payment-auto-refund 10건 외 전부 통과
  - 390px 화면(mock): 카드 3개 정렬·넘침 없음, 상세 진입 시 사주 결과로 리다이렉트 확인
- [ ] 5 마무리: check:pre-push → push → main CI 1회 확인 → 이 문서 `status: done` → 결과 보고(운영 승격은 묻기만).
