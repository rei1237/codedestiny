# 앱인토스 심사 준비: 확인된 사실과 남은 게이트

확인일: 2026-11-04 (KST). 이 문서는 심사 통과 또는 제출 가능 판정이 아니다. 콘솔 설정과 외부 정책은 제출 직전에 다시 확인한다.

| 항목 | 확인 근거 | 현재 판정 |
|---|---|---|
| 서비스 범위 | `full-service-inventory.json`, `apps/toss/scripts/launch-status.mjs` | 후보 89, 부분 구현 24, 추가 추적 65. 완전 검증·출시 제외 미확정. |
| 권한·결제 | `worker/toss/catalog.js`, `apps/toss/src/release.ts`; 콘솔 인앱 상품 목록 | 승인 상품 배열 비어 있음, 앱 공개 게이트 닫힘, 콘솔 상품 없음. 가격·권리·승인 상태 대조 전 판매 금지. `worker/toss/native-tea.js`는 인생의 책과 별도 키인 인생 총운을 모두 같은 이름으로 반환하므로 상품명 구분도 필요하다. |
| 상품 수 | [공식 인앱 결제 가이드](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment) | 비게임 최대 30개. 개별 서비스 권리와 기존 가격을 보존하는 매핑 미확정. |
| 로그인·서버 인증 | 콘솔 토스 로그인 및 mTLS 화면 | 로그인 설정 미등록, 인증서 발급 안내 상태. 발급·설정·실제 연동 검증 필요. |
| 개인정보·탈퇴 | `apps/toss/src/App.tsx`, `worker/toss/session.js` | 앱 안내는 준비용이며 개인정보 삭제 처리도 제공 예정으로 표시. 콘솔은 이름 필수 동의를 표시하므로 실제 처리 및 고지를 대조해야 한다. |
| 데이터 위치 | Atlas `Codedestiny` / `Neo` 개요와 백업 목록, Cloudflare R2 `bugs` 설정 | Atlas 클러스터와 표시된 33개 스냅샷은 AWS 서울. R2 피드백 버킷은 Asia-Pacific으로 표시. 각 기능의 최종 바인딩, R2 국가, 모든 복제·수탁 계약은 미확인. 운영 레코드는 조회하지 않았다. |
| AI 제공·보관 | `worker/routes/life-book-ai.js`, `worker/routes/love-secret-ai.js`; [Gemini API 약관](https://aistudio.google.com/docs/terms), [보관 안내](https://aistudio.google.com/docs/zdr) | 코드에서 Gemini와 Workers AI 경로 확인. Google은 유료 API에도 제한적인 안전 목적 로그 및 여러 국가의 일시 저장 가능성을 명시한다. Google AI Studio에 가져온 Gemini 프로젝트 한 개가 Tier 1로 표시되나 실제 운영 키와의 연결은 미확인. 보관 설정과 전체 처리 국가도 미확인. |
| 연령·콘텐츠 | 콘솔 앱 정보는 만 19세 이상으로 표시; [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide), [Gemini API 약관](https://aistudio.google.com/docs/terms) | 전체 콘텐츠 및 실제 연령 차단 동작은 미검증. API 약관은 18세 미만을 대상으로 하거나 접근 가능성이 높은 서비스 사용을 제한한다. |
| 앱 정보·심사 자료 | 콘솔 앱 출시·등록 화면 | 아이콘·썸네일 배경이 포함된 꽉 찬 사각형 필요로 반려. 앱 정보 승인, 최신 번들·스크린샷·심사 메모 미완료. |
| 기기 테스트 | [SDK 테스트 안내](https://developers-apps-in-toss.toss.im/development/test/sandbox), [토스 앱 테스트](https://developers-apps-in-toss.toss.im/guide/operation/toss) | SDK 3.x 별도 샌드박스 앱은 제공되지 않는다고 안내. 개발 도구 및 업로드 번들의 토스 앱 테스트 스킴에서 전체 출시 경로를 확인해야 한다. 미실행. |
| 결제·결과 복구 | `apps/toss/test/` | 모의 테스트 247/247 통과. 실제 상품·토스 앱·서버 연동 증거가 아니다. 공식 문서의 미결 주문 확인을 두 셸의 로그인 복원·로그인 뒤에 연결하고 중복 복구 및 세션 전환을 모의 검사했다. 공식 [미결 주문 조회](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.getpendingorders)와 [지급 완료](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.completeproductgrant)는 `isSupported()` 사전 확인과 미지원 시 업데이트 안내를 명시한다. 두 API의 `isSupported()` 확인과 미지원 버전·잘못된 조회 응답·복구 실패 시 신규 결제 차단을 구현하고 모의 테스트했다. SDK와 실기기 검증은 미실행이다. 홈 셸의 보관함과 직접 결과 경로는 복구 완료 후 다시 조회하도록 고쳤으며 지연·부분 실패를 모의 검증했다. 별도 서비스 셸의 기록 화면도 검색·필터를 유지하며 재조회하도록 수정했다. 서비스별 결과 화면 갱신과 실제 기기 동작은 확인이 필요하다. 인생의 책·연애 비책의 공유 화면에 토스 결제 권한·복구·취소 안내 전달을 추가했다. 두 상담의 토스 생성 실패 응답과 주요 시작 화면은 미차감·자동 복구를 단정하지 않도록 수정했다. 두 결과 전용 화면의 403은 기존 결과를 숨기도록 모의 검사했다. 다른 실패 경로와 실제 기기는 미검증이다. 토스 경로에서 오류와 지급 상태 안내를 보존해야 한다. 두 공유 화면은 권한 확인 장애를 결제 게이트로 이어 보내는 웹 복구 분기도 있어, 토스 어댑터의 재확인이 실패할 때 결제창이 열리지 않는지 검증해야 한다. 연애 비책 추가 질문은 토스 어댑터에서 차단되어 웹 동등성 미완료. |
| 비게임 공식 필수 기준 | [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame); `apps/toss/src/App.tsx`, `worker/toss/models.js`, `src/features/neo-war-room/neo-operation-room-result.module.css` | 연결 해제 뒤 사용자 데이터 삭제, 로그인·결제 데이터 암호화 범위, 라이트 모드와 네비게이션/기기 동작을 증명해야 한다. 앱 탈퇴 안내는 삭제가 준비 중이라 명시하고, `worker/toss/session.js`는 세션을 삭제하지만 기존 소유자 식별자를 재활성화한다. [토스 로그인 안내](https://developers-apps-in-toss.toss.im/guide/authentication/intro)는 연결 해제 후 재로그인에도 같은 사용자 키가 전달될 수 있다고 설명한다. 네오 결과 CSS는 `color-scheme: dark`를 지정한다. `apps/toss/index.html`의 viewport에는 공식 [핀치 줌 설정](https://developers-apps-in-toss.toss.im/documentation/integration/props#disable-pinch-zoom)이 없어 기기별 조정·접근성 검증이 필요하다. 실제 토스 렌더링과 저장 설정은 미검증이다. |
| 찻집 편지 상담 진입 | `lib/fortune/yeoni-entry.ts`, `app/fortune-tea-house/FortuneTeaHouseClient.tsx`, `apps/toss/service/Screens.jsx` | 원본은 `?counsel=letter`를 대화 상담으로 분기하지만 토스 셸은 저장 결과를 제외하고 찻집 화면을 연다. 편지 상담·기록 및 앨범의 실제 동등성은 미완료다. |
| 외부 링크·뒤로가기·접근성·오류 | `apps/toss/src/main.tsx`, `apps/toss/service/Screens.jsx` 등 | 코드 경계는 있으나 공식 기기에서 출시 대상 전체 검증 전이다. |

삭제 범위 조사 출발점: 토스 전용 `TossIdentity`, `TossSession`, `TossPurchase`, `TossNativeConsultation` 외에 토스 어댑터는 `ProfileCard`, `YeongnyangiRequest`, `PaidExecutionRecord`와 원본 인생의 책·연애 비책·네오·찻집 결과 경로를 사용한다. 찻집 원본은 결과·타로 초안·지갑·원장 컬렉션도 참조한다. 이는 코드상 조사 후보이며 모든 토스 경로의 실제 쓰기와 법정 보존 대상이 확인된 완전한 삭제 목록이 아니다. 재연결, 진행 중 생성, 환불과 보존 의무를 검증하기 전 운영 삭제를 실행하지 않는다.

[전자상거래법 시행령 제6조](https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0006&lsiSeq=288143&urlMode=lsScJoRltInfoR)는 일정한 계약·청약철회 및 대금결제·공급 기록 5년, 소비자 불만·분쟁 처리 기록 3년을 규정한다. 토스 결제에서 각 사업자의 보존 주체·필드, 접근 분리 및 연결 해제 시 처리 방법은 별도로 확인해야 하며 이 근거만으로 상담 원문 보존을 정당화하지 않는다.

공개 웹에서 확인된 주소는 [개인정보처리방침](https://code-destiny.com/privacy/), [이용약관](https://code-destiny.com/terms/), [문의](https://code-destiny.com/contact/)다. 2026-11-04에 세 주소와 [환불 안내](https://code-destiny.com/refund-policy/)의 HTTP HEAD 200 응답을 확인했다. 본문은 검색 도구의 캐시로 확인했으며 토스 앱 내 연결은 미검증이다. 공개 개인정보 문서는 웹 가입 및 포트원·이니시스 중심으로 설명하므로 토스 로그인·인앱결제의 실제 처리·국외 이전·삭제 절차를 충족한다고 판단할 수 없다.

## 공식 기준별 미완료 체크리스트

- [ ] [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame): 등록할 기능의 직접 진입, 뒤로가기·닫기·홈, 기기 변경 후 기록과 접근성을 실제 기기에서 확인한다. `apps/toss/src/main.tsx`, `apps/toss/service/Screens.jsx`만으로 전체 경로 통과를 뜻하지 않는다.
- [ ] 같은 가이드의 라이트 모드·핀치 줌·권한 거부·속도·브리지 중복 호출을 확인한다. `apps/toss/apps-in-toss.config.ts`는 내비게이션을 light로 설정하지만 원본 결과 화면 CSS와 viewport는 별도 검증이 필요하다.
- [ ] [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide): 토스 로그인만 사용하고 디지털 상품은 인앱 결제로 처리하며, 주요 기능을 외부 사이트나 중첩 웹뷰로 넘기지 않는다. 각 콘텐츠의 사전 AI 고지·결과 표시 및 금지 표현도 검토한다.
- [ ] [토스 로그인 안내](https://developers-apps-in-toss.toss.im/guide/authentication/intro): 실제 수집 항목·약관 URL·국외 이전·연결 해제 콜백 및 재연결 처리를 콘솔 설정과 대조한다. 앱 내 임시 고지는 최종 방침이 아니다.
- [ ] [인앱 결제 안내](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment): 상품명·유형·SKU·실제 가격·승인 상태를 대조하고, 결제 전 권한과 취소·실패·중복·환불·미결 주문 복구를 공식 테스트 환경과 기기에서 확인한다.
- [ ] [미니앱 등록 안내](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace): 앱 이름·카테고리·600×600 로고·스크린샷·설명·주요 기능과 심사 재현 절차를 실제 출시 내용에 맞게 준비한다.
- [ ] [토스 앱 테스트 안내](https://developers-apps-in-toss.toss.im/guide/operation/toss): 최신 번들을 올린 테스트 스킴으로 출시 대상 전체 경로를 검증한다. 실제 과금이 필요한 경우 별도 승인 전 진행하지 않는다.

실결제, 유료 LLM, 운영 DB 접근을 개발 테스트에 사용하지 않는다. 최종 제출은 전체 차단 항목 해소, main CI 확인, 제출 내용·잔여 위험 설명 및 사용자 승인 후에만 한다.
