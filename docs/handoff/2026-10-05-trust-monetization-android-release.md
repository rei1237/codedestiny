---
status: active
updated: 2026-10-06
next: 기본 상세 전달 분리의 실패 검사·최종 main CI와 통합 상태를 확인한다. Android는 다른 세션 통합 및 main CI 확인 전 보류한다.
---

# 프롤로그·유료 콘텐츠 정비 → Android 출시

## 승인된 요청과 순서

1. 영냥이 아홉 장면 프롤로그에서 대통령 예측 원문·날짜를 강조한다. 저주·고양이 변신은 창작 설정으로 구분한다.
2. 꿀꿀운세·영냥이·저자 소개에 공개 적중 기록과 실제 공개 댓글을 강조한다. 저자 회고는 비난·논쟁으로 상담을 멈췄지만 사람들의 선택을 돕고자 서비스를 만들었다는 이야기다. 타인의 능력·질투를 사실로 단정하지 않는다.
3. 점성술 우선, 자미두수·숙요점·베다점 무료 경계를 분석한다. 차트·짧은 요약 무료, 신규 비AI 상세 해석 체계별 3,000원 계정 해금. 기존 유료 상품과 중복 과금하지 않는다. 기존 가격·구매 권리 유지.
4. 관련 세션 변경이 main에 통합되고 정확한 SHA의 CI가 통과한 뒤 Android 빌드. 그 전에 빌드하지 않는다.
5. 앱 이름 ‘꿀꿀운세 - 연이와 영냥이’, 기존 꿀꿀운세 홈을 활용한 두 상담가 선택, Google Play 우선. 최종 화면으로 아이콘·기능 그래픽·소개 이미지 6장 제작.

## 현재 작업 위치

- 작업 디렉터리: D:\Development\code-destiny\.codex-worktrees\trust-monetization-20261005-221557
- 브랜치: wt/trust-monetization-20261005-221557 (동시 작업 예외, PR 생성 안 함)
- 기준 SHA: cd22b8a9a581baf0f882b8355dae92d4466ff86c
- 콘텐츠 구현 커밋: 00479d172e613effba5c346e73707bf0b04bcbba.
- 서버 상세 조회 구현 커밋: 75aa0fde8 (기존 콘텐츠 검사 커밋 b70240a5a 이후). 최신 전달·검증 상태는 문서 마지막 절을 따른다.
- 개발 검증은 mock. 실결제·유료 LLM·운영 DB 쓰기·Play 업로드·공개 출시·운영 승격 미실행.

## 동시 작업과 앱 빌드 대기

- ‘유료 서비스 구매 전환 개선 계획’(01a10c16-2312-72b3-abeb-6e12defdb43c), ‘운세 검색·AI 인용 최적화’(01a10b51-36b8-7aa2-ad0d-29518f311283) active 확인.
- 공유 main의 index.html, styles/home-funnel.css, public 미러, RSS, marketing 변경은 타 세션 소유. 보존한다.
- 최신 origin/main에는 PublicRecordLink와 저자 공개 기록 링크가 있어 유지한다.
- 앱 빌드 전 위 세션 상태와 main 미반영 변경을 다시 확인한다. 현재 빌드 조건 미충족.

## 공개 댓글 근거

원문 https://blog.naver.com/neosaju/223444062729, 2026-10-05 비로그인 브라우저로 본문·댓글 확인. 전체 46개에는 비밀댓글·작성자 답글·논쟁이 포함된다. 후기 46개라고 표시하지 않는다.

- 2024-12-04: ‘대박!! 엄청 정확하게 푸셨네요~~👍 내년부터 대운이 바뀌는 시기네요..지켜보겠습니다…ㅎㅎ’
- 2024-12-29: ‘성지순례왔습니다.’
- 2025-03-18: ‘성지순례입니다.(윤석열탄핵)’ (긴 댓글의 첫 문장 발췌, 선고 전 반응)
- 2025-04-04: ‘역시 맞추셨네요!! 믿고있었습니다!!!’
- 2025-04-04: ‘진짜 사필귀정 됐네요 신기하다.. 글 항상 잘 보고 있습니다 😖!!’
- 2025-04-30: ‘성지순례왔습니다. 네오님’

## 분석·구현·검증 기록

### 콘텐츠 구현 (미배포)

- home-data.ts: 아홉 장면·선택지·이미지를 유지하고 2024-05-12 윤석열 탄핵 가능성, 2024-05-27 이재명 대통령 가능 시기 기록 명시. 실제 과정과 원문의 ‘혁명’ 해석 차이 유지. 공용 PRESIDENTIAL_RECORDS 링크 참조.
- StoryPanel.tsx: 해당 장면 원문 링크, 창작 설정과 과거 사례 한계 구분. Room.tsx·FortuneHome.tsx 도입 문구 강화.
- lib/brand/trust-stories.mjs: 공개 반응 6건, 마스킹 닉네임·댓글 날짜·발췌 표식·원문 URL. 대표 3건+더 보기. 구매 후기로 오인하지 않는 설명. 저자 회고 공용 데이터.
- FounderTrust.tsx·TrustStories.tsx·templates/home-funnel.html: 대통령 기록과 공개 반응을 구매 후기보다 먼저 표시.
- app/about/page.js: 원문 기록·댓글·저자 회고 추가. 앞선 SEO 세션의 PublicRecordLink와 기존 저자 링크는 유지.
- no-political-trust-copy.static.test.mjs: 이번에 사용자가 승인한 출처 연결 문구에 한해 정확한 파일별 등장 횟수를 갱신.

### 체계별 유료화 조사 (코드 관찰, 브라우저·실구매 검증 아님)

| 체계 / 진입 | 현재 무료·상세 경계와 정본 | 기존 상품 | 서버/우회 관찰 | 다음 조치 |
|---|---|---|---|---|
| 점성술 / openAstroModal → renderAstroInsightCounselV20260613 | js/saju-engine.js의 현재 렌더러가 renderAstroInsightLegacyNeon을 호출. AstroNatalReading.render + renderChart + renderDeep가 상세 성향·삶의 여섯 갈래·행성·시기 본문까지 생성 | astro_basic_deep_pack 3,000원; career/talent/relationship/growth 각각 기존 3,000원; stellar 4종·연간·월간 별도 등록 | _astroCounselPaidGate는 _cdGateBody를 사용. 잠긴 본문을 _cdPendingGateBodies에 저장하므로 DOM 비노출만으로 서버 보호를 입증할 수 없음. natal-reading.js도 공개 번들 | 기존 기본 패키지와 중복 범위 확정 후 동일 키 재사용. 신규 중복 상품 금지. 상세 생성·전달을 권한 검증된 서버 경로로 옮기고 공개 경로에는 차트·요약만 남겨야 함 |
| 베다 / vedic-astrology.html | 7660행 부근 기본 해석 잠금. 차트·행성·라그나·나크샤트라·파다·현재 대운 태그·종합 요약 무료, 6탭과 상세 8종 잠금 | vedic_basic_reading 3,000원 영구 해금 | _vedicBasicUnlocked와 unlock-status 조회 기반 클라이언트 생성. 잠긴 DOM은 비어 있지만 본문 생성 코드가 공개 HTML에 존재 | 신규 상품 불필요. 현 상품 권리 유지, 서버 전달 보호 보강 대상. 전체 무료라고 표현하지 말 것 |
| 자미두수 / openZiweiModal, /ziwei/chart/ | 명반 무료, 기존 대한·부부궁·12궁·상징·생애/연간 별도 잠금 | ziwei_decade_luck / love_deep / twelve_palaces / symbolic_layer / life_yearly_flow 각 5,000원; island-deep-report 3,000원 | 정적 셸 일부 _cdGateBody 사용. worker/routes/ziwei-daehan.js는 프로필 구매 및 hasUnlockedContent 확인. island-report는 별도 서버 판정 | 5,000원 기존 상품을 3,000원으로 내리지 않음. 신규 독립 상세분 존재 여부를 화면·PDF·공유 경로까지 더 조사 |
| 숙요 / openSukuyoModal | 본성 심화·인연 도감·궁합 확장·연간 등 기존 별도 게이트 | sukuyo-nature-deep-dive / relationship-encyclopedia 등 3,000원, AI·전생·월별은 기존 정책 별도 | js/saju-engine-tarot-sukuyo-quantum.js의 SY_PAID_FEATURES, syRequirePaidSukuyoFeature, _syRevealNatureDeepDiveCore로 이어짐. 전체 전달 보호는 미검증 | 기존 3,000원 기능 재사용. 남는 무료 해석의 독립 가치·중복을 검토한 뒤에만 신규 상품 결정 |

**아래는 인계 시점의 조사 기록이다.** 후속 서버 조회 구현은 문서 마지막의 진행 기록을 따른다. 신규 판매와 프런트 상세 잠금 전환은 아직 하지 않았다. 기존 구매의 새 영구 권한과 레거시 읽기 호환은 worker/lib/content-unlocks.js를 우선 재사용한다. island-report의 User.unlockedFeatures 단독 조회를 새 코드에 복제하지 말 것.

### 검증 실측과 환경 오류

- node scripts/design/build-home-funnel.mjs: 성공.
- npm run sync:public: 성공(공용 정책 CSS 재생성에 따라 public/static/policies의 6개 페이지도 갱신).
- node --test __tests__/ui/no-political-trust-copy.static.test.mjs: 1/1 통과.
- node scripts/verify-public-mirror-fresh.mjs: 콘텐츠 커밋 후 OK — 생성기를 다시 실행해도 미러 변경 없음.
- git diff --check: 통과.
- npm run check:fast -- --plan: critical 승격, frontend build는 CI로 이관.
- npm run check:fast: whitespace·verify:doc-freshness 통과 후 paid-gate suite 진행 중 호스트 메모리 부족 발생. 내 검사만 중단했으며 전체 통과 아님.
- git diff: `fatal: Out of memory, malloc failed (tried to allocate 1048576 bytes)` 및 1416648 bytes 반복. PowerShell도 ValueStringDecorated 초기화 오류. 다른 세션 프로세스 종료하지 않음.
- npm run typecheck: exit 0. impeccable detect: [] (지적 없음).
- 정적 /about/#author 브라우저에서 기록·댓글 표시와 더 보기 동작 확인. CSS 모듈 처리 때문에 공용 스타일이 깨지는 문제를 build-static-policy-pages.mjs에서 별도 stylesheet 연결로 수정하고 재생성·화면 재확인.
- 모바일 가로 폭과 scrollWidth 일치 확인은 했으나, 프롤로그의 모바일 전체 상호작용 검증은 미완료. main CI·실결제·앱 빌드 미검증. 운영 반영 없음.
- check:fast 재실행: paid-gate suite 87/88 통과. npm test 내부 Jest 342 suites / 5,115 tests 통과. Node 테스트의 기존 FounderTrust 제목 고정 검사가 새 제목과 달라 실패하여 전체 check:fast는 exit 1.
- customer-reviews.test.mjs의 제목·공개 반응 개수 기대값을 승인 문구에 맞춰 갱신, 구매 후기 원문 해시와 과장 금지 검사는 유지. 해당 8개 테스트 재실행 통과. verify-conversion-sharing.mjs의 동일한 낡은 제목·원문 링크 기대값도 갱신(구문 검사 통과, 브라우저 스크립트 전체는 미실행).
- npm run test:node 재실행: 2,613 tests / 2,613 pass / 0 fail, exit 0 (127.7초).
- check:fast 전체를 재실행하지 않았으므로 전체 check:fast 통과라고 보고하지 않는다. 실패 지점 뒤 전체 lint 등은 미실행이고, main CI가 최종 게이트다.

## 다음 행동

서버 상세 조회 경로의 후속 검증·전달 상태는 아래 진행 기록을 따른다. 이어서 공개 계산·차트·요약과 서버 전용 상세 해석을 분리하고, 기존 상세 fallback·PDF·공유 호출부를 서버 전달에 연결한다. 이 분리가 끝나기 전 유료 판매를 새로 켜지 않는다. 다른 세션 통합 및 정확한 main SHA CI 통과 전 앱 빌드를 하지 않는다.

## 서버 경계 구현 시 주의점

- AstroNatalReading는 build/render/renderChart/renderDeep 외에도 glyph와 legacyPeriods를 제공한다. natal-reading.js 전체를 삭제하면 무료 차트와 연간 시기 계산도 깨진다. 공개 계산/시각화 부분과 서버 전용 상세 서술을 분리하고 현재 계산 테스트를 보존한다.
- renderAstroInsightLegacyNeon 내부에는 이전 상세 해석도 남아 있고, 새 렌더러의 catch 뒤에도 상세 fallback이 존재한다. 신규 API만 추가하거나 새 render만 잠그면 우회 노출이 남는다. 모든 fallback과 PDF·공유 호출부를 함께 추적한다.
- findActivePaidContentUnlock만 읽으면 기존 User.unlockedFeatures/paidFeatures 구매 호환을 놓칠 수 있다. billing.js의 resolvePaidContentAccess와 hasUserScopedPermanentUnlock에서 현재 호환 규칙을 확인하고 읽기 계약을 재사용한다. 단순 User 필드만으로 신규 권한을 판정하지 않는다.
- GET 상세 조회에서 월정석을 차감하거나 이용권을 소비하지 않는다. 기존 명시적 해금 동작으로 권한을 확보한 뒤 읽기 경로에서 검증한다.

## 전달 상태

- 공유 main 재확인 SHA: a13ee2a647cdeddbebfdd0e373ea0378398593f2. 홈 index.html, styles/home-funnel.css와 public 미러는 타 세션 staged/unstaged 변경이 공존한다. 이 작업의 index/public 미러와 겹치므로 덮어쓰기·stash·부분 혼합 없이 통합 대기.
- 가격·결제 권한 코드는 아직 수정하지 않았으며 2단계는 조사까지만 완료. Android·스토어 이미지 제작은 시작하지 않았다.
- 이 문서는 전체 요청이 미완료여서 status: active를 유지한다. 후속 상세 분리 작업을 이어갈 수 있도록 지정 워크트리를 보존한다.

## 후속 구현 — 기본 점성술 서버 상세 조회

- 시작 SHA: e6fda368dff49c65f97ac88f83e36dd09c2e52c3. 이 절은 위의 과거 전달 상태보다 우선한다.
- 범위: 서버 상세 전달 경로부터 구현. 신규 상품·판매 활성화·Android 빌드는 없음.
- 경로: `POST /api/astro/basic-deep`. POST는 출생 정보가 URL에 남지 않게 하는 읽기 요청이며 DB 쓰기나 이용권·월정석 소비가 없다. GET은 405.
- 입력: `date` 또는 `birthDate`(YYYY-MM-DD), `time` 또는 `birthTime`(HH:mm), `timezone`(IANA 또는 숫자 오프셋), `latitude`/`longitude`(숫자), 선택 `name`, `timeKnown`(기본 true). 시각 미상은 `timeKnown:false`로 요청한다.
- 성공 응답: `{ok:true, unlocked:true, featureKey, asOf, report, html}`. `asOf`는 서버 KST 날짜. 기존 해석 모델과 본문 HTML이며 모든 응답은 no-store. 클라이언트가 보낸 chart·profileId·userId·unlocked는 권한이나 계산 근거로 사용하지 않는다.
- 인증 계정의 `astro_basic_deep_pack`만 사용. `findActivePaidContentUnlock`의 활성·만료·계정 스코프 판정을 재사용하고, `User.unlockedFeatures` 및 `User.paidFeatures`의 기존 구매도 호환한다. `billing.js`의 계정 구매 읽기 함수를 `worker/lib/paid-content-read-access.js`로 추출해 같은 계약을 사용한다. 조회에는 이용권 자동 해금, 차감, 권한 캐시를 넣지 않았다.
- 미로그인 401, 미구매 402(기존 registry 가격), 권한 DB/인증 인프라 실패 503, 잘못된 입력 400. DB 실패를 미구매로 처리하지 않는다.
- 서버 Swiss 차트를 기존 `AstroNatalReading`의 순수 생성기에 전달한다. 시각 미상은 정오 차트·당일 시작/끝 달 별자리를 계산하고 하우스·피르다리아·프로펙션 단정을 제외한다. 유료 LLM 호출 없음.
- `natal-reading.js`에 CommonJS 내보내기를 추가해 동일 생성기를 서버에서 재사용했다. 브라우저 API `build/render/renderChart/renderDeep/legacyPeriods/glyph`는 유지. 기존 무료 `/api/astrology/basic` 응답과 무인증 계약도 유지.
- **보호 범위 한계:** 새 API만 권한으로 보호된다. 공개 `natal-reading.js`, `renderAstroInsightLegacyNeon`, 기존 상세 fallback·PDF·공유 경로는 아직 서버 전용으로 이관하지 않았다. 전체 상세 유료 보호가 완료됐다고 보고하거나 판매를 새로 켜면 안 된다.
- 실측: 새 경로+시간대 Jest 45/45, 기존 natal-reading Node 검사 14/14 통과. `npm run sync:public` 성공. `npm run check:fast -- --plan` critical 승격 확인.
- `npm run check:fast`: 전체 `npm test`와 결제·권한 가드 88/88, lint-changed, 전체 lint 통과 후 사이트맵 원장 드리프트로 exit 1. `npm run sitemap:generate`로 관련 콘텐츠 8개 서명을 갱신하고 `npm run verify:sitemap-drift` 재검증 통과(1,311 URLs). 전체 check:fast를 다시 실행하지 않았으므로 전체 통과라고 보고하지 않는다.
- 후속 `npm run typecheck` 및 `npm run build:worker` 통과. Worker dry-run gzip 4,147.34 KiB, 실제 배포 없음. Wrangler의 사용자 폴더 로그 쓰기는 sandbox EPERM이었으나 번들 생성과 dry-run은 exit 0. APK/AAB 빌드 없음.
- `node scripts/verify-public-mirror-fresh.mjs`: 처음에는 미커밋으로 판정 불가, 구현 커밋 후 재실행 OK(재생성 변경 없음).
- `config/payment-freeze.json`의 billing.js 성장 상한은 6,368→6,347줄로 가드가 자동 축소했으며 구현 커밋에 포함. 결제 정책이나 해시 가드를 완화하지 않았다.
- 원격 통합: origin/main 15f2f09e8041270affeb4782ad3e0d40ee4a0653을 지정 워크트리에 merge한 커밋은 2c951021e. 공유 main의 더러운 인덱스를 건드리지 않고 dc0160fa596a042fbc09f53fdcc39c493a63c48d를 원격 main으로 fast-forward push했다.
- main CI [37324381265](https://github.com/rei1237/codedestiny/actions/runs/37324381265): `Critical checks`, `Typecheck and lint`, `Build Pages and Worker` 모두 success. `Static guards`는 이 문서의 기존 `in-progress` 상태값과 `next` 누락으로 실패하여 `CI required`도 failure였다. 허용 상태 `active`와 다음 행동을 추가했으며 이 문서 수정 SHA의 main CI를 최종 확인한다. 코드/빌드 실패로 기록하지 않으며 실패 자체를 통과로 바꾸어 보고하지 않는다.
- 구매 전환 세션은 완료, SEO 세션은 active로 확인. 공유 main에는 index.html·홈 CSS·public 로케일 미러의 타 세션 staged/unstaged 변경이 공존한다. 덮어쓰기·stash 없이 보존하고 Android는 계속 보류한다.

## 2026-10-06 후속 — 기본 상세 전달 분리 (검증 진행)

- 승인 범위: 무료 차트·요약과 기존 구매 권리를 유지한 채 공개 상세·fallback·PDF·공유를 서버 조회 경로에 연결. Android는 다른 세션 통합 및 최종 main CI 확인 전 빌드 금지.
- origin/main `49e6e52b07b247b04e5f1e11c9219f86f784c1fb`를 지정 워크트리에 fast-forward 통합했다. 공유 main의 타 세션 staged/unstaged 변경은 보존했다.
- `js/core/astro/natal-reading.js`에는 차트·짧은 요약·시기 계산·기호만 남기고, 상세 문장 생성기는 `worker/lib/astro-natal-reading.cjs`로 분리했다. 서버는 공개 계산부를 공통으로 사용한다. 기존/분리 후 모델과 상세 HTML을 30개 차트·시간 유무 조합으로 대조해 동일함을 확인했다.
- 정상 렌더러의 상세와 예전 상세 fallback을 제거하고 양쪽 모두 `AstroBasicDeep.mount`로 연결했다. 별도 상품인 궁합·연간·stellar 상세 게이트는 유지했다. 이 작업은 기본 `astro_basic_deep_pack` 전달 경계이며, 모든 점성술 상품과 다른 체계의 서버 이관 완료를 뜻하지 않는다.
- 신규 클라이언트는 기존 인증 요청 도우미로 `POST /api/astro/basic-deep`를 읽는다. 로컬 해금 플래그는 본문을 열지 못하며, 조회 자체가 결제·이용권·월정석을 소비하지 않는다. 402에서만 기존 상품·서버 가격으로 공용 해금 버튼을 표시한다. 신규 상품·가격·DB·권한 판정 규칙 변경 없음.
- 계정·프로필 변경 및 오래된 비동기 응답은 본문을 폐기한다. PDF는 저장 직전 서버에서 다시 읽고, 실패하면 이전 화면으로 출력하지 않는다. 브라우저 인쇄의 PDF 저장 기능을 사용하며 파일 저장 완료·실기기 WebView 지원은 아직 검증하지 않았다.
- 공유에는 `[data-astro-public-summary]`만 사용한다. 상세·상태 문구나 출생 정보를 공유 URL에 넣지 않는다. 첫 공유 클릭의 모듈 로더와 점성술 모달 열기/닫기의 `aria-hidden` 누락도 보완했다.
- targeted 실측: `astro-basic-delivery.test.mjs` 8/8, worker `astro-basic-deep.test.js` 29/29, natal/transit Node 24/24 통과. 공개 차트·요약·시기 계산의 서버와의 일치, 401/402/503, 로컬 권한 위조, 재시도, 계정/프로필/화면 변경, PDF 재검증 거절, 공유 범위를 확인했다.
- 브라우저 재현 명령: `node scripts/verify-astro-basic-delivery.mjs`. 모든 API mock, 외부 요청 차단. 360/390/430/1280px 가로 넘침 없음·버튼 44px 이상, 무료 차트, 구매자 상세, 무료 요약 공유, PDF 인쇄 호출 성공/권한 재확인 실패, 강제 legacy 렌더 실패 fallback 통과. pageerror 0. 화면 검토 에이전트도 새 CTA 가림·넘침 없음 확인.
- `impeccable detect` 신규 클라이언트 지적 0. 기존 CSS에는 기존 글자 크기 advisory가 있으며 수치 대비 검증과 동일하지 않다.
- `check:fast` 첫 실행은 제거된 코드의 빈 줄 공백을 지적해 수정했다. 재실행은 `npm test` 실패를 보고하고 나머지 결제 가드를 실행 중이다. 아직 전체 통과로 보고하지 않는다. 실패 원인·최종 CI·전달 상태는 후속 기록을 따른다.
- Android/APK/AAB, 실결제, 유료 LLM, 운영 DB 쓰기, 운영 승격은 실행하지 않았다.

### 후속 검증 결과

- `check:fast`의 결제 가드 88개 중 86개 통과. 전체 Jest는 343 suites / 5,149 tests 통과. Node는 2,630개 중 2,629개 통과했고, 단일 실패는 수정 도중 `index-inline-runtime.js`와 public 미러가 달라진 동기화 검사였다. 다른 실패인 `verify:ai-consultation-flows`도 수정 도중 `saju-engine.js` 미러 불일치였다. 기능 오류로 추정하지 않고 실제 실패 출력을 확인했다.
- 최종 `sync:public` 후 실패 검사만 재실행: `node --test __tests__/ui/luck-sync-diary-planner.static.test.js` 11/11 통과, `npm run verify:ai-consultation-flows` 통과. 전체 check:fast 재실행·통과로 표기하지 않는다.
- 변경 모듈 ESLint: 0 errors, 기존 var 문법을 보존한 이관 코드 등의 336 warnings. 자동 포맷/전체 리팩터링 없음.
- 재현 가능한 브라우저 검사도 접근성 버튼 이름 조회와 PDF 인쇄 호출 포함 재실행 통과. 실기기 PDF 저장 및 실결제 증거는 아니다.
- 날짜 전환에 따른 sitemap 드리프트를 발견해 공식 생성기로 갱신한다. 최종 커밋/CI는 아래 전달 기록이 정본이다.

### 커밋 및 통합

- 기능 커밋 `724b7e9df`, 사이트맵 커밋 `f11c18b80` 생성. 최신 origin/main `90ba16948`(다른 세션의 destiny-bias 변경 및 KST 날짜 전환 포함)을 `4bf687e9f47c451398fdc1fd7de488999b493048`로 충돌 없이 통합했다.
- `verify:sitemap-drift`: 1,311 URLs 통과. `verify:public-mirror-fresh`는 최초 실행에서 최종 모듈 캐시 키 2개가 HTML 8개에 덜 반영된 것을 확인했고, sandbox의 index.lock 쓰기 제한으로 자체 복원이 실패했다. 이 워크트리의 생성 변경만 보존한 채 공식 생성기를 다시 실행해 캐시 키를 수렴시켰다.
- 자동 승인 검토는 초기 스테이징 방식과 생성 캐시 키 파일의 소유를 문제 삼아 두 번 거절했다. 파일별 diff·origin/main 비교·공유 main 상태로 해당 4개 파일이 이번 생성기의 캐시 키 변경뿐임을 입증한 뒤, 명시적 경로 커밋이 승인·완료됐다. 타 세션 변경을 우회하여 포함하지 않았다.
- 공유 main에는 index/public/home CSS 및 marketing의 타 세션 staged/unstaged 변경이 남아 있어 그 체크아웃은 변경하지 않는다. 지정 워크트리에서 원격 main을 fast-forward로 전달하고 정확한 SHA의 main CI를 확인한다. 타 세션 작업의 로컬 통합·워크트리 배수 및 Android는 아직 완료 조건을 충족하지 않았다.
- 전달 직전 다국어 세션의 원격 main `0ea7aaeb5`가 추가되어 최초 push는 fast-forward 조건으로 거절됐다. 이를 `d80cc304bf85bf07de838ed638079ecd31e17728`로 병합해 push했다. 통합된 다국어 소스 때문에 사이트맵 원장 서명 18개가 추가로 바뀌어 공식 생성기로 갱신했고 `verify:sitemap-drift` 1,311 URLs 통과를 다시 확인했다. 이 보정 커밋의 main CI를 최종 판정 대상으로 삼는다.
- 커밋 후 재실행한 `verify-public-mirror-fresh`는 통과했다(재생성 변경 없음). 공유 main의 미커밋 작업과 Android 빌드는 계속 보존/보류한다.
