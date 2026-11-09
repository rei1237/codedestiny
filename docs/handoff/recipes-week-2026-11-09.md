---
status: done
updated: 2026-11-09
next: 기존 main Secret Scan 실패가 해소됐는지 확인하고, clean main에서 레시피 커밋을 통합한다. 운영 승격은 하지 않는다.
---
# 연이의 주간 레시피 · 2026-11-09

이번 주 제작과 로컬 전달은 완료했다. 아래 next는 차단 해소 뒤 진행할 main 통합에만 해당한다.

## 첫 행동
`gh run view 42535705699 --json conclusion,jobs`와 현재 origin/main의 Secret Scan 결과를 확인한다. 이미 실패한 검사 위로 push하지 않는다. 11월 9일 결과를 다시 생성하지 말고 보존 커밋을 사용한다.

## 지금 상태
- 브랜치: wt/recipes-20261109-20261109-090455
- 워크트리: D:/Development/codedestiny-worktrees/recipes-20261109-20261109-090455
- 기준 main: fbc3a41df78d54b6570859aca792e98aa39a080f
- 레시피 커밋: 50cae91bfbe624f949cd32524ff41e8ed43bb723, 로컬 전용.
- Gitleaks git history 단계가 실패한 main [Secret Scan](https://github.com/rei1237/codedestiny/actions/runs/42535705699). 같은 SHA의 [주 CI](https://github.com/rei1237/codedestiny/actions/runs/42535705705)는 성공. 실패 원인이 실제 비밀값인지는 확인하지 않았다.

## 승인 상태
2026-11-09: “기존 main CI 실패 등 전달을 막는 조건이 있다면 무리하게 통합하거나 배포하지 말고 제작 결과와 정확한 막힘을 보존·보고하세요. 운영 배포 승격이나 외부 SNS 게시를 새로 수행하지 마세요.”

## 작업 규칙과 함정
원래 D:/Development/code-destiny는 다른 기능 브랜치이며 수정 중이고 main도 별도 체크아웃에서 변경 중이다. 두 곳 모두 정리·리셋하지 않는다. 안전하게 전달 가능한 시점에 현재 원격을 기준으로 작업하고, 사이트맵이 충돌하면 수작업 병합 대신 정본에서 재생성한다.

## 설계
기존 레시피 데이터 레지스트리에 주차 모듈을 한 번만 추가한다. 번들 안의 이미지와 원본 생성 프롬프트는 public/images/five-elements/provenance-week-20261109.json에 기록했다. 5개 메뉴의 네 단계에는 기존 캐릭터를 재사용한다. 별도 허브, 결제, API, 인증, DB 변경 없음.

## 단계
- [x] 5개 원화와 1200×800 WEBP 제작·디코딩·시각 확인, 레시피·이미지 주차별 보존.
- [x] 로컬 허브와 5개 상세 HTTP 200, HTML 재료·4단계·연이 대사·구조화 데이터·canonical 일치. 레시피 테스트 3/3 통과. 사이트맵 재생성 및 drift 검사 통과.
- [ ] 기존 main 보안 검사 해결 후 통합 및 main CI 확인. 현재 운영에는 공개하지 않음.
