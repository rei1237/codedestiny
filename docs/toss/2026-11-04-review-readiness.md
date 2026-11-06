# 앱인토스 심사 준비: 확인된 사실과 남은 게이트

확인일: 2026-11-04 (KST). 이 문서는 심사 통과 또는 제출 가능 판정이 아니다. 콘솔 설정과 외부 정책은 제출 직전에 다시 확인한다.

2026-11-06 뒤로가기: [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame)는 토스 내비게이션과 별도 뒤로가기 버튼을 동시에 표시하지 않도록 요구한다. 토스 연이 편지 상담과 오미쿠지의 중복 버튼을 제거하고 네이티브 뒤로가기 이벤트의 단계 이동과 입력 보존을 로컬 모의 검사했다. 다른 서비스 전체와 실제 기기는 아직 미검증이다.

2026-11-06 오미쿠지: 원본의 결정적 결과 엔진을 빌드 시 읽어 토스 입력·제비 뽑기·재추첨·부적·결과 보기를 연결했다. 로그인 계정의 질문과 결과는 같은 브라우저 세션에서 계정별로만 복구하며, 비로그인 결과는 메모리에만 남고 화면을 닫으면 사라진다. 기기 간 기록과 비로그인 결과 재열람은 미구현이다. [공식 클립보드 SDK](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/clipboard/clipboard.settext)의 쓰기 권한을 설정하고 거부를 별도로 표시하며 [공식 공유 SDK](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/share/share.createlink)의 토스 딥링크를 사용한다. 공유 문구에는 질문 원문을 넣지 않는다. 복사·공유 브리지의 중복 호출을 막고 화면 이탈 뒤 늦게 도착한 공유 링크는 열지 않으며 권한·로그인·버전 오류를 구분한다. 로컬 React 모의 검사만 수행했고 실제 토스 기기, 콘솔 권한 및 정책·개인정보 고지는 미검증이다. 원본 웹의 카카오 SDK는 토스 번들에서 사용하지 않는다.

2026-11-06 사주 FPTI 조사: 무료 계산 외에 별도 심층 리포트가 있다. 원본 `worker/routes/fpti.js`의 `premium-fpti-report`는 저장 프로필의 출생정보를 기준으로 영구 해금을 확인하고 보관된 리포트를 읽는다. 토스 SKU·프로필 권리 대응과 원본의 로컬 저장·권한 오류 경계를 검증하지 않았으므로 단건 상담으로 바꾸거나 전체 이식을 완료로 처리하지 않는다.

2026-11-06 결제 화면·이벤트 경계: [단건 구매 SDK](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.createonetimepurchaseorder)가 제공하는 성공 이벤트의 주문 번호를 지급에 사용한 주문 번호와 대조한다. 불일치하거나 응답이 잘못되면 성공 화면을 열지 않고 추가 결제를 차단한다. 찻집·숙요 공통 가격은 계정이나 상품이 바뀌는 렌더에서도 이전 범위의 금액을 숨긴다. 모두 로컬 모의 검증이며 실제 구매자 식별, 주문 번호 없는 재시작 복구, 콘솔 승인·가격 대조 및 공식 기기 검증은 여전히 출시 차단이다.

2026-11-06 숙요 구매 복구: 미연결 주문은 검증된 계정·상품·가격의 준비 입력을 사용자가 선택한 경우에만 연결한다. 저장 입력이 없을 때 새 입력을 기존 주문에 연결하고, 권한을 재확인한 생성 실패 결과를 같은 주문으로 명시적으로 재시도하는 경로를 로컬 모의 환경에서 검증했다. `toss_sukuyo_prepared_recovery_v1`은 스키마에만 선언했으며 `autoIndex:false`이므로 운영 인덱스를 생성하거나 확인하지 않았다. 공식 기기, SKU, 최초 구매자 결합 및 주문 번호 없는 결제의 판정을 대신하지 않는다.

2026-11-06 마야 구매 복구: 미연결 주문에 대해 같은 계정·상품·저장 가격의 준비 입력을 검증하고 사용자가 선택한 입력에만 연결하는 경로를 추가했다. 조회 전후 주문과 세션을 다시 확인하며, 연결 응답의 결제 상태나 주문 번호가 다르면 새 결제창을 열지 않는다. `toss_maya_prepared_recovery_v1` 인덱스는 스키마에 선언하고 출시 인덱스 검사 대상에 포함했으나 `autoIndex:false`이므로 운영 인덱스의 생성·실물 검증은 하지 않았고 출시 차단이다. 이 복구는 주문 번호를 받지 못한 결제의 상태 판정, 최초 구매자 검증, 실제 판매가 대조 또는 공식 기기 시험을 대체하지 않는다.

2026-11-06 통합 검증: 다른 세션의 최신 원격 main `a5fe57bdd7eb6c0aaab08592d9720a54f73ab7bb`을 전용 워크트리에서 통합했다(`7c431ae36c0a47c7ca4d19d7e201290f73a07f8e`). 사이트맵 원장과 네 XML 충돌은 병합 소스의 서명으로 재생성했고 URL 1,059개 드리프트 검사가 통과했다. 원격 main에 있던 `app/components/service-packs/service-packs.module.css`의 마지막 빈 줄 한 줄은 통합 공백 검사를 통과하도록 제거했다. 통합 트리 `check:fast`는 Node 4,623개·Jest 7,675개를 통과했고, 앱인토스 mock 659개와 로컬 번들도 통과했다. 다른 세션의 미커밋 파일은 건드리지 않았다. 이 통합은 main 반영·push·GitHub CI 또는 공식 기기 시험이 아니다.

2026-11-06 지급 콜백 호환성: 공식 [단건 결제 SDK](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.createonetimepurchaseorder)는 결제 API의 기본 지원 버전보다 높은 Android 5.231.1·iOS 5.230.0부터 지급 콜백의 성공·실패 반환 처리를 명시한다. `apps/toss/src/platform.ts`는 공식 `isMinVersionSupported`로 두 구매 진입점을 확인하며 미지원 시 새 결제창을 열지 않는다. 조회가 던진 인증·권한 오류는 원형을 유지하고, 미지급 주문 복구에는 이 추가 버전 제한을 적용하지 않는다. 연이 화면은 미지원 시 업데이트를 안내한다. 앱인토스 전용 mock 659개, 공식 devtools SDK mock, `check:fast`의 결제 게이트 77개·Node 4,529개·Jest 7,534개와 로컬 앱 번들이 통과했다. 모의 테스트는 버전별 실제 기기 동작이나 실제 주문을 증명하지 않는다.

2026-11-06 추가 주문 검증 근거: [토스 운영진의 11월 5일 답변](https://techchat-apps-in-toss.toss.im/t/topic/5122)은 구매자 검증 API가 아직 제공되지 않고 QR 테스트는 실제 과금이라고 설명한다. [11월 3일 답변](https://techchat-apps-in-toss.toss.im/t/anonkey-iap/5097/6)은 SDK 콜백과 주문별 중복 방지 권고와 별개로 서버 독립 구매자 검증은 제공되지 않는다고 명시한다. 최초 주문 매핑은 여전히 출시 차단이다. [운영진의 가격 안내](https://techchat-apps-in-toss.toss.im/t/topic/4839/2)에 따르면 상품 가격은 콘솔 변경만으로 SDK 표시 금액에 반영될 수 있으므로 등록 시뿐 아니라 변경 시에도 기존 가격 정본과 최종 판매가를 대조해야 한다.

2026-11-06 홈 권한 경계: 홈 셸은 `ApiError`뿐 아니라 SDK가 전달한 일반 객체의 401·403과 `ACCESS_DENIED`도 구분하고, 거부된 이전 결과와 만료 계정의 화면 상태를 숨긴다. 재승인 전 지연 응답, 계정 만료와 기존 결과 재조회는 모의 검사했다. 공식 기기와 전체 서비스의 권한 오류는 미검증이다. 연이 편지 질문을 비운 뒤 나가면 본인 또는 명시적으로 복원한 비회원의 초안만 제거하고 다른 계정 초안은 보존한다.

2026-11-06 결제 회귀: 주문서 이탈을 확정 취소로 가정하지 않고 상담과 타로 구매에서 같은 실행 세션의 추가 결제를 차단한다. 앱인토스 모의 테스트 586개와 공식 devtools 목, `check:fast`(Node 4,529개·Jest 7,525개)를 통과했다. 앱 재시작·다른 기기에서의 차단과, 주문 ID를 받기 전에 중단된 주문의 상태 확인 및 안전한 해제는 여전히 미구현이다. [주문 상태 조회](https://developers-apps-in-toss.toss.im/api/iap)는 주문 ID를 요구하고 [미지급 주문 조회](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.getpendingorders)는 결제 완료 주문만 반환하므로 빈 목록을 미결제 증거로 취급하지 않는다. 공식 테스트 환경에서 전체 흐름을 확인하기 전까지 출시 차단이다.

2026-11-06 주문 소유권 출시 차단: `worker/toss/partner.js`는 주문 조회 전 로컬 사용자 식별자를 요구하지만 공식 API가 받지 않는 사용자 헤더는 보내지 않는다. `worker/toss/policy.js:checkOrder`는 주문 ID·SKU·상태를 검사한다. 저장된 주문은 `worker/toss/grant.js`에서 소유 계정을 비교하지만 첫 지급 시에는 응답이 구매자와 일치하는지 별도 근거가 필요하다. 공식 [인앱 결제 SDK의 주문 조회 API 설명](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iap/in-app-purchase#api)은 이 API가 사용자 헤더를 받지 않는다고 명시하고 응답에 구매자 식별자가 없다. [2026-10-19 토스 개발자 커뮤니티 운영진 답변](https://techchat-apps-in-toss.toss.im/t/iap/5022/2)도 당시 사용자와 주문을 연결해 검증하는 API가 제공되지 않는다고 설명한다. 따라서 로컬 식별자 확인이나 최초 제출자 고정만으로 구매자를 검증했다고 볼 수 없으며, 공식적으로 확인된 대안과 실제 테스트 전까지 출시 차단이다. [완료·환불 주문 목록 SDK](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iap/in-app-purchase#getcompletedorrefundedorders)는 완료·환불 거래를 조회하지만 진행 중 거래의 부재를 증명하지 않는다.

2026-11-06 개인정보 근거 추가: 운영 Worker `code-destiny-web`의 비밀 변수 **이름만** 읽은 결과 `GEMINIF_API_KEY`가 등록되어 있으며 `worker/lib/gemini.js:pickGeminiKeys`도 이 이름을 사용한다. 비밀값이나 운영 상담은 읽지 않았다. 등록 사실만으로 실제 Google 프로젝트, 과금 상태, 데이터 처리 국가를 확정할 수 없다. [Gemini API 약관](https://ai.google.dev/gemini-api/terms)은 유료 서비스 여부에 따라 처리 조건을 구분하고 유료 서비스 데이터의 일시 저장·캐시가 Google 또는 대리인의 시설이 있는 국가에서 이뤄질 수 있다고 설명한다. 실제 프로젝트와 계약, 수탁·국외 이전 고지를 확인하기 전 개인정보 심사 항목은 미통과다.

2026-11-06 관측성 차단: `worker/toss/routes.js:/events`는 허용된 클라이언트 이벤트만 선택적 `TOSS_ANALYTICS` 바인딩에 기록하고, `worker/toss/policy.js`는 결제 확인·생성 완료 등 서버 전용 이벤트를 클라이언트에서 거부한다. 현재 추적한 `worker/toss` 경로만으로 서버 전용 이벤트의 실제 기록과 중복 방지, 바인딩 활성화 또는 오류 추적을 입증하지 못했다. 부재를 단정하지 않고 전체 출시 흐름에서 실제 이벤트와 오류 추적의 누락·중복을 검증하기 전까지 차단으로 둔다.

| 항목 | 확인 근거 | 현재 판정 |
|---|---|---|
| 서비스 범위 | `docs/toss/build-service-inventory.mjs`, `full-service-inventory.json`, `apps/toss/scripts/launch-status.mjs` | 현재 홈·React·시각 레지스트리 재생성 결과 후보 89, 수동 근거에 따른 부분 구현 32, 추가 추적 57. 전체 라우트와 구현 계약, 완전 검증·출시 제외 미확정. |
| 권한·결제 | `worker/toss/catalog.js`, `apps/toss/src/release.ts`; 콘솔 인앱 상품 목록 | 승인 상품 배열 비어 있음, 앱 공개 게이트 닫힘, 콘솔 상품 없음. 가격·권리·승인 상태 대조 전 판매 금지. 인생의 책과 인생 총운은 기능 키에 따라 표시 이름을 구분하도록 수정했으며 공식 기기 검증은 남았다. |
| 상품 수 | [공식 인앱 결제 가이드](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment) | 비게임 최대 30개. 개별 서비스 권리와 기존 가격을 보존하는 매핑 미확정. |
| 로그인·서버 인증 | 콘솔 토스 로그인 및 mTLS 화면 | 로그인 설정 미등록, 인증서 발급 안내 상태. 발급·설정·실제 연동 검증 필요. |
| 개인정보·탈퇴 | `apps/toss/src/App.tsx`, `worker/toss/session.js` | 앱 안내는 준비용이며 개인정보 삭제 처리도 제공 예정으로 표시. 콘솔은 이름 필수 동의를 표시하므로 실제 처리 및 고지를 대조해야 한다. |
| 데이터 위치 | Atlas `Codedestiny` / `Neo` 개요와 백업 목록, Cloudflare R2 `bugs` 설정 | Atlas 클러스터와 표시된 33개 스냅샷은 AWS 서울. R2 피드백 버킷은 Asia-Pacific으로 표시. 각 기능의 최종 바인딩, R2 국가, 모든 복제·수탁 계약은 미확인. 운영 레코드는 조회하지 않았다. |
| AI 제공·보관 | `worker/routes/life-book-ai.js`, `worker/routes/love-secret-ai.js`; [Gemini API 약관](https://aistudio.google.com/docs/terms), [보관 안내](https://aistudio.google.com/docs/zdr) | 코드에서 Gemini와 Workers AI 경로 확인. Google은 유료 API에도 제한적인 안전 목적 로그 및 여러 국가의 일시 저장 가능성을 명시한다. Google AI Studio에 가져온 Gemini 프로젝트 한 개가 Tier 1로 표시되나 실제 운영 키와의 연결은 미확인. 보관 설정과 전체 처리 국가도 미확인. |
| 연령·콘텐츠 | 콘솔 앱 정보는 만 19세 이상으로 표시; [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide), [Gemini API 약관](https://aistudio.google.com/docs/terms) | 전체 콘텐츠 및 실제 연령 차단 동작은 미검증. API 약관은 18세 미만을 대상으로 하거나 접근 가능성이 높은 서비스 사용을 제한한다. |
| 앱 정보·심사 자료 | 콘솔 앱 출시·등록 화면 | 아이콘·썸네일 배경이 포함된 꽉 찬 사각형 필요로 반려. 앱 정보 승인, 최신 번들·스크린샷·심사 메모 미완료. |
| 기기 테스트 | [SDK 테스트 안내](https://developers-apps-in-toss.toss.im/development/test/sandbox), [토스 앱 테스트](https://developers-apps-in-toss.toss.im/guide/operation/toss) | SDK 3.x 별도 샌드박스 앱은 제공되지 않는다고 안내. 개발 도구 및 업로드 번들의 토스 앱 테스트 스킴에서 전체 출시 경로를 확인해야 한다. 미실행. |
| 결제·결과 복구 | `apps/toss/test/` | 2026-11-05 최신 main 병합 후 앱인토스 모의 테스트 467/467 통과. `node apps/toss/test/official-devtools-check.cjs`는 공식 devtools 3.9 SDK 목과 가짜 서버에서 상품 목록·지급·취소·미지급 복구를 통과했으나, 목 주문 ID는 실제 UUID가 아니며 서버 주문 검증이나 실제 기기 검증이 아니다. 계정 변경 중 이전 성공·401 응답, 스트리밍, 로그아웃·연결 해제 경합을 추가 검증했다. 실제 상품·토스 앱·서버 연동 증거가 아니다. 공식 문서의 미결 주문 확인을 두 셸의 로그인 복원·로그인 뒤에 연결하고 중복 복구 및 세션 전환을 모의 검사했다. 공식 [미결 주문 조회](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.getpendingorders)와 [지급 완료](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.completeproductgrant)는 `isSupported()` 사전 확인과 미지원 시 업데이트 안내를 명시한다. 두 API의 `isSupported()` 확인과 미지원 버전·잘못된 조회 응답·복구 실패 시 신규 결제 차단을 구현하고 모의 테스트했다. SDK와 실기기 검증은 미실행이다. 홈 셸의 보관함과 직접 결과 경로는 복구 완료 후 다시 조회하도록 고쳤으며 지연·부분 실패를 모의 검증했다. 별도 서비스 셸의 기록 화면도 검색·필터를 유지하며 재조회하도록 수정했다. 서비스별 결과 화면 갱신과 실제 기기 동작은 확인이 필요하다. 인생의 책·연애 비책의 공유 화면에 토스 결제 권한·복구·취소 안내 전달을 추가했다. 두 상담의 토스 생성 실패 응답과 주요 시작 화면은 미차감·자동 복구를 단정하지 않도록 수정했다. 두 결과 전용 화면의 403은 기존 결과를 숨기도록 모의 검사했다. 다른 실패 경로와 실제 기기는 미검증이다. 토스 경로에서 오류와 지급 상태 안내를 보존해야 한다. 두 공유 화면은 권한 확인 장애를 결제 게이트로 이어 보내는 웹 복구 분기도 있어, 토스 어댑터의 재확인이 실패할 때 결제창이 열리지 않는지 검증해야 한다. 연애 비책 추가 질문은 토스의 저장된 상담과 구매 권한을 다시 확인하는 화면·서버·복구 경로를 연결하고 모의 검사했다. 최초 구매자 검증, AI 안전 요건과 공식 기기 검증은 미완료다. |
| 비게임 공식 필수 기준 | [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame); `apps/toss/src/App.tsx`, `worker/toss/models.js`, `src/features/neo-war-room/neo-operation-room-result.module.css` | 연결 해제 뒤 사용자 데이터 삭제, 로그인·결제 데이터 암호화 범위, 라이트 모드와 네비게이션/기기 동작을 증명해야 한다. 앱 탈퇴 안내는 삭제가 준비 중이라 명시하고, `worker/toss/session.js`는 세션을 삭제하지만 기존 소유자 식별자를 재활성화한다. [토스 로그인 안내](https://developers-apps-in-toss.toss.im/guide/authentication/intro)는 연결 해제 후 재로그인에도 같은 사용자 키가 전달될 수 있다고 설명한다. 네오 결과 CSS는 `color-scheme: dark`를 지정한다. `apps/toss/index.html`의 viewport에는 공식 [핀치 줌 설정](https://developers-apps-in-toss.toss.im/documentation/integration/props#disable-pinch-zoom)이 없어 기기별 조정·접근성 검증이 필요하다. 실제 토스 렌더링과 저장 설정은 미검증이다. |
| 찻집 편지 상담 진입 | `lib/fortune/yeoni-entry.ts`, `app/fortune-tea-house/FortuneTeaHouseClient.tsx`, `apps/toss/service/Screens.jsx` | `?counsel=letter`는 원본 연이 상담 입력을 사용하는 토스 편지 화면으로 연결한다. 토스 계정의 상담·구매 권한과 보관함 결과를 재확인하고, 찻집 저장 결과 및 뒤로가기 경로를 모의 테스트했다. 웹 계정의 과거 상담 이전·앨범 동등성, 승인 상품과 공식 기기 검증은 미완료다. |
| 외부 링크·뒤로가기·접근성·오류 | `apps/toss/src/main.tsx`, `apps/toss/service/Screens.jsx` 등 | 코드 경계는 있으나 공식 기기에서 출시 대상 전체 검증 전이다. |

삭제 범위 조사 출발점: 토스 전용 `TossIdentity`, `TossSession`, `TossPurchase`, `TossNativeConsultation` 외에 토스 어댑터는 `ProfileCard`, `YeongnyangiRequest`, `PaidExecutionRecord`와 원본 인생의 책·연애 비책·네오·찻집 결과 경로를 사용한다. 찻집 원본은 결과·타로 초안·지갑·원장 컬렉션도 참조한다. 이는 코드상 조사 후보이며 모든 토스 경로의 실제 쓰기와 법정 보존 대상이 확인된 완전한 삭제 목록이 아니다. 재연결, 진행 중 생성, 환불과 보존 의무를 검증하기 전 운영 삭제를 실행하지 않는다.

추가 조사: 찻집 그룹 생성은 `worker/routes/fortune-tea-house.js`의 `createLlmCacheStore`를 사용한다. `worker/lib/llm-cache-store.js`는 응답 텍스트를 `cacheKey`로 저장하며 찻집의 만료 기준은 30일이다. MongoDB TTL의 물리 삭제는 비동기이므로 실제 보관 기간을 30일 이내라고 단정할 수 없다. 이 인터페이스에는 사용자별 삭제 인자가 없으므로 토스 상담 응답이 캐시되는 조건과 삭제·만료 보장, 공유 캐시의 다른 사용자 데이터 보호를 확인해야 한다. 운영 캐시를 조회하지 않았다.

[전자상거래법 시행령 제6조](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0006&lsiSeq=288143&urlMode=lsScJoRltInfoR)는 일정한 계약·청약철회 및 대금결제·공급 기록 5년, 소비자 불만·분쟁 처리 기록 3년을 규정한다. 토스 결제에서 각 사업자의 보존 주체·필드, 접근 분리 및 연결 해제 시 처리 방법은 별도로 확인해야 하며 이 근거만으로 상담 원문 보존을 정당화하지 않는다.

공개 웹에서 확인된 주소는 [개인정보처리방침](https://code-destiny.com/privacy/), [이용약관](https://code-destiny.com/terms/), [문의](https://code-destiny.com/contact/)다. 2026-11-04에 세 주소와 [환불 안내](https://code-destiny.com/refund-policy/)의 HTTP HEAD 200 응답을 확인했다. 본문은 검색 도구의 캐시로 확인했으며 토스 앱 내 연결은 미검증이다. 공개 개인정보 문서는 웹 가입 및 포트원·이니시스 중심으로 설명하므로 토스 로그인·인앱결제의 실제 처리·국외 이전·삭제 절차를 충족한다고 판단할 수 없다.

## 결제 시험과 과금

2026-11-04 공식 [인앱 결제 안내](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment)에 따르면 SDK 3.x는 로컬 개발 도구 mock을 사용하며 콘솔 QR로 토스 앱에서 하는 결제는 실제 과금이다. 이 저장소의 apps/toss/package.json은 SDK 3.7.0을 사용한다. 로컬 mock은 무과금으로 검증하고, QR 실결제가 필요한 시점에는 금액·절차를 제시해 사용자 확인을 받기 전 실행하지 않는다.

상품 등록 안내는 상품 이미지 1024×1024px, 공급가 10원 단위와 부가세를 더한 판매가를 요구한다. 기존 레지스트리의 실제 판매가와 콘솔 산출 판매가가 일치하는지 상품별로 대조하기 전 가격을 임의로 확정하지 않는다. [공식 인앱 결제 안내](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment)

콘솔 등록 화면에서 공급가 4,540원과 4,550원의 판매가는 각각 4,994원과 5,005원으로 표시됐다. 기존 5,000원 상품의 정확한 판매가를 이 입력 단위로 보존할 방법은 확인되지 않았다. 상품을 저장하거나 기존 가격을 변경하지 않았으며, 플랫폼의 예외 또는 정확한 매핑 확인이 필요하다. 최신 main의 기존 사주 묶음 29,000원도 부가세 10%를 단순 적용한 산술상 인접 공급가 26,360원과 26,370원의 판매가가 각각 28,996원과 29,007원이다. 이 두 값은 계산이며 콘솔 입력으로 검증하지 않았다.

[상품 목록 SDK](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.getproductitemlist)의 상품 응답에는 표시용 `displayAmount` 문자열이 있다. `apps/toss/src/platform.ts`는 SKU와 상품 유형을 연결해 이를 표시하고, `worker/toss/policy.js`의 주문 검증은 SKU·상태를 확인한다. 이 코드만으로 콘솔의 실제 판매가가 기존 레지스트리와 같다고 판정하지 않으며, 등록 상품마다 콘솔 대조가 필요하다.

암호화 대조: `worker/toss/session.js`는 토스 사용자 키를 봉인하고 세션 토큰을 해시한다. `worker/toss/models.js`의 구매 모델은 주문 ID를 `_id`로, SKU·가격·상태를 일반 필드로 정의한다. 코드만으로 저장 계층의 암호화 설정이나 공식 가이드가 요구하는 결제 내역 암호화 범위를 증명할 수 없다. 실제 설정과 필요한 필드 보호를 확인하기 전 통과로 표시하지 않는다.

연애 비책 시작 화면은 `8bba419a4`에서 토스 결제 전 결과 창을 열지 않고, 결과 조회가 권한 확인에 성공한 경우에만 결과 링크를 표시한다. 거부·오류 시 링크를 숨기고 기존 결제 후 복구 대상을 보존한다. 인생의 책 새 탭 링크도 토스에서 숨긴다. 기존 웹 동작은 유지하며 SDK·실기기 검증은 남았다.

2026-11-05 최신 main 병합 후 인벤토리를 다시 생성했다. `animal-destiny`와 `career-style` 홈 레지스트리의 접근 표시가 기존 금액 표기에서 “묶음 포함”으로 바뀌어 있으므로, 해당 기능을 이식하기 전에 최신 권한·가격 정본과 앱인토스 상품 매핑을 대조한다. `worker/lib/saju-bundle-policy.js`는 두 기능을 출생정보 기반 묶음 별칭에 포함하고 신규 개별 판매를 닫으며 기존 구매 권리는 보존한다. `worker/lib/paid-feature-registry.js`에 남은 개별 금액은 기존 기록이므로 새 토스 단건 SKU의 근거로 쓰지 않는다. 이 기록은 토스 가격 변경이나 권리 승인을 의미하지 않는다.

2026-11-06 재확인: 콘솔 인앱 상품 목록은 비어 있어 등록 및 승인된 SKU가 없고 토스 로그인 등록과 mTLS 인증서 발급도 시작 화면 상태다. 콘솔 앱 등록 화면은 로고·썸네일의 사각 배경 문제로 반려된 상태이며 기존 스크린샷 3장의 최신 빌드 일치는 확인하지 못했다. 공식 문서는 스크린샷 제출을 선택 사항으로 설명하지만 사용자가 심사 자료 준비를 요구하므로 최신 실제 화면을 마련해야 한다. 기존 제출 이미지 `docs/toss/assets/20261008-1/ai-saju-studio-icon-600.png`는 600×600 RGB이며 네 모서리도 불투명하다. 인수인계에 기록된 등록 URL과 현재 반려 화면의 URL이 일치하므로 단순 재업로드로 해결된다고 판단할 수 없고 반려 원인을 더 확인해야 한다. 베다 토스 화면의 12개 언어 문구 존재와 일본어 로컬 표시를 확인했으나 원어민 품질, 다른 언어 표시, 실기기 및 안전영역은 미검증이다.

상품 생성 콘솔은 상품별 1024×1024px 이미지를 요구한다. 상품별 실제 이미지와 기존 가격·콘솔 공급가 및 최종 판매가의 일치 여부를 확인하기 전에는 등록하지 않는다.

## 공식 기준별 미완료 체크리스트

- [ ] [AI 채팅·상담 운영 요건](https://developers-apps-in-toss.toss.im/intro/guide): 위험 키워드와 문맥을 함께 판단하는 필터, 일관된 거절, 자살·자해 발화에 대한 안전 응답, 문제 응답을 신속히 수정·차단하는 운영 체계를 상담 입력·출력과 후속 질문 전체에서 검증한다. 모델·프롬프트 변경 전 검토 요청 절차도 확인한다. 2026-11-05 기준 `worker/toss`, `worker/yeongnyangi`, 대표 상담 라우트와 공통 라이브러리를 제한적으로 추적했으나 요건 전체의 적용 근거는 확인하지 못했다. 검색 결과만으로 구현 부재를 단정하지 않으며, 통합 검증 전에는 심사 차단이다.
- [ ] [SDK 3.x 개발 테스트](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x#test-environment): `apps/toss/package.json`에 공식 devtools 패키지는 있지만 `apps/toss/vite.config.ts`에는 공식 플러그인이 연결되어 있지 않다. 기존 `canonical/vite-preview.mjs`는 일부 상담용 별도 픽스처이며 공식 도구로 출시 전체 경로를 점검한 증거가 아니다. 운영 API·실결제·실 LLM·운영 DB로 폴백하지 않는 로컬 목 경계를 마련하고 공식 devtools와 실제 기기에서 각각 검증한다.
- [ ] [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame): 등록할 기능의 직접 진입, 뒤로가기·닫기·홈, 기기 변경 후 기록과 접근성을 실제 기기에서 확인한다. `apps/toss/src/main.tsx`, `apps/toss/service/Screens.jsx`만으로 전체 경로 통과를 뜻하지 않는다. 찻집 뒤로가기와 첫 화면 닫기는 토스 셸에 연결하고 중복 버튼을 숨겼으나 실제 기기의 단계 이동·복구는 미검증이다.
- [ ] 같은 가이드의 라이트 모드·핀치 줌·권한 거부·속도·브리지 중복 호출을 확인한다. `apps/toss/apps-in-toss.config.ts`는 내비게이션을 light로 설정하지만 원본 결과 화면 CSS와 viewport는 별도 검증이 필요하다.
- [ ] [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide): 토스 로그인만 사용하고 디지털 상품은 인앱 결제로 처리하며, 주요 기능을 외부 사이트나 중첩 웹뷰로 넘기지 않는다. 각 콘텐츠의 사전 AI 고지·결과 표시 및 금지 표현도 검토한다.
- [ ] [토스 로그인 안내](https://developers-apps-in-toss.toss.im/guide/authentication/intro): 실제 수집 항목·약관 URL·국외 이전·연결 해제 콜백 및 재연결 처리를 콘솔 설정과 대조한다. 앱 내 임시 고지는 최종 방침이 아니다.
- [ ] [인앱 결제 안내](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment): 상품명·유형·SKU·실제 가격·승인 상태를 대조하고, 결제 전 권한과 취소·실패·중복·환불·미결 주문 복구를 공식 테스트 환경과 기기에서 확인한다.
- [ ] [미니앱 등록 안내](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace): 앱 이름·카테고리·600×600 로고·스크린샷·설명·주요 기능과 심사 재현 절차를 실제 출시 내용에 맞게 준비한다.
- [ ] [토스 앱 테스트 안내](https://developers-apps-in-toss.toss.im/guide/operation/toss): 최신 번들을 올린 테스트 스킴으로 출시 대상 전체 경로를 검증한다. 실제 과금이 필요한 경우 별도 승인 전 진행하지 않는다.

실결제, 유료 LLM, 운영 DB 접근을 개발 테스트에 사용하지 않는다. 최종 제출은 전체 차단 항목 해소, main CI 확인, 제출 내용·잔여 위험 설명 및 사용자 승인 후에만 한다.

2026-11-06 로컬 회귀 보강: 타로 선택·질문·카드·결제 준비 단계는 토스 뒤로가기 이벤트를 처리하며 구매 및 같은 주문 복구 요청 중 중복 클릭과 단계 이탈을 막는다. 토스 결제 시작 이후 결과가 불확실한 경우 같은 JavaScript 실행 중에는 편지 상담과 타로의 새 결제를 숨기거나 비활성화하고 구매 내역 확인을 안내한다. 구매 복구는 앱 내부 이동으로 열어 메모리 상태를 유지한다. 결제 시작 전 권한 오류는 원래 오류로 전달한다. 로컬 목 회귀 결과일 뿐 실제 기기 검증, 앱 재시작이나 기기 변경을 가로지르는 미확정 결제 방지, 최초 구매자 검증은 해결되지 않았다.

2026-11-06 심리테스트 이식: 원본 22개 테스트의 양쪽 끝 답변과 토스 결과·뒤로가기·동일 화면 재열기·계정 전환·복사 권한을 로컬 목으로 점검했다. 원본 아우라의 `th` 점수가 결과의 `t`에 전달되지 않던 문제와 치와와 최대점수 분모 오류는 토스 화면에서만 수정했다. 토스 화면의 공감·관계 테스트는 임상 진단을 암시하는 표현, 근거를 확인할 수 없는 인구 비율과 고정 특성 비율 대신 실제 답변 합계와 비진단 안내를 표시하며, 관련 결과의 임의 특성 비율과 비하 표현을 숨기거나 문구를 수정했다. 기존 웹의 결과 로직과 문구는 유지한다. 개인정보를 장기 저장하지 않아 결과는 해당 화면 실행 중에만 재열 수 있다. 앱 재시작·기기 변경 복구, 전체 22개 콘텐츠의 추가 문구·정책 검토, 토스 공식 기기·접근성 검증은 미완료다.

공식 [주문 상태 조회 API](https://developers-apps-in-toss.toss.im/documentation/common/monetization/iap/in-app-purchase#api)는 사용자 키 헤더를 받지 않으며 응답에 구매자 식별자가 없다. 따라서 주문 상태와 미니앱 일치 여부의 확인만으로 현재 로그인한 사용자의 최초 구매를 증명하지 못한다. 클라이언트의 주문 목록을 서버가 독립적으로 검증하는 방법은 확인되지 않았고 이 문제는 계속 출시 차단이다.

심리테스트의 22개 직접 주소와 목록 주소가 실제 진입 분기·서비스 셸에 연결되고 홈 버튼이 해당 목록을 여는지 로컬 회귀에 포함했다. 이는 네이티브 토스 앱 실행이나 앱 재시작 후 결과 복구 검증을 대체하지 않는다.
토스용 심리테스트에서는 민감도 결과를 진단이 아닌 답변 점수 비율로 표시하고, 전생 결과를 상상 속 이야기로 명확히 구분하며, 치와와·스릴러 결과의 단정적이거나 비하할 수 있는 표현을 완화했다. 기존 웹 화면 문구는 변경하지 않았다. 나머지 콘텐츠의 전체 심사 적합성은 아직 검증 중이다.
