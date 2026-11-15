---
status: in-progress
updated: 2026-11-15
next: 실행 중인 check:fast 결과를 정리하고 최신 main 통합·pre-push·전달을 진행한다.
---

# 연이 2D 스프라이트

## 첫 행동

작업 디렉터리 `D:/Development/codedestiny-worktrees/yeoni-model-stage1-20261115-163923`에서 `.tmp/yeoni-stage1/sprite-check-fast.log`와 git 상태를 확인한다. 검사 프로세스가 실행 중이면 파일을 머지해 검사 입력을 바꾸지 않는다.

## 왜 · 승인 상태

2026-11-15 사용자: “차라리 스프라이트 시트로 2D로 귀엽게 구현 … 명상, 108배, 인사 등 다양한 표정”. **3D 계획은 폐기**, 연이 먼저·영냥이는 다음 단계. 내장 ImageGen 사용 및 독립 화면 구현 완료. 운영 승격 승인 없음. 저장소 규칙에 따른 main 커밋·push는 승인 범위다.

## 지금 상태

- 작업 브랜치 `wt/yeoni-model-stage1-20261115-163923`, 커밋 `12c0d0bf4`(2D 자산·화면·세션·테스트). 아직 main 미통합·미푸시.
- root main의 다른 작업은 보존. 마지막 확인에서 `.claude/skills/fire-your-seo-agency/`만 미추적이었다. 실제 상태를 다시 확인한다.
- 제작 원본·검수 이미지: `D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v1/`. 검수용 mock 서버 `http://127.0.0.1:20198/moonlit-lotus/model-review/` 실행 중. ego task 6은 finish 완료.

## 설계·정본

`docs/design/moonlit-lotus-sprite-contract.md`, `app/moonlit-lotus/model-review/bow-session.ts`.
WebP 2장·24포즈, 384px 셀/기준선354, 큰절 왕복 17프레임/10.3초. 세션 종료 시점 집계, 9/27/108배, 정지·복원·속도 경계. Three.js와 package-lock 변경 없음.

## 단계

- [x] 원본 기반 2D 자산, 검수 화면, 카운터, 모바일·오류·복원 검수
- [x] 관련 자동 검사 17개, 타입 검사, ESLint 통과
- [ ] check:fast 결과 기록(기준 커밋의 홈 번역·카탈로그 실패 관찰 중)
- [ ] 최신 main 통합 후 필요한 범위 재검증, committed-tree pre-push
- [ ] main push/CI 1회 확인, 자기 워크트리와 스크래치 정리

## 함정·미검증

2D 미리보기는 실제 스프라이트 재생이다. 거절된 3D 초안은 저장소 밖 `rejected-3d/`에 보존, 완성품으로 보고하지 않는다. 재귀 삭제는 자동 검토에서 차단돼 파일을 이동해 보존했다. 생성 시트의 투명 영역 RGB 노이즈는 알파 아래이며 브라우저에서 보이지 않는다. 실제 모바일 기기·OS 잠금 미검증. 음악·확언·운세 연결은 후속.
