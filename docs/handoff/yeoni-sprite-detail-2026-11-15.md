---
status: done
updated: 2026-11-15
next: 사용자 외형 피드백이 있으면 2d-v2 원본과 sprite-clips.ts부터 확인
---

# 연이 80컷 상세 스프라이트

## 첫 행동
현재 main과 사용자 요청을 확인한다. 구현·브라우저 검수 완료. 영냥이를 먼저 만들거나 3D로 되돌리지 않는다.

## 지금 상태
- 기준 main: a4671ed68803d04415228d2097f94382d4ae4685, 당시 CI 성공.
- 작업 브랜치: wt/yeoni-sprite-detail-20261115-181750.
- 격리 경로: D:/Development/codedestiny-worktrees/yeoni-sprite-detail-20261115-181750. 전달 시 main에 머지하고 배수.
- 구현 경로: app/moonlit-lotus/model-review/, public/assets/moonlit-lotus/yeoni/2d-v2/.
- 원본·검수 증거: D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v2/.

## 승인 상태
2026-11-15 사용자: “지금보다 2배 이상은 컷을 만들어서 훨씬 더 디테일하게 움직임이 표현되어야하고 귀여운 여러가지 포즈들도 만들어줘”.
저장소 규칙에 따른 commit/main push 승인, 운영 승격 제외. 연이 우선·영냥이 다음 단계.

## 작업 규칙과 함정
다른 세션 main의 .claude/skills/fire-your-seo-agency/와 mock 서버 34052는 보존한다.
원본 1254px를 1536px로 정렬한 것이며 네이티브 2K가 아니다.
GIF는 실제 컷·타이밍 미리보기이며 웹 75ms 교차 전환은 포함하지 않는다.
타입 오류는 BOW_CLIP의 phase를 필수로 바꿔 해결했다. 전체 check:fast 통과라고 표현하지 않는다.

## 설계
80개 그림, 5개 4×4 시트. 큰절 44고유컷·45항목·8840ms.
눈 깜빡임·손 인사·명상 8호흡컷, 추가 9선택포즈.
현재 명세: docs/design/moonlit-lotus-sprite-contract.md의 v2 절.

## 단계
- [x] 80컷 생성·알파·정렬·WebP·명세
- [x] 실제 화면 연결·시트 디코딩·교차 전환
- [x] Node 18개·타입 검사·브라우저 desktop/mobile/reduced/failure 검증
- [x] 원본·프롬프트·검수 이미지와 GIF 외부 보관
- [x] 코드 구현 완료, 전달은 저장소 commit/pre-push/main push 절차 수행
