---
status: active
updated: 2026-11-14
next: 통합 main의 초과 없는 Linux AIT를 재생하고 두 계정 검사를 통과시킨 뒤 최신 비공개 QR과 미이식 서비스 작업을 이어간다.
---

## 첫 행동

AGENTS.md와 CLAUDE.md를 읽고 이 워크트리의 변경 및 origin/main을 확인한다. 목록 담당자는 docs/toss/build-service-inventory.mjs와 feature-matrix.md를 현재 코드와 대조한다.

## 지금 상태

D:/Development/codedestiny-worktrees/toss-studio-port-20261113-230802, wt/toss-studio-port-20261113-230802. 첫 main 전달 bf2256294, 월간 운세·동물 궁합·이파까지 통합 87f6ce336. 출발한 main f2db2995d. 사용자의 기본 체크아웃은 다른 세션이 사용 중이다.

## 승인 상태

2026-11-13 사용자 요청 “검증된 커밋으로 Linux AIT를 생성하고, 기존 축소 버전과 구분되는 새 비공개 테스트 QR을 준비해.” mock 개발, main CI, 비공개 업로드까지 진행한다. 운영 Worker·비밀값·상품 노출·검토 요청·최종 출시는 별도 게이트다. 실결제 검증은 확장하지 않는다.

## 작업 규칙과 함정

20261113-7의 실제 Linux 컨테이너에서 reviewOnly가 참이었다. 4,950원은 연이 사주 전용이다. 일반 탐색, 주문 소유권, 서비스 보관함과 복구의 권한을 따로 검증한다. Windows AIT는 경로 구분자가 달라 업로드하지 않는다. 웹·토스 결제 정책과 원문은 각 원장을 따른다.

## 설계

기존 캐릭터 아트·웹 점술방·기존 Worker 생성 경로를 재사용한다. 미등록 SKU의 판매는 닫고 로컬 fixture로 결제·생성·재열람을 시험한다. mock은 외부 연동을 호출하지 않는다.

## 단계

- [x] 기존 Linux AIT와 main의 차이 확인, 두 세계 홈과 달빛 점술방의 원본 진입 및 360px 시각 검증
- [x] 로컬 홈에서 영냥이 질문·로그인·mock 구매·원문 재열람
- [x] 웹 레지스트리·상품 원장별 현재 상태와 남은 기능 대조
- [x] 무료 타로 5종 원본 결과와 동일 저장소의 두 계정 격리 검증
- [ ] targeted, pre-push, main CI 및 Linux 산출물 확인
- [x] 첫 비공개 테스트 QR 20261114-8 발급 및 AIT deploymentId 일치 확인
- [ ] 모든 추가 서비스가 포함된 Linux AIT·QR 검증과 실기기 점검표

첫 push CI 43450551020에서 핵심 검사·전체 빌드·타입검사 성공, 인수인계 상태 필드만 실패해 active로 수정했다. 첫 Linux 산출물 요청 43450602078. 신버전의 핵심 범위는 실제 Linux AIT와 콘솔 비공개 QR을 함께 확인해야 한다. docs/toss/full-service-inventory.json의 개별 상태를 전체 서비스 완료 판정의 기준으로 쓴다.

## 2026-11-14 추가 이식

첫 번째 실제 QR은 C:/Users/user/Downloads/CodeDestiny/43450602078/toss-private-20261114-8.png, Linux AIT의 deploymentId는 01a1d58f-1af7-765a-b075-7c7c1bf9a89f. 홈에서 영냥이 질문 검색·빠른 입력, mock 토스 로그인 및 원문 보관함, 실판매 닫힘을 AIT 자체에서 확인했다. 소유자·SKU 경계 개발 검증은 새 일반 홈으로 시작하는 studio-browser / letter-browser / room-browser를 사용한다.

main c3a960736에 토스 테스트 1470/1470과 pre-push 성공. GitHub push 43460224208, Linux 요청 43460223398. 다음 통합 지점 832b0d865에는 두 편지 각 6개, 찻집 추가질문·네오 작전수정, 14편 웹툰, 명상, 오라클, 사주·자미 원본 결과, RPG/룰렛 복원, 흑월 생성, 인연 장소가 있다. Windows AIT 91,098,283바이트, 확장 99,890,537바이트라 새 아트를 넣으면 용량을 재확인한다. 기기 QR은 반드시 Ubuntu 공식 빌드 후 생성한다.
