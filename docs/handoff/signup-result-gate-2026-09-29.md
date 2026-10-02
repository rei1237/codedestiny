---
status: active
updated: 2026-10-02
next: "운영 SHA 에 932a22824 포함 여부 확인 — 미포함이면 1회 승인 승격 뒤 실기기 모바일 OAuth 복귀 확인"
---

# 무료 사주 결과 직전 가입·로그인

작업 디렉터리: `C:/Users/user/.codex/worktrees/growth-execution/code-destiny`
구현 커밋: `932a2282471fa371d8a185ec515ba3f41319fe1a`

## 관찰과 가설

- 관찰: 기존 `checkPrivacyAndCalculate`는 비회원도 동의 후 사주 계산을 실행했다. 영냥이 유료 상담은 이미 로그인 이후 서버 요청을 만든다.
- 가설: 비회원 결과 열람 허용이 낮은 가입률의 원인이다. 전환 수치를 조회하거나 이 가설을 입증하지 않았다.
- 요청에 따라 기본 사주 입력은 공개하고, 공통 계산 진입과 직접 `calculate()` 호출 모두 결과 전에 서버 세션을 확인한다. 공개 소개·SEO 글과 기존 결제 가격·이용권·월정석·단건 결제 정책은 그대로다.

## 구현

- `js/saju-engine.js`: 로그인 게이트, 같은 탭의 1시간 임시 입력, 로그인 취소/만료/저장 불가 처리, 정상 복귀 자동 계산, 성공 뒤 임시 입력 삭제. 출생 정보는 URL에 넣지 않는다.
- `js/destiny-profile.js`: 기존 인증 요청·401 복구를 재사용한 결과용 세션 확인. 로컬 로그인 표시만으로 통과시키지 않는다. 5xx/통신 장애는 비회원으로 단정하지 않는다.
- `js/saju-engine-continuation.js`: 입력 폼 초기화 후 복원.
- `index.html`: 강제 세션 확인은 로컬 비회원 캐시를 건너뛴다. 기존 가입/로그인 모달 재사용, 설명·포커스 이동·키보드 순환 보완.
- `SajuLandingHero.tsx`, 영냥이 무료/천원 안내: 무료 사주 결과에 로그인이 필요함을 안내.
- 생성된 public 미러 및 독립 페이지/React 결제 런타임의 스크립트 캐시 참조 갱신. 인증 공급자·결제 판정·API 응답·DB 스키마는 변경하지 않았다.
- `fortune_login_required`, `fortune_login_resumed`를 기존 동의 기반 계측으로 보낸다. 출생 정보/이름은 이벤트에 넣지 않는다.

## 검증

- `node --test __tests__/ui/saju-result-login.test.mjs`: 7/7 통과.
- `node scripts/verify-saju-result-login.mjs`: 360/390/430/1280px 실제 셸 + 모의 API. 비회원 차단, 취소/새로고침 입력 복원, 로그인 링크의 next 주소를 따른 자동 재개, 성공 후 임시 입력 삭제 통과.
- `node scripts/verify-checkout-auth-recovery.mjs`: 7셸+2런타임/401 복구/단일비행 통과.
- `npm run verify:payment-choice-parity -- --self-test`, `npm run verify:analytics-events`, `npm run verify:public-mirror-fresh`: 통과.
- Impeccable 기계 검사: `[]`. 모바일/데스크톱 실제 모의 렌더 확인. 첫 캡처의 전환 애니메이션 중간 상태를 완료 상태와 구별했다.
- 최초 `check:fast`: 85/88 통과. 실패 3개는 스크립트 캐시 핀과 수정 중 소스/미러 불일치였으며 개별 재검증은 통과. 최종 전체 실행·main CI 결과는 전달 시 별도 기록한다.
- 최종 로컬 스위트: 87/88 통과 후 `billing-client.ts`의 캐시 주소 변경에 대한 동결 기록 해시만 갱신해 해당 가드도 통과했다. 전체 npm test는 통과했다. `check:fast` 명령 전체가 종료 코드 0이었다고 보고하지 않는다.
- 첫 main CI에서 기존 사주 요약 브라우저 픽스처가 인증 사용자를 반환하지 않아 막혔다. 정상 회원 픽스처로 수정했고 16개 요약 화면 조합이 로컬 통과했다. 새 비회원/로그인 복귀 브라우저 검사도 CI에 연결했다.

증거: `C:/Users/user/.codex/visualizations/2026/09/29/01a0ec3d-d2f7-78a0-a792-501230c600dd/signup-result-gate/`

## 남은 확인과 경계

- 운영 배포는 아직 실행하지 않았다. `CLAUDE.md:53`의 명시적 1회 승인 경계를 유지한다.
- 실제 카카오/다른 제공자 가입, Threads 인앱→외부 브라우저 전환, 실제 휴대폰은 미검증. 다른 브라우저나 새 탭으로 이동하면 sessionStorage 입력은 공유되지 않는다.
- 이번 변경은 **기본 사주의 공통 입력·결과 경로**에 적용했다. 별도 독립 앱(예: 동물 사주) 전체에 신규 가입 게이트를 적용했다는 의미가 아니다. 기존 영냥이 인증·결제 게이트는 유지했다.
- 정적 클라이언트 계산의 서비스 이용 흐름을 제한하는 변경이며, 클라이언트 계산 코드를 서버의 비밀 데이터로 바꾸는 보안 장치는 아니다.
- 배포 후 가입 전환·이탈·로그인 복귀율을 측정해야 한다. 증가를 보장하지 않는다.
- 롤백: 구현 커밋만 revert하고 미러 검증/CI를 거친다. 다른 세션 변경을 reset하지 않는다.

## 재개

`C:/Users/user/.codex/worktrees/growth-execution/code-destiny`에서 이 문서를 읽고 구현 커밋 `932a2282471fa371d8a185ec515ba3f41319fe1a`의 main 포함 여부와 CI를 확인한다. 승인된 운영 ref가 있으면 프로젝트 배포 절차로 승격한 뒤 Pages/Worker SHA를 확인하고 실제 모바일 OAuth 복귀를 검증한다.
