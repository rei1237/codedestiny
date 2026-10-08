# CODE DESTINY 전체 서비스 토스 이전 실행 계획

status: in-progress

## 최신 실행 상태 (2026-10-08, 전체 완료 아님)

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 브랜치: `wt/toss-miniapp-20261007-223959`. 동시 작업 중인 루트 main 변경은 건드리지 않았다.
- 기준 통합: origin/main `a789d250b`를 반영한 merge `694465e7a155daf590bf69441f12993ff07d3f00` 이후 구현. 최신 기능 커밋 `23befce87`.
- **원격 전달/업로드 없음.** main 푸시가 자동 승인 검토에서 거절됨: 전체 기능 완료 전의 부분 구현이며 SERVICE_AVAILABLE=false, 승인 SKU 없음. 재시도/다른 경로 우회하지 않았다. 이 제한은 로컬 구현을 중단할 사유로 사용하지 않는다.
- 콘솔의 기존 업로드본 `20261008-3`과 아래 로컬 신규 번들은 다르다. 기존 업로드본을 최신 전체 이식본이라고 안내하면 안 된다.

### 이번에 구현·커밋한 단위

| 커밋 | 실제 변경 | 제한 |
|---|---|---|
| eaeb0cdbc | 상담가·상품·요청 소유권 고정, 연이/네오 상담 준비 | 상담실 고유 UX 전체 이식 아님 |
| 2103e0ea9 | 사주·점성술·자미두수·베다·숙요·타로 저장 근거 표시 | 무료 독립 계산 화면 아님 |
| 2480f9632 | 연결 해제 영속 재시도, 해제 대기 계정 재활성 차단 | 개인정보 삭제/법적 보관 정책 미완성 |
| cf588251e | CI에 토스 테스트·빌드 연결, sitemap 원장 갱신 | GitHub CI 미실행 |
| 1bf629ea3 | 기존 buildChemiReport·포토카드 재사용, 5테마·팬덤·오행·상세 풀이 | 웹 최근 기록/사진 꾸미기 등 동등성 추가 필요 |
| e558e795c | 카드 미리보기·File.saveBase64, 선택 요약 Share.createLink/sendMessage | 모의/API 계약 검사만, 실기기 저장·전송 미검증 |
| 852b25f83 | 보관함 50건 커서 페이지, 읽기 실패와 미연결 구매 분리 | 대량 실 DB/인덱스 실측 미실행 |
| 22abf6e14 | 기존 10분 cron에서 최대 10건 토스 주문 확인, 서버 확인 환불만 반영 | 실 mTLS/운영 데이터 미검증, 비활성 계정은 원격 조회 제외 |
| 23befce87 | 타로 라이브러리 12개 계약, IAP 권한·`PaidExecutionRecord` claim/complete·재열람·환불 어댑터 | 승인 SKU·화면·생성기·실기기·업로드 미구현 |

### 현재 검증 증거

- `npm test --prefix apps/toss`: **76/76 통과, 실패/건너뜀 0**. 외부 네트워크 차단, 천문 데이터는 loopback 로컬 파일 서버만 사용. 샌드박스에서 loopback EACCES가 난 실행과 정상 권한 실행을 구분한다.
- 이후 추가한 `node --test apps/toss/test/order-reconciliation.test.mjs`: **4/4 통과**. REFUNDED 일치 조건, 통신/미확정/불일치 시 권한 유지, 최대 10건, 거래 반영 실패 재시도 검증. 새 전체 70개 합산 실행은 아직 하지 않았다. 마지막 cron coverage/worker-no-undef/mongo query shapes 및 worker dry-run 통과. dry-run 로그 파일 EPERM 경고는 남음.
- `npm run typecheck --prefix apps/toss`: 통과. `npm run build --prefix apps/toss`: 통과. 빌드에는 큰 초기 chunk와 공유 Next 컴포넌트의 use-client directive 경고가 남아 있다.
- 타로 라이브러리 계약 모의 검사: `apps/toss/test/tarot-library.test.mjs`의 5건과 기존 grant/library/routes 검사 합계 **20/20 통과**. 중복 지급 1건화, 승인 featureKey/flowId 결속, 무료 3개 흐름의 IAP 제외, claim→complete 재열람, 환불 접근 차단을 확인했다. 실결제·유료 LLM·운영 DB 쓰기는 하지 않았다.
- 로컬 신규 AIT: `apps/toss/ai-saju-studio.ait`, deploymentId `01a11b57-35bc-7f8e-a12b-e24caf4ead41`, **1,348,706 bytes**, SHA256 `fc48c066043d348544bb3738545c5d2f700bbff7bb2cd102975f345a79316ac5`. **업로드하지 않음.**
- 전체 공통 검사: 앞선 `check:fast`에서 npm test 통과(392.2초), Paid Flow Gates 88/88 통과, lint 통과 후 sitemap drift 실패. 원장 생성 후 해당 drift 검사 통과. check:fast 전체 및 GitHub CI 통과로 보고하지 않는다.
- root typecheck, worker-no-undef, mongo-query-index-shapes, cron-mongo-op-coverage, guard-wiring, CI required lanes self-test, strict-core encoding 검사 통과. worker dry-run 번들 생성 통과(로그 경로 EPERM 경고); 배포 아님.
- CUA 로컬 Chrome 390/1280: 최애운명 5테마·앞뒤 카드·Enter·상세/팬덤/밈 펼침 검수. 흰 버튼 글자 대비, 소수점 1.7000000000000002, 표 열 간격 수정 후 재검수 통과. 390에서 카드/요약 내보내기 미리보기 및 브라우저 미지원 안내 확인. 실제 토스/iOS/Android 검증 아님.
- 공식 [File.saveBase64](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/file/file.savebase64), [Share.createLink](https://developers-apps-in-toss.toss.im/documentation/sdk/domains-api/share/share.createlink)와 설치 3.7.0 타입 대조. 공개 공유 링크에는 생일·명식·결과 ID·토큰을 넣지 않음. 반환만으로 실제 공유 완료를 집계하지 않음.

### 다음 구현 순서와 남은 공백

1. 타로 라이브러리 12개 독립 흐름의 입력·드로우·각 서비스 고유 결과 렌더러를 토스로 이식하고, 유료 생성기는 새 claim/complete 어댑터에 연결한다. 기존 3개 registry에 누락된 healing/self-esteem을 추가해 현재 canonical 후보는 **87개**. 87은 검증 완료 기능 수가 아니다.
2. 기본 운세 독립 화면·종합/모둠 상품·찻집/전략실 고유 흐름·기타 기능·서재를 계속 이식. 기존 웹 전체를 iframe/외부 링크로 대체하지 않음.
3. 개인정보 삭제/해제 콜백 후 처리, 민감 거래 메타데이터 보호, 환불 동기화의 운영·비활성 계정 정책 검증, 전체 제공 권리 매핑, 9/15 재개 E2E 추가. 현재 공통 모의 검사만으로 이 항목 완료 주장 금지.
4. 176개 가격 키/70개 상담 조합의 가격 검토 자료는 `price-review.json`. 실제 SKU 승인/가격 확정/30개 한도 해결 전 판매 준비 완료 아님.
5. 전체 구현 후 원격 전달 허용 상태 확인 → main CI → mTLS/약관/상품/사업자 상태 → 실기기 → 실제 화면 소개 이미지 → 업로드·검수·승인·출시를 각각 확인.

타로 구현 위치: `index.html:tarotCollection`에 명리학, 관계6장, 재회5장, 연간12장, 회복, 자기 기준 회복, 프롬프트/오라클, 수비학, 이직, 마인드스캔, 원석 소울, 천체의 선율이 있다. `worker/toss/grant.js`는 현재 YeongnyangiRequest 전용이며 PaidExecutionRecord 기반 리딩을 자동 지원하지 않는다. 재사용 후보 `worker/lib/love-tarot-delivery.js:deliverLoveTarot`, `worker/lib/mindscan-delivery.js:deliverMindscan`은 인증+접근검증 콜백 구조다. 웹 PG 어댑터를 토스에 넣지 않는다.

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

### 코드 이식 재개: 외부 심사를 코드 작업의 중단 조건으로 사용하지 않음

사용자 요청: “코드상으로만이라도 모든 서비스 기능 앱인 토스로 이식하는 작업 못해?”

- 토스 상담 선택을 사주/서양 점성술/자미두수/베다점/숙요점/타로로 확장. 현재 question policy가 지원하는 상품 범위만 제공하며 장기 전환 미지원 조합은 제외한다. 승인 SKU 목록은 여전히 빈 목록이다. 전체 꿀꿀운세 이전 완료가 아니다.
- 기존 prepareFortune와 주문 소유권/생성/보관 경로를 재사용. 타로는 출생정보를 받거나 프로필을 만들지 않고, 기존 스프레드와 서버 확정 덱 및 drawTarotSpread를 거쳐 결제 전 카드를 선택한다. `/api/toss/prepared/:id/draw`는 로그인 소유자와 승인 상품을 확인한다.
- 운명의 꽃: `/api/toss/flower/match`는 토스 인증 후 기존 4개 계산기와 꽃 matcher를 호출한다. 원본 프로필/출생정보는 응답에서 제외한다. 기존 정책대로 결과를 저장하지 않는다. 시각 미상일 때 matcher의 정오 기본값을 쓰지 않고 해당 체계의 입력 필요 상태를 표시한다.
- 최애운명/꽃 화면은 지연 로딩한다. 독립 화면 검수에서 390px/1280px의 넘침·클리핑 없음. 타로에 남아 있던 출생/도시 안내 4곳을 수정하고 재확인했다. 실제 토스 기기와 로그인 이후 결과 화면 검수는 아직 아니다.
- 검증: 토스 타입 검사 성공, 토스 테스트 44/44 성공(모의 인증/구매 및 로컬 천문 파일 계산). `.ait` 빌드 성공: 로컬 deploymentId `01a11b03-7663-728d-9cb2-52fc07227230`, 692935 bytes. 이는 업로드/공개 배포 ID가 아니다.
- `check:fast -- --plan`은 critical로 분류. `check:fast`의 Paid Flow Gates에서 첫 `npm test` 실패를 확인했으며 일부 후속 정적 검사 통과 후 실행을 중단했다. 전체 게이트/CI 통과로 주장하지 않는다. 이전 sitemap 드리프트도 해결되지 않았다.
- 다음 코드 작업: 연이/네오의 persona·서비스 소유 기록 분리, 나머지 꿀꿀 기능별 입력/결과 렌더러와 구매 어댑터 이식, SKU 그룹 설계의 공식 계약 검증, 해제/탈퇴 개인정보 처리와 환불 동기화 공백 해결. 사업자 심사 대기는 이 작업들의 차단 사유가 아니다.

### 2026-10-08 현재 확인 기록

- 콘솔 검색 키워드 임시저장 후 새로고침 확인: 사주, 점성술, 타로, 자미두수, 베다점, 숙요점, 궁합, 코드데스티니, 꿀꿀운세, 영냥이.
- 토스 로그인 및 인앱 결제 화면 모두 `사업자 정보를 검토하고 있어요`, `등록하기` 비활성. 콘솔 안내는 검토 후 본인 확인 단계다. 실제 등록/승인/IAP 구매 검증은 미완료다.
- 최애운명 초안: 기존 runChemi 호출을 390px/1280px 실제 브라우저에서 가상 입력으로 확인. 넘침/잘림 없음. 포토카드, 저장, 공유는 아직 이전하지 않았다.
- `npm run typecheck --prefix apps/toss` 성공, `npm test --prefix apps/toss` 모의 테스트 32/32 성공. 실결제/실LLM/운영 DB 테스트 없음.
- `npm run check:fast -- --plan` 실행. `npm run check:fast`는 문서 최신성·변경 lint 이후 sitemap lastmod/priority/원장 드리프트에서 중단. 전체 게이트 통과로 보고하지 않는다. 이 단위는 아직 main 전달/CI/업로드되지 않았다.
- 최신 업로드는 계속 20261008-3이며 이 로컬 최애운명 초안은 포함하지 않는다. 새 번들 업로드나 검토 제출을 했다고 보고하지 않는다.

사용자는 사업자 서류 제출 후 약 하루 검토 대기라고 알렸다. 앱 정보는 별도 반려/미제출 상태이고 사업자 승인과 다르다. 현재 콘솔에는 수정 로고·세로 미리보기 3장·10개 검색 키워드를 임시저장했다. 토스 로그인·IAP·mTLS 운영 연동은 아직 확인되지 않았다.

다음 구현자는 이 문서의 범위를 축소하지 말고 기능 전수표와 실제 기능 이전을 계속한다. 미완성 대표 기능을 보여주기 위한 빈 카드·웹 리다이렉트·가짜 결과를 추가하지 않는다. 전체 이전이 끝나기 전에 새 부분 번들을 전체 출시본으로 업로드하지 않는다.

## 2026-10-08 전체 이식 실행 단위: 상담가와 구매 소유권

- 기준 원격 main `c2e85bebe`를 기존 토스 작업본에 병합. 병합 커밋 `ee92e5a927a90b17deb8159a0e398f7806ab6598`. main의 다른 세션 미커밋 파일은 수정하지 않았다.
- 영냥이/연이/네오 선택을 토스 상담 화면에 추가. 서버 승인 상품의 serviceId만 persona를 선택하며 클라이언트 persona/domain/fishId는 권한 근거로 사용하지 않는다. 기존 chat 상품/prepareFortune/프롬프트 재사용.
- 구매 serviceId 보관, 요청의 persona+snapshot.persona+chat featureKey 검증, 지급·재열람·생성 권한 증거에서 서비스 교차 연결 차단. 기존 serviceId 없는 영냥이 구매는 읽기 호환 유지.
- 상담 상세·입력·구매에 선택 상담가 표시, 관련 이동 URL에 비민감 상품 선택 유지. 연이/네오 상세의 영냥이 오표시 제거. 질문 입력 전 범위 변경 권고 제거. 계산 성별 라벨 중립화.
- 발견 목록의 확인된 별칭을 묶고 기존 목록에서 빠진 pet-saju/ziwei-island 활성 진입 추가. 85개 canonical 후보이며 전체 검증 완료 서비스 개수가 아니다. 미정 입력/결과/보관 계약은 null로 명시한다.
- `build-price-review.mjs`: 서버 가격 키 176개, 상담 상품 조합 70개를 로컬 정본에서 추출. 공급가/VAT 후보는 계산치이며 승인 가격 아님. 가격 변경/상품 등록 없음.
- 토스 모의 테스트 47/47 통과, 타입 검사 통과. 로컬 빌드 deploymentId `01a11b33-3174-7772-b3d4-d7c62d7fa96b`, 693419 bytes. 업로드하지 않았다. 이후 추가한 소유권 강화/근거 필드 수정은 별도 targeted 21/21 통과, 최종 재빌드 필요.
- CUA 화면 검수 390/1280에서 넘침 없음. 지적된 상담가/추천/성별 라벨 수정 후 390 재검수 통과. 실제 토스 기기 검증 아님.
- check:fast 첫 실행의 npm test 실패는 샌드박스 임시 폴더 realpath EPERM. 정상 실행 환경 재시도에서는 npm test가 392.2초에 통과했으며 나머지 게이트 진행 중. 전체 CI 완료 아님.
- 아직 전체 이식 미완료. 기본 계산 독립 화면·전체 타로·운명의 찻집/전략실 고유 화면·기타 서비스·네이티브 결과 렌더러·삭제/해제 재처리·SKU 그룹 계약·실기기/운영 연동을 계속 구현해야 한다. SERVICE_AVAILABLE=false와 빈 승인 SKU는 유지한다.
