---
status: in-progress
updated: 2026-11-24
next: 원격 main의 웹툰 탭 번역 폭 검사 복구를 확인한 뒤 검증된 상담 변경을 전달하고 승인된 운영 릴리스를 시작한다.
---

## 첫 행동

원격 main의 최신 SHA와 해당 CI를 확인한다. 마지막으로 확인한 실패는 f8ef9f36a3, 실행 45310238580의 Static guards / Verify locale text fit이다. home.shelf.webtoon 탭 폭 56px를 일본어와 베트남어가 초과한다.

## 지금 상태

분리 작업트리 D:/Development/codedestiny-worktrees/consultation-approved-pair-20261124-094619의 wt/consultation-approved-pair-20261124-094619에 기능 커밋 0e938b9df0이 있다. 원격 main으로의 푸시와 운영 워크플로 실행이 남아 있다. 공유 main의 타 세션 미커밋 변경을 보존한다.

## 승인 상태

2026-11-24 사용자 요청 “일단 다시 계획 정리 후 서비스에 운영 반영까지 진행해”. 후속 요청은 인간형 전용 신규 스프라이트와 꿀꿀운세 사주 LLM 대기 전용 영상, 중복 방지다.

## 작업 규칙과 함정

일반 사주 계산 오버레이에 영상을 넣지 않는다. 결제 테스트는 mock으로 실행한다. 빨간 main 위에 기능을 푸시하지 않는다. 기존 실패 복구 후 원격 커밋과 충돌이 있으면 분리 작업트리에서 해결한다.

## 설계

16개 포즈의 원본·동작과 사전 제작 영상 ID는 docs/design/consultation-room-media.md에 있다. 메인과 찻집은 같은 인간형 동작 시트를 공유한다. 사주 상담은 사주·궁합 모드별 한 편만 표시한다. 초융합·연애 비책·네오 전략실은 대기 중 소개 클립을 포스터로 전환한다.

## 단계

- [x] 새 시트와 선택한 상담의 장면 연결, 정적 배포 미러 동기화
- [x] 390px/1280px Chromium에서 인간형 네 동작, 홈 MP4 0개, 대기 미디어 단일 마운트·제거, 동작 줄이기 검증
- [x] 초융합·영냥이 모바일·데스크톱 프리뷰와 커밋된 트리 check:pre-push 확인
- [ ] 원격 main 복구 확인, 필요 시 최신 main 통합 및 재검증
- [ ] main 푸시와 Release Cloudflare Pages and Worker의 mode=production 실행, 전달 상태 기록 및 작업트리 정리
