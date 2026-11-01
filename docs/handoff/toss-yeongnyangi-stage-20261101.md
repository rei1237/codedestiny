---
status: active
updated: 2026-11-01
next: 영냥이 전달 SHA의 main CI required 결과를 한 번 확인하고 이 단계만 확정한다.
---

# 앱인토스 영냥이 한 서비스 검증

## 왜

사용자가 최종 main CI 재확인 후 앱인토스 다음 작업 진행을 요청했다. 공통 경계 CI 41282998959는 전부 성공했고, 영냥이 한 서비스만 다음 단계로 진행한다.

## 지금 상태

- 기준 main은 `cb57c98bd31112137682fdfafda69ecb66d4d41d`, 해당 CI 41295435905도 성공했다. 동시 세션을 보존하는 공식 작업공간에서 진행한다. PR 없음.
- 서버가 이미 구매한 상담으로 확인해도 결제 재진입 화면이 현재 판매 목록을 요구하던 문제를 재현했다. 성공한 응답의 paid===true인 경우 원래 결과 경로로 이동한다. 이탈 후 늦은 응답은 무시한다. 신규 권리와 가격 판정은 변경하지 않았다.
- 기능 커밋 `d5b975a924da314b17ae314a16b487494d9777d1`의 로컬 개발 검증을 완료했다. 최종 main CI 확인 전까지 단계 완료 대기다. 실제 전달 SHA·push 여부·CI URL은 아래 verification.json의 delivery 항목을 따른다.

## 남은 작업

- [ ] 이 단계의 main 전달과 CI required 결과 확인 1건. 이후 운명의 찻집은 별도 요청 전 시작하지 않는다.
- [ ] 실기기·실구매·유료 AI·운영 DB·심사·출시는 이번 개발 검증과 구분한다.

## 검증

- 신규 재진입 검사: 수정 전 1 실패/3 통과 → 수정 후 4 통과. 토스 전체 mock 162/162, 원본 영냥이 복구·재시도 40/40 통과.
- 실제 브라우저 preview fixture에서 입력·결과·보관함 × 360/390/430/1280px 총 12개 검사. 가로 넘침·깨진 이미지·페이지 오류 0. 저장 샘플의 보관함 재열람과 새로고침 통과. 실제 SDK 구매 증거는 아니다.
- 변경 lint 오류 0(기존 이미지 경고 1), 앱 typecheck 및 `npm run build --prefix apps/toss` 통과. 번들 업로드 없음.
- 최초 check:fast는 임시 Git 쓰기 Permission denied 및 로컬 천문 서버 connect EACCES로 실패 후 중단했다. 외부 차단을 유지하고 로컬 권한을 허용한 재실행은 종료 0. 안전 검사 90/90, 전체 lint·typecheck·Node·Worker 빌드·인코딩 및 Jest 443개 묶음/7,227개 모두 통과했다. 최초 중단 검사는 통과로 기록하지 않는다.
- 정본: `apps/toss/service/Screens.jsx:35`. 상세 근거: `D:\Development\code-destiny\outputs\toss-yeongnyangi-20261101\verification.json`.

## 재개

`D:\Development\code-destiny`에서 `D:\Development\code-destiny\docs\handoff\toss-yeongnyangi-stage-20261101.md`를 읽고 기능 커밋 `d5b975a924da314b17ae314a16b487494d9777d1`을 포함하는 최종 전달 SHA와 CI 결과 확인부터 진행한다. 원래 checkout의 미커밋 변경을 보존한다. 실제 작업공간과 세션 상태는 위 근거 폴더의 state.json을 따른다.
