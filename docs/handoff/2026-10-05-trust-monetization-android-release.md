---
status: in-progress
updated: 2026-10-05
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
- 마지막 코드/검사 커밋: b70240a5ab6bf9c43427e29c9f9a8bf6249c23c1. main 통합·push·CI는 아직 없음.
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

**유료화 구현은 아직 하지 않았다.** 가격·권한·API·DB·결제 로직 변경 없음. 잠금 버튼만 추가하는 수정은 승인한 서버 보호 기준을 충족하지 못하므로 하지 않았다. 기존 구매의 새 영구 권한과 레거시 읽기 호환은 worker/lib/content-unlocks.js를 우선 재사용한다. island-report의 User.unlockedFeatures 단독 조회를 새 코드에 복제하지 말 것.

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

격리 작업 디렉터리의 b70240a5a 커밋을 출발점으로, 점성술 기존 astro_basic_deep_pack 권한을 사용하는 서버 상세 전달 경로를 구현한다. 콘텐츠 커밋은 끝났고 public mirror freshness도 통과했다. 무료 요약/상세 분리 전에 유료 판매를 새로 켜지 않는다. 다른 세션 통합 전 앱 빌드는 보류한다.

## 서버 경계 구현 시 주의점

- AstroNatalReading는 build/render/renderChart/renderDeep 외에도 glyph와 legacyPeriods를 제공한다. natal-reading.js 전체를 삭제하면 무료 차트와 연간 시기 계산도 깨진다. 공개 계산/시각화 부분과 서버 전용 상세 서술을 분리하고 현재 계산 테스트를 보존한다.
- renderAstroInsightLegacyNeon 내부에는 이전 상세 해석도 남아 있고, 새 렌더러의 catch 뒤에도 상세 fallback이 존재한다. 신규 API만 추가하거나 새 render만 잠그면 우회 노출이 남는다. 모든 fallback과 PDF·공유 호출부를 함께 추적한다.
- findActivePaidContentUnlock만 읽으면 기존 User.unlockedFeatures/paidFeatures 구매 호환을 놓칠 수 있다. billing.js의 resolvePaidContentAccess와 hasUserScopedPermanentUnlock에서 현재 호환 규칙을 확인하고 읽기 계약을 재사용한다. 단순 User 필드만으로 신규 권한을 판정하지 않는다.
- GET 상세 조회에서 월정석을 차감하거나 이용권을 소비하지 않는다. 기존 명시적 해금 동작으로 권한을 확보한 뒤 읽기 경로에서 검증한다.

## 전달 상태

- 공유 main 재확인 SHA: a13ee2a647cdeddbebfdd0e373ea0378398593f2. 홈 index.html, styles/home-funnel.css와 public 미러는 타 세션 staged/unstaged 변경이 공존한다. 이 작업의 index/public 미러와 겹치므로 덮어쓰기·stash·부분 혼합 없이 통합 대기.
- 가격·결제 권한 코드는 아직 수정하지 않았으며 2단계는 조사까지만 완료. Android·스토어 이미지 제작은 시작하지 않았다.
- 이 문서는 전체 요청이 미완료여서 status: in-progress를 유지한다. 다른 세션에서 이어갈 수 있도록 미통합 작업과 워크트리를 보존한다.
