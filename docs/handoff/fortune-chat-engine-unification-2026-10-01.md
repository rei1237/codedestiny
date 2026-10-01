---
status: active
implementationStatus: shipped-to-main (6단계 C-3 C-2 결함 1·2 교정 완료 · 스테이징 플래그 ON · 프로덕션 OFF)
updated: 2026-10-01
next: 6단계 D — 게스트 정책 결정(새 상담실 로그인 필수 vs 구 guardian 게스트 3회). 결함 3(십신 오류) 근거 대조 가드는 후보로 남음.
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

## 5단계 결과 (2026-10-01, 커밋)

- `14e1a7d7d` — 새 상담실이 `?character=neo|yeoni` 를 무시하던 틈을 메웠다. `FortuneChatEntry` 가 값을 읽어 `ConsultationRoom initialPersona` 로 넘긴다(그 밖의 값은 기본 연이).
- `47a337789` — 꽃돼지 히어로(`templates/home-funnel.html` → `index.html`·미러 7개) 1차 CTA 아래에 보조 진입점을 넣었다.
  - 문구: "연이와 네오에게, 지금 가장 궁금한 한 가지" / "내 고민 상담하기" / "회원가입 무료 1회 · 이후 1회 3,000원".
  - 1차 CTA 계약(`.cdh-copy .cdh-primary`, 첫 화면 안)은 그대로다.
  - href 는 `js/core/home-funnel.js` 가 상담 문과 함께 홈 테마에 맞춰 `?character=yeoni|neo` 로 바꾼다(`[data-cdh-chat-entry]`).
  - `/`(app/page.js) SSR 안내 nav 에 `/fortune-chat/` 링크를 하나 더했다.
  - i18n `home.chatEntry.{title,cta,price}` 를 en·ja·zh-CN·zh-TW 로 저작했다. 나머지 7개는 en 복사다.
  - sitemap 원장을 재생성했다(서명 486개만 바뀌고 lastmod·URL 은 그대로다).
- 해석:
  - 고민 칩은 넣지 않았다(로드맵·요청 문구에 없다). 필요하면 별도 작업이다.
  - `/fortune-chat` 은 `noindex` 라 사이트맵에 넣지 않았다. 넣으면 "제출된 URL 에 noindex" 오류가 된다. 그래서 "sitemap" 은 원장 재생성으로 해석했다.
- 검증(전부 mock·로컬):
  - `node --test` fortune-chat·shell-dictionary-parity 16/16 통과.
  - `verify-i18n-price-drift`·`verify-krw-copy-canonical` PASS.
  - `build-home-funnel --check` current. `generate-sitemap --check` OK.
  - HEAD 단독 clean 워크트리는 sitemap check OK 였고, 내 파일만 얹으면 원장이 메인 체크아웃과 바이트 단위로 같았다. 옆 세션 오염은 없다.
  - playwright 390·1280 × 연이·네오 렌더:
    - 1차 CTA 가 보조 진입보다 위에 있고 첫 화면 안이다.
    - href 가 `?character=yeoni`/`neo` 로 동기화된다.
    - 가로 넘침이 없다.
  - visual-checker 판정은 4장 모두 OK 다(텍스트 대비 최저 6.29:1).
  - `check:fast --committed-head`: 워커 jest 2건이 실패했다(`db.payment-admission-separation` 의 `<100ms` 시간 단언, `auth.signup-phone-backfill`). 둘 다 run-mock-tests 러너 단독 실행에서는 18/18 통과했고, 이 변경은 워커 파일을 건드리지 않는다. 그래서 전체 병렬 부하에서 생기는 타이밍성 실패로 본다.
- 5단계 남은 위험(수용):
  - 390 에서 보조 버튼이 1차 CTA 와 폭·높이가 같다. 위계는 채움 대 테두리로만 드러난다.
  - light 구분선 대비가 1.24:1 로 약하다.
  - 히어로 보조 진입은 analytics 가 세지 않는다(`data-cd-business-entry` 는 paid/daily 만 집계한다).

## 6단계 A 결과 (2026-10-01, 커밋)

- `95945a6ae` 후속 0: worker-config-parity self-test 픽스처 `BASE_STAGING` 에 `ENABLE_FORTUNE_CHAT_CONSULTATIONS = "true"` 추가.
- `b484c3017` 후속 3·N2:
  - N2: `proveChatAccess` 가 재시도(`requireExisting`)로 이용권 사용을 찾으면 사용 기록의 `passCycleKey`·`coinCost` 로 `perUsePassRefund` 를 다시 만든다.
  - 유료 PER_USE 가 0장으로 `GENERATION_REVIEW_REQUIRED` 가 되면 이용권 한도(`PASS_QUOTA_RESTORED`)나 월정석(`MONTHLY_CREDIT_RESTORED`, `refundTerminalMoonstone({perUse:true})`)을 한 번 복원한다. FAMILY 와 같은 헬퍼(`restorePassQuota`)를 쓴다.
  - 카드(`payment`)·코인·관리자는 자동 복원하지 않고 검수 대기로 남는다(영냥이 DIRECT_KRW 와 같은 정책, 가정).
  - 이용권 복원은 `restorePass` 없이 사용량만 되돌린다(기존 `runPassQuotaRefund` 와 같다). 소진으로 꺼진 이용권을 다시 켜지는 않는다.
- `c605ee1ba` 후속 1: `createOrder` 가 `fc-` 상담 카드 주문 전에 `assertChatPaymentIntent` 로 상담 행과 결제된 카드 주문만 읽는다. 이미 열린 상담(무료·이용권·월정석·결제 주문·CREATED 아님)은 `FORTUNE_ALREADY_PAID`, 형식 오류·남의 상담은 `INVALID_REQUEST`. 이용권 조회는 추가하지 않았다(billing-pass-policy).
- `1ae52a050` 카드 복귀 흐름 테스트: 웹훅 전 복귀는 503 대기, 기록 도착 뒤 동시 활성화 1회, 끝까지 생성, 재활성화는 그대로.
- 크론 활성화·중복 감지는 4단계 테스트(`yeongnyangi-recovery.test.js` 76·84·95행)가 이미 덮는다.

검증 (전부 mock): 관련 jest 53 스위트 1068 통과. 변이 확인 2회(N2 되돌림 → 2 실패, prepare 가드 제거 → 7 실패). verify billing-pass-policy·paid-feature-billing-policy·per-use-never-unlocks·payment-freeze·payment-concurrency-guards·guard-wiring·worker-no-undef 통과. `check:fast --committed-head` 전체 jest 328 스위트 4908 통과. paid-gate-auditor 는 돌리지 않았다.

## 6단계 B 결과 (2026-10-01, 커밋)

- `5362845ed` 후속 2·4 (+ 후속 1 남은 틈):
  - 점유 표시: 상담 행의 `paymentClaimOrderId` 를 영냥이와 같은 필드로 쓴다. 값은 `card:fc-<id>`(카드)·`access:pass:fc-<id>`(이용권), 헬퍼는 `access-methods.js` `chatCardClaim`·`chatPassClaim`.
  - 카드 prepare(`assertChatPaymentIntent`)가 주문을 만들기 **전에** CAS 로 `card:fc-<id>` 를 잡는다. 이용권 점유가 있으면 `MOONSTONE_IN_PROGRESS`(409, 창 0개). 카드 점유는 상담 단위라 취소 뒤 다음 세대 주문도 같은 점유를 쓴다. 이용권 조회는 여전히 없다(billing-pass-policy).
  - 이용권 활성화(`per-use-access.js` `holdForPass`)는 소진 전에 `access:pass:fc-<id>` 를 CAS 로 잡는다. 카드 점유가 있으면 `PG_PAYMENT_NOT_PAID`(409, 화면이 이미 처리). 402(소진 안 됨)·기존 주문 발견일 때만 `''` 로 돌려주고, 503 은 점유를 유지한다(소진 여부 불명).
  - 무료 1회(`repository.js` `attachFreeTrial` 트랜잭션)는 카드 점유가 없을 때만 붙는다. 카드 점유가 있으면 `PG_PAYMENT_NOT_PAID`, `freeUsed` 그대로.
  - 배포 전에 만들어진 카드 주문은 기존 `assertNoOpenCheckout` 한 번 읽기로 계속 막는다.
  - 크론(`recovery.js`)이 `fc-` 활성화 영구 오류를 주문당 1회 운영자 메일로 알린다(`[꿀꿀 운세] 결제 상담 열기 실패`, 결제·상담 id·오류 코드만, 개인정보 없음). 발송 실패면 5분 뒤 재시도하고, 성공하면 `metadata.fortuneChatActivationAlerted` 를 세운 뒤 24시간 보류로 돌아간다. DB 장애·`yn-` 주문은 알리지 않는다.
- `c26b737ab` 사이트맵 원장 서명 갱신: 라우트 서명이 전이 import 를 해싱하는데 그 그래프가 `worker/yeongnyangi/*` 에 닿는다(17개 라우트, lastmod 그대로). clean 워크트리에서 재생성했다.

검증 (전부 mock): 관련 jest 50 스위트 1070 통과. 새 테스트는 payment-intent 2, repository 3(test.each 포함), recovery 2개다. 변이 확인 5회는 모두 실패로 잡혔다(attachFreeTrial `$ne:card` 제거 → 1, `holdForPass` 제거 → 2, prepare CAS 제거 → 2, 알림 제거 → 1, 알림 중복 → 2). verify billing-pass-policy·paid-feature-billing-policy·per-use-never-unlocks·payment-freeze·payment-concurrency-guards·guard-wiring·worker-no-undef·pg-window-no-conflict 통과. `check:fast --committed-head` 전체 jest 328 스위트 4915 통과·사이트맵 드리프트 통과. paid-gate-auditor 는 돌리지 않았다.

6단계 B 남은 위험(수용·후속):
- 카드 점유는 해제하지 않는다. 카드 창을 한 번 연 상담은 무료·이용권으로 바꿀 수 없다(기존에도 pg-retry-check 실패 표시가 없어 같았다). 바꾸려면 새 상담을 만든다.
- 이용권 활성화가 503 으로 끝나면 점유가 남아, 같은 상담의 이용권 재시도(멱등) 전까지 카드 prepare 가 `MOONSTONE_IN_PROGRESS` 다.
- 이용권 탭 둘이 동시에 활성화하면 한쪽 402 해제가 다른 쪽 점유를 지울 수 있다(같은 요청 id 라 이중 소진은 아님).
- 같은 상담에서 취소 뒤 다음 세대 카드 창은 순차로 열린다(동시 대기 창 둘은 막혔다).
- 월정석 코인 게이트(`fc-`)는 점유 대상이 아니다.
- `yn-` 활성화 영구 오류는 여전히 알림이 없다.

## 6단계 C-1 결과 (2026-10-01, 커밋)

- `0dcb352b5` 연이·네오 타로 상담(`chat_tarot`, 3,000원, featureKey `fortune-chat-consultation`):
  - 영냥이 타로 v2 파이프라인을 그대로 쓴다. 카드는 prepare 때 서버가 뽑고, `profileId` 는 `'tarot-question'`, 생년월일 프로필이 없다.
  - 고민 종류는 8개다(`choice·love·feelings·contact·reunion·career·money·healing`, `catalog.ts` `chatTarotKinds`). 영냥이 9종 중 **`compatibility` 는 뺐다**. 참여자 이름 입력이 필요하고 관계 규칙에 영냥이 말투가 박혀 있어서다. 그 밖의 kind 는 `INVALID_CONSULTATION_KIND`(400)로 막는다(`service.ts`).
  - 페르소나 말투: `consultation-contract.ts` `chatTarotRules`·`consultation-evidence.ts` `withChatTarotVoice` 가 증거 사실 규칙과 장 focus 의 "영냥이 상담 문체"를 "상담자의 말투"로 바꾼다. 페르소나 지시는 기존 상담 프롬프트가 붙인다.
  - 타로 의도 digest 에 `persona` 를 넣어, 같은 질문이 영냥이 요청과 같은 id 로 겹치지 않는다.
  - 화면(`ConsultationRoom.tsx`): 운세 칩 "타로" → 프로필 칸 숨김·안내 문구 → 고민 종류 8칩(기본 "지금의 선택", 칩마다 placeholder 변경) → 열기 패널 "질문에 맞춰 카드를 펼쳐 두었어요." 결과의 자료 접기 제목은 "펼친 카드 다시 보기"다.
  - 에셋: `public/images/fortune-chat/{yeoni,neo}/tarot-640.webp`(codex 이미지 생성, 640×427 q80, 메타 json 동봉).
  - `config/sitemap-lastmod.json` 라우트 서명 17개 갱신(lastmod 그대로, 전이 import 해시).
- `fd0757457` 상담실 차트 카드 레이아웃: 영냥이 차트 CSS 는 `.book` 아래에서만 카드 버튼을 세로로 쌓는다. 그래서 상담실에서는 자리 라벨과 카드 이름이 붙고, 연이 차트 제목 대비가 1.51:1 이었다. `consultation.module.css` 의 `.charts` 범위 규칙으로 고쳤다(연이 제목 rgb(179,25,85), 네오 rgb(233,196,106) 실측). 따로 되돌릴 수 있다.

검증 (전부 mock — 실 LLM·실결제 없음):
- node --test: persona 11·world 5·reading-invariance/tarot-consultation-v2/tarot-master/consultation-access 16 통과.
- jest: fortune-chat-consultations-route + yeongnyangi-repository 91 통과. `check:fast`(critical, 전체 jest 328 스위트 4915) 통과.
- 정적 검사: eslint 0 error, `tsc --noEmit` 0.
- 변이 6회는 모두 잡혔다(digest persona, kind 화이트리스트, evidence 말투, manifest 말투, chat 도메인, 화면 kind).
- verify: payment-freeze·billing-pass-policy·paid-feature-billing-policy·per-use-never-unlocks·guard-wiring·worker-no-undef 통과. `sitemap:generate --check` 는 머지 후 main 에서 OK.
- Playwright 스텁(390·1280 × 연이·네오):
  - POST 본문은 `domain:tarot`·`consultationKind:career` 이고 profileId 가 없다.
  - 무료 열기 뒤 결제 버튼 0개, 카드 이미지 3장이다.
  - 가로 넘침 0, 페이지 오류 0.
- visual-checker: 시작·열기 화면 PASS. 결과 카드는 CSS 수정 뒤 PASS였고, 제목 대비는 computed color 로만 다시 확인했다.
- paid-gate-auditor: PASS(다른 chat_* 와 같은 게이팅, 영냥이 상품과 교차 없음, 동결 파일 무변경).

6단계 C-1 남은 위험(수용·후속):
- 실 LLM 출력은 미검증이다. 페르소나 말투가 증거 규칙 치환만으로 충분한지는 C-2 에서 본다.
- 차트 CSS 수정은 사주 등 다른 상담 차트의 버튼 배치에도 적용된다(영냥이와 같은 배치로 맞춰짐). 타로 외 차트는 화면으로 확인하지 않았다.
- 연이 소개 문구 "명식을 바탕으로 질문 하나에 깊게 답해요"가 타로와 맞지 않는다.
- 새 상담 경로는 로그인 필수다. 구 guardian 타로는 게스트도 썼다(게스트 정책 미정).

## 6단계 C-2 준비 (2026-10-01, 실 LLM 0회)

사용자 선택: 최소안 A — 연이 사주(`chat_saju`, kind `ask`) + 네오 타로(`chat_tarot`, kind `career`) 2권.

- `d034451ed` 실행기 `scripts/fortune-chat-c2-quality.mjs`: 고등어 벤치마크의 예산(`BenchmarkBudget`)·운영 호출 경계(`runProductionBenchmarkCall`)를 재사용하고, 저장된 `snapshot.persona` 를 장마다 넘긴다. 11회·$0.40 상한, 재시도 0. `--live` 는 승인 해시·READY 상태·고정 경로·실행 번들·실행기 소스 해시가 모두 맞아야 돈다.
- 계획(커밋 안 함, gitignore): `build-cache/fortune-chat-c2-live-20261001/plan/plan.json`, 준비 스크립트 `build-cache/fortune-chat-c2-live-20261001/prepare-plan.mjs`.
  - 계획 SHA-256 `2ba6046ee627e2101a224dcf1f26a2f9b21267745d84db9f7da628eec223636f`, 상태 READY_FOR_SEPARATE_APPROVAL, codeHead fa2dbc389.
  - 최대 생성 11회(사주 질문 분석 1 + 장 5, 타로 장 5) + 토큰 계산 11회. 예약 최대 $0.333445(≈467원), 하드 $0.40. 예상 실측 약 165원(9/30 파일럿 단가 기준 추정).
  - 합성 프로필 1997-02-10 12:00 F 서울, 기준 2026-10-01T03:00Z. 질문 분해 수: 사주 2·타로 1.
- 검증(mock): prepare 단계에서 장 요청 5개마다 해당 페르소나 프롬프트 포함·영냥이 페르소나 없음·타로에 "영냥이 상담 문체" 없음을 단언(통과). 실행기 mock 2회(DRAFT·READY 계획) 모두 11회·5/5+5/5, 유료 0. 틀린 해시의 `--live` 는 키를 읽기 전에 거부하고 출력 폴더도 만들지 않는다.
- 실행(승인 뒤 1회): `node scripts/fortune-chat-c2-quality.mjs --live --plan-file <저장소>/build-cache/fortune-chat-c2-live-20261001/plan/plan.json --out <저장소>/build-cache/fortune-chat-c2-live-20261001/live-approved-1 --approved-plan-sha256 <위 해시> --env-file <저장소>/.env.local` (경로는 모두 절대 경로).
- 🔴 실행기·runtime·budget 파일이나 워커 코드가 바뀌면 해시 불일치로 실행이 거부된다. 그때는 prepare-plan 을 다시 돌려 새 해시로 다시 승인받는다(옛 승인 재사용 금지). 실행기 파일이 CRLF 로 다시 체크아웃돼도 소스 해시가 바뀐다.
- 실행 뒤: 권별 전체 원문 `live-approved-1/readings/*.md` 와 `quality-review.md` 를 만들어 사용자에게 절대 경로로 전달한다.

## 6단계 C-2 결과 (2026-10-01, 실 LLM 1회 사용 완료)

- 실행 직전 mock 재계산으로 계획·실행 번들·실행기 소스 해시 셋이 일치함을 확인했다(codeHead 뒤 커밋 4개는 영냥이 UI·검증기·문서뿐). 사용자 정확 승인 뒤 `--live` 1회 실행. 승인 표지 `plan/approval-used-2ba6046e….json` 이 생겨 같은 계획은 재실행할 수 없다.
- 결과: 유료 생성 11회, 사주 5/5, 타로 5/5, 10장 모두 STOP, 재시도 0, DB·결제 0. 비용 실측 $0.1048(≈147원). 출력은 장별 상한의 최대 45%.
- 산출물(gitignore): `build-cache/fortune-chat-c2-live-20261001/live-approved-1/readings/{yeoni-saju,neo-tarot}.md`(전체 원문), `quality-review.md`(검토).
- 판정: 출시를 막는 수준은 아니다. 영냥이·고양이 말투 혼입 0, 사주 팩트(세운·충합·월운·오행)와 타로 7장 위치·방향 대부분이 일치한다. 고칠 결함은 다음과 같다.
  1. 🔴 연이 5장이 사용자를 "연이님"으로 부른다(5회, 인사·생활 장면).
  2. 🔴 네오 5장 본문에 내부 위치 키 노출(`inner_vocation`·`calling`·`happy_direction`·`life_after_move`·`action_steps`·`let_go`, 9회). 프롬프트 카드 팩트의 `positionKey` 가 원인으로 추정된다.
  3. 🔴 연이 4장 십신 오류: 월지를 식신·정재·정관으로 썼다(팩트는 상관·정재·정관).
  - ⚠️ 네오 "핵심 판단 먼저"가 약해 두 페르소나 문체 차이가 작다. 연이 호칭 혼용(선생님·당신), topics 중복(모델 출력), 장 사이 반복이 있다.
- 다음(C-3): 결함 1·2를 프롬프트 수정 + 결정적 출력 정규화로 막는다(mock 검증). 결함 3은 근거 대조 가드 후보다. 플래그 ON 전에 1·2를 고치기를 권한다. 다시 실호출하려면 새 계획·새 승인이 필요하다.

## 6단계 C-3 결과 (2026-10-01, 커밋, 실 LLM 0회)

- `20129f2e2` C-2 결함 1·2 교정:
  - 프롬프트(`prompts/persona/yeoni.ts`·`neo.ts`, 생성 시점에 붙으므로 이미 저장된 상담에도 적용): 상담자 이름은 사용자의 이름이 아니다, 호칭이 필요하면 '당신'. 카드 자리는 positionLabel 이름으로만 부르고 positionKey 영문 키를 본문·괄호에 쓰지 않는다.
  - 결정적 교정(`fortune/consultation.ts`): `tarotPositionNames` 가 뽑힌 카드의 자리 키→라벨을 모은다. `redactInternalEvidence` 가 이 키를 알게 되어 괄호 속 키는 지우고 맨 키는 자리 라벨로 바꾼다(조사 보정). 한국어 밖에서는 `_` 가 있는 키만 다룬다(`calling` 같은 영단어 보호). `correctPersonaAddress` 는 한국어 본문의 '연이님/네오님/…씨'를 '당신'(씨+모음 조사는 보정)으로, 호격('연이님,' · ', 연이님.')은 지운다. 앞에 한글이 붙은 이름(김연이님)은 건드리지 않는다. 사용자 이름은 프롬프트에 없으므로(C-2 요청 원문에서 확인) 항상 오호칭이다.
  - 연결: `providers/chapter.ts` `correctChapterProse` 하나를 `validateChapter` 와 `deliverChapter`(delivery.ts) 둘 다 쓴다. 거부·재생성 경로는 늘리지 않았다(원칙 17). 로그 `[yeongnyangi-persona-address]`.
- `2766ac7cb` 사이트맵 원장 서명 18개 갱신(lastmod 그대로, 전이 import 해시). clean 워크트리에서 재생성.

검증 (전부 mock):
- node --test `yeongnyangi-consultation`·`yeongnyangi-persona` 22 통과(새 테스트 2: 자리 키 교정·호칭 교정).
- C-2 저장 원문 재생(LLM 호출 0): delivered json 10장을 `correctChapterProse` 에 통과시켜 화면 필드의 자리 키 6→0(블록 id `position-*` 는 제외), '연이님' 5→0. 교정 문장은 자연스러움을 눈으로 확인(예: "팀장님이 당신에게 주도적인 역할을", "마음의 소명인 감정의 균형").
- 변이 2회 모두 잡힘(자리 키 목록 제거 → 1 실패, 호칭 치환 제거 → 1 실패).
- `check:fast --committed-head --base=24fdaf1c3`: exit 0, node test 2191·jest 328 스위트 4915 통과, 사이트맵 드리프트 OK.

6단계 C-3 남은 위험(수용·후속):
- 실 LLM 재검증은 하지 않았다(새 계획·새 승인 필요). 프롬프트 준수율은 미측정이고, 결정적 교정이 안전망이다.
- 자리 라벨이 없는 구 스프레드 키(영냥이 v1 타로의 `current`·`outcome` 등)는 괄호 속만 지우고 맨 키는 그대로 둔다.
- 괄호 안에 라벨과 키가 섞이면("(마음의 소명, inner_vocation)") 키가 라벨로 바뀌어 같은 말이 두 번 남는다(드묾).
- 결함 3(연이 4장 십신 오류)과 ⚠️ 항목(네오 결론 먼저 약함, 연이 '선생님'·'당신' 혼용, topics 중복)은 고치지 않았다. 새 프롬프트가 호칭을 '당신'으로 정했으므로 '선생님' 혼용은 줄 수 있으나 미측정.
- 영냥이(페르소나 없음) 타로에도 자리 키 교정이 적용된다(같은 내부 키 노출 결함 축, 요청 바이트는 그대로).

### 구 guardian 경로 은퇴 판단: 지금은 은퇴하지 않는다

아래 조건을 순서대로 충족한 뒤 은퇴한다. 각 단계는 따로 승인받는다.
1. ✅ 타로 통합(C-1).
2. ✅ 실 LLM 품질 1회 검증(C-2, 2026-10-01 실행, 결함 3건은 위 C-2 결과).
3. 게스트 정책 결정: 새 상담실은 로그인 필수, 구 경로는 게스트 3회.
4. 프로덕션 플래그 `ENABLE_FORTUNE_CHAT_CONSULTATIONS` ON(운영 승격 1회 승인).
5. 관찰 기간 뒤 구 guardian 생성·대화 경로 삭제. 삭제는 3면 grep 후 별도 변경으로 한다.

## 남은 위험·후속 (우선순위순)

0. ✅ CI 픽스처(6단계 A `95945a6ae`).
1. ✅ 카드 prepare 가드(6단계 A `c605ee1ba`). 남은 틈(대기 창 둘)은 6단계 B `5362845ed` 상담 단위 카드 점유로 닫았다.
2. ✅ 카드 창·이용권·무료 TOCTOU(6단계 B `5362845ed`, `paymentClaimOrderId` CAS).
3. ✅ 이용권·월정석 0장 복원과 N2(6단계 A `b484c3017`). 카드 0장 실패의 자동 환불 여부는 정책 결정 대기(지금은 검수 대기).
4. ✅ `fc-` 활성화 영구 오류 운영자 알림(6단계 B `5362845ed`). 알림 뒤 환불 여부는 운영자 판단(자동 환불 없음).
5. 익명 병합이 `freeUsed` 를 절대값으로 `$set` 해서, 복원과 겹치면 무료 1회가 하나 더 생길 수 있다(영향 작음).
6. `unattachedChat` 이 `state:'CREATED'` 를 고정하지 않는다(기존 PER_USE 동작).
7. CI: `paid-flow-gates.yml` 이 `worker/yeongnyangi/**` 변경에 걸리지 않는다. `change-risk` 가 이 파일들을 deep 대상으로 올리지 않는다(N4).

## 범위 밖 결함 (보고만)

- guardian 서버 문구 "1회 5,000원"(`guardian-fortune-usage.js`, `guardian-fortune-generate.js`)이 실제 3,000원과 다르다.
- 계정 usage 스키마 기본값·최대값이 3이다(가드는 min(…,1)로 막는다).
- paid attempt 에 `source` 가 표기되지 않는다.
- `/guardian/chat` SSE 를 쓰지 않는다. `includeGuardian` 도 쓰이지 않는다.
- `paid-flow-gates.yml:308` 이 "무료 3회 이후 회당 5,000원"이라고 적는다(실제 3,000원·무료 1회).
- 구 일일 타로 시드는 주제·날짜가 같으면 같은 카드다(추정, 미검증).
- 영냥이 팩이 부분 전달 뒤 복원되지 않는다.
- `retry.js` `hasRequestAccess` 공백이 있다.
- `MAX_FIX_RESUMES=0` 이라 죽은 경로가 남는다.
- `content-assets.md:9` 가 낡았다.
- main CI `CI required` 가 e88d22ae5 부터 Static guards 의 `sitemap-volatile-lastmod-kst.test.js`("주간 허브가 주 시작일을 쓰지 않습니다", 실제 2026-10-15 / 기대 2026-10-12)로 실패한다. clean HEAD 에서도 재현된다.
- 공유 키 `shell.fortuneGatewayDoor.fortuneGatewayDoorMeta.n115000` 의 en·ja·zh 번역이 무료 1회 부분을 두 번 싣는다. 5단계는 이 키를 쓰지 않고 `home.chatEntry.price` 를 따로 만들었다.
- `i18n:merge --namespace shellCopy` 를 돌리면 `public/i18n/ko.json` 의 `home.homeGuide.lead`·`home.searchEntry.title`/`fusion` 이 낡은 저작 ko 로 되돌아간다(저작본과 ko 사전의 기존 드리프트). 5단계에서는 ko 사전에 새 키만 더했다.
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
5. ✅ 메인 히어로 보조 진입점("연이와 네오에게, 지금 가장 궁금한 한 가지" / "내 고민 상담하기")과 sitemap (2026-10-01 완료, 위 5단계 결과).
6. A ✅ 결제 복귀·중복·복구 E2E(mock), 후속 0·1·3 (2026-10-01, 위 6단계 A 결과).
   B ✅ 후속 2·4 (2026-10-01, 위 6단계 B 결과).
   C-1 ✅ 타로 통합(2026-10-01, 위 6단계 C-1 결과). guardian 은퇴는 조건부 보류.
   C-2 ✅ 실 LLM 품질 1회 검증(2026-10-01, 위 6단계 C-2 결과, ≈147원).
   C-3 ✅ C-2 결함 1·2 결정적 교정(2026-10-01, 위 6단계 C-3 결과, mock).
   D 게스트 정책 → 프로덕션 플래그 ON → 관찰 → guardian 은퇴. 결함 3 근거 대조 가드는 후보.

## 다음 세션 첫 문장

> docs/handoff/fortune-chat-engine-unification-2026-10-01.md 의 "구 guardian 경로 은퇴 판단" 3번(게스트 정책)을 읽고, 새 상담실의 게스트 허용 여부 선택지를 추천과 함께 정리해 줘. 결정 전에는 코드를 바꾸지 않는다.
