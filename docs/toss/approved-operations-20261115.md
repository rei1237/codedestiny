# 토스 운영 설정 — 2026-11-15

## 승인과 경계

사용자는 신규 판매를 닫아 둔 무료 기능·기존 구매 권리용 Worker 승격, 비밀키 및 토스 로그인 설정을 승인했다. 기존 미완료 유료 상담의 생성 재개 가능성도 승인 범위다. 실결제 테스트, 실 LLM 개발 검증, 임의 운영 DB 쓰기, 검토 제출, 공개 출시는 포함하지 않는다.

## 키와 운영 자료 확인

- 운영의 Toss 신원·세션·구매·네이티브 상담 컬렉션은 모두 0건이었다. 직접 연결한 canonical 클러스터에서 `code-destiny-worker` appName 연결 8개를 확인했다. staging appName은 별개다. 단순 DB 이름만으로 같은 클러스터라고 판단하지 않았다.
- 운영 Toss 전용 키가 없는 것을 확인한 뒤 `TOSS_IDENTITY_KEY`, `TOSS_DATA_KEY`, `TOSS_CALLBACK_AUTHORIZATION`를 처음 등록했다. 키 생성 직전 컬렉션 집계를 다시 확인했다. 비밀값은 메모리와 subprocess stdin으로만 전달했다.
- 기존 웹 키·데이터는 변경하지 않았다. 운영 DB에 자료를 생성하거나 수정하지 않았다.
- 실제 `TOSS_MTLS` 인증서 바인딩은 `54538b62-1dfb-4189-a7af-9b1356c536bb`, 만료는 `2027-12-03T00:27:15Z`다. 키 등록 후에도 유지됐다.
- 현재 운영에는 외부 Vedic API base/key 바인딩이 없으며 Swiss 로컬 계산을 사용한다. 미래에 외부 처리자를 연결하면 고지를 다시 확인해야 한다.
- 2026-11-14T16:16:55Z 기준 production text bindings 123개(plain 60 + secret 63); 서버 활성화 변수 한 개를 더 등록할 공간이 있다.

## 현재 기준 배포와 복구

이번 세션이 승격하기 전에 다른 세션의 [공식 운영 실행 43612648387](https://github.com/rei1237/codedestiny/actions/runs/43612648387)이 성공했다. 이를 취소하거나 롤백하지 않았다.

- Pages/Worker 코드: `f8a4ec2afa7ba2bacb7913201aae6962c4c6e232`
- Pages deployment: `da6878a5-60cd-48d0-8496-f03639fa8cb6`
- Worker deployment: `56b263aa-480d-483f-a7c1-83ace58ad3ee`
- Worker version: `10e51006-c4b6-4869-a13a-4533acdaf6b4`

코드 롤백이 필요하면 공식 `Release Cloudflare Pages and Worker`의 `mode=rollback`으로 위 Pages/Worker를 함께 대상으로 지정한다. 로컬 배포나 강제 push는 하지 않는다. 키는 초기화 이후 임의 회전·삭제하지 않는다.

## 개인정보와 로그인 설정

공개 방침의 시행일 및 서버 동의 버전을 2026-11-15로 맞춘다. 토스 이름은 암호화된 로그인 응답에 일시 수신되지만 복호화·계정·로그 저장하지 않는 점을 구분했다. 프라슈나 질문·좌표·시각의 계산 목적과 Cloudflare 처리, 저장 대상 상담의 MongoDB 처리를 명확히 했다. 기존 법정 거래기록 보유기간과 구매 결과 보존 정책은 유지한다.

콘솔 초안은 이름 필수, 나머지 6개 로그인 정보 미사용이다. 필수 서비스 약관과 개인정보 수집·이용, 국외 이전 동의문을 정상 UI로 추가했다. 고정 템플릿의 이름 저장·일률적 탈퇴 시 보유기간 대신 실제 공개 방침을 연결하는 custom 동의문을 사용한다.

- 서비스 약관: `https://code-destiny.com/terms/`
- 수집·이용: `https://code-destiny.com/privacy-policy/#toss-login`
- 국외 이전: `https://code-destiny.com/privacy-policy/#overseas-transfer`
- 연결 해제: POST `https://code-destiny.com/api/toss/callbacks/unlink`

콘솔 Basic Auth 입력은 raw 자격 문자열, 서버 secret은 `Basic ` + base64 문자열로 대조한다. [공식 토스 로그인 가이드](https://developers-apps-in-toss.toss.im/guide/authentication/intro)의 인코딩 계약을 따른다. 실제 연결 해제 테스트는 기존 권리를 바꾸므로 실행하지 않았다.

## 진행 상태

- 키 3개 등록 완료, READY 미설정으로 서버 닫힘 유지.
- 로그인 콘솔은 초안 준비까지 완료. 공개 고지 반영 후 최종 등록한다.
- 첫 critical 검사는 sitemap drift에서 중단돼 공식 generator로 갱신했다.
- 두 번째 검사는 5,074개 중 5,073개 통과, 로컬 일일 운세 빌드 데이터 누락 1건 실패. 외부 API를 사용하지 않는 `fortune:build-data`로 산출물을 준비했다.
- 재실행 Node 검사는 5,074개 전부 통과, critical 계약 검사와 Worker 빌드도 통과했다. Jest는 8,007개 통과·1개 건너뜀·정책 버전 대조 1개 실패였다. 주문 기록용 `ORDER_POLICY_VERSIONS.privacy`도 2026-11-15로 맞춘 뒤 해당 Jest 파일 2개 테스트가 모두 통과했다. 결제 가격·허용 조건·원장 동작은 바꾸지 않았다. 전체 재실행 완료로 과장하지 않으며 최종 main CI를 확인한다.
- 신규 판매·실결제·검토 제출·공개 출시는 계속 보류한다.

## 다음 실행 순서

privacy 변경의 검증·커밋·main CI 확인 → READY가 닫힌 채 공식 production 승격 → 공개 방침 확인 → 로그인 콘솔 등록 → 정상 Cloudflare plain_text `TOSS_RELEASE_READY=true` 설정 → production vars 정본 기록 및 staging false 고정 검사. 각 설정 직전 최신 바인딩과 코드 SHA를 다시 읽어 다른 세션 변경을 보존한다.

승격 전 추가 필수 보완: 기존 앱의 신규 판매 false 상태를 서버 신규 상담 준비에도 동일하게 집행한다. 현재 서버는 READY를 켜면 등록 SKU의 새 intent를 만들 수 있다. 기존 구매 복구·재열람을 보존하는 별도 코드 검증을 먼저 완료한다.


## 신규 판매 서버 집행 보완 — 2026-11-15

- 신규 판매 정본은 lib/toss-release.mjs의 NEW_PURCHASES_AVAILABLE=false다. 앱은 기존 release.ts를 통해 재수출하며 서버 catalog·신규 prepare도 같은 값을 따른다. 가격/SKU는 유지한다.
- /prepare, canonical 신규 상담, letter 신규 상담을 차단한다. native 공통 prepare는 기존 소유 구매 원장과 서비스/SKU 및 실제 paid 주문을 쓰기 전에 검증한다. paid 재시도도 verifiedIntent를 통과한다.
- 미귀속 주문 최초 제출은 구매자 독립 증명이 아니므로 /orders/grant, /orders/restore, /tarot-library/orders/grant에서 원장이 없으면 partner 조회 전에 차단한다. 세 grant 트랜잭션도 원장 없는 첫 삽입을 차단한다. 기존 소유자의 원장·가격·미완료 입력 복구·결과 재열람은 유지한다.
- 일반 및 tarot 원장 검증에 ownerId 대조를 명시했다. tarot execution이 없는 기존 원장을 다른 owner로 복구하는 경우도 쓰지 않는다.
- private 구매 전체 흐름은 테스트 전용 module DI의 true로 유지한다. 실서버/env/body 우회는 추가하지 않았다.
- 공용 상수 추출 전후 플랫폼 번들은 identifier minify를 끈 동일 esbuild 옵션에서 23,862 bytes 완전 일치했다. 기존 최종 AIT/QR은 유지한다.
- 최초 targeted 104개 통과. 최초 귀속 보완 후 115개 통과, 누락 의존성과 fixture 수정 후 관련 118개 통과, 마지막 tarot owner 회귀 13개 통과. Toss 전체 첫 실행은 1,739/1,745 통과였고 3건 fixture와 3건 새 worktree 앱 의존성 누락을 위 targeted 검사로 해소했다. lock 기준 npm ci --ignore-scripts, 앱 typecheck 통과. 전체 check:fast는 추가 보완 이전에 시작했으므로 검사 시점을 구분하고 최종 CI가 최종 트리를 검사한다.
- 콜백 자격 문자열은 작업공간73 p1 input[name="callback.basicAuth"] DOM에만 있다. 저장 전 reload/close하지 않는다. 분실하면 identity/data키는 보존하고 미등록 callback만 메모리 생성해 서버 secret과 콘솔 raw를 같이 재설정한다. 출력·파일 기록 금지.

최종 로컬 결과: check:fast critical 계약 77/77, Node 5,072/5,074. life-book/love-secret 기존 구매 전체 흐름 fixture 2개가 닫힌 판매 정본을 읽어 실패했다. 명시 mock module DI로 보완 후 해당 파일 95개 통과. Worker build와 Toss typecheck 통과. 전체 check:fast 통과로 표시하지 않으며 최종 main CI로 최종 트리를 검증한다. 추가 가격/정책 변경 및 실호출은 없다.

서버 판매 닫힘 보완은 main a18cf23c7e0990bd532878f1e725335aaf7608be로 전달됐다. pre-push PASS. main CI43618278370은 독립 작업 후 1회 확인에서 진행 중이며 공식 운영 승격·콘솔 등록·READY 활성화는 아직 실행하지 않았다. 운영 true/staging false 설정 후보는 별도 임시 파일에서 parity 및 27개 회귀 검사 PASS, 실제 설정은 미적용이다.

전체 Toss 최초 실패 6개는 추가 전체 반복 없이 final-sales-targeted.log의 118 PASS로 모두 해소 검증했다: native-fusion-boundary(2), native-neo-boundary(1)는 명시 mock DI 보완; official-devtools(1), vedic-extra-ui(1), vedic-reading-ui(1)는 잠금 파일 기준 앱 의존성 설치 후 통과. 같은 실행에 grant/native-consultation/tarot-library/routes 회귀를 포함했다. 최종 tarot ownerId 보강은 그 뒤 13 PASS로 별도 검증했다.

공식 운영 실행을 정확히 1회 시작했다: https://github.com/rei1237/codedestiny/actions/runs/43618733981 (mode=production, 코드 a18cf23c7). main CI는 아직 성공으로 기록하지 않는다. 공식 release 자체 고위험 preflight를 생략하지 않으며 실패하면 승격 전 차단한다. 로그인 콘솔 저장·READY 설정은 공개 반영을 확인한 뒤 실행한다.
