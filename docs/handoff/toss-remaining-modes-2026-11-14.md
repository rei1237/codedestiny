---
status: in-progress
updated: 2026-11-14
next: 최신 연이 카드토큰 AIT 시각검사 후 pre-push/main push/Linux41경로/QR 전달
---

## 첫 행동
D:/Development/codedestiny-worktrees/toss-remaining-modes-20261114-133804 에서 git status 확인. 이전 문서 character-rooms-20261114.md는 QR14/b69 검증 범위이며 이번 작업과 구분한다.

## 지금 상태
wt/toss-remaining-modes-20261114-133804, base origin/main 0a2561b26. 원 checkout feat/world-cast-page와 untracked2개는 다른 세션 소유. 설치 완료. 웹 원본 공동사주 draft/타로 가격인계/궁합 대비 수정 커밋 7c3adc51f. 원본 UI가 이미 입력 지원, 누락은 mock 계약/상품/실AIT 검사인 것을 확인.

## 승인 상태
2026-11-14 사용자: 남은 찻집5모드부터 연이 등급형 입력, 네오 상대방 입력까지 계속 구현. 웹 원본과 달빛 예화 유지, 실제 AIT 홈→모의 구매·생성·보관함 재열람. 실결제·검토 요청 계속 보류. 실LLM·운영DB·운영Worker·판매 노출도 금지. main push와 Linux AIT/private QR은 기존 승인범위.

## 작업 규칙과 함정
- 공유 root를 checkout/reset/stash하지 않는다. 워크트리만 편집.
- 모의SKU를 운영원장에 넣지 않는다. 4950원은 기본사주편지만. 원래상품키와생성프롬프트 유지.
- 기존 tea 사주 고정모의결과를 6상품으로 확장. 스프레드/공동형/상대출생 입력을 변경해 같은주문 재사용하지 못하게 비교.
- Linux AIT 100MB 제한. 기존모듈 통째 새 import를 하지 않는다.
- 실제browser는 저작된 private-simulation-archive Playwright 검사. 콘솔은 Ego스킬을 읽고 새 목표TaskSpace 하나만.

## 설계
tea-modes.mjs가 6모의상품/입력비교/기존계산snapshot 기반모의결과. neo-partner-fixture.mjs는 원본4궁합챕터와관계정보. 편지는 기존21등급을 입력스냅샷/타로/후속/보존으로 검증.

## 단계
- [x] 웹 계약대조, 원본UI 재사용 확인
- [x] 연이21 API검사, 네오상대4 API/4fixture, 기존private4 합계33 PASS
- [x] 찻집6 API·Windows AIT01a1d870 모든경로/복구/다른계정 검사
- [ ] targeted/checkfast/commit/prepush/main push/CI
- [ ] Linux AIT/privateQR/기능표/최종 전달·정리

## 검증과 다음 실행 상세
- Windows AIT 01a1d870-4551-7929-a087-fe938f3921a6: 찻집6 PASS(log D:/Development/Temp/remaining-tea-final2.txt). 3/5카드는 확인화면 배열 선택이 최종상품을 결정한다.
- 이전 AIT01a1d861: 연이21등급·네오상대4 PASS. helper은 원본 입력/기간/후속/타로 서버deck을 검증.
- API targeted61 PASS, 추가가격인계 실제React8시나리오 PASS, joint/draw9 PASS. checkfast70684 실행중 로그remaining-checkfast.txt; 전체위험자동승격.
- 최신빌드55221(remaining-build4.txt): 연이 공유타로 --yn 토큰을 원본 salon색상에연결. 시각검사에서 카드공백발견; 덱이미지는lazy라 scroll+decode후찍기. letter_modes가 helper수정완료.
- 29363(remaining-tea-visible.txt)은 궁합 sprite 각요소 scroll/data-loaded 검증중. 캡처는 C:/Users/user/Downloads/CodeDestiny/remaining-modes-20261114.
- impeccable context/detect 완료. detector 출력0, 기존색상/아트재사용. 새색상/그림없음.
- Sukuyo mock은 원본 birthsnapshot을 쓰지만 천문계산이서버전용이라 calculationSource=mock-response-no-astronomy, astronomy수치 검증주장금지. 운영worker변경없음.
- Linux 최종 workflow_dispatch full_ci/toss_artifact/toss_simulation_artifact=true, .github/workflows/pr-ci.yml에41경로. artifacts <100MB,현재99.916MB로여유작음.
- docs/toss/remaining-modes-20261114.md 작성됨. 최종Linux증거확정후 ait-verification-20261114.json checks/followupBundles와 build-service-inventory.mjs tea productVerification 갱신.
- 다른세션원본checkout과임시파일보존. 원래QR14는b69번들이므로새QR필요. Ego브라우저기존55는finished, 새goal하나로시작.
