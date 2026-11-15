---
status: done
updated: 2026-11-16
next: 구현·검수 완료. 운영 승격은 별도 요청 범위다.
---

## 첫 행동
현재 변경과 이 문서를 확인한다. 12지신 전신 모션으로 프로필 얼굴 합성을 대체하는 작업이다.

## 지금 상태
- worktree: D:/Development/codedestiny-worktrees/moonlit-zodiac-motion-20261116-003615
- branch: wt/moonlit-zodiac-motion-20261116-003615, base: 5b74dd4a6865a2cfdc81410f62e5e99734427924
- 현재 변경은 모두 이 작업 소유, 미커밋. main의 다른 세션 변경은 보존.
- mock preview: http://127.0.0.1:28836/moonlit-lotus/ (API 28837).

## 승인 상태
사용자 요청: 연이·영냥이 외 12지신 동물 선택, 각 동물의 기도·108배·이동 모션. 운영 승격은 이번 요청에 포함되지 않았다. main 전달과 CI 1회 확인까지 수행한다.

## 작업 규칙과 함정
- 얼굴을 원형으로 잘라 범용 몸에 붙이는 표현 제거. 계정 프로필은 읽기만, 성장은 변경하지 않는다.
- 실제 UI 스크린샷은 visual_checker가 판정. 로컬 mock만 사용.
- 큰절 프레임은 기존 elapsed/CYCLE_MS를 따른다. 미리보기는 카운터를 호출하지 않는다.
- 생성 PNG의 도구 썸네일은 투명 영역이 검정/빨강으로 보일 수 있다. 실제 합성 후 판단한다.

## 설계
- companions.ts: 12종 목록, 종 식별, atlas URL/프레임 규약.
- CharacterChooser.tsx: 연이·영냥이·12종과 동작 미리보기, 프로필 동물 가져오기.
- general atlas: 4×4, 384px 셀, idle/blink/greeting/meditation/prayer/bow 8컷/walk 4컷.
- dedicated bow atlas: 16컷, 별도 파일로 연결 예정.
- 소스 외부 보존: D:/CodeDestiny-Build/moonlit-lotus/zodiac-v1
- 재현 스크립트: scripts/design/export-zodiac-sprites.cjs

## 단계
- [x] 범용 얼굴 합성 제거, 12종 선택 UI와 프로필 종 연결
- [x] 12종 general atlas 192컷 생성·내보내기 (7,986,846 bytes)
- [x] 전용 큰절 16컷 ×12 내보내기·연결
- [x] 자산/동작 회귀 검사와 check:fast
- [x] 실제 모바일 에뮬레이션 및 visual_checker 검수

## 완료 갱신
추가 요청 서한비48컷을 포함해 총15종을 선택한다. 원본은 박지은 캐릭터.png이며 사용자 지정 이름 서한비를 적용했다. 자산커밋72763df98, 기능커밋45df4a715. 위의 미커밋·서버표시는 시작시점기록이며 검수용mock서버는 종료했다.

check:fast의 Node5106개 중 당일운세JSON미생성으로1개실패했다. 외부API없는 fortune:build-data 후 해당파일7개재실행통과, 계획의나머지검사를이어실행하여완료했다. Jest479suites/8012tests통과(기존1개skip),타입/ESLint/관련17개통과. 상세는 docs/design/moonlit-zodiac-v1.md.

main의 다른세션 docs/toss변경과 .claude/skills/fire-your-seo-agency는보존한다. 검증한커밋만main에직접머지·push하고CI는1회확인한다. 운영승격은수행하지않는다.
