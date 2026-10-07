# 영냥이 상품·구매 흐름과 홈 상담 안내

status: in-progress

## 승인된 정책

- 10회·20회권은 신규 판매를 종료하고 기존 구매·선물·주문 복구를 보존한다. 질문 → 상담 범위 → 단건 결제 또는 같은 범위 5회권 순서로 안내하며, 기존 가격·30일·적용 범위는 유지한다.
- 월간 4등급 판매는 꿀꿀운세에서 유지하고 영냥이 구매 흐름에서만 제외한다. 이용권·월정석·단건 결제 구조를 유지하며 보유 혜택은 사용자가 선택해야 적용한다.
- 꿀꿀운세의 기본 질문 상담가는 영냥이다. 연이와 네오는 다른 상담 스타일로 안내하되 실제 상품·권리는 합치지 않는다. 답 → 근거 → 해볼 행동을 먼저 설명한다.
- 재미있는 사주의 **유료 11개는 모두 1,000원**, **기존 무료 8개는 유지**한다. 종합사주 3,000원·궁합 5,000원은 유지한다. 나머지 AI 상품의 일괄 1,000원 변경 요청은 철회됐으며 기존 상품 분류·가격을 따른다. 실측하지 않은 수익성을 단정하지 않는다.
- 운명의 꽃은 로그인 후 무료로 제공한다. 네 체계 결과와 꽃말·작은 행동 안내를 메인에서 소개한다. Olympus 등 보조 콘텐츠와 과거 결과는 삭제하지 않는다.
- 신비로운 입장 연출은 후속 작업이다. 실결제·유료 LLM·운영 DB 쓰기·운영 승격은 이번 검증 범위에 포함하지 않는다.

## 구현 계약과 변경 파일

홈은 상담을 선택하는 Persuade, 질문·구매 화면은 조건과 결제 수단을 확인하는 Operate로 다룬다. 기존 캐릭터·테마를 유지하며 전역 디자인 정본을 바꾸지 않는다.

| 범위 | 현재 구현 | 주요 파일 |
|---|---|---|
| 판매 종료와 과거 구매 | 판매 가능 카탈로그와 과거 상품 해석을 분리한다. 종료 상품은 동일 주문 복구만 허용하며 새 주문은 `409 PRODUCT_SALE_ENDED`로 막는다. | `worker/payments/service-pack-policy.js`, `service-packs.js`, `service-pack-routes.js` |
| 질문·구매 문맥 | 단건/같은 범위 5회권을 안내하고 상점 이동 시 상품·요청·언어를 전달한다. 질문 조건 수정 시 입력 내용을 복원한다. 조회 실패는 보유량 0으로 취급하지 않는다. | `app/checkout/CheckoutClient.tsx`, `app/components/service-packs/{ServicePacks.tsx,consultation-context.ts,service-pack-client.ts}`, `app/points/PointsClient.tsx`, `app/yeongnyangi/_components/Consultation.tsx` |
| 명시적인 보유 혜택 사용 | Family·월정석·기존 횟수권은 각각 선택해 사용한다. 복구는 이미 남은 결제·차감 증빙만 연결하며, 증빙 없는 Family 자동 차감을 하지 않는다. | `app/checkout/CheckoutClient.tsx`, `worker/yeongnyangi/repository.js` |
| 홈·상담 안내 | 대표 상담은 메인에, 체계별 전문가와 기타 콘텐츠는 펼치기 영역에 둔다. 영냥이 질문 입력에서 연이·네오의 기존 상담으로 연결한다. 타로 진입은 프롬프트 라이브러리로 모으고 기존 리딩·과거 결과를 보존한다. | `templates/home-funnel.html`, `scripts/design/build-home-funnel.mjs`, `index.html`, `styles/concern-first-home.css`, `app/yeongnyangi/_components/{NightHero.tsx,QuestionScope.tsx,ConsultationCompanion.tsx}` |
| 재미있는 사주 가격 | 서버 가격 정본과 카드 표시를 맞춘다. 이번에 인연의 장소·러브 코드·관계 경계 테스트를 1,000원으로 내려 유료 11개·무료 8개 구성을 유지한다. | `worker/lib/paid-feature-registry.js`, `worker/routes/relationship-boundary-test.js`, `js/core/saju/reportDashboard.js`, `app/saju/love-simulation/_components/LoveSimulationEngine.tsx` |
| 운명의 꽃 | 서버 인증과 계산을 유지한 무료 결과다. 사주·점성술·자미두수·숙요점 네 체계를 제공하며 결과를 서버에 저장하지 않는다. | `worker/routes/destiny-flower.js`, `js/core/index-inline-runtime.js`, `app/flower/page.tsx`, `templates/home-funnel.html` |
| 꽃 신규 청구 차단 | `FEATURE_NOW_FREE`로 신규 주문·월정석 청구를 막는다. 과거 가격 해석·구매 원장은 남겨 기존 구매를 보존한다. | `worker/lib/billing-feature-registry.js`, `worker/payments/{orders.js,moonstone.js,legacy-pricing.js,errors.js}`, `worker/routes/payments.js` |

기존 결제·차감·복구 경로를 재사용하며 DB 마이그레이션은 추가하지 않는다. 추가 질문 한도는 `questionDecision`이 있는 질문 상담에서만 표시한다. 기존 전체 성향 리포트 주문에 질문 상담의 한도를 붙이지 않는다. `public`의 셸·스크립트 미러는 소스와 동기화하는 생성물이다.

## 이미지 출처와 실제 반영

- **서한비:** 사용자가 검은 호랑이 모습을 인간 서한비와 같은 캐릭터로 지정했다. 사용자 참조는 `C:/Users/user/Desktop/CodeDestiny-Build/박지은 캐릭터.png`이며, 파일명으로 캐릭터를 박지은으로 바꾸지 않는다. 러브 코덱스의 설명과 대체 텍스트도 서한비의 동물 모습으로 명시한다.
- **운명의 꽃:** 사용자가 요청한 새 식물 그림으로 생성했다. 꽃 메인 소개와 `/flower/` 대표 이미지에 적용했다.
- 생성 원본 폴더: `C:/Users/user/.codex/generated_images/01a116b6-9460-7d41-9f69-ac843acbbbcf/`. 꽃은 `exec-7ec4b997-42d1-4456-b61a-b9251a16d107.png`(1,536×1,024, 2,868,779바이트), 서한비는 `exec-c96b7fb4-9b9f-4cc4-931b-04ea1f3663ba.png`(1,218×1,292, 1,774,355바이트)다.

아래 WebP는 `public/images/consultation/`에 실제 저장됐으며 크기·파일 용량을 확인했다.

| 파일 | 크기 | 용량 |
|---|---|---|
| `destiny-flower-editorial-v1-480.webp` | 480×320 | 21,612바이트 |
| `destiny-flower-editorial-v1-960.webp` | 960×640 | 82,946바이트 |
| `seo-hanbi-tiger-v1-480.webp` | 480×509 | 56,672바이트 |
| `seo-hanbi-tiger-v1-960.webp` | 960×1,018 | 156,914바이트 |

꽃 홈 이미지는 480/960 `srcset`을 사용한다. 서한비는 `src/features/master-love-codex/components/CodexLanding.tsx`와 해당 CSS에서 480 이미지를 사용하며 960 파일도 준비돼 있다. 로컬 반영은 운영 배포나 화면 검증 완료를 뜻하지 않는다.

## 검증 상태와 남은 확인

- 기존 판매 종료·복구 작업의 기록: 커밋 `e7d5c5337`, backend unit 133개와 client 37개 통과. 이 결과를 이후 UI·가격·꽃 무료화 변경의 통과 근거로 확대하지 않는다.
- 이번 문서 갱신에서 소스 데이터 19개를 확인했다. `REPORT_CARDS`는 유료 11개·무료 8개이며 유료 표시 가격은 모두 1,000원이다. 이미지 4개도 `sharp.metadata()`와 파일 크기로 확인했다.
- 꽃 신규 청구 차단·비로그인/로그인 네 체계 결과·명시적 Family 사용의 mock 단위 검사 102개, 구매 문맥·과거 주문 클라이언트 검사 39개가 통과했다. 대표 검사 소스는 `__tests__/worker/free-flower-billing.test.js`, `destiny-flower.route.test.js`, `yeongnyangi-repository.test.js`, `__tests__/ui/service-pack-context.test.mjs`다.
- 실제 컴포넌트와 정적 홈을 로컬 mock 서버에서 렌더링해 360/390/430/1280px 화면을 확인했다. 두 구매 선택·단건 기본값·키보드 방향키·같은 범위 상점·상담 복귀·기존 10회권 잔여량/만료일·Family·조회 오류 표시·무료 꽃 모달을 검증했다. 외부 API와 PG는 차단한 환경이며 실제 로그인·모바일 PG 왕복·실결제·LLM 품질 증거가 아니다.
- 화면 증거: `C:/Users/user/.codex/visualizations/2026/10/07/01a116b6-9460-7d41-9f69-ac843acbbbcf/simple-packs/`의 `home-*`, `checkout-*`, `codex-*`, `benefits-owned-390.png`, `benefits-error-390.png`, `measurements.json`. 전체 페이지 캡처의 지연 이미지/애니메이션은 실제 스크롤 후 `home-featured-middle-1280.png`, `home-featured-lower-1280.png`로 재확인했다. 최종 화면 리뷰는 ship이다.
- `npm run check:fast -- --plan`과 `npm run check:fast`를 실행했다. 결제 가드 88개 중 87개 및 Jest 354 suites / 5,364 tests가 통과했다. Node 2,991개 중 4개는 변경 전 이미지·배치·가격·번역 사전 기준 때문에 실패해 정본/기대값을 수정했으며 해당 4파일의 29개 검사는 재실행 통과했다.
- 통과 검사는 재사용하고 계획의 남은 `lint`, `typecheck`, `verify:sitemap-drift`, `verify:env-parity`, `verify:phone-encryption`, `verify:signup-phone-required`, `verify:checkout-pass-card`, `verify:pass-snapshot`, `verify:staging-llm-mock`, `verify:analytics-events`, `verify:no-nested-retry`, `verify:worker-no-undef`, `verify:mongo-reset-callers`, `verify:cron-mongo-op-coverage`, `verify:admin-route-error-context`, `build:worker`, `verify:entry-encoding -- --strict-core`를 실행해 통과했다. sitemap 원장과 payment-freeze manifest를 함께 갱신했다. 전체 CI 재검증은 main push 후 확인한다.
- 첫 push `3bd2d5a44`의 Paid Flow Gates·Gift transaction integrity·AI Locale은 통과했다. Browser Shadow가 단건 직행 경로의 환불 동의 누락을 발견해 `DIRECT_KRW` 직행을 되돌리고 기존 공통 동의창에 단건만 노출하도록 수정했다. 동의값을 임의로 넣지 않으며 checkout 회귀 8개·auth recovery 검사를 통과했다. 수정 커밋의 브라우저 CI를 다시 확인한다. 카탈로그 GET은 mock에 서버의 판매 가능 목록을 연결했다.
- 첫 전체 CI의 build/critical/fast는 통과했고, 홈 레지스트리 가드가 LOVE CODE의 탐색·질문 카드에 남은 5,000원 표기 두 곳을 발견했다. 현재 1,000원으로 맞추고 `verify:home-service-registry`(57개 상품/37개 질문 가격)·셸 사전 검사 4개·payment-freeze 검사를 통과했다.

## 사용자 수정 지시 반영 — 기존 홈 UI 복원

- 사주·자미두수·숙요점·베다점·점성술 진입점을 접힌 영역 밖, 기존 히어로 바로 아래로 복원했다. 기존 이미지·버튼·이벤트 연결을 그대로 사용한다.
- 꽃돼지 연이가 설명하는 30일 이용권 배너와 4종 카드 구성을 `01f3392fe` 이전 형태로 복원했다. 제목·설명·버튼 문구만 쉽게 다듬고 가격·한도는 CURRENT_PASS_PLANS에서 읽는다. 텍스트 카드 전용 CSS는 제거했다.
- 영냥이 구매 화면의 단건/5회권, 10·20회권 신규 판매 종료, 기존 구매 권리 보존은 유지한다. 추가 결제/인증/API/DB 변경은 없다.
- 360·390·430·1280px 로컬 mock 렌더에서 진입점과 이용권 카드의 가로 잘림 없음 및 연이 이미지 로드를 확인했다. 화면은 동일 증거 폴더의 restored-entry-*.png, restored-pass-*.png에 저장했다.
- verify:home-service-registry, verify:i18n-price-drift, verify:payment-freeze 통과. check:fast 계획·실행 중.

## 전달 상태

- main에 구현·회귀 수정·공통 정책 문서를 모두 push했다. 코드 최종 변경은 `dc7d98dec3cbc67efb53ae97420b31f51a6f14cc`, 정책 문서 포함 main은 `6fbc2050948d68f6b683e557970bace8c0f905b4`다.
- 코드 CI: https://github.com/rei1237/codedestiny/actions/runs/37666978999 — build/fast 성공, static guards의 브라우저 설치 진행 중.
- 정책 CI: https://github.com/rei1237/codedestiny/actions/runs/37668026153 — static guards의 브라우저 설치 진행 중.
- 환불 동의·카탈로그 mock 수정 후 Browser Shadow: https://github.com/rei1237/codedestiny/actions/runs/37666484086 — 브라우저 설치 진행 중. 외부 설치가 끝나기 전 검사 통과로 취급하지 않는다.
- 실결제·유료 LLM·운영 DB 쓰기·운영 승격은 실행하지 않았다.

## 진행

- [x] 승인 범위·현재 코드·동시 작업 확인
- [x] 10회·20회권 판매 종료와 기존 주문 복구 구현·해당 회귀 검사
- [x] 구매 문맥·명시적 혜택 선택·대표 상담 안내 소스 반영
- [x] 재미있는 사주 가격·꽃 무료화·신규 청구 차단 소스 반영
- [x] 꽃·서한비 이미지 최적화 및 실제 소비 경로 반영
- [x] 최신 변경 mock 회귀·화면 검토·변경 기반 검사 확정
- [ ] 검증한 변경 커밋·main CI·작업 정리
