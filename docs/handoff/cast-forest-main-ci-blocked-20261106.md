---
status: done
updated: 2026-11-06
next: 전달 완료. 후속 검증은 최신 main CI를 확인한다.
---
# 캐릭터·홈·숲길 변경 전달 대기

## 요청과 구현

사용자가 승인한 캐릭터 기준 시트·상담 웹툰 교정, 홈 기록 버튼, 달빛 예화 이용 안내, 숲길 안에서 프로필 생성·선택하기를 구현했다. 상세는 docs/design/cast-and-forest-20261106.md.

- 작업 디렉터리 D:\Development\codedestiny-worktrees\cast-art-canon-20261106-082832
- 마지막 구현 커밋 a282e47cb
- 이미지 커밋 cfadf7923, UI 커밋 6ef3fcc69, 최신 origin/main 병합 3edc8054d
- 미커밋 변경 없음. 원본 루트와 다른 main 워크트리의 타 세션 수정은 보존했다.
- 무성·윤달·흑월 프로필 시트는 D:\CodeDestiny-Build에 저장했다.

## 검증

상담 웹툰 진입 6개, 기존 프로필 진입 6개, 홈 4개 너비 브라우저 검사, 질문/웹툰 확대/닫기/뒤로/전달 브라우저 검사, 숲길 실제 작성기와 mock API 저장실패/재시도/기존 카드 선택/같은 단계 복귀가 통과했다. typecheck와 변경 React 파일 ESLint 통과. 공용 profile-card-storage의 기존 미사용 인자 경고 1개.

check:fast는 77개 가드 중 독립 페이지 캐시 핀 불일치 1개로 중단했다. 핀을 내용 해시로 갱신하고 해당 verify:payment-choice-parity -- --self-test를 재실행해 통과했다. 전체 check:fast 재완료로 보고하지 않는다.

최신 main 병합 후 미러를 다시 생성해 커밋했고 npm run check:pre-push 전체 통과. 실결제·실 LLM·운영 DB·배포 검증은 수행하지 않았다.

## 전달

원격 main의 미러 불일치를 수정한 c14490387의 PR CI 42137097844가 통과했다. 해당 커밋을 병합하고 정적 셸 8종의 미러를 재생성했다. 사이트맵 1,059개 URL과 원장 852개를 재검사했다. 이 문서와 미러를 함께 main으로 전달한다.
