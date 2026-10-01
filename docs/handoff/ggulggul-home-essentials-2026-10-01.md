---
status: done
implementationStatus: shipped-to-main
updated: 2026-10-01
next: 본 작업 완료. 후속 과제(아래 "남은 일")는 별도 세션에서 하나씩.
---

# 꿀꿀 운세 메인 — 필수 6섹션 노출 + 단일 "연이의 정원" (2026-10-01)

계획: `C:\Users\user\.claude\plans\pasted-content-id-673b-giggly-sphinx.md` (커밋 A~D).

## 결과

| 커밋 | 내용 |
|---|---|
| 667de5c90 | 안쪽 "모두 펼치기/다시 접기"(`#cdHomeExpandToggle`, `html.cd-home-expanded`) 제거. 정원 API `__cdOpenGarden/__cdCloseGarden` 단일화, aria-expanded/controls·접기 시 포커스→summary |
| 50ea345a1 | 검색 상시 노출(디스클로저 제거)·입력 전 결과 0·필터 패널, 필수 6섹션을 정원 밖으로 재배치 |
| db2e4005b | 사이트맵 원장 재생성 |
| d0cf372fd | 스모크/SEO 브라우저 검사: 무료 사주 퀵 카드 전에 정원을 연다 |
| d5b7b58ad | 헤더·히어로 중복 링크 제거, 오늘 게이트 "프로필 만들고 오늘의 운세 보기", 카카오 이벤트 실제 조건 문구, 대표 상담 모바일 세로 목록(장식 레이어 제거), 대화 상담 문 href 가 연이/네오 모드를 따름, 고민 라벨 줄바꿈 |
| d5b90e1bc | 사이트맵 원장 재생성 — e88d22ae5(siteSeo.ts)가 원장을 안 갱신해 main CI 의 주간 KST 테스트가 깨져 있던 것 복구 |
| 32a53f0c3 | `/fortune-chat/?character=neo|yeoni` 초기 캐릭터, 저장 세션이 명시 파라미터를 덮지 않음 |
| 1c2c5014a | 380px 이하 대화 문 제목 어절 단위 줄바꿈 |

## 유지한 계약

- 가격·지급 정책·운세 엔진·상담 프롬프트·결제 동결 파일 무변경(`verify:payment-freeze` 통과).
- 대화 상담 문은 연이 단일 카드(2026-09-02 사용자 결정, `guardian-fortune.static.test`)라 정적 href 는 `/fortune-chat/` 그대로, 런타임에만 `?character=` 를 붙인다.
- 고민 카드 이미지 유지(반응형 이미지 테스트 계약).
- 후기 보상 문구는 서버 구동(js/review-reward-*.mjs)이라 무변경.

## 검증

- check:fast exit 1 은 사이트맵 KST 테스트 1건(위 d5b90e1bc 로 해결)뿐. typecheck 0.
- `verify-home-funnel.cjs` 0 — 320/375/390/430/1280, 필수 6섹션 가시·접기 밖, 닫힌 정원 포커스 불가, 딥링크(#cdhPass·#cdhExpertsSlot 은 정원만 열고 이동, #services 는 정원을 열지 않고 검색에 포커스), 이전 상태(cd-home-expanded) 흉내, 로그인 mock.
- Playwright: 가로 넘침 0(ko/en/ja 320~1280), /en 노출 한국어 리프 15→10(신규 0), 대표 상담 썸네일이 칸 전체를 덮음, `/fortune-chat/?character=neo` → 네오 선택(비-GET 전부 차단, LLM 호출 없음).
- 스크린샷(visual-checker 판정 통과): scratchpad `shots3/`, `fix2-320-chat.png`, `fix2-390-sig.png`.

## 남은 일 (보고만, 범위 밖)

1. 변경 전부터 실패: `verify-today-hub-gate`, `verify-review-anytime-ui`, `verify-saju-reading-personas`, `verify-feature-popup-journey` (main 기준선과 출력 동일).
2. 320px 헤더 연이/네오 스위치가 오른쪽으로 8~21px 넘침 — main 과 동일(기존 결함).
3. 320px 하단 도크 "모든 운세" 라벨 잘림, 320px 대표 상담 메타 "·" 줄머리 — 경미.
4. 스테이징 `ConsultationRoom`(서버 플래그 on + 로그인) 은 `?character=` 를 아직 안 읽는다 — fortune-chat 상담실 세션 영역.
5. 푸터 키워드 나열·/en·/ja 홈 기존 한국어 리프(이용권 등급명 등) — SEO/i18n 별도 작업.
6. 네오 푸터 면책문 대비 4.42:1, 라이트 "아직 등록된 후기가 없어요" 4.22:1 — 기존 스타일.
