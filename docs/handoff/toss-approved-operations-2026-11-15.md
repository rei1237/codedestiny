---
status: in-progress
updated: 2026-11-15
next: 공식 production run43618733981의 결과를 다음 실제 활성화 판단 시점에 1회 확인한다. 성공한 공개 privacy/SHA 확인 뒤 콘솔 등록과 READY 설정을 진행한다.
---

## 첫 행동
handoff 스킬, CLAUDE.md, docs/toss/launch-operational-evidence-20261114.md를 따른다. 비밀값은 출력·파일·커밋에 남기지 않는다.

## 지금 상태
- 작업 디렉터리: D:/Development/codedestiny-worktrees/toss-approved-operations-20261115-005204
- 브랜치: wt/toss-approved-operations-20261115-005204, 시작 SHA f8a4ec2afa7ba2bacb7913201aae6962c4c6e232.
- 원본 root 체크아웃의 다른 세션 미추적 파일은 보존한다.
- 기존 코드/AIT 검증 및 비공개 QR 20261115-16은 완료됐다. 운영 활성화는 아직 실행하지 않았다.

## 승인 상태
2026-11-15 사용자에게 질문한 범위: “신규 판매를 닫아 둔 채, 무료 기능·기존 구매 권리를 위한 운영 Worker 승격, 비밀키·토스 로그인 설정을 진행할까요? 서버 활성화는 기존 미완료 유료 상담의 LLM 생성 재개도 가능하게 합니다. 실결제 테스트와 검토 제출·공개 출시는 이번 승인에 포함하지 않습니다.”

사용자 답변: **“위 영향 범위로 운영 설정 진행”**. 이 승인 범위를 재확인하지 않는다. 신규 판매, 실결제 테스트, 실 LLM 개발 검증, 임의 운영 DB 쓰기, 검토 제출 및 공개 출시는 제외한다. 사용자 이용에 따른 기존 미완료 유료 생성 재개 가능성은 고지·승인됐다.

## 작업 규칙과 함정
- 로컬 배포 금지. 공식 Release Cloudflare Pages and Worker의 production 경로만 사용한다. Pages/Worker 동일 SHA와 롤백 계약을 보존한다.
- 현재 운영 배포 식별값을 먼저 기록한다. 기존 암호화 자료가 있으면 신원/데이터 키를 임의 교체하지 않는다.
- TOSS_RELEASE_READY는 로그인뿐 아니라 기존 유료 생성·대사·연결 끊기 복구를 연다. 준비가 끝난 뒤 활성화한다.
- 최초 구매자 독립 증명 문제가 있어 신규 판매는 닫힌 채 유지한다. 다른 서비스에 4,950원 SKU를 재사용하지 않는다.
- 콘솔은 ego-browser 스킬을 사용한다. 사용자 “새 작업공간에서 계속” 승인은 유지된다. 이전 작업공간72는 종료됐으므로 새 공간에서 시작한다.
- 불명확한 국외 처리 사업자·국가·보유기간은 추정하지 않는다. 필요한 외부 사실만 root에 전달하고 독립 단계는 계속한다.

## 설계
기존 원본과 개인정보 정본을 대조해 최소 설정한다. 키는 보안 메모리/표준입력으로만 처리하고 값은 관찰 결과에 포함하지 않는다. Toss 컬렉션은 읽기 전용 집계로 기존 권리와 복구 영향만 확인한다. 모의 테스트를 실운영 생성으로 대체하지 않는다.

## 단계
- [x] 사용자 승인과 작업 범위 기록, 안전 워크트리 준비
- [x] 운영 배포·바인딩·기존 키/DB 집계 확인
- [ ] 개인정보 고지와 콘솔 필수 항목 대조
- [ ] 키 등록·공식 Worker/Pages 승격·토스 로그인 설정
- [ ] 준비 상태 확인 후 서버 활성화, 신규 판매 닫힘 검증
- [ ] 결과 문서·targeted 검사·커밋·pre-push·push·최종 CI 확인 및 정리

## 2026-11-15 운영 진행 기록
- 운영 Toss 컬렉션 4종은 모두 0건이었다. canonical DB에서 실제 운영 appName `code-destiny-worker` 연결 8개를 읽기 전용으로 확인했다(동일 DB 이름만으로 클러스터 일치를 단정하지 않음).
- 기존 Toss 키가 없는 상태에서 신원 키·데이터 키·콜백 인증값 3개를 메모리 생성 및 보안 stdin으로 등록했다. 비밀값은 파일·로그에 남기지 않았다. READY는 미설정, mTLS 바인딩은 보존했다.
- Ego 작업공간73 p1에 로그인 설정 초안이 있다. 필수 이름 외 6항목 사용 안 함. 서비스 약관·개인정보 수집 이용·국외 이전의 필수 동의문을 정상 추가 UI로 준비했다. 콜백 POST URL과 raw Basic Auth 입력은 준비됐지만 최종 등록은 아직 안 했다. 콜백 값은 DOM에만 있으므로 화면 출력에서 반드시 가리고, 저장 전 탭을 닫거나 새로고침하지 않는다.
- 고정 국외 이전 템플릿은 이름 보관·보유기간이 실제 처리와 달라 사용하지 않았다. 정상 custom 동의문 경로를 사용한다. name은 암호화 응답에 일시 수신되며 복호화·DB·로그 보관하지 않는다.
- 현재 운영 외부 Vedic base/key 바인딩은 없다. 현재 Swiss 로컬 계산 경로와 프라슈나 좌표·질문·시각 처리를 privacy에 명확히 반영했다. AUTH_PRIVACY_VERSION도 2026-11-15로 맞췄다.
- privacy 수정 후 첫 critical 검사는 sitemap drift에서 실패했다. 공식 sitemap:generate로 재생성했다. 두 번째 검사는 5,074개 중 5,073개 통과, 신규 worktree의 일일 계산 산출물 누락으로 1개 실패했다. 공식 fortune:build-data(외부 호출 없음) 실행 후 세 번째 critical 검사 session79937 진행 중이며 실패했던 항목도 통과했다. 생성 sitemap 날짜 변경은 privacy 및 공식 volatile 운세 날짜이며 URL 목록은 유지된다.
- 이 세션 production dispatch는 아직 0회다. 다른 세션의 공식 run43612648387이 2026-11-14T16:09:27Z 성공해 live Pages/Worker를 f8a4ec2afa7ba2bacb7913201aae6962c4c6e232로 갱신했다. root도 이 실행을 시작하지 않았다. 기존 동시 배포는 취소·롤백하지 않으며 새 rollback baseline으로 식별값을 다시 읽는다.
- 승인된 실행 순서: 공개 privacy를 READY 닫힌 상태의 공식 1회 production 승격으로 반영 → 콘솔 등록 → 정상 Cloudflare plain_text 설정으로 READY=true → 저장소 production vars 정본에 동일 값 기록. staging에는 활성화를 전파하지 않는다. 설정 변경 직전 최신 바인딩·코드 SHA를 다시 읽고 다른 세션 값과 3키·mTLS를 보존한다.
- 새 baseline: Pages da6878a5-60cd-48d0-8496-f03639fa8cb6 / Worker deployment56b263aa-480d-483f-a7c1-83ace58ad3ee, version10e51006-c4b6-4869-a13a-4533acdaf6b4. 키3개 포함된 버전이다. 코드 양쪽 f8a.
- Cloudflare 정상 UI 로그인 완료, 작업공간73 p2 production settings에 있다. Add variable 모달에서 Production만 선택된 plain 변수 입력 경로를 확인했지만 저장하지 않았다. 설정 버튼은 Add variable and deploy이며 최신 코드/다른바인딩 보존을 사전·사후 확인해야 한다.
- activation vars는 production true/staging false, 딱 TOSS_RELEASE_READY 한 키만 parity 검증기에 명시적 환경 차이+값 단언으로 추가하도록 root도 확인했다. 일반 unknown/mismatch 검증은 약화하지 않는다.

## 활성화 전 필수 보완 — 신규 판매 서버 집행

privacy 검사79937은 Node5074 전부, critical 계약/Worker 빌드 통과, Jest8007 pass/1 skipped/1 fail로 종료했다. 유일한 실패는 주문용 정책버전도 동기화해야 한다는 대조 테스트다. worker/payments/policy-versions.js의 privacy를 2026-11-15로 맞춘 뒤 `npm run test:jest -- --runTestsByPath __tests__/worker/payments-v2.policy-versions.test.js` 2/2 pass. 전체 재실행은 하지 않고 최종 CI가 전체 검증한다. 원래 정책/가격/결제 동작은 유지한다.

privacy 최초 커밋 후 pre-push가 `public/static/policies/privacy/index.html` 미러 누락을 찾았다. 공식 `npm run sync:public`은 이 파일 1개만 최종 변경했고 source와 같은 커밋으로 amend한다. 생성 중 일시적으로 표시된 feature-details 변경은 완료 후 사라졌으며 다른 변경은 섞이지 않았다.

2026-11-15 root 요청으로 재확인한 결과 `apps/toss/src/release.ts`의 `NEW_PURCHASES_AVAILABLE=false`는 클라이언트에만 적용된다. Worker `/catalog`는 승인 SKU를 available:true로 표시하고, READY true 이후 `/prepare`, `/canonical/fortune-chat/consultations` POST, native 공통 `prepareNativeConsultation`은 새 미결제 상담 intent를 만들 수 있다. **이 상태로 READY를 켜지 않는다.**

root 승인: 기존 NEW_PURCHASES_AVAILABLE를 단일 정본으로 앱/서버가 공유하고, 원래 승인된 판매 닫힘 정책을 서버에서 집행한다. 새 env·SKU·독립 정책 게이트를 만들지 않는다. 등록 원장·가격·기존 grant/recover/read/paid retry를 보존한다. native·tarot·music 등 모든 신규 intent 진입을 추적한다. native-tea.js의 공통 함수는 orderId가 있는 구매 복구와 없는 신규 준비를 구분한다. 기존 준비/완료 결과를 신뢰된 주문 소유권 없이 반환하면 안 된다.

mock 로그인·구매·생성은 명시 DI로 계속 검증하며 실서버 폴백은 금지한다. 앱 release 정본 이동 시 `apps/toss/scripts/launch-status.mjs`의 정규식 읽기와 관련 static 테스트도 새 정본으로 맞춰야 한다. 실제 앱 번들에서 공용 상수 참조가 달라지면 AIT 재빌드 필요 여부를 root에 알린다. 변경 파일·함수와 targeted 검사 결과를 root에 보내 활성화 전 읽기 검토를 받는다. privacy 단독 커밋 후 서버 보완을 분리 커밋하고 **하나의 공식 production 승격**에 포함한다.


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

## 현재 전달 지점 — 2026-11-15 01:58 KST

- 서버 보완+privacy가 main a18cf23c7e0990bd532878f1e725335aaf7608be로 push됐다. 원래 privacy 및 승인기록 커밋은 origin/main f03d8add0 위에 rebase됐다. 원본 checkout은 수정하지 않았다.
- check:pre-push 모두 PASS. 최종 main CI https://github.com/rei1237/codedestiny/actions/runs/43618278370 는 독립 작업 후 1회 확인에서 in_progress였다. 저장소 규칙에 따라 기다리거나 반복 폴링하지 않았다.
- 운영 dispatch는 여전히 0회. READY 미설정. 운영 baseline은 f8a4ec2afa7ba2bacb7913201aae6962c4c6e232의 Pages da6878a5-60cd-48d0-8496-f03639fa8cb6 / Worker version10e51006-c4b6-4869-a13a-4533acdaf6b4로 동일하며 키3개·mTLS 유지.
- 작업공간73 p1 초안 credential 존재를 다시 확인했다. round39까지 실행. 다음 browser 파일은 round40부터, 이전 파일 재실행 금지. console 등록은 아직 실행 안 했다. Ego 업데이트 알림은 있었으나 업데이트하지 않았다.
- .tmp/toss-operations/record-activation.mjs는 운영 활성화 성공 뒤 저장소 prod=true/staging=false와 정합성 가드를 적용할 준비 스크립트다. 아직 실제 파일에 실행하지 않았다. preview-activation.mjs가 만든 .tmp 후보만 검사했고 parity 및 27 self-tests 모두 PASS. 초기 후보는 주석 속 [vars]를 잘못 잡아 실패했으며 정확한 ^[vars] 행으로 수정해 재검증했다.
- root 읽기 검토에서 발견한 최초 귀속 및 tarot ownerId 두 blocker는 수정·검증됐다. root는 추가 blocker 없이 CI 성공 후 승인 범위대로 진행함을 확인했다.
- 남은 실행: CI 성공 확인 → gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production 딱1회 → 독립 작업 후 공개 privacy/배포SHA 확인 → p1 등록하기(가입하기/테스트하기 아님) → 최신바인딩 확인하고 p2 정상 UI Add variable and deploy로 plain READY=true → read-after-write SHA/키/mtls/기타바인딩보존 확인 → record-activation.mjs 적용/검증/커밋/push → handoff done 및 자기워크트리/스크래치정리. 추가 코드승격 금지, 실결제/실LLM테스트/운영DB임의쓰기/공개출시 제외.

전체 Toss 최초 실패 6개는 추가 전체 반복 없이 final-sales-targeted.log의 118 PASS로 모두 해소 검증했다: native-fusion-boundary(2), native-neo-boundary(1)는 명시 mock DI 보완; official-devtools(1), vedic-extra-ui(1), vedic-reading-ui(1)는 잠금 파일 기준 앱 의존성 설치 후 통과. 같은 실행에 grant/native-consultation/tarot-library/routes 회귀를 포함했다. 최종 tarot ownerId 보강은 그 뒤 13 PASS로 별도 검증했다.

## 공식 운영 실행 시작 — 2026-11-15

- https://github.com/rei1237/codedestiny/actions/runs/43618733981 : 승인된 mode=production을 정확히 1회 dispatch했다. 원격 main a18cf23c7e0990bd532878f1e725335aaf7608be 확인 후 실행했고 스킵/재배포 옵션은 없다. 앞으로 같은 요청으로 두 번째 production dispatch를 하지 않는다.
- main CI pending은 통과로 간주하지 않는다. 정본 문서는 main CI를 전달 완료 조건으로 규정하고 배포 자체의 별도 안전장치도 명시한다. 공식 production workflow의 checks가 lint/typecheck/상시 auth-payment/high-risk deploy:critical/Node를 승격 전에 실행하고 실패 시 닫히므로 별도 대기 게이트를 추가하지 않았다. root도 이 계약을 읽고 진행을 확인했다.
- READY는 아직 미설정이며 p1 로그인 초안은 미등록이다. p2는 production settings 화면에서 저장하지 않은 상태다. browser round40까지 실행했으며 다음은 round41.
- 이후 실제 활성화 판단에서 main CI 및 release 결과를 각 1회 확인한다. 중간 대기/반복 폴링·실LLM/실결제/검토제출/공개출시는 하지 않는다.
