# CODE DESTINY 전체 서비스 토스 이전 실행 계획

status: in-progress

## 현재 요청과 완료 기준

영냥이 안내·예시만 담은 기존 제출 범위를 폐기한다. 꿀꿀운세 전체, 연이, 네오, 최애운명, 운명의 꽃, 사주·점성술·타로·자미두수·베다점·숙요와 기타 현재 제공 서비스를 조사하고 실제 토스 CSR 흐름으로 옮긴다. 카드나 홍보 이미지 추가를 기능 구현으로 집계하지 않는다. 로그인·구매·입력·결과·기록·재접속 복원까지 기능별 증거가 있어야 완료다.

이 문서가 기존 feature-matrix의 '첫 제출 제외' 결정보다 우선한다. 원래 웹의 가격·이용권·월정석 정책은 보존하며 토스 디지털 콘텐츠는 승인된 단건 IAP로 연결한다. 새로운 충전 재화·자동 갱신은 도입하지 않는다.

## 확인한 공식 계약 (2026-10-08)

- [비게임 출시 가이드](https://developers-apps-in-toss.toss.im/checklist/app-nongame): 소개 기능 실제 동작, CSR/SSG, 외부 사이트 래핑 금지, 라이트 모드, 토스 로그인, 뒤로가기·음악 일시정지·타기기 구매 유지.
- [TossAuth.login](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/tossauth/tossauth.login): authorizationCode/referrer를 서버로 전달. 클라이언트 userId는 인증 근거가 아니다.
- [단건 IAP](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/iap/iap.createonetimepurchaseorder): sku, processProductGrant, onEvent/onError, cleanup 계약. Android/iOS 5.219.0 이상.
- [서버 API](https://developers-apps-in-toss.toss.im/documentation/integration/server-api): mTLS, 3.1.1 이후 apps.tossmini.com/private-apps.tossmini.com의 앱별 Origin.
- [IAP 등록](https://developers-apps-in-toss.toss.im/guide/monetization/in-app-payment): 비게임 30개 한도, 공급가 10원 단위와 VAT 포함 판매가. 웹 가격을 토스 실가격으로 단순 복사하지 않는다. 가격 변경은 승인 전 실행하지 않는다.
- [서비스 정책](https://developers-apps-in-toss.toss.im/intro/guide), [SDK 3.x](https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x), [문서 목차](https://developers-apps-in-toss.toss.im/llms.txt)를 확인했다. 개별 기능별 주의사항과 API 상세는 해당 구현 시 추가 대조한다.

## 작업 순서

1. 기능 전수 대조: js/core/service-registry.js, app/_lib/serviceFeatureRegistry.ts, index.html의 상세·컬렉션 진입, 유료 registry와 Worker 라우트를 대조한다. 중복 진입은 기능 누락으로 처리하지 않고 별칭으로 남긴다. 로그인·유료·입력·결과·보관·토스 SKU를 행별로 명시한다.
2. 플랫폼 기반: 기존 TossIdentity 독립 계정을 유지. mTLS 설정·토스 약관·사업자/정산·승인 SKU를 실제 콘솔에서 확인. 콜백 해제, 삭제, 환불 동기화 및 암호화 보관의 구현 공백을 먼저 해소한다. 웹 계정 자동 병합 금지.
3. 계산형 기능: 최애운명은 lib/idol-chemi의 동일 엔진을 사용. 운명의 꽃은 토스 인증 후 기존 서버 matcher 사용. 차트가 없는 상태에서 꽃 엔진의 기본 20% 오행이나 기본 출생시각을 정상 계산으로 제시하지 않는다. 사주/별자리/자미두수/숙요/베다도 기존 계산 정본과 비교한다.
4. 상담형 기능: 영냥이·연이·네오의 기존 persona, question scope, manifest, tarot draw, 원본 결과 렌더러를 재사용한다. 상담 준비 요청에 서비스 소유 범위를 고정하고 서버 검증 후 IAP에 연결한다. 장문 생성은 지급 콜백과 분리한다.
5. 나머지 꿀꿀 기능: 타로 라이브러리, 신탁·해몽·관상·손금·명상·음악·서재·콘텐츠·기록을 전수표 순서로 이식한다. 정책상 불가한 기능은 사유를 확인하고 사용자에게 구체적으로 보고한다. 무단 제외 금지.
6. 공통 구매/기록: 주문 중복, 취소/실패/보류/환불, 앱 종료, 다른 기기, 9/15 중단 재개, 기록 누락과 타인 접근을 mock 및 허용된 플랫폼 테스트로 검증한다. 실제 결제/유료 LLM은 별도 구체 승인 필요.
7. 다중 서비스 홈: 연이·영냥이 캐릭터 구분, 최애운명·꽃·대표 상담으로 편집. 출시 대상 전체는 상담 목록에서 접근. 실제 완성 화면으로 3~5장 미리보기 재제작. 현재 테스트 이미지는 정식 이미지로 간주하지 않는다.
8. 통합 전달: targeted 검사→검증 단위 커밋→안전한 main 전달/CI→호환 백엔드 배포→실기기 확인→최종 .ait 업로드→통합 검토→승인 후 출시. 운영 웹 승격은 현재 요청상 선행 조건이 아니다. DB/주문 원본을 손상시키는 롤백 금지.

## 조사에서 발견한 실제 차이

- 현재 업로드 20261008-3은 사주 안내·예시만 제공하며 로그인·구매·생성 비활성. 전체 기능 완료가 아니다.
- 홈 레지스트리만 57개 진입이 있으며 React 레지스트리·컬렉션·영냥이 상품은 별도다. 57을 전체 기능 수로 주장하지 않는다.
- 최애운명: 웹에서 runChemi/buildChemiReport를 사용하는 결정론 계산. 토스용 초안은 동일 runChemi를 사용하나 전체 포토카드·팬덤 리포트·저장/공유 동등성 검증 전 완료로 집계하지 않는다.
- 운명의 꽃: worker/routes/destiny-flower.js의 실제 정책은 로그인 후 무료 매칭, 결과 저장 없음. 과거 유료 registry/주석과 충돌하므로 현재 라우트가 우선한다.
- 30개 IAP 한도 때문에 모든 웹 상품의 1:1 SKU 복사는 불가능할 수 있다. 동일 권리·금액·제공 조건의 그룹화 가능 여부를 검증하고 승인된 매핑만 사용한다. 임의로 범용 충전권을 만들지 않는다.

## 외부 상태와 다음 행동

### 2026-10-08 현재 확인 기록

- 콘솔 검색 키워드 임시저장 후 새로고침 확인: 사주, 점성술, 타로, 자미두수, 베다점, 숙요점, 궁합, 코드데스티니, 꿀꿀운세, 영냥이.
- 토스 로그인 및 인앱 결제 화면 모두 `사업자 정보를 검토하고 있어요`, `등록하기` 비활성. 콘솔 안내는 검토 후 본인 확인 단계다. 실제 등록/승인/IAP 구매 검증은 미완료다.
- 최애운명 초안: 기존 runChemi 호출을 390px/1280px 실제 브라우저에서 가상 입력으로 확인. 넘침/잘림 없음. 포토카드, 저장, 공유는 아직 이전하지 않았다.
- `npm run typecheck --prefix apps/toss` 성공, `npm test --prefix apps/toss` 모의 테스트 32/32 성공. 실결제/실LLM/운영 DB 테스트 없음.
- `npm run check:fast -- --plan` 실행. `npm run check:fast`는 문서 최신성·변경 lint 이후 sitemap lastmod/priority/원장 드리프트에서 중단. 전체 게이트 통과로 보고하지 않는다. 이 단위는 아직 main 전달/CI/업로드되지 않았다.
- 최신 업로드는 계속 20261008-3이며 이 로컬 최애운명 초안은 포함하지 않는다. 새 번들 업로드나 검토 제출을 했다고 보고하지 않는다.

사용자는 사업자 서류 제출 후 약 하루 검토 대기라고 알렸다. 앱 정보는 별도 반려/미제출 상태이고 사업자 승인과 다르다. 현재 콘솔에는 수정 로고·세로 미리보기 3장·10개 검색 키워드를 임시저장했다. 토스 로그인·IAP·mTLS 운영 연동은 아직 확인되지 않았다.

다음 구현자는 이 문서의 범위를 축소하지 말고 기능 전수표와 실제 기능 이전을 계속한다. 미완성 대표 기능을 보여주기 위한 빈 카드·웹 리다이렉트·가짜 결과를 추가하지 않는다. 전체 이전이 끝나기 전에 새 부분 번들을 전체 출시본으로 업로드하지 않는다.
