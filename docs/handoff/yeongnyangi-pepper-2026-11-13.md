---
status: blocked
updated: 2026-11-13
next: 현재 main의 보안 검사 결과를 확인하고 통과 후 보존한 레시피를 전달한다.
---
# 금 오행 영냥이 통후추 떡볶이

## 첫 행동
원격 main의 Secret Scan 결과와 작업 트리 상태를 확인한다. 생성 완료한 그림을 재생성하지 않는다.

## 지금 상태
작업 브랜치 wt/yeongnyangi-pepper-tteok-20261113-195006, 워크트리 D:/Development/codedestiny-worktrees/yeongnyangi-pepper-tteok-20261113-195006. 콘텐츠 커밋 d207eaa25, origin/main 병합 후 2e9a2c93639299319a01b178bb50ebf4dafa367a.
## 승인 상태
2026-11-13 요청 “새로운 요리법을 영냥이 버전으로 이번에는 매운 맛 위주로 금 오행 버전으로 영냥이 이미지를 활용해서 그려서 적용해줘”.
## 작업 규칙과 함정
원격 기준 79615c45의 Secret Scan 43412318879에서 gitleaks 실패. 운영 승격 안 함. 로컬 pre-push의 미러 검사는 index.html을 다르다고 판정했고 생성 후 git diff --numstat에는 내용 차이가 없었다. 재개 시 clean worktree에서 해당 검사 재확인.
## 설계
기존 recipes 레지스트리에 한 편을 추가하고 진행 캐릭터에 따라 기본 연이 또는 영냥이의 장면 그림을 선택한다. 네 컷 출처는 public/images/five-elements/provenance-yeongnyangi-pepper.json.
## 단계
- [x] 원고와 4컷 WebP, 목록과 상세 연결, 사이트맵 생성
- [x] 레시피 테스트 3/3. 로컬 목록·상세 HTTP 200, 캐릭터 제목과 HowToStep 확인
- [ ] pre-push 전체 통과, main 전달 및 CI 확인
