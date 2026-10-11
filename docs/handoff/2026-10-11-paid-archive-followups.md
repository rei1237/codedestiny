---
status: done
updated: 2026-10-11
next: "P2-1 카드 수수료 환불 여부 사용자 결정 대기. P1-3 나머지 미보관 결과는 별도 인수인계로"
---

# 유료 결과 보관함 저장·이용권 증빙 — 남은 문제와 후속 과제

## 왜

사용자 요청: "이용권 즉시 사용 시 저장 누락 가능한 부분은 버그이므로 해결해줘야겠고 아직 보관함이 없는 유료 결과는 숙요 인연 도감은 잠금 해제 기능이므로 잠금 해제되면 볼 수 있도록하고 나머지는 보관함에 볼 수 있도록해야해 결제쪽 기록 문제도 합리적으로 수정해야겠고 나머지 남은 문제에 대해서 인수인계 문서 만들어서 진행하도록해줘"

앞선 작업(e6e8b5d54 프로필 카드 상한·수수료 제거, 7483d916d 숙요 궁합 보관함 저장)에 이어서 진행했다.

## 지금 상태

이번 커밋에 들어간 것:

- **이용권 즉시 사용 저장 누락 수정.** 이용권은 화면을 먼저 열고 사용 기록을 뒤에서 쓴다. 그래서 보관함 저장이 기록보다 먼저 도착하면 `requireExisting` 검사에서 403 이 났다.
  - 클라이언트는 게이트 결과에서 결제 방식(`accessMethod:'pass'`)을 기억해 보낸다. 403·503·네트워크 오류이면 4초·12초·30초 뒤에 다시 보낸다.
  - 서버는 `accessMethod:'pass'` 이면서 기록이 없을 때 같은 requestId 로 이용권 사용을 직접 확정한다. 멱등이므로 뒤늦은 pass-check 와 두 번 깎이지 않는다.
  - 관련 파일: `worker/routes/sukuyo-archive.js`, `worker/routes/compat-result-archive.js`의 `provePerUse`.
- **결제 기록 정리.**
  - 이용권 사용 증빙(`pass-consumption.js`)에 profileId 를 남긴다.
  - `verifyPerUsePayment` 는 membership_pass·family 증빙을 `source:"pass"` 로 분류한다. 보관함 기록의 `metadata.accessType` 이 "pass" 로 찍힌다.
- **보관함 저장 대상 추가.** 모두 서버가 결제·잠금 해제를 확인한 뒤에만 저장한다.

  | 결과 | featureKey | 엔드포인트 |
  |---|---|---|
  | 숙요 본성 심화 | `sukuyo-nature-deep-dive` | `POST /api/sukuyo/nature-deep-dive/archive` |
  | 극T 관계 회로 | `sukuyo-extreme-t-relationship` | `POST /api/sukuyo/extreme-t/archive` |
  | 점성술 궁합(셀럽) | `compat-astro-synastry` | `POST /api/compat-archive/astro-synastry` |
  | 점성술 궁합(직접 입력) | `compat-astro-direct-synastry` | `POST /api/compat-archive/astro-direct-synastry` |
  | 자미두수 궁합 | `compat-ziwei-compatibility` | `POST /api/compat-archive/ziwei-compat` |

  - 공용 저장 모양은 `worker/lib/paid-result-archive.js` 에 있다.
  - 보관함 노출 설정은 `lib/records/service-registry.js`, `lib/records/reading-registry.js` 에 있다.
- **숙요 인연 도감은 보관함에 넣지 않는다.** 잠금 해제형 기능이라서다. 대신 `cd:unlocks-changed`·`cd:tile-locks-updated` 이벤트가 오면 도감·본성 심화·극T 의 잠금 상태를 다시 읽고 바로 다시 그린다. 위치는 `js/saju-engine-tarot-sukuyo-quantum.js` 의 `syBindBirthUnlockRefresh`.
- **점성술·자미두수 궁합 requestId.** 결제마다 새 requestId(`compat-archive:<featureKey>:<rand>`)를 만들어 게이트와 복귀 서술자에 싣는다. 한 결제는 기록 하나가 된다. 위치는 `js/saju-engine.js` 의 `_seNewCompatArchiveRequestId`.

검증 결과는 이 문서를 만든 커밋 메시지와 최종 보고에 있다. 수동 E2E 는 아직 하지 않았다(P1-6).

## 다음 세션 시작 명령

과제 하나에 세션 하나를 쓴다. 과제 번호만 바꿔 붙여 넣는다.

```
docs/handoff/2026-10-11-paid-archive-followups.md 를 읽고 P0-1 을 진행해줘
```

- 동시에 돌리지 않는다:
  - P0-1·P1-1 은 둘 다 `js/saju-engine-tarot-sukuyo-quantum.js` 를 고친다.
  - P0-2·P1-3 은 둘 다 `js/destiny-profile.js` 를 고친다.
- 결제 동결 영역(`index.html` 의 `_cdChooseServicePaymentMode`·`_cdRunDirectKrwCheckout`·`_cdOpenPaidServiceGate`, `destiny-profile.js` 의 `_dpRenderStandalonePaymentChoice`, `billing-client.ts`·`useCoinGate.ts`·`portone.ts`)은 사용자 승인 없이 고치지 않는다. 고쳤다면 `node scripts/verify-payment-freeze.mjs` 로 확인한다.
- 끝낸 과제는 제목 옆에 `✅ 완료 YYYY-MM-DD (커밋)` 를 붙인다. 전부 끝나면 `status: done` 으로 바꾼다.

## 과제 목록

### P0. 결제 정합성

**P0-1. 숙요 기본·정밀 궁합의 고정 requestId — 두 번째 상대가 첫 결제의 멱등 재생으로 처리될 위험** — 🔴 RED ✅ 완료 2026-10-11 (5aa147705)
- 현상: 숙요 회당 궁합(`compat-sukuyo-compatibility`, `premium-sukuyo-compat-extra`)은 게이트 requestId 를 `sukuyo-paid:<featureKey>|<profileId>` 로 카드에 고정한다. 같은 카드로 다른 상대를 보면 서버가 첫 결제를 다시 쓰는 것으로 볼 수 있다. 그러면 두 번째 결제가 일어나지 않는다. 보관함 기록은 상대 시그니처로 나뉘지만, 결제 증빙은 첫 결제 하나를 같이 쓴다.
- 근거: `js/saju-engine-tarot-sukuyo-quantum.js` 의 `syOpenPaidSukuyoFeature`(`requestId: 'sukuyo-paid:' + inFlightKey`).
- 할 일:
  - 실제 동작을 먼저 확인한다. 게이트·`verifyPerUsePayment` 의 멱등 키 처리를 따라가 두 번째 결제가 차감되는지 테스트로 재현한다.
  - 재현되면 점성술·자미두수처럼 결제마다 새 requestId 를 만든다. 복귀 서술자에도 싣고, `sukuyo-archive.js` 는 그 requestId 로 증빙을 찾게 바꾼다.
- 범위: `js/saju-engine-tarot-sukuyo-quantum.js`(`syOpenPaidSukuyoFeature`, 궁합 복귀 처리), `worker/routes/sukuyo-archive.js`.
- 결과(5aa147705):
  - 재현: 이중 결제가 아니라 반대였다. 월정석은 `spendMoonstone` purchaseId 유니크로 `replayed:true`, 이용권은 (featureKey, requestId) 소비 마커로 멱등이라 두 번째 상대가 **차감 없이** 열렸다. 보관함도 고정값 증빙 하나로 상대 N명을 저장했다. 단건 KRW 는 게이트 진입 스코프가 주문 키에 붙어 영향 없었다.
  - 수정: 궁합 2종만 결제마다 `sukuyo-paid:<fk>|<profileId>|<꼬리>`. 복귀 서술자 args 에 requestId·profileId. 서버는 이 기능·이 카드 접두사일 때만 받아(아니면 400) 그 값으로 증빙을 찾고 결제 1건 = 기록 1건. requestId 가 없으면(배포 전 JS·결제) 예전 고정값으로 찾는다.
  - 남은 것: 수동 E2E(P1-6) 미실시. 캐시된 예전 JS 는 고정값을 계속 써 배포 전과 같다(P2-2). 다른 숙요 회당 기능(전생·월운 등)이 같은 고정값을 쓰는지는 이번 범위 밖이라 보지 않았다.

**P0-2. 같은 경합을 가진 다른 `requireExisting` 소비자** — 🟠 ✅ 완료 2026-10-11 (977eab2a7)
- 이용권 즉시 사용 뒤 서버가 `requireExisting:true` 로 증빙을 찾는 경로는 모두 같은 403 경합을 가진다. 이번에는 보관함 저장 두 라우트만 고쳤다.
- 남은 곳:
  - `ziwei-deep-report`
  - `nakshatra-compat-delivery`
  - `paid-narrative-intent`
  - `palm-result-delivery`
- 할 일: 각 경로가 403 에서 재시도하거나, `accessMethod:'pass'` 일 때 이용권을 직접 확정하는지 확인한다. 둘 다 아니면 같은 방식으로 맞춘다.
- 근본 해결안: `index.html` 의 `_cdRecordMembershipPassInBackground` 에 5xx·네트워크 오류 재시도를 넣는다. 이 함수는 동결 영역이 아니다. React 쪽 `billing-client.ts` 의 백그라운드 기록은 동결 파일이라 승인이 필요하다.
- 결과(977eab2a7):
  - `nakshatra-compat-delivery`(402)·`palm-result-delivery`(403)에 같은 방식을 붙였다. 증빙이 없고 `accessMethod:'pass'` 이면 같은 requestId 로 이용권을 직접 확정한다(소비 마커로 멱등). DB 장애(`proven:null`)는 503 그대로다. 손금은 requestId 를 지정한 조회에서만 확정하고 '최근 판독' 조회는 소비하지 않는다. 클라이언트는 게이트가 이용권으로 통과하면 `accessMethod:'pass'` 를 같이 보낸다.
  - `ziwei-deep-report` 는 cron 전용, `paid-narrative-intent` 는 등록·승격만 하고 소비하지 않아 대상이 아니다.
  - 근본 해결안: ✅ 완료 2026-10-11 (a2b89a51c, 동결 파일 수정은 사용자 승인).
    - 백그라운드 이용권 기록 세 곳이 5xx·타임아웃·네트워크 오류면 같은 requestId 로 4·12·30초 뒤 최대 3번 다시 보낸다. 대상은 셸 `_cdRecordMembershipPassInBackground`, React `billing-client.ts` `recordMembershipPassInBackground`, 독립 정적 페이지 `destiny-profile.js` `_dpRecordMembershipPassInBackground` 다.
    - 서버가 (기능, requestId) 소비 마커로 멱등이라 이중 차감은 없다. 402·로그아웃·프로필 누락 같은 4xx 는 다시 보내지 않는다. 셸은 requestId 가 비면 다시 보내지 않는다.
    - 셸 인플라이트 키에 requestId 를 넣었다.
    - 금전 결제 POST 의 자동 재시도 금지 가드는 그대로다. `verify-pass-recovery-path` 에 세 곳의 재시도 검사를 붙였다.

**P0-3. 회당 결제 → 영구 해금 분류 누락** — 🟠 ✅ 완료 2026-10-11 (f81feb15a)
- `worker/routes/fortune.js:2510` 의 `PERSISTENT_UNLOCK_KEY_SET` 에 `sukuyo-extreme-t-relationship` 이 없다. 이 목록을 읽는 경로(레거시 해금 조회)에서 극T 해금이 영구로 취급되지 않을 수 있다.
- 할 일: 이 목록을 `worker/lib/paid-feature-registry.js` 의 출생 기반·영구 해금 목록과 대조한다. 빠진 키를 넣거나, 레지스트리에서 파생하게 바꾼다.
- 결과(f81feb15a): 극T 하나가 아니라 레지스트리 `UNLOCK_PAID_FEATURE_KEYS` 전체를 펼쳐 넣어 파생하게 했다. 손으로 적은 목록은 별칭·구 번들 호환으로 남겼다. 회당 키는 섞이지 않는다는 테스트를 붙였다.

### P1. 기능·표시

**P1-1. 극T 대체(fallback) 렌더 경로는 보관함에 저장하지 않는다** ✅ 완료 2026-10-11 (e8dd28ee8)
- 빌더(`builderHtml`) 경로만 저장한다. 빌더를 못 쓰는 예전 렌더 경로로 그려지면 기록이 남지 않는다.
- 할 일: 대체 경로가 실제로 쓰이는지 확인한다. 쓰이면 같은 저장 호출을 붙인다.
- 결과(e8dd28ee8): 결과 영역 폴백(`hasFallbackExtremeTRelationshipAccess`)으로 그려질 때 저장이 빠졌다. 정상 경로와 같은 facts·sections 로 저장한다.

**P1-2. 본성 심화 기록은 날짜마다 하나 생긴다**
- 시그니처에 `dailyDate`(오늘 날짜)가 들어간다. 오늘의 흐름 문단이 날마다 달라서다. 같은 날 다시 열면 갱신되고, 다른 날 다시 열면 새 기록이 생긴다(구매·복귀 직후에만 저장하므로 자주 생기지는 않는다).
- 할 일: 사용자가 "기록이 쌓인다"고 느끼면 시그니처에서 날짜를 빼고 최신으로 덮어쓰는 쪽으로 바꾼다.
- 2026-10-11: 조건부 과제라 코드는 바꾸지 않았다. 사용자 체감 보고가 오면 진행한다.

**P1-3. 아직 보관함이 없는 브라우저 계산형 유료 결과** — 🟡 1차 완료 2026-10-11 (aaaea2bd2)
- 이번 범위는 사용자가 지정한 숙요·점성술·자미두수 결과까지다. 그 밖에도 결제 뒤 브라우저에서만 계산되고 저장되지 않는 결과가 있다. 예: 관상(physiognomy), 베다 궁합(vedic-compatibility), 스톤헨지, destiny-compass 일부.
- 할 일: `worker/lib/paid-feature-registry.js` 의 회당 목록과 `lib/records/service-registry.js` 의 `SAVED_FEATURES` 를 대조해 목록을 만든다. 그다음 `compat-result-archive.js` 패턴으로 하나씩 붙인다. 무료 결과는 넣지 않는다.
- 1차 결과(aaaea2bd2): 운명의 나침반 심화 3종을 붙였다.
  - 서버: `POST /api/result-archive/<destiny-compass-crossroads|destiny-compass-future-sim|destiny-compass-life-voyage>`. `compat-result-archive.js` 처리기를 기능 표를 받게 일반화해 그대로 쓴다(결제 requestId 확인 → 결제 1건 = 기록 1건, 이용권 즉시 사용 폴백 포함). 프로필 카드는 없어도 된다.
  - 클라이언트: `app/destiny-compass/_lib/archive.ts`. 결제마다 requestId 를 만들어 게이트·복귀 서술자에 싣고, 결과가 그려지면 한 번 보낸다. 403·5xx·네트워크 오류는 4·12·30초 뒤 다시 보낸다.
  - 보관함: `SAVED_FEATURES`·`READING_FEATURES`(compass 계열 장 표시)·공용 픽스처에 3개 키.
- 남은 미보관 회당 결과(대조 목록):
  - 관상: `physiognomy-ogwan-mole-deep`, `physiognomy-compatibility`, `physiognomy-pastlife-compatibility`
  - `vedic-compatibility-per-use`
  - 스톤헨지 `stonehenge-runes-single`·`triad` — `index.html` FAQ 가 "룬은 저장되지 않는다"고 안내한다. 넣으려면 제품 결정과 FAQ 수정이 같이 필요하다.
  - `tarot-myeongri-three-card`, `fun.quantumLotto.ritualReport`
  - `openKemetModal`, `openJuyukModal`, `ifa-oracle`, `royal-tea-oracle`, `maya-prompt-generator`, `destiny_meeting_place`
  - 서버가 계산하지만 저장하지 않는 것: `tarot-reunion`·`numerology`·`ijik`·`crystal-soul`, `nakshatra-muhurta`·`vvip-codex`
- 참고: `RECORD_SERVICES` 의 나침반 항목 대체 featureKey 가 `destiny-compass-life-voyage` 로 적혀 있었다. ✅ 정정 2026-10-11 (a2b89a51c)
  - 이 항목(`DestinyCompassReport`)은 나침반 AI 심층 리포트(`destiny-compass-deep-report`)를 저장한다. 문서에 featureKey 가 없어 대체 키가 그대로 쓰였다. 그래서 보관함의 환불 철회 판정이 다른 상품 키로 이뤄져, 환불된 심층 리포트가 목록에 남을 수 있었다.
  - `destiny-compass-deep-report` 로 고치고 `record-library` 테스트를 붙였다. 판독 화면은 출처로 고르므로 영향이 없다.

**P1-4. 출생정보 수정 시 결과가 다시 잠긴다는 안내 부족** ✅ 완료 2026-10-11 (9973db561)
- 카드 수정이 무료가 됐다. 출생정보를 바꾸면 출생 기반 해금이 잠기는 것은 의도된 동작이지만, 수정 화면에 안내가 없다.
- 할 일: 카드 수정 저장 전에 "이 카드로 연 결과는 원래 생년월일로 되돌리면 다시 열립니다" 류의 안내를 넣는다. 정책 문구 확인이 필요하다.
- 결과(9973db561): 사용자가 고른 제안 문구를 카드 수정 모드 안내 줄에 5개 언어로 넣었다. 잠기는 조건은 생년월일·시각·양음력·성별 변경으로 넓혀 적었다(서버의 출생 키가 이 넷으로 만들어진다).

**P1-5. 프로필 상한 잔재** ✅ 완료 2026-10-11 (2b6ec36a7)
- `worker/routes/fortune.js`·billing 응답이 아직 `profileLimit` 숫자를 내보내는 곳이 있다. 서버 판정에는 쓰지 않지만 클라이언트가 보여 줄 수 있다.
- `home.passMini` 계열 번역 키 중 상한 문구용 키가 쓰이지 않은 채 남아 있다.
- Play Console 상품 설명에 "프로필 무제한"·"프로필 N개" 문구가 있으면 콘솔에서 직접 고쳐야 한다(코드 밖).
- `worker/routes/user.js:11` 의 레거시 동기화는 `MAX_SYNC_PROFILES = 30` 을 넘는 카드를 자른다. 그리고 `deleteMany` 의 `$nin` 이 잘린 카드를 지울 수 있다. 상한을 없앤 정책과 충돌하므로 확인이 필요하다.
- 할 일: 위 항목을 하나씩 확인하고 정리한다. 동기화 상한은 서버 보호(요청 크기)와 정책 사이에서 값을 정해야 하므로 사용자 확인이 필요하다.
- 결과(2b6ec36a7):
  - 사용자 결정대로 동기화 목록이 상한(30)으로 잘리면 `deleteMany` 를 건너뛴다. 상한 30 은 요청 크기 보호로 남겼다.
  - 쓰이지 않는 `home.passMini.*Benefit2` 12개 로케일에서 지웠다.
  - 남김: 응답의 `profileLimit` 필드와 `shellRuntime` 쪽 잔재는 호환 때문에 그대로 뒀다. Play Console 문구는 코드 밖이라 콘솔에서 직접 고쳐야 한다.

**P1-6. 수동 E2E 미실행** — 미실시(2026-10-11)
- 로컬 `wrangler dev` + `next dev` 로 다음을 확인한다. 실결제가 아니라 테스트 모드여야 한다.
  1. 이용권 사용자로 점성술 궁합(셀럽)을 연다 → 결과 표시 → `/records/` 에 "점성술 궁합" 기록이 생긴다.
  2. 같은 카드로 다른 셀럽을 연다 → 기록이 2건이 된다.
  3. 자미두수 궁합을 KRW 결제(모바일 리다이렉트 복귀)로 연다 → 복귀 뒤 결과와 기록이 생긴다.
  4. 본성 심화·극T 를 산다 → 기록이 생긴다. 다른 탭에서 해금 → 이벤트로 바로 열린다.
  5. 숙요 인연 도감을 해금한다 → 새로고침 없이 '해금 완료' 로 바뀐다.
  6. 운명의 나침반 갈림길·미래 시뮬레이션·삶의 항로를 산다 → `/records/` 에 각 기록이 생긴다(P1-3 1차).
  7. 이용권으로 낙샤트라 궁합·손금 판독을 연다 → 첫 요청에 결과가 나온다(P0-2).
- 2026-10-11: 이 세션은 브라우저·테스트 결제 환경이 없어 하지 못했다. 자동 테스트만 통과했다.

### P2. 정리

**P2-1. 과거 카드 수수료 환불 여부** — 사용자 결정 필요 · ⏸ 보류(2026-10-11 사용자 결정)
- 수수료 정책이 바뀌기 전에 프로필 카드 추가·수정·삭제 비용을 낸 사용자가 있다. 환불·포인트 보상 여부는 운영 결정이다. 코드 작업 전에 대상 주문 수를 읽기 전용으로 센다.

**P2-2. 오래된 캐시 JS**
- 셸 JS 는 빌드 해시로 캐시를 깬다. 그래도 서비스 워커나 앱 WebView 가 예전 JS 를 쥐고 있으면, 그 사용자는 저장 호출이 없는 예전 흐름을 계속 쓴다. 배포 뒤 며칠 동안 신규 기록 수를 지켜본다.
- 2026-10-11: 관찰 과제라 코드는 바꾸지 않았다. 배포 뒤 확인한다.

**P2-3. 죽은 코드·인벤토리** ✅ 일부 완료 2026-10-11 (9973db561)
- `js/destiny-profile.js:6132` 의 첫 `_cdCoinGatePerUse` 정의는 `:13013` 정의가 덮어써서 쓰이지 않는다.
- `payment-inventory.json` 에 정리되지 않은 항목이 있다.
- 월 지표 문서의 수치가 실제와 어긋난다(monthly figure drift).
- 할 일: 참조처를 확인한 뒤 지운다. 동결 영역 근처라 `verify-payment-freeze` 를 함께 돌린다.
- 결과(9973db561):
  - 첫 `_cdCoinGatePerUse` 정의를 지웠다. 참조는 스크립트·목에만 있었고 로드 중 호출은 없었다. `verify-payment-freeze` 통과.
  - `destiny-profile.js` 내용이 바뀌어 캐시 핀(`?v=build-…`)을 독립 정적 페이지·verify 스크립트·`billing-client.ts` 의 `PAID_SERVICE_RUNTIME_SRC` 에서 갱신했다. 동결 파일은 이 문자열과 매니페스트 sha 만 사용자 승인을 받고 바꿨다.
  - 남김: `payment-inventory.json` 은 생성기가 60d7c42c2 에서 지워져 다시 만들 수 없다(`unresolvedCount` 1091). "월 지표 문서"는 어느 파일인지 특정하지 못했다.

**P2-4. `verify-records-hub` 가 이 환경에서 시간 초과**
- 로컬 Windows 환경에서 시간 초과로 끝난다. CI 에서 통과하는지 확인하고, 필요하면 타임아웃을 조정한다.
- 2026-10-11 확인: `scripts/design/verify-records-hub.mjs` 는 로컬 dev 서버(`RECORDS_TEST_ORIGIN`, 기본 :3194)를 띄워 놓고 도는 Playwright 스크립트다. package.json 스크립트에도, `.github/workflows` 에도 연결돼 있지 않아 CI 에서는 돌지 않는다. 그래서 타임아웃은 손대지 않았다. CI 에 넣으려면 dev 서버 기동 단계가 있는 작업을 따로 만들어야 한다. `SAVED_FEATURES` 를 순회하므로 P1-3 으로 상세 화면 3개가 늘었다.
- 같은 날 CI 확인 중 발견: 9973db561 이 셸 캐시 핀 연쇄(init.js → uiBindings.js)를 끝까지 맞추지 못해 Main drift watchdog 가 실패했다. c01210550 에서 sync:public 을 수렴할 때까지 돌려 고쳤다.
