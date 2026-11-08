---
status: in-progress
updated: 2026-11-08
next: 최종 check:fast 결과를 기록하고, origin/main의 별도 기업 API 변경이 CI를 통과한 뒤 통합·전달한다.
---

# 연이의 달빛 홈 화면

## 첫 행동

전체 검사의 로그 D:/Development/Temp/yeoni-widget-fast-final.log 끝부분을 확인한다. 이미 실패한 main CI를 반복 조회하지 않는다.

## 지금 상태와 승인

- 작업 위치: D:/Development/codedestiny-worktrees/yeoni-widget-20261108-140814, 브랜치 wt/yeoni-widget-20261108-140814. 기준 13074e9f8, 기능 최종 커밋 ca36ee873f7f3130f617406b24c70ead23febfc9. main에 미전달.
- 2026-11-08 사용자 요청: “연이 모드에서만 오늘의 꽃말이 나오도록해줘 오늘의 운세는 영냥이 모드에서만”. 인간형 옷장, 위젯, 배경화면 범위 구현과 검증 및 main 전달 승인. 실제 결제/운영 DB/릴리스 빌드 제외.
- main 0b70e9801의 [CI 실패](https://github.com/rei1237/codedestiny/actions/runs/42453171322): 기업 API 환경 변수 BUSINESS_API_PER_MINUTE, BUSINESS_API_SALES 문서 누락 등. 타 작업의 실패 위에 푸시하지 않는다.

## 설계와 확인

- 두 홈에서 같은 설정으로 연결. 공개 콘텐츠만 KST 기준으로 순환한다. 고정 확언과 기존 위젯별 식별자를 보존한다. 연이 인간형 세 벌과 꽃돼지 신작 한 장을 같은 원본에서 배경/위젯 크기로 제작했다.
- [x] Android API 36: 위젯 추가/취소, 두 위젯 독립 수정, 오프라인 날짜 전환·재부팅, 연이 배경 적용. Gradle 네이티브 단위 검사 및 debug APK 빌드 통과.
- [x] 좁은/넓은 웹에서 키보드와 이미지 다운로드, iOS 브리지 모의 저장 확인. iPhone·Android 실물과 배포 앱은 미검증.
- [x] 위젯/자산/언어 검사와 기능 커밋 check:pre-push 통과.
- [ ] 최종 전체 check:fast, 통합 후 pre-push 및 main CI 확인.

## 작업 규칙과 함정

공유 루트와 기존 main 작업 공간은 다른 세션이 쓰므로 수정하지 않는다. 새 origin/main이 녹색이면 이 워크트리에서 병합한다. app/home-main.module.css 양쪽 홈 카드 스타일 보존, config/sitemap-lastmod.json은 통합 후 재생성. 공개 미러 동기화 후 검사·커밋·main 전달. 전달 완료 시에만 자기 워크트리를 배수한다.
