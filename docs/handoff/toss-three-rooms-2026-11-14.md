---
status: in-progress
updated: 2026-11-14
next: check:fast 완료 후 기능 커밋·pre-push·main push, Linux AIT CI와 3경로 검사·비공개 QR 전달
---

## 첫 행동
D:/Development/codedestiny-worktrees/toss-three-rooms-20261114-105958 에서 git status를 확인한다. TEMP/three-checkfast.txt의 npm run check:fast 결과를 확인한다. 최신 테스트/수정은 이 문서 아래와 docs/toss/character-rooms-20261114.md에 있다.

## 지금 상태
- 작업트리 D:/Development/codedestiny-worktrees/toss-three-rooms-20261114-105958
- 브랜치 wt/toss-three-rooms-20261114-105958, 시작 SHA a5d6f5814. 아직 이번 작업 커밋 전.
- 원 체크아웃 D:/Development/code-destiny는 다른 세션 feat/world-cast-page. 그 변경은 건드리지 않는다.
- 로컬 AIT: apps/toss/private-simulation/ai-saju-studio.ait, deployment 01a1d7db-8d9e-775e-9ec3-f435d5eb7620, expanded 99,887,260 < 100MB.
- 이 Windows AIT에서 letter/tea/neo 전체 구매·재진입·다른 계정 거절 3개 통과.
- 캡처 C:/Users/user/Downloads/CodeDestiny/three-rooms-20261114/{letter,tea,neo}-result.png.
- 독립 qa_locator 리뷰 중요 결함 없음. API 4검사 및 편지 SKU/계정/복원 수동 검사 통과.

## 승인 상태
2026-11-14 사용자: “기능표에서 ‘일부만 이식’인 96개 중 코드로 마저 구현할 수 있는 항목부터 계속 진행해줘. 연이 상담 편지·운명의 찻집·네오 팩폭 전략실부터 웹 원본과 대조해서, 달빛 예화 디자인을 유지하고 실제 AIT에서 홈 → 입력 → 모의 구매·생성 → 보관함 재열람까지 검증해줘. 실결제와 검토 요청은 계속 보류해.”
기존 승인된 main push·Linux AIT·비공개 QR 이어 진행. 운영 Worker·실 DB·실 LLM·실결제·검토 요청 금지.

## 작업 규칙과 함정
- 새 fixture를 통째 import하면 다른 서비스 계산 코드가 AIT에 추가되어 100MB 초과. roomOrderRequest/characterRoomReading/roomRecords를 기존 모듈에서 별도 export하여 필요한 것만 tree shake.
- 연이 편지는 모의판에서 yeoni만 추가. 네오 편지는 이번 범위에서 닫힘. products 기존 영냥이 29개 유지, sdkProducts에 별도 편지/네이티브 목록 추가.
- 찻집 localhost preview fallback이 실제 fixture 실패를 덮었다. paymentSurface=toss에서 차단했고 ensure-access 모의 402/200 응답 추가.
- page.waitForURL(/fortune-tea-house/)는 login next 쿼리에도 일치함. pathname 조건 필수.
- 네오 refine 버튼은 이미지 실패 텍스트 때문에 exact name 매칭이 실패했다. 원본 휘장 파일을 추가해 최종 AIT는 실패 텍스트 0개. 버튼 regex 유지.
- Windows 빌드 동안 이전 AIT로 검사하면 잘못된 결과가 나온다. 빌드 완료 deploymentId를 확인하고 시작.
- 원문 복원 검사 saved state deepEqual + 주문1 + room generationCount1. 보관함은 canonical/records와 /library 둘 다 연결.
- node_modules는 root 기존 공유; apps/toss에는 npm ci 완료.
- Python은 py 사용. python alias는 실패함.
- ego-browser skill 읽음. space 54, p1 앱인토스 콘솔 버전 목록. 기존 최신 20261114-13. 이번 ego 스크립트 C:/Users/user/ego/toss-three-rooms-20261114-1150. 새 QR 업로드는 Linux CI artifact 확정 뒤만 한다. 버전 등록/수정 → 파일 업로드 → 임시저장 → 테스트까지만. 검토 요청 금지.
- Ego 업데이트 알림 있음. 현재 작업 완료 뒤 알리되 승인 없이 upgrade 금지.

## 설계
docs/toss/character-rooms-20261114.md 참조. production worker 로직·SKU 원장 그대로. 모의 어댑터만 해당 상태/상품/원본 UI 연결. 공유 찻집 페이지에 toss localhost fallback 차단 1줄. 아트는 서비스 번들 r2 adapter에 국한.

## 단계
- [x] 웹 원본과 adapter 대조
- [x] 편지/찻집/네오 모의 주문·저장·후속 상담
- [x] 로컬 AIT 3개 홈→재열람·계정B 거절 + 360px
- [x] node --test private-simulation.test + offline-room 7/7, inventory 6/6
- [ ] npm run check:fast (진행 중), 커밋, check:pre-push
- [ ] push main + main CI
- [ ] workflow_dispatch pr-ci.yml full_ci=true toss_artifact=true toss_simulation_artifact=true, Linux artifact 받기
- [ ] Linux AIT 3개 E2E (workflow에 추가됨) 및 캡처/용량
- [ ] 비공개 모의 QR 20261114-14 예상; 실제 생성된 값만 사용
- [ ] docs/toss 기능표/inventory generation과 실행 증거 갱신, 최종 docs commit push CI
- [ ] 자신 문서 done, 워크트리·스크래치 배수, 최종 한국어 보고
