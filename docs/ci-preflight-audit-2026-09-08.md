# PR / CI / staging audit — 2026-09-08

## 실제 조사 범위
11 workflows와 모든 job/step, package scripts, root/app/mobile 구조, ruleset 20666260, 최신 열린 PR 전체, 42 worktrees 및 git cherry, 최근 실패 PR CI 10건의 job/log를 확인했다. 단일 npm root가 Next Pages·정적 홈·Worker·공유 lib를 관리하고 apps/mobile은 별도 package.json을 가진다. npm workspaces/Turbo/Nx, reusable workflow, composite action, OS/Node matrix, Cypress 설정은 발견하지 못했다. Playwright는 개별 mock/DOM 검증 스크립트에서 실행한다.

## 현재 문제와 근거

| 근거 | 분류 | 확인 내용 |
|---|---|---|
| Actions 34231628699, 34221316619, 34217125384 | 생성물 누락 | public mirror drift |
| Actions 34230988574, 34221396432 | 생성물 누락 | sitemap drift |
| Actions 34227715685 | 코드/콘텐츠 불일치 | shell markup와 ko.json 한 키 불일치 |
| Actions 34229246564 | flaky assertion | 암호문 base64의 무작위 숫자 8자리 연속을 평문 노출로 오인 |
| Actions 34231628682 | 콘텐츠/가격 회귀 | i18n-price-drift, vedic-basic-quality; 동일 base에서는 통과 |
| PR 1839 본문 및 Windows 로컬 재현 | 환경 차이 | SVG CRLF checkout으로 생성물 검사 실패. Linux CI는 통과 |
| PR 1834/1839/1824 live metadata | main 최신성/충돌 | 1835 merge 후 CONFLICTING. CI 성공은 새 main 호환성 증거가 아님 |
| PR CI main push + next-cache-warm push | 중복 build | 동일 SHA·동일 webpack cache key로 build:cf 중복 |

34225177843/34224840171/34224362171은 Static guards 실패까지 확인했으며 축약 로그만으로 세부 원인을 확정하지 않는다. 환경변수·의존성 캐시 손상·외부 API·Pages/Worker 순서가 이번 표본의 원인이라는 증거는 없다. PR 1824의 과거 browser timeout은 본문 주장으로, 로그와 별도 구분한다.

## 변경 및 보존

- ci:fast를 GitHub/local 공통 명령으로 연결. ci:preflight가 CI YAML의 fast/guards/critical/build 명령을 읽고 미지원 조건/명령을 차단한다.
- 임시 index 및 UUID detached checkout에서 미커밋 수정본을 검사한다. 실제 branch commit/push/PR은 성공 후에만 한다. CI tier에 따라 build·산출 SEO·Worker 크기까지 검증한다.
- snapshot diff 기반 paid scope, 전체 paid suite는 실패 귀책 면제 없이 실행한다. 외부 LLM/PG/DB Node transport를 차단한다.
- 검증 tree + 최신 main SHA의 로컬 receipt를 사용한다. pr:create는 dirty/stale/unpushed tree를 거부한다. 직접 GitHub UI나 gh 사용을 서버에서 PR 생성 전에 차단하는 기능은 아니다. required CI는 그대로 서버 게이트다.
- next-cache-warm 자동 push를 제거하고 수동 복구를 남긴다. main PR CI가 같은 cache를 채운다.
- SVG LF 고정. 암호화 무작위 숫자 검사를 GCM IV 길이·태그 변조 거부로 교체. 실결제/암호화 구현/정책/DB schema 변경 없음.

## CI 구성

Fast: lint, changed lint, typecheck, 기존 source-reading/static/mobile/browser 가드. CSS/docs는 Pages build와 전체 Jest를 생략하되 static 가드를 보존한다.
Risk: 기존 change-risk 정본으로 standard에 Pages/Worker build+산출물 검사+mock smoke, critical에 전체 unit/security/deploy/DB 정적 검증. Paid Flow Gates는 별도 scope로 유지한다.
Full: high-risk/배포/Worker/결제/인증 및 full-ci 라벨. check-changed의 더 세밀한 dependency 선택은 기존 10-PR shadow 계약을 유지한다. 안전 근거 없는 경로 축소는 하지 않는다.

## 배포 / cache / 보호

Ruleset main-protection은 PR, deletion/non-fast-forward 방지, CI required를 요구한다. required approvals 0, strict_required_status_checks_policy false. 별도 branch protection API는 404지만 ruleset은 active다. allow_auto_merge false. 개인(User) 소유 공개 저장소라 GitHub 문서의 organization-owned merge queue 자격에 해당하지 않는다. merge_group 트리거는 준비돼 있지만 queue rule은 없다.

PR validation은 같은 PR의 이전 run을 취소한다. production/staging은 대상별 직렬화, cancel-in-progress false를 유지한다. npm download cache와 lock 기반 webpack/tsbuildinfo 캐시 사용. node_modules 공유 artifact는 설치 스크립트/platform 차이를 피하려 도입하지 않았다. Playwright browser 캐시는 다운로드/복원 비용 절감 증거가 없어 추가하지 않았다.

PR preview는 없다. main 자동 staging과 수동 production이 분리돼 있고 Pages/Worker는 같은 release SHA, 배포 후 version.json/API SHA 검증. release 내부에서 검증 artifact fingerprint를 재사용한다. PR merge SHA와 release 환경이 달라 PR artifact를 무조건 배포에 재사용하지 않는다. 일일 운세의 기존 production 재발행 예외는 유지한다.

## 실측 비용

PR CI 34231415079: 13:21:05–13:25:53, 약 4분48초. fast 67초, guards 190초, build 229초. warm run 34227191575: 12:38:13–12:41:12, 179초. 자동 warm 제거는 해당 유형 main merge당 약 3 runner-min + npm 설치/checkout 한 세트를 절감한다. 개선 후 전체 CI wall time은 실제 후속 run으로 별도 측정해야 한다. 검사를 삭제하지 않아 PR 자체 wall time 감소를 주장하지 않는다.

## 순차 PR 판단 (계속 갱신)

1835는 다른 세션에서 60d7c42c2로 merge됐다. 그 후 1839는 sitemap-lastmod 공통 파일, 1834는 shell/saju-engine/style 공통 변경과 충돌한다. 1824는 초기에 미완성 Draft였으나 작업 중 Ready/구현 완료로 본문이 갱신돼 최신 diff/검증을 다시 봐야 한다.

현재 인프라 개선 → 1839 독립 React 상세 → 1834 정적 홈/Worker 상담 → 1824 광범위 모바일/공유/서비스 소개 순으로 검토한다. 공통 생성물은 매 단계 재생성하고, 의미 충돌은 자동 ours/theirs로 덮지 않는다. 실제 merge는 최신 head의 local/required CI와 직전 staging 확인 후에만 한다.

## Worktrees

초기 42개: dirty 3, locked 4, unique patch 30. exact merged clean 9에는 현재 작업용/검증용도 포함돼 숫자 전체를 삭제 대상으로 삼지 않는다. 미커밋·locked·git cherry +는 보존한다. upstream gone은 obsolete의 증거가 아니다. 정리 내역은 최종 결과에 별도 기록한다.

## 출처

- https://github.com/rei1237/codedestiny/actions/runs/34231628699
- https://github.com/rei1237/codedestiny/actions/runs/34229246564
- https://github.com/rei1237/codedestiny/actions/runs/34227191575
- https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue
- https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching
`Critical checks`의 npm test는 test:jest로 한정했다. test:node는 필수 guards lane에서 모든 PR에 이미 실행되므로 중복된 동일 Node suite만 제거한다. CI required가 두 lane 모두의 성공을 요구한다.
실제 정리: handoff-copyable-instructions와 payment-inventory-phase1 워크트리는 clean·고유 패치 없음·스테이징 main 반영을 확인 후 제거했다. payment-inventory-phase1 로컬 브랜치도 git branch -d로 제거했다. 다른 unique/dirty/locked 항목은 보존했다. 첫 preflight의 긴 경로 잔여 폴더는 자동 승인 검토가 재귀 삭제를 차단해 보존했다.

실제 진행 갱신: 별도 병합 작업이 1835 → 1839 → 1834를 순차 병합했다(main fc428f90f). 이 인프라 PR은 그 main을 반영해 다시 preflight한다. 1824는 최신 main 충돌을 작성 작업에서 해결 중이다. 새 1841은 Draft라 제외하며, 새 1842는 초기 조사 이후 생성되어 별도 dependency/CI 판정이 필요하다. 이 문서의 PR 상태는 조사 시점 스냅샷이며 최종 상태는 PR/API에서 확인한다.

추가 재현: 최신 main의 quantum-card-cascade 검사가 모바일에서 10초 timeout으로 실패했다. CPU 6배 감속 및 DOM mutation stack으로 index.html의 detachAll → detachNode가 숨겨진 resultPage를 분리함을 확인했다. 테스트가 실제 계산 흐름의 결과 페이지 열기를 생략한 것이 원인이다. 기존 lazy mount API로 결과 페이지를 열도록 fixture를 수정했고 카드 CSS/중복 DOM assertion과 timeout은 유지했다.
