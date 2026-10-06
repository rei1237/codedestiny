---
status: done
updated: 2026-10-07
next: "후보 제작 세션 종료. OS 앱 언어 연동 보완 및 OAuth/Play 테스트 계정·실기기를 갖춘 출시 인수 검증이 남는다."
---

# Android 47 후보 · 영냥이와 꽃돼지 연이

## 지금 상태
- Capacitor 8/Java 구조 유지. `com.codedestiny.app`, min24/target36, 후보 `1.0.47 (47)`.
- 기존 키 서명 APK/AAB 생성, Google bundletool validate·apksigner·zipalign 통과. 파일은 `D:/Development/code-destiny/output/android-20261007/`에 보존한다. 최종 SHA256은 그 폴더의 `build-artifacts.json`을 따른다.
- 이 문서의 done은 후보 제작·전달 세션을 닫는 상태다. 원래 요청 전체와 출시 인수가 모두 완료됐다는 뜻이 아니다.
- 새 연이를 원본 `C:/Users/user/Desktop/CodeDestiny-Build/연이 프로필1.png`에 맞춰 제작하고 실제 잠금 알림과 앱 상세에 적용했다. 영냥이 책/구슬 포즈도 적용했다.
- 실제 API36 PIN 잠금 시스템 알림(명언/확언/일일 안내), 오프라인 상세, 설정 Back, 개별 콘텐츠, 권한 거부·조용한 시간·중복 방지를 검증했다. 캡처 구분과 한계는 본문 보고서를 따른다.
- 기존 업로드 키의 45 APK 위에 `adb install -r`로 47 Release 설치 성공. Play 설치본 업데이트·실계정 구매 데이터 보존의 증거는 아니다.
- 앱의 기존 강제 전체 화면 방식은 표준 알림 → 잠금 해제 후 상세로 변경했다. 동일 동작 보존으로 표시하지 않는다.

## 상세 정본
- `docs/android-upgrade-20261007.md`: 구조, 변경 이유, 보존·검증·제약, 재현 명령.
- `docs/android-feature-preservation-20261007.md`: 공개 카탈로그 74개 코드 근거. 전체 상품 E2E 통과 아님.
- `public/assets/yeongnyangi/companion/manifest.json`: 원본/배포 에셋·해시·사용 위치.
- `output/android-20261007/build-artifacts.json`: 실제 최종 APK/AAB 바이트·SHA256·서명·소스 기준.

## 남은 구현과 외부 검증
- OS 앱별 언어와 웹 언어 양방향 연동, 독일어 좁은 탭 줄바꿈, 일부 legacy 명언 출처 전수 검토, 별도 휴식/대기 포즈는 미완료.
- Google/Kakao/Naver 테스트 계정·OAuth Play 앱 서명 지문 설정, Play 라이선스 계정/SKU, 모든 상품의 생성·복구 fixture가 필요하다. 실결제·유료 LLM·운영 DB 쓰기·Play 업로드·수동 운영 승격은 실행하지 않았다.
- API24/API33/16KB 실행, Samsung One UI/실기기/TalkBack, 프로세스 종료 후 모든 화면 입력 복원, 실제 카카오·파일 흐름은 미검증이다.
- 초기화가 느린 저메모리 에뮬레이터에서 Release cold start 12.154초를 관찰했다. 실기기 성능 합격을 뜻하지 않으며 후속 프로파일링이 필요하다.
- 동시에 진행된 무료 결과 저장 제외 정책은 최신 main에서 받은 별도 사용자 작업이다. Android 작업은 가격·이용권/월정석/단건 결제·상담 엔진·DB 스키마를 바꾸지 않았다.

## 작업 경계
- 공유 main의 다른 변경과 index.lock을 건드리지 않았다. 격리 경로: `D:/Development/code-destiny/.codex-worktrees/android-upgrade-20261007-010446`.
- 최종 main 소스 `e3868a2bd1c14c0409b1a475c88c6cdfb732bea5`, [CI 37518284491](https://github.com/rei1237/codedestiny/actions/runs/37518284491) 성공. 이전 bridge 포함 소스 `6f75c3411037f1d7307f55b0f36fb04e64a455d3`의 [CI 37514953305](https://github.com/rei1237/codedestiny/actions/runs/37514953305)도 전체 성공했다.
- 최종 Release 실제 설정에서 권한 허용 직후 차단 안내 0개, 연이 선택·알림 게시·PIN 잠금·알림 탭·PIN 입력·같은 명언 상세 복귀까지 확인했다.
- 자동 검토가 생성 RSS/llms 6파일 되돌리기를 거절해 원본을 보존했다. 정리 시에는 복원 가능한 백업과 해시 확인 없이 해당 변경을 삭제하지 않는다.
- 원문 8파일(Gradle 동기화 2파일 포함), binary diff, SHA256을 `output/android-20261007/preserved-generated/`에 보존·해시 일치 확인했다. 코드/문서 커밋 뒤 자기 워크트리만 배수한다. 공유 main의 미커밋 변경과 잠금 파일은 소유 세션이 처리한다.

## 재개 지시
`D:/Development/code-destiny`에서 보존본 `D:/Development/code-destiny/output/android-20261007/docs/handoff/android-upgrade-2026-10-07.md`와 상세 보고서를 읽고, main의 다른 세션 변경을 보존하면서 최종 소스 `e3868a2bd1c14c0409b1a475c88c6cdfb732bea5`와 원격 포함 여부를 확인한다. 다음 작업은 OS 앱 언어 연동의 미완료 범위를 먼저 확인하고, 제공받은 OAuth/Play 테스트 계정과 기기에서 테스트 매트릭스를 실행하는 것이다. 실결제·운영 쓰기·Play 업로드는 별도 승인 범위를 확인한다. 문서 전달 최종 커밋은 출력 폴더의 delivery.json에 추가 기록한다.
