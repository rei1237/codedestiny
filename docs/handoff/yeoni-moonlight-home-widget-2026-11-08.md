---
status: done
updated: 2026-11-08
next: Android 출시 빌드에서 실제 기기 위젯을 확인한다.
---

# 연이의 달빛 홈 화면

## 첫 행동

이번 그림 추가 검사는 D:/Development/Temp/yeoni-flower-art-fast.log, 통합 pre-push는 D:/Development/Temp/yeoni-flower-art-merged-prepush.log에서 종료 결과를 확인한다.

## 지금 상태와 승인

- 작업 위치: D:/Development/codedestiny-worktrees/yeoni-widget-20261108-140814, 브랜치 wt/yeoni-widget-20261108-140814. 기준 13074e9f8, 기능 최종 커밋 ca36ee873f7f3130f617406b24c70ead23febfc9. 꽃돼지 재물·연애·재회, 운세 그림 두 장은 68a642814. 복구 시도한 main 2c71d2253을 1ec3096d2에 통합했다. 재물 부적 재작화 b69ed5c3d: 둥근 한글 제목을 포함한 원본과 웹/Android 축소본 교체, 원본 검사 10개 통과. 연이 그림 제목은 2f96609d0, 영냥이 제목은 c6dbce0f1. 원격 수정 44518a28f를 병합했다.
- 2026-11-08 사용자 요청: “연이 모드에서만 오늘의 꽃말이 나오도록해줘 오늘의 운세는 영냥이 모드에서만”. 인간형 옷장, 위젯, 배경화면 범위 구현과 검증 및 main 전달 승인. 실제 결제/운영 DB/릴리스 빌드 제외.
- main 0b70e9801의 [CI 실패](https://github.com/rei1237/codedestiny/actions/runs/42453171322): 기업 API 환경 변수 BUSINESS_API_PER_MINUTE, BUSINESS_API_SALES 문서 누락 등. 새 [수정 커밋 CI](https://github.com/rei1237/codedestiny/actions/runs/42456002143) 의 Static guards와 Build Pages and Worker도 실패했다. 이후 44518a28f에서 푸터 테스트와 Pages 빌드가 복구되었다.

## 설계와 확인

- 두 홈에서 같은 설정으로 연결. 공개 콘텐츠만 KST 기준으로 순환한다. 고정 확언과 기존 위젯별 식별자를 보존한다. 연이 인간형 세 벌과 꽃돼지 신작 한 장을 같은 원본에서 배경/위젯 크기로 제작했다.
- [x] Android API 36: 위젯 추가/취소, 두 위젯 독립 수정, 오프라인 날짜 전환·재부팅, 연이 배경 적용. Gradle 네이티브 단위 검사 및 debug APK 빌드 통과.
- [x] 좁은/넓은 웹에서 키보드와 이미지 다운로드, iOS 브리지 모의 저장 확인. iPhone·Android 실물과 배포 앱은 미검증.
- [x] 위젯/자산/언어 검사와 기능 커밋 check:pre-push 통과.
- [x] 신규 원본 5장과 위젯 썸네일 등록, 카탈로그/언어 테스트 12개, Android 정책 테스트 4개와 assembleDebug 통과. Chrome 375px에서 재회 원본 선택과 운세 그림 두 장의 같은 문장, 연이 전용 꽃말 확인. 그림 추가 커밋 pre-push 통과.
- [x] 통합 pre-push 및 원본 검사 통과. check:fast에서 실패했던 공통 푸터 검사는 병합 후 4/4 통과. Android 실기기는 출시 후 확인 대상.

## 작업 규칙과 함정

공유 루트와 기존 main 작업 공간은 다른 세션이 쓰므로 수정하지 않는다. 홈 카드 CSS 양쪽 보존·미러 동기화·사이트맵 재생성·병합 완료. 원격이 새로 이동했는지 전달 전에 확인한다. 전달 완료 시에만 자기 워크트리를 배수한다.
