# Phase 2 감사 전달 보존 기록

status: done

**최신 상태: CR-001/002 승인 구현과 회귀를 완료했고, 두 기능 플래그는 기본 OFF다.** 사용자의 명시 지시로 push·배포·원격 통합은 하지 않는다. 아래 Phase 2/3 수치는 당시 이력이며 최신 상태는 [05-final-report.md](../engine-audit/05-final-report.md)를 따른다.

## CR-001/002 로컬 구현 완료

- 검증한 구현 커밋: `261a6c1054677378455cf24523bf59e23fa9e11b` (`fix(calendar): gate verified term and historical lunar corrections`). 후속 종료 문서 커밋은 `git log -1`로 확인한다.
- 101입력/1,109필드 회귀 통과. 추가 영향 4입력/7필드도 같은 두 결함군의 공식 KASI/JPL 근거로 확인하고 별도 골든에 보존했다.
- 고정 시드 20,000개 입력 × 두 엔진 = 40,000개 OFF 비교에서 차이 0. ON 범위 내 사주 2,147/자미 252회 실행 오류 0, 사실값 변경 사주 6/자미 76. 실제 고객 발생률을 뜻하지 않는다.
- 24개 역사 음력월 712일의 양·음력 사주/자미 일치, 168개 절입의 ±1초/±1분 경계, 미확정 40 ms 구간 거절, 타입·대상 린트·생성물 검사 통과. 오라클 없는 CI용 골든 검사 5개 통과.
- 소스 핀 43개 항목을 별도 승인 파일에 고정했고 기존 핀은 보존했다. 새 증거 104파일 614,828바이트와 이전 증거 120파일을 보존했으며 Git 저장본 총 224개 해시를 확인했다.
- `calculateLocalResult`, KASI prefetch, normalizeSaju, 결제/인증/저장 형식 불변. 저장·유료 결과 재계산 0, Swiss 실행 0, 운영 활성화 0. 캐시 URL 생성 변경 10파일은 `?v=` 값 밖의 내용이 같음을 검사했다.
- 전체 CI/전체 앱 빌드·Swiss 연결 검사는 미실행이다. 사용자가 push·배포를 명시적으로 금지했다. 기존 공유 체크아웃과 다른 세션 변경을 보존하고, 미통합 로컬 구현이 있는 워크트리는 삭제하지 않는다.

## 2026-11-01 공식 추가 판정 완료

- 보고서 `docs/engine-audit/02a-authoritative-adjudication.md`: KASI/JPL 직접 공개 근거로 A 101개 입력/1,109필드의 출력 오류 확인, 이 집합 미확정 0. 독립 결함 수가 아니라 두 결함군(절입 정밀도/역사 음력)이다. 미래 정본 초·전체 역사 범위·운영 사용자 영향은 미확인으로 유지했다.
- `docs/engine-audit/03-fix-plan.md`에 확정된 두 결함군만 넣었다. 내부 엔진 제안은 `change-requests/CR-001.md`, `CR-002.md`에 기록했고 승인 전 적용 금지다.
- 검증한 증거 커밋: `39a07eb8c25385139190c443e9fc466d829ea529`. 추가 증거 104개 파일 2,748,819바이트, 원본 Phase 2 16개 파일 보존. Git 저장본 120개 해시 확인, 오프라인 판정 검사 7개·소스 핀 39개·12개 MIT 의존성 확인, 문법/문서 freshness/정적 pre-push 통과.
- 미실행: 운영 변경, 엔진 내부 수정, 신규 의존성, Swiss 실행, 전체 CI, push, 저장/유료 결과 재계산. `check:fast -- --plan`은 critical로 Swiss 연결 전체 Jest를 선택하므로 실제 전체 검사는 차단했다.
- 원격 main `abe9ddacbb582f14b0c43ec6fd3e342dac2344f6`의 [PR CI](https://github.com/rei1237/codedestiny/actions/runs/41293508476)는 종료 조회 시 실행 중이었다. 이전 main 성공/실패를 현재 상태로 간주하지 않는다. 현재 감사는 원격 미통합이다.
- 공유 원래 체크아웃의 `feat/world-cast-page`와 다른 세션 변경을 보존했다. 미통합 증거와 격리 설치물이 있는 이 워크트리는 삭제하지 않는다. 임시 초안은 제거했고 최종 공식 원문은 JSON 안에 바이트 해시와 함께 보존했다.

## 최초 Phase 2 종료 이력

- 작업 디렉터리: `D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440`
- 보고서: `D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440/docs/engine-audit/02-diff-report.md`
- 마지막 검증한 구현·증거 커밋: `0b302e898a41663e32c84627dcdb7c732c073917` (`test(audit): classify saju and ziwei differences`). 후속 전달 문서/후보 근거 문구 보정 커밋은 `git log -1`로 확인한다.
- 22,711건 실행. 확정 결함 0, 미확정 A 101개 입력(3개 조사군), B/C/D 분류 및 원시 결과 보존. 운영 코드·의존성·사용자 저장 결과 변경 없음.
- 검증: Phase 2 하네스 6개, 허용 경로·거절 검사 8개, Python cold 6건 통과. 16개 증거 파일의 gzip·해시·전체 입력 ID·집계 보존 검사 통과. 위 구현 커밋의 `npm run check:pre-push` 통과.
- 전체 check:fast/CI는 미실행. 계획이 critical로 전체 Jest를 선택하며 Swiss 연결 서비스 어댑터 테스트를 포함한다. 사용자 실행 금지가 우선하므로 게이트 우회·변경 없이 push를 보류했다.
- 현재 원격 main은 `1dce860a3d892b3de2b9fdb2a860dc821441c977`, [CI 성공](https://github.com/rei1237/codedestiny/actions/runs/41288817334). 과거 main 실패를 현재 차단 이유로 사용하지 않는다. 이 성공은 이번 미통합 작업 검증이 아니다.
- 원래 체크아웃 `D:/Development/code-destiny`의 `feat/world-cast-page` 및 다른 세션 변경을 보존했다. 미통합 Phase 0~2 커밋과 격리 설치물이 있으므로 이 작업 폴더를 삭제하지 않는다. 자체 스크래치나 `.partial` 잔여는 없다.

## 재개 경계

이번 요청은 완료되어 종료한다. 이후 재개 시 첫 행동은 **최종 구현 보고서와 기능 플래그/범위 제한을 읽기 전용으로 확인**하는 것이다. 두 CR의 구현 승인을 운영 활성화·범위 확대·push·배포 승인으로 확대하지 않는다. Swiss 차단은 계속 유지한다.

```text
D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440에서 D:/Development/code-destiny/.codex-worktrees/engine-audit-phase0-20261101-163440/docs/handoff/2026-11-01-engine-audit-phase2-delivery.md를 읽고, 마지막 검증한 구현 커밋 261a6c1054677378455cf24523bf59e23fa9e11b 및 후속 종료 문서 커밋을 git log -1로 확인하라. 첫 행동은 docs/engine-audit/05-final-report.md의 검증과 OFF/범위 제한을 읽기 전용으로 확인하는 것이다. 별도 승인 없이 기능 활성화·범위 확대·Swiss 실행·전체 CI·push·배포를 시작하지 마라.
```
