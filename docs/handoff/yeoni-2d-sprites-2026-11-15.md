---
status: done
updated: 2026-11-15
next: 후속 요청 시 main의 독립 검수 화면과 스프라이트 계약에서 이어간다. 영냥이 제작은 별도 단계다.
---

# 연이 2D 스프라이트

## 첫 행동

후속 작업 디렉터리 `D:/Development/code-destiny`에서 사용자 변경과 git 상태를 확인한 뒤 `docs/design/moonlit-lotus-sprite-contract.md`를 읽는다. 3D 제작을 재개하지 않는다.

## 왜 · 승인 상태

2026-11-15 사용자: “차라리 스프라이트 시트로 2D로 귀엽게 구현 … 명상, 108배, 인사 등 다양한 표정”. **3D 계획은 폐기**, 연이 먼저·영냥이는 다음 단계. 내장 ImageGen 사용 및 독립 화면 구현 완료. 운영 승격 승인 없음. 저장소 규칙에 따른 main 커밋·push는 승인 범위다.

## 지금 상태

- 구현 커밋 `12c0d0bf4`(2D 자산·화면·세션·테스트), 최신 main 통합 커밋 `e9f7aa892`. 최종 전달 SHA·원격 상태는 `git log`와 `origin/main`이 정본이다.
- root main의 다른 작업은 보존. 마지막 확인에서 `.claude/skills/fire-your-seo-agency/`만 미추적이었다. 실제 상태를 다시 확인한다.
- 제작 원본·검수 이미지·재생 GIF: `D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v1/`. 주소 `/moonlit-lotus/model-review/`. ego task 6은 finish 완료. 실행 서버 포트는 최종 보고를 따른다.

## 설계·정본

`docs/design/moonlit-lotus-sprite-contract.md`, `app/moonlit-lotus/model-review/bow-session.ts`.
WebP 2장·24포즈, 384px 셀/기준선354, 큰절 왕복 17프레임/10.3초. 세션 종료 시점 집계, 9/27/108배, 정지·복원·속도 경계. Three.js와 package-lock 변경 없음.

## 단계

- [x] 원본 기반 2D 자산, 검수 화면, 카운터, 모바일·오류·복원 검수
- [x] 관련 자동 검사 17개, 타입 검사, ESLint 통과
- [x] check:fast의 기준 커밋 홈 실패·운세 생성물 부재를 기록(전체 실행 통과 아님)
- [x] 최신 main 통합 후 관련 144개 + 운세 생성물 준비 후 7개 통과
- [x] committed-tree pre-push 통과. 전달은 저장소의 main push·CI 1회 확인 규칙을 따른다.

## 함정·미검증

2D 미리보기는 실제 스프라이트 재생이다. 거절된 3D 초안은 저장소 밖 `rejected-3d/`에 보존, 완성품으로 보고하지 않는다. 재귀 삭제는 자동 검토에서 차단돼 파일을 이동해 보존했다. 생성 시트의 투명 영역 RGB 노이즈는 알파 아래이며 브라우저에서 보이지 않는다. 실제 모바일 기기·OS 잠금 미검증. 음악·확언·운세 연결은 후속.
