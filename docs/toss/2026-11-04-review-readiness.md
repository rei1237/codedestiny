# 앱인토스 심사 준비: 확인된 사실과 남은 게이트

확인일: 2026-11-04 (KST). 이 문서는 심사 통과 또는 제출 가능 판정이 아니다. 콘솔 설정과 외부 정책은 제출 직전에 다시 확인한다.

| 항목 | 확인 근거 | 현재 판정 |
|---|---|---|
| 서비스 범위 | `full-service-inventory.json`, `apps/toss/scripts/launch-status.mjs` | 후보 89, 부분 구현 24, 추가 추적 65. 완전 검증·출시 제외 미확정. |
| 권한·결제 | `worker/toss/catalog.js`, `apps/toss/src/release.ts`; 콘솔 인앱 상품 목록 | 승인 상품 배열 비어 있음, 앱 공개 게이트 닫힘, 콘솔 상품 없음. 가격·권리·승인 상태 대조 전 판매 금지. |
| 상품 수 | [공식 인앱 결제 가이드](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment) | 비게임 최대 30개. 개별 서비스 권리와 기존 가격을 보존하는 매핑 미확정. |
| 로그인·서버 인증 | 콘솔 토스 로그인 및 mTLS 화면 | 로그인 설정 미등록, 인증서 발급 안내 상태. 발급·설정·실제 연동 검증 필요. |
| 개인정보·탈퇴 | `apps/toss/src/App.tsx`, `worker/toss/session.js` | 앱 안내는 준비용이며 개인정보 삭제 처리도 제공 예정으로 표시. 콘솔은 이름 필수 동의를 표시하므로 실제 처리 및 고지를 대조해야 한다. |
| 데이터 위치 | Atlas `Codedestiny` / `Neo` 개요와 백업 목록, Cloudflare R2 `bugs` 설정 | Atlas 클러스터와 표시된 33개 스냅샷은 AWS 서울. R2 피드백 버킷은 Asia-Pacific으로 표시. 각 기능의 최종 바인딩, R2 국가, 모든 복제·수탁 계약은 미확인. 운영 레코드는 조회하지 않았다. |
| AI 제공·보관 | `worker/routes/life-book-ai.js`, `worker/routes/love-secret-ai.js`; [Gemini API 약관](https://aistudio.google.com/docs/terms), [보관 안내](https://aistudio.google.com/docs/zdr) | 코드에서 Gemini와 Workers AI 경로 확인. Google은 유료 API에도 제한적인 안전 목적 로그 및 여러 국가의 일시 저장 가능성을 명시한다. Google AI Studio에 가져온 Gemini 프로젝트 한 개가 Tier 1로 표시되나 실제 운영 키와의 연결은 미확인. 보관 설정과 전체 처리 국가도 미확인. |
| 연령·콘텐츠 | 콘솔 앱 정보는 만 19세 이상으로 표시; [서비스 오픈 정책](https://developers-apps-in-toss.toss.im/intro/guide), [Gemini API 약관](https://aistudio.google.com/docs/terms) | 전체 콘텐츠 및 실제 연령 차단 동작은 미검증. API 약관은 18세 미만을 대상으로 하거나 접근 가능성이 높은 서비스 사용을 제한한다. |
| 앱 정보·심사 자료 | 콘솔 앱 출시·등록 화면 | 아이콘·썸네일 배경이 포함된 꽉 찬 사각형 필요로 반려. 앱 정보 승인, 최신 번들·스크린샷·심사 메모 미완료. |
| 기기 테스트 | [SDK 테스트 안내](https://developers-apps-in-toss.toss.im/development/test/sandbox), [토스 앱 테스트](https://developers-apps-in-toss.toss.im/guide/operation/toss) | SDK 3.x 별도 샌드박스 앱은 제공되지 않는다고 안내. 개발 도구 및 업로드 번들의 토스 앱 테스트 스킴에서 전체 출시 경로를 확인해야 한다. 미실행. |
| 결제·결과 복구 | `apps/toss/test/` | 모의 테스트 167/167 통과. 실제 상품·토스 앱·서버 연동 증거가 아니다. 공식 문서의 미결 주문 확인을 두 셸의 로그인 복원·로그인 뒤에 연결하고 중복 복구 및 세션 전환을 모의 검사했다. SDK와 실기기 검증은 미실행이다. 로그인 직후 기록 보관함이 복구보다 먼저 로드된 경우 자동 복구 완료 뒤 목록을 갱신하는지 추가 검증·수정이 필요하다. 인생의 책·연애 비책의 공유 화면은 토스 결제 어댑터 오류를 일반 결제 오류로 바꾸는 경로가 있고, 연애 비책 공통 서버 오류 문구는 결제 미차감을 단정한다. 토스 경로에서 오류와 지급 상태 안내를 보존해야 한다. 두 공유 화면은 권한 확인 장애를 결제 게이트로 이어 보내는 웹 복구 분기도 있어, 토스 어댑터의 재확인이 실패할 때 결제창이 열리지 않는지 검증해야 한다. 연애 비책 추가 질문은 토스 어댑터에서 차단되어 웹 동등성 미완료. |
| 외부 링크·뒤로가기·접근성·오류 | `apps/toss/src/main.tsx`, `apps/toss/service/Screens.jsx` 등 | 코드 경계는 있으나 공식 기기에서 출시 대상 전체 검증 전이다. |

공개 웹에서 확인된 주소는 [개인정보처리방침](https://code-destiny.com/privacy/), [이용약관](https://code-destiny.com/terms/), [문의](https://code-destiny.com/contact/)다. 검색 도구의 캐시로 열람한 근거이며 최신 HTTP 응답이나 토스 앱 내 연결을 검증한 것은 아니다. 공개 개인정보 문서는 웹 가입 및 포트원·이니시스 중심으로 설명하므로 토스 로그인·인앱결제의 실제 처리·국외 이전·삭제 절차를 충족한다고 판단할 수 없다.

실결제, 유료 LLM, 운영 DB 접근을 개발 테스트에 사용하지 않는다. 최종 제출은 전체 차단 항목 해소, main CI 확인, 제출 내용·잔여 위험 설명 및 사용자 승인 후에만 한다.
