---
status: active
implementationStatus: shipped-to-main (4단계 에셋·포즈·순간 완료 · 스테이징 플래그 ON · 프로덕션 OFF)
updated: 2026-10-01
next: 5단계 — 메인 히어로 보조 진입점과 sitemap.
---

# 연이·네오 대화형 상담 → 영냥이 질문형 엔진 공유 (1단계: 공통 엔진·결제 연결)

계획 원본: `C:\Users\user\.claude\plans\pasted-content-id-d7b8-code-humming-tower.md`
사용자 결정(2026-10-01):
- 영냥이 파이프라인에 persona 축을 추가한다.
- 깊이는 고등어(5장, v6)로 한다.
- 가격은 1회 3,000원과 계정 무료 1회를 유지한다.
- 이번 세션은 1단계만 진행한다.

## 결과 (커밋)

| 커밋 | 내용 |
|---|---|
| a586d5ed4 | 연이·네오 말투 프롬프트(`worker/yeongnyangi/prompts/persona/`)와 장 생성기 persona 선택. 결론은 persona 로 바꾸지 않는다 |
| aee618eb7 | 접근 수단 목록을 공유 상수로 만듦(`access-methods.js`): `PER_USE`·`ACCOUNT_FREE_TRIAL` 추가, 상담 필드(persona 등) 추가 |
| eddb61ae5 | `getChatProduct`(chat_<도메인>, 고등어 깊이, 3,000원)와 `prepareFortune(..., {persona})`. 영냥이 fingerprint·상품·가격은 그대로다 |
| 40a45857e | PER_USE 접근: `fc-<요청 id>` 결제·코인·월정석·이용권 증빙을 고정하고 매 claim 마다 재확인한다 |
| ddc5cd0cd | 무료 1회(guardian 계정 사용량 문서 공유)와 사용자의 명시적 선택(`access`: free_trial·pass·checkout). 이용권은 `pass` 선택 때만 차감한다. 열린 카드 결제창이 있으면 409 |
| e28bc7247 | `/api/fortune-chat/consultations` 라우트(`ENABLE_FORTUNE_CHAT_CONSULTATIONS==='true'` 일 때만 생성·활성화). 영냥이 기록에서 persona 행 제외 |
| f84d72fe8 | 10분 크론: 결제된 `fc-` 주문 자동 활성화, 다른 방식으로 이미 열린 상담에 결제가 들어오면 중복 결제로 보고 운영 알림 후 표시. 멈춘 PER_USE·무료 상담도 재개 |

## API (2단계 UI 가 쓸 계약)

| 메서드·경로 (`/api/fortune-chat` 기준) | 동작 |
|---|---|
| `POST /consultations {persona, domain, profileId, question, consultationAttemptId, locale, timezone}` | 201. 응답에 `paymentRequestId`(`fc-<id>`)·`paidFeatureKey`·`freeTrialAvailable` |
| `POST /consultations/:id/activate {access}` | `access` 는 `free_trial`·`pass`·`checkout`. 없으면 402 `PAYMENT_REQUIRED`(결제창을 열 정보 포함). `checkout` 인데 결제 기록이 아직 없으면 503 |
| `GET /consultations/:id` | 읽기와 이어서 생성. 플래그 OFF 여도 열려 있다 |
| `POST /consultations/:id/generate` | 같은 상담 재시도 |
| `GET /consultations?persona=yeoni\|neo` | 기록 최대 30개 |

- 도메인: saju·ziwei·sukuyo·vedic·astrology.
- 타로는 기존 guardian 경로를 유지한다. 영냥이 타로는 계약이 달라 6단계에서 다룬다.
- 카드 결제는 기존 per-use 결제창을 `featureKey: fortune-chat-consultation`, `requestId: fc-<id>` 로 열고, 돌아오면 `access: 'checkout'` 으로 활성화한다.

## 검증 (전부 mock — 실 LLM·실결제 없음)

- jest:
  - 관련 27개 스위트 560/560(커밋 5 시점)
  - `yeongnyangi-repository` 69
  - `fortune-chat-consultations-route` 12
  - `yeongnyangi-recovery` 18
- 변이 검사 14개를 모두 잡았다:
  - 선택 게이트, 열린 결제창, 복원 분기, 무료 가드
  - 플래그, 상담 판별, access 화이트리스트, 기록 필터, 영냥이 목록 분리
  - 크론 필터, 표시 조건, 증빙 일치, 알림 선행, fc 분기
- verify: payment-freeze, billing-pass-policy, paid-feature-billing-policy, per-use-never-unlocks, no-nested-retry, worker-no-undef, payment-concurrency-guards, guardian-fortune-failure-contract, fortune-chat-reading, guard-wiring. typecheck 통과.
- paid-gate-auditor 재감사: PASS(N1 해소).
- **미검증:**
  - 실제 Mongo 트랜잭션 쓰기 충돌
  - 실 LLM 상담 품질(별도 1회 승인 필요)
  - 스테이징 화면

## 2단계 결과 (2026-10-01, 커밋)

- `05c853a03` 기록 응답(`GET ?persona=`)이 `enabled`(플래그)를 함께 돌려준다.
- `a660192ea` 결제 버튼 판정 `app/fortune-chat/consultation-access.ts` + `__tests__/ui/fortune-chat-consultation-access.test.js`(4건, 가드 줄 제거 변이로 1건 실패 확인).
  - 렌더: `state===CREATED`·`paid!==true`·`accessMethod` 없음일 때만 결제·무료 버튼을 그린다.
  - 클릭: 결제창 직전 `activate()`(증빙만 붙이고 아무것도 쓰지 않음)로 다시 읽어 같은 판정을 한 번 더 한다. 다시 읽기 실패면 결제창을 열지 않는다(fail-closed).
- `c8c706947` 상담실 `ConsultationRoom.tsx`·결과 `ConsultationResult.tsx`·API 클라이언트 `consultation-api.ts`·`consultation.module.css`.
  - 시작: 연이/네오 → 프로필(`useProfiles`, 새 프로필은 ProfileForm) → 운세 축 → 질문.
  - 열기: 무료 1회(`free_trial`) 또는 카드(`ensurePaidAccess`, featureKey 는 서버가 준 `fc-<id>`, requestId 는 `paymentRequestId`, 복귀는 `usePaidResume(fortune-chat-consultation:engine)`).
  - 결과 순서: 핵심 답변 → 요약 카드 → 근거 → 흐름 → 시기 → 행동 → 마무리.
  - 복구: `?consultation=<id>` 로 새로고침해도 다시 열린다. 생성 중이면 1.5초(보류 코드면 30초) 폴링, `recovery.canRetryNow` 면 "이어서 쓰기".
- `479b5a86a` `/fortune-chat` 진입 분기 `FortuneChatEntry.tsx`: 로그인 + `enabled` 면 새 상담실, 그 밖은 기존 대화형 상담. `?consultation=<id>` 는 플래그와 무관하게 상담실.
  - 🔴 탐침은 로그인 확정 뒤에만 보낸다(비로그인 401 → 갱신 실패 → logout 이벤트 → 기존 상담방 초기화).
- `6cb20649c` 스테이징 `ENABLE_FORTUNE_CHAT_CONSULTATIONS="true"` + `STAGING_ONLY_KEYS` 선언(프로덕션 유입 차단). 롤백은 이 커밋 revert.

검증(전부 mock):
- tsc 전체 0건, eslint 0건(새 파일 6개), node --test 접근 판정 4/4·fortune-chat 정적 22/22, 라우트 jest 12/12, 설정을 읽는 테스트 23/23, verify-worker-config-parity·verify:env-parity 통과.
- 화면: next dev + playwright `page.route` 스텁(스크래치, 커밋 안 함)으로 390·1280 — 시작 → 상담 준비 → 열기 패널(결제 1·무료 1) → 무료로 열기 → 결과. 결과·새로고침 뒤 결제 버튼 0개, 섹션 순서 일치, 가로 넘침 0. visual-checker 6장 통과(줄바꿈·칩 잘림·가격 배지·질문 중복 인용을 고친 뒤).
- `npm run check:fast`: 2143 중 1건 실패 — `__tests__/release/sitemap-volatile-lastmod-kst.test.js`. clean HEAD(e88d22ae5) 워크트리에서도 같은 실패라 이번 변경과 무관(아래 범위 밖 결함).
- 미검증: 스테이징 실화면(플래그 ON 배포 뒤), 실 카드 결제 복귀, 실 LLM 결과.

2단계 남은 위험:
- 서버 prepare 가드는 여전히 없다(후속 1). UI 가드는 낡은 탭은 막지만, 다른 탭에 아직 결제 대기 중인 카드 창이 열려 있는 경우는 막지 못한다.
- 타로는 새 상담실에 없다(6단계 타로 통합). 플래그가 켜진 로그인 사용자는 기존 타로 대화에 들어갈 수 없다.
- 로그인 사용자는 `/fortune-chat` 방문마다 기록 GET 1회(Mongo 조회 1회)가 늘고, 첫 방문은 탐침 응답 전까지 기존 상담방이 잠깐 보였다가 바뀐다(`/api/fortune-chat/bootstrap` GET 1회 발생). 두 번째 방문부터는 sessionStorage 힌트로 바로 상담실.
- 가격 배지는 서비스 등록 키 `fortune-chat-consultation` 로 표시한다(표시 전용). 실제 결제 금액은 서버 `fc-<id>` 판정이 정본.

## 3단계 결과 (2026-10-01, 커밋)

- `6062d83b4` 네오 세계(별빛 전략실)와 상담자별 결과 보존.
  - `app/fortune-chat/consultation-world.ts`: 결과 순서·라벨(`RESULT_ORDER`·`SECTION_LABEL`)과 상담자별 칸(`PersonaRows`·`showRow`·`refreshRow`).
    - 연이: 핵심 답변 → 요약 카드 → 근거 → 흐름 → 시기 → 행동 → 마무리(2단계 그대로).
    - 네오: 핵심 판단 → 지금 할 일 → 시기 → 판단 근거 → 판세 → 장별 브리핑 → 마무리. 내용은 같고 순서·제목만 다르다.
  - `ConsultationResult.tsx`: 섹션을 순서표대로 그린다. 루트에 `data-persona`.
  - `ConsultationRoom.tsx`: 헤더에 연이/네오 전환(`data-consultation-mode`). 보던 상담은 상담자별 칸에 남고, 다른 쪽에 남은 상담이 있으면 점과 aria-label("… 보던 상담이 있어요")로 알린다. 전환하면 URL `?consultation=` 이 그 칸의 상담 id(없으면 제거)로 바뀐다.
    - 사용자가 연 상담(기록·새로 만들기·결제 복귀)은 `showRow`, 뒤늦은 응답(폴링·활성화·무료·이어 쓰기·결제 복귀 대기)은 `refreshRow` — 그 칸이 같은 id 일 때만 바꾼다.
    - 생성·결제 중(`busy`·`isPaying`)에는 전환을 막는다. 결제 흐름 자체는 바꾸지 않았다.
  - `consultation.module.css`: `main.starlight` 토큰 한 세트(남색 #050713 계열 표면·금색 강조·밝은 글자), 핵심 판단 금색 세로선, 전환 버튼·점.
  - 테스트 `__tests__/ui/fortune-chat-consultation-world.test.js`(3건). 순서·칸 보존·낡은 응답 차단에 변이 3개를 넣어 모두 실패하는 것을 확인했다.

해석·가정:
- "정보 위계" = 네오는 판단 → 할 일 → 시기를 앞에 둔다. 서버·프롬프트는 그대로이고 화면 순서만 바꿨다.
- "결과 보존" = 한 탭 안의 메모리 보존이다. 새로고침 뒤에는 URL 에 있는 활성 상담 하나만 복구되고, 다른 상담자 상담은 기록 목록에서 다시 연다.
- 질문 입력·운세 축·프로필 선택은 두 상담자가 공유한다.

검증(전부 mock):
- node --test 세계 3/3 + 접근 판정 4/4, tsc 전체 0건, eslint 변경 파일 0건.
- 화면: next dev + playwright `page.route` 스텁(스크래치, 커밋 안 함)으로 390·1280 확인.
  - 연이 결과 → 네오 전환(URL 제거, 연이에 점) → 네오 기록 열기 → 연이 복귀(추가 GET 0회, URL 복원) → 네오 복귀.
  - 순서 일치, 가로 넘침 0, 페이지 오류 0.
  - visual-checker: 별빛 화면 대비 전부 4.5:1 이상(금색 버튼 글자 10.91:1). 연이 화면의 점은 금색이 1.5:1 이라 로즈로 바꿔 6.59:1.
- check:fast: `--committed-head --base=d0cf372fd --head=6062d83b4`(옆 세션 커밋 제외). critical 등급 33단계 중 실패 2건, 둘 다 기존 실패다. ① `verify:sitemap-drift`(아래 범위 밖 결함 — 제 커밋 전후 생성 결과 동일) ② test:node 의 `sitemap-volatile-lastmod-kst` 1건(2단계부터 있던 실패). 사이트맵 다음 단계는 하나씩 따로 돌렸고 typecheck·결제 verify 20종·build:worker·test:jest 를 포함해 나머지는 전부 통과했다.
- 미검증: 스테이징 실화면, 실 카드 결제 복귀 중 전환, 실 LLM 결과.

3단계 남은 위험:
- 보이지 않는 상담자 칸이 생성 중이면 폴링하지 않는다. 그쪽으로 돌아오면 그때 폴링을 다시 시작한다(서버 생성은 계속 진행된다).
- 연이(밝은 테마)에서 ProfileForm·ReadingCharts 의 영냥이 어두운 스타일이 밝은 글자를 밝은 바탕에 그릴 수 있다. 2단계부터 있던 상태이고, 이번에는 확인하지 않았다.

## 4단계 결과 (2026-10-01, 커밋)

- `7a46d8a43` 운세별 에셋·포즈·로딩/빈 기록/오류 순간.
  - `consultation-world.ts`:
    - `DOMAIN_ART`: 상담자 × 운세 축 5종 그림과 alt.
      - 연이는 검증된 운세 입구 그림 `public/images/consultation/*-yeoni-entry-*-640.webp` 를 재사용했다(자산 규칙: 기존 검증 자산 우선).
      - 네오는 새로 그렸다: `public/images/fortune-chat/neo/{saju,ziwei,sukuyo,vedic,astrology}-640.webp`, 640×427, 44–59KB.
    - `MOMENT_ART`: 상담자 × loading·empty·error. 파일은 `public/images/fortune-chat/moments/{yeoni,neo}-{loading,empty,error}.webp`, 320×320, 13–23KB. 장식 그림이라 `alt=""` 이고, 의미는 옆 글이 전한다.
    - `poseFor(row, {failed, drafting})`: 헤더 아바타 표정을 정한다.
      - 오류 → think
      - 질문 전 → greet, 질문 입력 중 → listen
      - 결제 전 → listen, 생성 중 → read
      - 완료 → cheer, 환불 → think
  - `ConsultationRoom.tsx`:
    - `DomainArt`(`data-consultation-domain-art`): 시작 화면의 운세 축 패널과, 장이 아직 없는 현재 상담 패널에 보인다.
    - `Moment`(`data-consultation-moment`): 생성 중 점 말풍선, 오류 문구, 빈 기록 패널("지난 상담", 상담자별 문구)에 붙는다.
    - 빈 기록 패널은 그 상담자의 기록 목록을 실제로 받아 온 뒤(`historyFor === persona`) 0건일 때만 보인다. 게스트·로딩 전에는 보이지 않는다.
  - `consultation.module.css`:
    - `.domainArt`: 3:2, 최대 390×260, 패널 가운데.
    - `.moment`·`.momentArt`: 96px, 560px 이하 76px.
    - 색은 세계 토큰만 쓴다.
  - 각 webp 옆의 `.webp.json` 에 프롬프트·생성기(codex-image, gpt-image-2)·생성 시각을 남겼다. 네오 참조 이미지는 `persona/neo-world-greet.webp` 다. 참고로 `neo-operation-room-hero-v2.webp` 는 사람 그림이라 마스코트가 아니다.
  - 테스트 `__tests__/ui/fortune-chat-consultation-world.test.js`: 2건을 추가해 5건이다.
    - 모든 상담자 × 축·순간에 그림이 있고, 파일이 실제로 있고, alt 가 비어 있지 않다.
    - 표정 매핑.

해석·가정:
- "운세별 에셋" = 상담자마다 운세 축 하나당 그림 한 장이다. 결과 화면(장이 생긴 뒤)에는 그림을 넣지 않았다.
- "포즈" = 기존 `PersonaMood` 5종을 단계에 매핑한 것이다. 새 스프라이트는 만들지 않았다.

검증(전부 mock, 실 LLM·실결제 없음):
- node --test 세계 5/5. tsc 의 fortune-chat 오류 0건, eslint 변경 파일 0건.
- 화면: next dev + playwright `page.route` 스텁(스크래치, 커밋 안 함)으로 390·1280 을 확인했다.
  - 시나리오(연이·네오 각각): 결제 전 상담, 생성 중, 불러오기 오류, 시작 화면(빈 기록·운세 축 전환).
  - 가로 넘침 0, 깨진 이미지 0, 페이지 오류 0.
- visual-checker:
  - 대비: 네오 본문 8.90:1, 연이 본문 7.86:1, 오류 빨강 5.30:1.
  - 순간 그림의 가장자리가 카드와 같아 상자로 보이지 않는다.
  - 1차 지적 "데스크톱에서 그림이 왼쪽으로 쏠림"은 `justify-self:center; width:min(100%,390px)` 로 고쳤다. 재판정에서 좌우 169/169px 로 대칭이다.
- check:fast: `--committed-head`(7a46d8a43 단독). critical 등급 34단계 전부 통과했다. 3단계 때 실패하던 `verify:sitemap-drift`·test:node 도 이번에는 통과했다(옆 세션 d5b90e1bc 원장 재생성 이후로 보임, 원인 미확정). test:jest 328 스위트·4893건 통과.
- 미검증: 스테이징 실화면, 실 카드 결제 복귀 중의 순간 그림.

4단계 남은 위험(결함 아님, 수용):
- 그림 내용:
  - 네오 숙요 그림의 별 표식은 약 17개다(27개가 아님).
  - 네오 사주 책장에 아주 작은 가짜 한자가 있으나 표시 크기에서는 보이지 않는다.
  - 네오 오류 그림은 "오류" 느낌이 약하다. 옆 문구가 전한다.
  - 연이 오류 그림 왼쪽 가장자리에 그림 내용이 닿아 세로 선처럼 보인다.
- 연이 순간 그림은 테두리 없는 비네트이고, 네오는 둥근 타일이다. 의도적으로 그대로 두었다.
- 오류 시나리오에서는 상담을 못 불러오므로 기본 연이 세계가 보인다(스텁 확인). 네오의 오류 순간 그림은 네오 칸에서 오류가 날 때만 보인다.
- 장이 생긴 뒤 결과 화면에는 운세 축 그림이 없다. 결과 위계(핵심 답변 우선)를 흐리지 않으려는 선택이다.

## 남은 위험·후속 (우선순위순)

0. 🔴 **main CI `Critical checks` 가 2단계 `6cb20649c` 부터 실패한다**(로컬 재현: `node scripts/verify-worker-config-parity.mjs --self-test`).
   - 메시지: "vars.ENABLE_FORTUNE_CHAT_CONSULTATIONS: 스테이징 전용 키인데 스테이징 설정에 없다"(baseline passes 케이스).
   - 원인: 키를 `STAGING_ONLY_KEYS` 에 선언했지만, self-test 픽스처 `BASE_STAGING` 의 `[vars]` 에는 넣지 않았다.
   - 고치는 법(추정, 미실행): `BASE_STAGING` 에 `'ENABLE_FORTUNE_CHAT_CONSULTATIONS = "true"',` 한 줄을 넣는다.
   - 이 job 은 결제·워커 파일이 바뀐 push 에서만 돈다. 그래서 e1f2174e0·d0cf372fd 에서는 skipped 로 가려져 있었다.

1. 🔴 **카드 결제 prepare 측 가드가 없다.**
   - 무료/이용권으로 연 상담에 낡은 탭이 `fc-` 카드 결제를 또 할 수 있다.
   - 지금은 크론이 사후에 중복 결제로 감지하고 운영 알림만 보낸다(자동 환불 없음).
   - 2단계 UI 가드로 낡은 탭은 막았다(위 2단계 결과). 6단계에서 prepare 가 `fc-` 요청의 접근 여부를 확인해야 한다.
2. `assertNoOpenCheckout` 는 트랜잭션 밖에서 한 번만 읽는다(TOCTOU). 영냥이 `paymentClaimOrderId` 같은 점유 표시가 없다.
3. 유료 PER_USE 가 0장 실패하면 자동 환불 없이 `GENERATION_REVIEW_REQUIRED` 로 남는다(영냥이 DIRECT_KRW 와 같다). 이용권 환불 정보(`perUsePassRefund`)는 재시도 때 잃을 수 있다(N2). 6단계 과제.
4. `fc-` 활성화가 영구 오류(예: 무료 복원으로 REFUNDED 된 상담에 결제)를 내면 24시간마다 재시도할 뿐 알림이 없다.
5. 익명 병합이 `freeUsed` 를 절대값으로 `$set` 해서, 복원과 겹치면 무료 1회가 하나 더 생길 수 있다(영향 작음).
6. `unattachedChat` 이 `state:'CREATED'` 를 고정하지 않는다(기존 PER_USE 동작).
7. CI: `paid-flow-gates.yml` 이 `worker/yeongnyangi/**` 변경에 걸리지 않는다. `change-risk` 가 이 파일들을 deep 대상으로 올리지 않는다(N4).

## 범위 밖 결함 (보고만)

- guardian 서버 문구 "1회 5,000원"(`guardian-fortune-usage.js`, `guardian-fortune-generate.js`)이 실제 3,000원과 다르다.
- 계정 usage 스키마 기본값·최대값이 3이다(가드는 min(…,1)로 막는다).
- paid attempt 에 `source` 가 표기되지 않는다.
- `/guardian/chat` SSE 를 쓰지 않는다.
- 영냥이 팩이 부분 전달 뒤 복원되지 않는다.
- `retry.js` `hasRequestAccess` 공백이 있다.
- `MAX_FIX_RESUMES=0` 이라 죽은 경로가 남는다.
- `content-assets.md:9` 가 낡았다.
- main CI `CI required` 가 e88d22ae5 부터 Static guards 의 `sitemap-volatile-lastmod-kst.test.js`("주간 허브가 주 시작일을 쓰지 않습니다", 실제 2026-10-15 / 기대 2026-10-12)로 실패한다. clean HEAD 에서도 재현된다.
- 2026-10-01 `verify:sitemap-drift` 가 로컬 clean 워크트리(d0cf372fd·e1f2174e0·6062d83b4)에서 모두 실패한다. 재생성하면 원장 294개 라우트의 서명·lastmod 가 바뀌고, 세 커밋의 생성 결과는 서로 같다. 그래서 3단계 변경 탓이 아니다. `/fortune-chat` 은 사이트맵에 없다. 날짜 롤링 또는 윈도우 CRLF 체크아웃 탓으로 보이나 원인은 확정하지 않았다.

## 로드맵

2. ✅ 연이 상담 UI (2026-10-01 완료, 위 2단계 결과):
   - 프로필 카드 생성
   - 질문 입력
   - 결과(핵심 답변 → 요약 카드 → 근거 → 흐름 → 시기 → 행동 → 마무리)
   - 기록과 새로고침 복구
   - 스테이징에서 플래그 ON(vars 는 참조 문서 예외 절차)
3. ✅ 네오 상담 세계(별빛 전략실): 정보 위계와 모드 전환 때 결과 보존 (2026-10-01 완료, 위 3단계 결과).
4. ✅ 운세별 에셋, 포즈, 로딩·빈 기록·오류 에셋 (2026-10-01 완료, 위 4단계 결과).
5. 메인 히어로 보조 진입점("연이와 네오에게, 지금 가장 궁금한 한 가지" / "내 고민 상담하기")과 sitemap.
6. 결제 복귀·중복·복구 E2E(mock), 위 후속 1·3, 타로 통합, 구 guardian 경로 은퇴 판단, 실 LLM 품질 1회 검증(별도 승인).

## 다음 세션 첫 문장

> docs/handoff/fortune-chat-engine-unification-2026-10-01.md 를 읽고 5단계(메인 히어로 보조 진입점 "연이와 네오에게, 지금 가장 궁금한 한 가지" / "내 고민 상담하기"와 sitemap)를 시작해 줘. 영냥이 홈 app/page.js 의 기존 상담 진입 구현과 /fortune-chat/?character= 동작을 먼저 읽어.
