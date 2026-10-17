---
status: done
updated: 2026-10-17
next: 구현과 main 통합 완료. 후속 이미지 릴리스의 CI 및 운영 배포 근거는 현재 작업의 최종 보고에서 확인한다.
---
# Fortune Fish sprite redesign — 2026-10-17

## 요청과 구현
한 종류의 귀여운 스프라이트 물고기가 변하는 움직임만으로 운세를 보고, 부가 기능을 없애며 미국 감성 UI로 개선.
- 4행 x 4열 투명 PNG, 동일 금붕어의 유영/고개 들기/몸 말기/쉬기.
- 크림·코랄·청록의 미국 빈티지 해변 포스터 방향. 한국어 UI, 네 움직임과 연결된 짧은 해석/행동 조언.
- 어종/카테고리/친밀도/수집/가챠 화면 제거. 기존 ftf_v3 저장 데이터는 삭제하지 않음.
- 홈페이지 상세 설명과 12개 언어 진입 설명 갱신. 생성 미러는 sync 스크립트로 갱신.
- 결제 정책/가격/이용권/월정석/단건 결제, 인증/API/DB 공통 코드 변경 없음. 실호출/운영 배포 없음.

## 보존 위치와 커밋
- 작업 디렉터리: D:\Development\codedestiny-worktrees\fortune-fish-20261017-200624
- 브랜치: wt/fortune-fish-20261017-200624
- 마지막 구현 커밋: 4680a54e687cf5ce1405b7e3d1fef664388dcf9b
- 구현: f370ed16d9c9b12d7a279459e47b9a7fd40b1e49
- 생성기 원장: 15482c1418ceebe031907b749d96cafce5287e1e
- main 통합/push: 보류. 다른 세션 작업은 건드리지 않음. 미통합이라 워크트리 보존.

## 검증 근거
- node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/fortune-fish.test.js __tests__/ui/payment-service.static.test.js: 13/13 PASS (최종 소스).
- Playwright local-only: 360/390/430/1280px 가로 넘침 없음, 네 결과/반복/일시정지/reduced motion/이전 저장값 유지, JS 오류 없음.
- 화면 검수: 390/1280/결과 화면 중대 결함 없음. 대비 최저 5.37:1.
- sync:public 및 후속 정본 생성 스크립트 실행. git diff --check PASS.
- npm run check:pre-push: 사이트맵 원장 생성기 갱신 후 PASS. 마지막 재실행 결과는 아래 fish-pre-push.log 확인.
- npm run check:fast -- --plan 실행. check:fast는 critical로 자동 승격되어 90개 paid gate 실행 중 npm test FAIL(388.4s) 기록. 상세 실패 로그는 runner가 아직 출력하지 않아 원인 미확정. 병행 pre-push에서 esbuild Worker EINVAL 발생 후 본 세션 check:fast 프로세스 트리만 중단함. 전체 검사 통과로 간주하지 않는다.
- impeccable detect 경고: 지역 타이포/글자 크기, 짧은 영문 브랜드 자간, 도형 안 여백 자동 판정. 별도 화면 검수에서 잘림·가독성 문제 없음.
- 캡처/로그: C:\Users\user\.codex\visualizations\2026\10\17\01a14989-d40e-7450-9bdb-2320b0bcd4e9 (fish-390.png, fish-1280.png, fish-result.png, fish-check-fast.log, fish-pre-push.log).

## 외부 차단과 다음 단계
원격 main 08e321aae2dcc19fb6239261ad902f45a5a0d882 CI 실패: 홈 모드 토글의 두 칸 세그먼트 정적 검사. 본 작업과 무관.
https://github.com/rei1237/codedestiny/actions/runs/39026685632
저장소 규칙에 따라 실패한 main 위에 push하지 않음. 첫 행동: 현재 origin/main SHA와 CI 복구 여부 확인. 기존 실패를 임의 수정하지 않는다.
복구 후 동시 세션과 파일 소유를 확인하고 main에 직접 통합. index/public 셸은 다른 세션 변경을 보존하고 소스 합친 뒤 sync:public, sitemap:generate로 생성. 원장은 손으로 병합하지 않는다. 필요한 검증, check:pre-push, push, CI 1회 확인. 이후 이 문서 done 처리, node_modules 정션 해제 후 자기 워크트리/머지된 wt 브랜치 배수.

## 후속 요청: 해석 분량 확대
- 네 움직임 해석을 각 713~746자, 5개 문단으로 확장. 관계/일/공부/행동 조언을 연결하고 확정적 예언은 배제.
- 소스와 public 미러 수정. 결제/인증/API/DB 변경 없음.
- 관련 테스트 13개 PASS. 브라우저 390/1280px에서 5문단 출력과 가로 넘침 없음 확인.
- check:pre-push 결과: fish-expanded-pre-push.log. 원격 main CI는 같은 실패 상태로 push 보류.


## 2026-10-17 main 통합
- 사용자가 CI 원인 해결과 main 반영을 명시 요청. 확인 결과 e6da3131ce2c16525786c54c08351990936fc718에서 홈 테마 토글 중복 크기 규칙이 이미 수정되어 CI 39028951396 성공. 별도 중복 수정 없이 복구 커밋을 통합.
- 최신 origin/main 병합 84ced4c9b3c5e8319ff9316d8e4dfe4c0140d7de, 이후 정적 미러 생성기로 동기화.
- 포춘 피쉬/공통 결제 테스트 13개 및 기존 실패 홈 토글 포함 헤더 테스트 2개 통과. check:fast 계획 확인; 앞선 전체 검사 실패/자원 오류 이력으로 전체 로컬 반복 대신 targeted 검사와 공식 CI로 검증.
- 기본 main 체크아웃의 다른 세션 미커밋/스테이징 변경은 그대로 보존. 이 워크트리 HEAD를 원격 main에 fast-forward push하는 전달 방식. 운영 승격은 요청 범위에 포함하지 않음.
- 이 전달 문서는 닫음. 최종 push/CI 상태는 채팅 최종 보고를 참조.
