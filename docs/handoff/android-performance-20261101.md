---
status: done
date: 2026-11-01
owner: 01a19588-f79a-7e72-b5fa-d72da6964cf9
---

# Android 성능 작업 완료 기록

기존 main 차단을 사용자 요청에 따라 수선하고 첫 실행 회귀를 수정했다. 이전 blocked 인수인계는 종료한다. 최종 main push·공식 CI 결과는 아래 검증 보고의 delivery.json과 채팅 최종 보고에 기록한다. Play 심사 중인1.0.56과 기존 매일09시 추적은 유지한다.

# Android 첫 실행 수정 검증 (2026-11-01)

원인: MainActivity가 초기 about:blank 문서를 준비 완료로 받아 네이티브 실행 지표가 실제 화면보다 빨리 끝났다. 홈에 추가한 클라이언트 링크 래퍼도 제거해 기존 Next Link에서 앱 자동 prefetch 억제를 유지했다. 실제 문서가 준비되면 추가 220ms 덮개 없이 홈을 표시하며, 시간 상한·오류 전환은 유지한다.

SM-M156S/Android16, USB, 각 앱 데이터 초기화, 네이티브 full compilation, 순서 교차, 각5회. 소스 dc1a040e3 + 첫 실행 수정 비교. release 최적화(minify/shrinkResources), debuggable=false, 별도 benchmark 패키지/debug 서명. 네트워크 mock/CSP 차단. 정식 서명 Release·실서버·실결제 증거가 아니다. 후속 main 통합분의 전체 모바일 재빌드는 미검증이다.

| 측정 단계 (중앙값·범위 ms) | 기준 | 수정 |
|---|---:|---:|
| Activity onCreate→웹 홈 FCP | 1399.9 (1244.4–2683.9) | 742.1 (665.8–929.4) |
| onCreate→DOM 준비 | 1131.6 (905.4–1803.5) | 836.2 (735.5–1022.4) |
| 첫 영냥이 버튼 터치→해당 화면 | 1369 (822–1697) | 792 (757–901) |
| 실제 문서 전 스플래시 조기 해제 | 5/5 | 0/5 |
| Android am start native surface | 842 | 1264 |
| 별도 네이티브 화면 캡처로 홈 이미지 확인 | 5227 (3473–6136) | 4060 (3804–4504) |

FCP는 네이티브 덮개 아래의 웹 렌더 시점이며 아이콘 탭→완전 표시 시간이 아니다. am start는 준비 판정이 달라졌으므로 전후 속도 지표로 비교할 수 없다. 화면 캡처 검사는 두 연속 프레임에서 같은 홈 ROI가 확인돼야 통과하며 캡처 자체가 약0.7–1.4초의 큰 부하를 준다. 이 항목은 실제 홈 표시 확인용이고 범위가 겹쳐 정밀한 체감속도 개선 수치로 사용하지 않는다.

20분8화면 반복 사용20표본 완료, 백그라운드 복귀 경로·제목 일치. USB 배터리 온도33.4–33.8°C. 비교 조건이 충분하지 않아 메모리·발열 개선은 주장하지 않는다. 음악 실재생·작성중 입력·느린 실네트워크·전체 OS 설치용량은 미검증이다.

검증: check:fast -- --plan 확인. check:fast 최초 전체 Jest441 suites/7224 tests 통과, Node4039/4040 및 기존 parity 실패 후 중단. URLSearchParams VM fixture와 생성 캐시주소를 수정하고 Node4040/4040, parity/self-test, paid-gate-ui, payment-freeze, lint/typecheck/sitemap, worker dry build, 인코딩 및 나머지 고유 가드 통과. 관련 Jest0(기존 전체 결과 재사용). 최신 main 통합 후 관련19/19, 생성 미러 갱신, check:pre-push 통과. 처음 실패한 check:fast 자체를 통과로 표기하지 않는다.

main CI 수선: 과거 tea-house mock 실패는 main1bf48c87b의 수정을 통합해21/21. 추가 VM 브라우저 전역·runtime pin 수정을 적용했고 같은 수정이 후속 main에도 도착해 보존했다. H1 CI 실패는 main c9731614e의 client-only 경계 수정으로 통합했다. 최종 GitHub CI 결과는 delivery.json과 채팅 최종 보고에 기록한다.

유지: 소개 이미지 가로·세로 해상도와 오프라인 포함 정책, 결제·가격·이용권·월정석·인증·구매 기록·API 응답·DB 스키마. 결제 파일 변경은 기존 runtime URL 캐시주소이며 결제 판정 변경이 아니다. 생성 미러는 sync:public, 동결 서명은 기존 generator로 갱신했다. Play1.0.56 취소·재제출·운영 승격은 수행하지 않았다. 매일09시 출시 추적은 기존 automation play를 유지한다.


최종 원자료: D:/Development/code-destiny/output/android-startup-20261101-01a19588
이전 용량 최적화 원자료: D:/Development/code-destiny/output/android-performance-20261101-01a19588 (이전 Debug 결과로만 해석).
