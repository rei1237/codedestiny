# 앱인토스 출시 진행 기록

status: in-progress

## 최신 사용자 지시 — 2026-10-08 재개

사용자가 최신 운영 소스 기준 구현·업로드 재개를 요청했다. 먼저 홈의 운명의 꽃 스타일, 읽을거리 접힘 배치, 명상 컬렉션의 잘못된 타로 기록 링크 제거를 main에 반영했다. 최종 UI 커밋은 `846d7eb9be4f0f4b7a78e56480a18456395f86fa`이며 CI 확인 후 승인된 운영 배포를 진행한다. 콘솔 재로그인은 확인했다. 사업자 증빙 서류 업로드가 남아 로그인/IAP 설정은 아직 열리지 않는다.

SDK 3.7.0은 npm latest 확인. 공식 미니앱 테스트 문서의 SDK 3.1.1 이상 계약에 따라 허용 Origin을 `ai-saju-studio.apps.tossmini.com`, `ai-saju-studio.private-apps.tossmini.com`으로 수정했다. 앞선 web/private-web 기재는 3.0.0~3.1.1 미만에 해당한다. 실기기 Origin은 아직 미실측. 근거: https://developers-apps-in-toss.toss.im/guide/operation/toss

## 이전 사용자 지시 — 출시 보류

2026-10-07: 사용자가 “지금 서비스 중에서 안되는 부분들이 있어서 그 부분이 해결된 이후에 앱인 토스 론칭해야겠다”라고 지시했다. **업로드·검수 제출·출시 작업을 보류했다. 기존 서비스 장애 해결과 회귀 검증 이후 재개한다.** 자동 재개/감시 예약은 만들지 않았다.

사용자가 사업자 정보 입력과 휴대폰 인증을 모두 완료했다고 알려 주었다. 이는 사용자 확인이며, 마지막 콘솔 조회는 아직 사업자 등록 안내였으므로 사업자 승인·정산 완료로 기록하지 않는다.

## 요청과 경계

CODE DESTINY의 기존 계산·해석·구매 기록을 보존하면서 토스 전용 CSR, Toss 로그인, IAP, 중단 복구, 기록, 약관, 소개 이미지와 콘솔 등록·업로드·검수·승인 후 출시를 구현한다. 실결제·과금 LLM·예산 지출·메시지 발송은 미승인이다. 삭제 요청은 사용자가 다른 세션에 보낼 말을 잘못 보냈다고 철회했다. **토스 출시만 진행하고 기존 웹 정리는 하지 않는다.**

## 실측 증거 (2026-10-07 KST)

- 저장소: https://github.com/rei1237/codedestiny, main. 여러 쓰기 세션을 확인하여 공식 스크립트로 격리했다.
- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959`
- 작업 브랜치: `wt/toss-miniapp-20261007-223959`, 시작 SHA `a71611cdfda163fbeaad2e7a90470e4821d3200d`.
- Chrome 로그인 콘솔에서 workspace `21957` / `네오3377`, 기존 앱 `ai 사주 물상`, appName `ai-saju-studio` 확인. 중복 앱 생성 없음.
- 앱 출시 화면: 앱 정보 반려, 첫 버전 미등록, 등록 버튼 비활성.
- 반려 사유: 아이콘/썸네일은 크롭하지 않은 배경 포함 사각형 제출 필요.
- 수정 화면은 앱 정보와 `.ait` 번들을 함께 받으며 토스앱 테스트를 요구한다.
- 콘솔 제한 실측: 한국어 앱명 10자, 영어 15자, 부제 20자. appName 변경 불가. 현재 연령 만 19세 이상.
- npm 공식 registry `@apps-in-toss/web-framework` latest `3.7.0`, beta `3.5.0-beta.0`.
- 공식 SDK 3.x 문서: `apps-in-toss.config.ts`, `webBundleDir`, `webView`, brand.primaryColor. 운영 Origin `<appName>.web.tossmini.com`, QR 테스트 `<appName>.private-web.tossmini.com`.
- 콘솔 MCP는 현재 호출 가능한 도구 목록에 없음. Chrome 새 전용 탭에서 로그인 세션 접근 성공. 원래 탭 연결 2회는 focus CDP timeout.

## 구현 선택

- `apps/toss` 독립 패키지와 lockfile. 루트 Next.js/PortOne 번들을 임베드하지 않는다.
- 설치된 SDK 타입과 공식 문서를 함께 확인한다. 기존 User는 이메일 필수이므로 Toss 식별자를 기존 웹 계정으로 자동 병합하지 않는다.
- 영냥이 `prepareFortune`, `presentFortune`, `generateNextChapter`, repository, queue, recovery와 계산 모듈 재사용 검토 중.
- IAP 서버 조회는 사용자 범위의 `x-toss-user-key` 필수. 공식 주문 응답에는 금액이 없으므로 금액을 서버 조회 결과라고 꾸미지 않는다. 콘솔 승인 SKU 가격 스냅샷과 SDK 상품 정보 대조가 필요하다.
- 화면 방향: 라이트 중성 바탕, 질문 우선, 영냥이 원본, 보라 CTA, 네이비/골드 강조. TDS 공통 UI. 첫 진입 로그인 자동 실행 금지.

## 재개할 때 다음 행동

1. 기존 서비스 장애가 해결됐는지 사용자/수정 커밋에서 확인. 해결 전에는 제출/출시하지 않는다.
2. 이 worktree의 미커밋 변경을 보존한 채 main의 동시 작업과 통합 범위를 비교한다. 다른 세션 변경을 삭제하지 않는다.
3. 아래 미완료 보안·약관·생명주기·통계·화면 검증을 마치고 targeted 검사와 CI를 실행한다.
4. 사업자/정산/관리자 권한, 토스 로그인·약관·mTLS·IAP 상태를 실제 콘솔에서 다시 확인한다.
5. 승인 SKU/가격·법적 동의·보존/삭제 정책·인증서·실기기 증거 없이 TOSS_RELEASE_READY를 true로 설정하지 않는다.

## 미완료

**출시 가능한 완성본이 아니다.** 로컬 개발 중 상태를 격리된 worktree에 보존했다. 아직 커밋/merge/main push/CI/배포를 하지 않았다. 사용자 보류 지시 때문에 check:fast와 로컬 Vite 서버를 중단했다. 미완료 작업이므로 worktree와 문서를 삭제하거나 status: done으로 표시하지 않았다.

### 준비한 구현

- `apps/toss`: React 18.3.1 / Vite 8.3.3 / TypeScript 5.9.3 / SDK 3.7.0 / TDS 2.4.1 독립 패키지, lockfile, CSR 화면, 공식 로그인/IAP/미지급 복구 어댑터. 외부 PG·웹 계정 로그인 없음.
- 원본 `public/assets/yeongnyangi/original/hero-800.webp`를 확인한 후 `apps/toss/public/assets/yeongnyangi.webp`에 재사용. 새 이미지 생성/등록 이미지 완성은 하지 않음.
- `worker/toss`: Workers mTLS 전용 fetch, 암호화 userKey/해시 세션, 독립 Toss identity, 서버 범위 주문 확인, 멱등 권한 트랜잭션, 결과/기록/복구 경로, 제한된 CORS와 이벤트 필드.
- `worker/yeongnyangi/access-methods.js`, `repository.js`, `recovery.js`: TOSS_IAP 증거 재검증 및 영속 PAID 행의 기존 복구 경로 연결.
- `worker/index.js`에 `/api/toss/` 전용 라우팅. `tsconfig.json`은 독립 apps/toss 타입 검사 제외.
- 승인 SKU registry는 **빈 배열**. `TOSS_RELEASE_READY !== 'true'`일 때 인증/유료 작업 차단. 현행 운영 웹 가격을 토스 승인 가격으로 간주하지 않음.

### 실행된 검증

- `node --test apps/toss/test/*.test.mjs`: **26 passed**, mock/pure tests.
- `npm run test:jest -- --runTestsByPath __tests__/worker/yeongnyangi-repository.test.js --runInBand`: **95 passed**. 실제 repository 코드를 사용하되 DB/LLM은 mock. TOSS_IAP 9/15 중단→같은 주문 재개, 8개 항목 보존, 동시 claim 중 한 번만 진행, 웹 결제 증가 없음, 다른 소유자 결과 거부 포함.
- `apps/toss`의 `npm run typecheck`: 통과(초기 UI 시점).
- `apps/toss`의 `npm run build`: 통과(초기 UI 시점). 이후 뒤로가기/가로 넘침/구매 중복 방지/CSS 설정을 편집했으므로 **현재 최종 변경 전체의 빌드 통과 증거는 아님**.
- 최초 로컬 `.ait`: `apps/toss/ai-saju-studio.ait`, 489,867 bytes, CLI 출력 deploymentId `01a116b8-e928-7933-8b78-46ccb0fc3185`. **로컬 빌드 ID이며 업로드/공개 배포 ID가 아님**. 현재 코드보다 이전 산출물이라 업로드 금지.
- Chrome 390×844 로컬 홈/질문 선택 관찰. 첫 진입 로그인 모달 없음. 영냥이 이미지 가로 넘침 발견 후 CSS 수정, 수정 후 재검증은 미실행. Android/iOS 토스 실기기 검증 아님.
- `npm run check:fast -- --plan`: critical 판정 확인. `npm run check:fast`는 paid-gate-suite 진행 중 사용자 보류로 종료, **통과 미확인**.
- main CI, 운영 DB, 실결제, 유료 LLM, mTLS 실통신, 실제 개인정보 삭제는 실행하지 않음.

### 출시 전 반드시 해결할 구현/검증 공백

- 서버 주문의 금액 필드가 없으므로 콘솔 승인 가격 증거와 SDK 결제창 가격 실측 필요. 현재 SKU 0개.
- 콜백은 Basic Auth 및 3개 referrer 검증과 세션 무효화까지만 구현. 연결 해제/자체 탈퇴 시 개인정보 삭제, 거래 보존 범위/기간, unlinkPending 재처리, 재가입/동시 로그인·해제 경합은 미완료.
- userKey AES-GCM 저장은 구현했지만 구매 내역/출생정보/상담 결과의 저장 암호화와 DB 리전은 검증되지 않음.
- 환불은 결과 접근 시 서버 조회 후 차단함. 백그라운드 주문/환불 동기화와 공식 환불 절차 연결은 미완료. Toss를 PortOne 환불로 처리하면 안 됨.
- 결과 화면은 저장된 chapter 구조를 읽지만 전체 native chart/시기 표시, 모든 상태와 접근성 검증이 미완료. 준비 중인 기능은 등록 문구에 넣지 않음.
- API 개인정보 최소화/익명 이벤트 필드 제한은 구현. 전환 이벤트 영속 중복 제거·콘솔 이벤트 연결·생성 완료율/미제공률 운영 지표는 미완료.
- 미지급 복구는 권한을 먼저 복원하고 사용자가 질문을 명시적으로 연결함. SDK가 요청 ID를 반환하지 않으므로 최근 draft를 임의 연결하지 않음. 타기기/백그라운드/콜백 유실 E2E 실측 필요.
- 출생 입력은 국내 7개 도시만 선택 가능. 음양력·윤달·시간 모름 엔진 parity, 해외/기타 도시 UX 보완 필요.
- 약관 화면은 준비 상태 고지이며 제출용 약관이 아니다. LLM/Cloudflare/Mongo 실제 리전·수탁/국외 이전·보존·환불 정책 확인과 최종 동의 등록 필요.
- 정책/비게임 체크리스트 전체 읽음. 콘솔 공지 목록에서 10/1 통합 검수, 10/22 노출 정책 변경, 9/23 공유 리워드 종료 공지 제목 확인. 본문과 10/7 블로그 접근 오류는 아직 해결되지 않음.
- 로고/소개 이미지/상품 이미지, 등록 문구 입력, 테스트 QR, 검수 제출, 승인, 출시 **모두 미실행**.

### 재개 명령

```powershell
Set-Location 'D:\Development\code-destiny\.codex-worktrees\toss-miniapp-20261007-223959'
Get-Content 'docs\toss\2026-10-07-launch-handoff.md'
git status --short
# 현재 마지막 커밋: a71611cdfda163fbeaad2e7a90470e4821d3200d (시작 커밋; 이 작업 커밋 없음)
# 다음: 기존 서비스 복구 확인 → 미커밋 토스 구현 보완/검증 → main 통합/CI → 콘솔 준비 후 제출
```

## 공식 근거

- https://developers-apps-in-toss.toss.im/llms.txt
- https://developers-apps-in-toss.toss.im/intro/guide
- https://developers-apps-in-toss.toss.im/checklist/app-nongame
- https://developers-apps-in-toss.toss.im/documentation/integration/sdk-3.x
- https://developers-apps-in-toss.toss.im/documentation/common/authentication/toss-login
- https://developers-apps-in-toss.toss.im/documentation/common/monetization/iap/in-app-purchase

10월 7일 블로그 공지는 web 도구에서 접근 오류로 재확인 필요. 최신 문서와 공지 사이의 미검증 사항을 확정 사실로 취급하지 않는다.
