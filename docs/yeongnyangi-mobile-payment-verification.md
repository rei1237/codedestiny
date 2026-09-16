# 영냥이 결제·모바일 복귀 비과금 검증

검증일: 2026-09-16. 운영 배포·실결제·유료 LLM 호출·운영 DB 쓰기는 제외한다.

## 확인한 결함과 수정

PG에서 돌아온 `/checkout/`은 공통 결제 런타임을 전역 공급자의 유휴 로딩에 의존했다. 저장소 없는 새 탭 복귀에서 `requestIdleCallback`을 60초 늦추면, 기존 주문은 유지되지만 결제 확인 요청이 0건이고 15초 안에 원래 상담 결과 화면으로 복귀하지 못했다.

`CheckoutClient`는 PG 복귀 쿼리와 상담 ID가 있으면 기존 `loadPaidServiceRuntimeGate`를 즉시 호출한다. 공통 런타임의 주문 복원·서버 확인·등록된 `usePaidResume` 핸들러를 그대로 사용한다. 수정 후 동일한 유휴 지연 시나리오는 Chromium·WebKit 모두 통과했다. 별도 결제 구현이나 응답 타입을 추가하지 않았다.

영냥이 단건 전용 정책, 28개 상품의 기존 가격, 이니시스·카카오페이 채널 선택, 인증·서버 결제 판정·DB 스키마 및 수동 상담 시작 동작을 유지했다.

## 검사 경계와 성공 기준

`scripts/verify-yeongnyangi-browser.mjs`는 실제 React 결제 화면, 공통 결제 선택창·결제 런타임·모바일 복귀 코드·재개 훅을 실행한다. 기존 결제 게이트를 테스트 함수로 대체하지 않는다. PortOne SDK와 HTTP API, LLM 생성 결과, 백엔드 저장 상태만 fixture로 대체한다.

- Node 네트워크 가드와 브라우저 외부 호스트 차단을 함께 사용한다. 대상 URL은 loopback만 허용한다.
- 모든 `/api/` 요청은 브라우저 fixture가 처리한다. 알 수 없는 API는 501로 실패하며, mock에서 실제 연동으로 폴백하지 않는다.
- SDK에는 실제 공통 코드가 만든 요청이 전달된다. 카드의 기존 이니시스 채널, 카카오페이의 기존 전용 채널과 `EASY_PAY` 방식, 등록소 가격, 원래 상담 ID·featureKey·returnTo를 검사한다. 채널 값은 비밀정보 없는 sentinel fixture이다.
- 전체 페이지 리다이렉트는 SDK 대기 중 문서를 떠났다가 SDK에 전달된 `redirectUrl`로 이동하여 재현한다. 새 탭 검사는 기존 페이지를 닫고 새 페이지의 local/session storage를 지운다.
- 개발 서버에서 필요한 경로를 먼저 컴파일하고 개발 전용 HMR 연결을 차단한다. PG 복귀 직전에는 결제창의 로컬 청크·fixture 요청이 끝나기를 기다린다. 결제 런타임이나 재시도 타이머를 대체하거나 단축하지 않으며, JS 오류를 검사에서 제외하지 않는다.
- 결제 확인 후 원래 상담 결과로 복귀하고, 서버 증빙으로 활성화된 뒤 기존 **영냥이 상담 시작하기** 버튼을 수동으로 누른다. 모든 챕터 완료 및 새로고침 재조회를 확인한다.
- 원래 상담 ID, 결제 주문 1개, 챕터별 저장 1개, 미확정 결제의 미완료 상태, 기존 증빙으로 복구를 assertion으로 검사한다. 동시 승인 대기 탭의 SDK 재호출도 동일한 PG paymentId만 사용해야 한다.

fixture의 타인 주문·환불·금액 판정은 서버 보안 검증의 대체 증거가 아니다. 해당 서버 경계는 관련 Jest 및 공통 결제 테스트로 함께 확인한다. 로그인 만료 검사는 로그인 API 경계에서 재인증을 모의하며 실제 로그인 UI/OAuth 왕복은 포함하지 않는다.

## 브라우저 시나리오

| 범위 | 내용 | 사례 수 |
| --- | --- | ---: |
| 모바일 폭·브라우저·채널 | 360/390/430px × Chromium/WebKit × 카드/카카오페이 × 전체 페이지/저장소 없는 새 탭 복귀 | 24 |
| 전체 상품 | 28개 상품의 등록소 가격·featureKey·상담 ID 연결, 결제 복귀·전체 챕터 완료·재조회(Chromium) | 28 |
| 기존 화면 | 홈, 프로필 저장, 상품 28개 표시, 상담 준비, 프롤로그, 무료 운세 16종(두 엔진) | 2 |
| 복귀·오류 경계 | 엔진별 아래 24개 시나리오 | 48 |

엔진별 경계: 핸들러 등록 지연, 유휴 로딩 60초 지연, 리다이렉트 없는 주문 상태 조회 복구, 승인 대기/웹훅 지연, 활성화 후 조회 503, 활성화 503, 저장된 첫 챕터 이후 생성 실패, 생성 중단 후 재개, 환불 상담 생성 차단, 타인 상담, 다른 상품, 외부 returnTo, 금액 쿼리 변조, 결제 화면 재조회, 뒤로가기 왕복, 중복 클릭, 승인 후 동시 탭, 승인 대기 중 동시 탭, 로그인 만료/재인증, PG 취소 복귀, PG 실패 복귀, 리다이렉트 없는 성공, SDK 취소, SDK 실패.

## 재현 명령

WebKit까지의 인수 검사는 HMR 없는 정적 산출물을 권장한다. 첫 번째 PowerShell 터미널에서 개발 서버를 종료한 뒤 mock 설정으로 로컬 정적 빌드를 만들고 제공한다. 다른 세션과 충돌하지 않는 포트만 선택한다. 이 빌드는 배포용 검증 게이트를 대신하지 않는다.

```powershell
Set-Location 'D:\Development\code-destiny'
$env:YEONGNYANGI_TEST_BASE = 'http://127.0.0.1:3118'
node scripts/verify-yeongnyangi-browser.mjs --build-static
if ($LASTEXITCODE -ne 0) { throw 'Mock static build failed' }
python -m http.server 3118 --bind 127.0.0.1 --directory out
```

두 번째 터미널에서 전체 검사를 실행한다. `npm run dev:live`는 이 검증에 사용하지 않는다.

```powershell
Set-Location 'D:\Development\code-destiny'
$env:YEONGNYANGI_TEST_BASE = 'http://127.0.0.1:3118'
node scripts/verify-yeongnyangi-browser.mjs
# 동일한 유휴 지연 회귀만 재검사
node scripts/verify-yeongnyangi-browser.mjs --payment-filter=idle-return
npm run check:fast -- --plan
npm run check:fast
```

`--build-static`은 기존 mock 개발 설정에서 비밀 환경 변수를 제거하고 Node 외부 네트워크 가드를 빌드 하위 프로세스에 상속한다. 운영 모드의 API 주소 유효성 검사를 충족하는 값은 `https://yeongnyangi-qa.example.invalid`라는 해석 불가능한 fixture 주소이며 실제 운영 주소로 폴백하지 않는다. 브라우저의 로컬 출처는 동일 출처 API fixture를 사용한다. sentinel API 요청도 브라우저 route에서 fixture로 처리하며 전송하지 않는다. 정적 HTTP 서버에는 실행 가능한 API/DB 서버가 없다.

무료 운세 빌드 데이터는 기존 계산식 생성기를 사용하며 LLM을 호출하지 않는다. 계산에 필요한 천문력은 기존 읽기 전용 public 파일 서버를 임시 loopback 포트에서 실행해 제공하고, 빌드 종료 시 해당 자식 프로세스만 종료한다.

기존 개발 서버 안전 가드를 먼저 실행하므로 개발 서버가 있으면 기본적으로 빌드가 실패한다. 이번 동시 세션에서는 타 작업 디렉터리의 서버도 전역 가드에 잡혔다. 사용한 작업 디렉터리의 `.next`가 별도 일반 디렉터리이고 이 검사의 서버를 종료했음을 확인한 후, 해당 분리된 빌드에만 기존 `ALLOW_DEV_SERVER_DURING_BUILD=1` 예외를 적용했다. Node/브라우저 네트워크 차단은 해제하지 않았다. 빠른 개발용 실행은 `MOCK_DEV_PORT=3118`, `MOCK_DEV_API_PORT=3119`를 설정한 `npm run dev`에도 가능하지만, 개발 청크 재컴파일 오류를 운영 결제 실패로 해석하지 않는다.

전체 결과는 `build-cache/yeongnyangi-mobile-payment.json`에 기록된다. 필터 실행은 별도 이름의 JSON을 사용하여 전체 결과를 덮어쓰지 않는다. 실패 시 진단과 스크린샷을 남긴다. `cases` 배열의 실제 결과와 종료 코드가 완료 판정 기준이다.

## 실행 결과와 남은 확인

| 명령 | 결과 |
| --- | --- |
| 관련 Jest 6개 스위트 | 114개 통과 |
| `npm run check:fast` | 종료 코드 0; paid gate suite 통과, Node 1,348개·Jest 274개 스위트/3,807개 통과 |
| 변경 파일 ESLint, `git diff --check`, `npm run verify:doc-freshness` | 통과 |
| 운영 URL을 대상으로 `--build-static` 실행 | loopback assertion으로 빌드·브라우저 시작 전 거부 |
| `node scripts/verify-yeongnyangi-browser.mjs --build-static` | mock 설정에서 1,636개 페이지 생성·정적 export 성공; 종료 코드 0 |
| 전체 브라우저 102개 | 정적 산출물에서 실행 중; 완료 후 갱신 |

초기 개발 서버 전체 실행에서 Chromium 65개는 통과했지만 WebKit의 개발 청크/HMR 오류로 실패했다. 실패를 통과로 바꾸거나 JS 오류를 무시하지 않았다. 최종 인수 실행은 HMR 없는 정적 산출물로 바꿨다. 기존 래퍼를 사용한 초기 정적 빌드 중단은 성공 증거로 사용하지 않으며, 별도 mock 빌드의 성공과 구분한다. 배포용 빌드의 최종 판정은 main CI에서 확인한다.

운영 읽기 전용 확인에서는 상품 API의 28개 상품이 모두 available이었고, 결제 설정 API의 `configured`, `serverVerificationConfigured`, `inicisConfigured`, `kakaopayConfigured`가 모두 true였다. 이는 설정과 제공 가능 상태의 증거이며 실결제 승인·실제 서비스 생성의 증거는 아니다.

최근 기록된 실제 활성화 후 조회 503의 원인은 이 브라우저 fixture로 입증하지 않았다. 여기서 확인하는 것은 해당 오류 이후 새로고침으로 기존 증빙을 이용해 복구하는 클라이언트 동작이다. 과거 503이 해결됐다고 판정하지 않는다.

실제 카드·카카오페이 승인, 물리 모바일 기기 및 외부 결제 앱 왕복, 실제 LLM·운영 DB 저장, 운영 배포본 반영은 **미검증**이다. 모바일 리다이렉트의 `redirectUrl` 및 `paymentId`/오류 `code` 복귀 기준은 [PortOne 공식 결제창 문서](https://developers.portone.io/opi/ko/integration/start/v2/checkout)를 따른다.
