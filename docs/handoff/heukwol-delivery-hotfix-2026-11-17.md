---
status: in-progress
updated: 2026-11-17
next: main CI 44096970429의 성공을 확인하고 원격 main d13cc7506e01704512b9433b718c34f6827513da로 운영 릴리스 워크플로(mode=production)를 실행한 뒤 실제 Pages/Worker 및 흑월 번들을 검증한다.
---

# 흑월 결제 후 전달 긴급 수정

## 첫 행동
`D:\Development\codedestiny-worktrees\android-temple-release60-20261117-220709`에서 git 상태와 아래 검증 로그를 확인한다. 루트의 기존 개발 서버를 중단하지 않는다.

## 지금 상태
- 브랜치 `wt/android-temple-release60-20261117-220709`, 기준 `2bbcccbd2514b76af9685172b546422a94ef181a`(main과 origin/main 동일). 이 워크트리는 앞선 Android 격리 빌드 공간이며 현재 그 빌드는 중단됐다.
- 검증된 코드 커밋: CI 검사기 `87371bb04`, 흑월 `93c371660` 및 문서 `d13cc7506e01704512b9433b718c34f6827513da`까지 **main에 fast-forward 통합·push 완료**. 흑월 클라이언트·요청 시간 제한·회귀 테스트 2개 및 공식 생성기로 갱신한 사이트맵 5개가 포함된다. 원격 main은 d13cc7506이며 이 후속 상태 갱신은 아직 원격에 올리지 않는다.
- 최종 check:fast **exit 0**(세션 97498 종료). 로그: `D:\Development\code-destiny\.tmp\android-temple-release\heukwol-check-fast-final.log`. 결제 관련 77개, lint, 타입, Node **5,202/5,202**, Jest **479 suites·8,012 tests 통과 / 기존 1 skipped**, 결제 정책, Worker dry-run까지 통과. 첫 완주 시도는 sitemap drift에서 멈췄고 공식 생성기로 갱신·확인 후 재실행했다. 표 검사기는 별도 self-test 30개/대조 216키 및 verify:guard-wiring 통과. main check:pre-push exit 0도 확인했다.
- main CI: https://github.com/rei1237/codedestiny/actions/runs/44096970429 . 운영 릴리스 선행 검사이므로 `gh run watch --interval 60 --exit-status`를 백그라운드 세션 **35392**로 실행했다. 루트 `.tmp/android-temple-release/heukwol-main-ci-watch.log`에 결과가 쌓인다. CI 완료를 확인한 뒤 배포한다. **아직 운영 dispatch하지 않았다.**
- 직전 main CI 44088994952는 명리 표 발견 가드 실패. 타입/lint·빌드·critical 성공. 이 실패도 아래 수정으로 해결한다.

## 승인 상태
2026-11-17 사용자: “지금 흑월의 경고 기능이 제대로 결제 이후에 전달이 안되는 버그가 있는데 이게 급선무이므로 이것부터 정확한 원인 파악 후 수정해서 운영 배포해줘”. 추가 증상: “결제 후 결과 화면으로 넘어가지 않음”. 수정·main 푸시·운영 배포 승인됨. 다시 묻지 않는다. 실제 결제·유료 AI 테스트·운영 DB 수정·환불 실행은 하지 않는다.

## 작업 규칙과 함정
- 운영 읽기 전용 조사: 2026-11-17 22:08:24 KST 간편결제 50,000원 승인, 22:12:40에 이미 환불된 주문 1개. 결제 권한 처리와 암호화된 복귀 정보가 있으며 경로 `/heukwol/`, 요청 ID·프로필 일치. 상담 실행·결과·증빙 claim은 0개. 질문 원문·개인정보·비밀값은 출력/저장하지 않았다. 환불 주문을 재생성하거나 권한 복구하지 않는다.
- 운영 버전은 조사 당시 Pages/Worker 모두 `623b2bee9bd2de80fcd8179827834191c310d131`, 이후 다른 릴리스 44089215244가 성공하여 두 계층 모두 `2bbcccbd2514b76af9685172b546422a94ef181a`로 바뀌었다. 흑월 코드는 두 버전에서 같으며 수정은 아직 미배포다.
- 사후 확인 스크립트는 루트 `.tmp/android-temple-release/verify-heukwol-live.mjs <배포 SHA>`다. 운영 양쪽 SHA/흑월 200/실제 페이지 번들의 새 전달 안내를 검사하며 실제 결제·LLM을 호출하지 않는다. 이전 운영 번들에 새 안내가 없음을 확인했다.
- 오류 원인: start()가 PG 응답을 기다리며 flight=true를 유지 → 서버 결제 완료 폴링의 resume handler도 flight로 거절 → /start 0회. PG 콜백이 안 돌아오는 간편결제 경로와 일치. 추가 누락: 흑월 start/continue는 60초 서버 생성에도 authFetch 일반 22초 상한 적용.
- 검사기 오류: 생성 파일 한 줄 주석의 `natal-core/*.mjs`를 정규식이 블록 주석 시작으로 오인해 뒤쪽 PURE 주석까지 HIDDEN 표를 지움. 기존 공용 주석 스캐너로 교체. 계산값/분류표를 바꾸지 않았다.
- 처음 추가한 진행 안내는 중복 handler의 setMessage('')가 지웠다. 해당 추가를 되돌린 뒤 UI 준비 안내 쓰기를 공유 deliver로 모았다. 재현 테스트 최종 통과. 첫 check:fast는 수정 전 중단했고 현재 세션이 최종 실행이다.

## 설계
계정+auth epoch+기존 requestId로 상담 전달 Promise 하나를 공유한다. 결제 대기 잠금은 같은 주문 복구를 막지 않는다. 늦은 PG 응답은 기존 전달에 합류하고 실패는 동일 주문으로 재시도한다. 계정 변경은 기존 상태를 무효화한다. start/continue에만 기존 LLM 95초 상한을 적용하고 prepare/pricing/result·결제·인증 제한은 유지한다. 서버 권한·가격·차감·환불·DB 스키마 및 SEO 메타/색인 정책은 무변경.

## 단계
- [x] 운영 읽기 전용 근거 및 실제 컴포넌트 mock 재현: 변경 전 4개 실패
- [x] 최종 UI/요청 제한 회귀 24/24 통과
- [x] CI 표 검사기 실패 로컬 재현, 수정 후 self-test 30개 통과
- [x] check:fast 완료 → 독립 커밋 2개 → main 머지 → check:pre-push → push
- [ ] main CI 성공 확인 후 `.github/workflows/cloudflare-pages-deploy.yml` mode=production 실행
- [ ] 릴리스 결과·운영 Pages/Worker SHA와 흑월 페이지 확인
- [ ] 이 문서를 done으로 닫고 절 몰입 효과·Android 60 출시 재개(기존 moonlit handoff 참고)

롤백: 수정 커밋만 revert하고 공식 Actions rollback으로 이전 Pages/Worker 버전을 복구한다. 로컬 Wrangler 배포 금지. 로그·스모크는 개인정보 없는 상태만 확인한다.
