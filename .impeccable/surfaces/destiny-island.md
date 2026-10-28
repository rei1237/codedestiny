# 운명의 섬

Primary target: destiny-island.html
Mode: Experience + Read. 모바일에서 열두 궁을 여행하고 자신의 성향과 시기를 읽는다.

## Direction contract
THESIS: 열두 장소를 직접 여행하는 무료 자미두수 이야기 지도.
OWN-WORLD: 청록의 숲, 남색 바다, 따뜻한 창문빛을 담은 회화 지도. 기존 서체와 수호자 초상을 유지한다.
STORY: 출생정보 입력 → 장소 선택 → 캐릭터 이동 → 궁 해석 → 시기 탐색.
FIRST VIEWPORT: 섬 전체가 중심, 위에 이름과 방문 수, 아래에 궁 목록과 시기 탐색. 모바일에는 축소 지도와 큰 목록 버튼을 함께 제공한다.
FORM: 사용자가 지정한 게임형 섬 탐험. 이미지 위 장소 표시와 경로 이동이 핵심 상호작용이다.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## 근거와 경계
- 정적 결과는 기존 buildIslandDeepReport와 실제 명반의 별·사화·삼방사정에 기반한다.
- 대한은 10년 구간, 유년은 선택 연도의 궁 위치다. 연도 선택을 월별·일별 예언으로 확대하지 않는다.
- 참고: https://qqqtseng.pixnet.net/blog/posts/9428394713 (대한·유년과 본명 궁 구분).
- 지도는 공통 연출 그림이며 출생정보가 지형을 만들어낸다고 주장하지 않는다.
- 방문 기록은 게임 진행만 나타내며 운세·궁 등급에 영향을 주지 않는다.
- 무료 전환 승인: 2026-10-17 사용자 요청. 기존 구매 기록과 소유자 재열람 유지.

## 진행
status: blocked-main-ci
- [x] 현재 구조·동시 수정 확인, 작업 격리
- [x] 새 지도 생성
- [x] 무료 결과/시기/이동 구현
- [x] mock 행동·화면 검증
- [ ] 커밋·main 통합·push·CI 확인·워크트리 정리

## 최종 화면 검토와 검증
- 360·390·430·1280px mock 브라우저: JS 오류/문서 가로 넘침 없음. 이동 transform 변화, 바로 도착, 정적 본문, 방문 도장, 연도 변경 확인.
- 느린 연도 응답이 닫힌 화면을 다시 열지 않고, 이동 도중 수첩을 열면 이동이 화면을 덮지 않음을 확인.
- finish reviewer가 지도 전체 fit·궁 목록·요청 취소 확인. 마지막 모바일 퀘스트 아이콘 넘침은 아이콘 숨김과 내부 간격 축소로 수정.
- 기존 글로우/긴 레거시 스타일의 기계 감지 경고는 남음. 새 지도/읽기 패널의 실제 가독성 검토 완료.
- 새 WebP: image_gen 원본을 sharp quality 85로 압축. 출처는 docs/design/destiny-island/art.jsonl.

## 전달 상태
- ESLint 변경 파일 검사와 npm run typecheck 통과. Worker 2스위트 14개 및 기존 결제/보존 호환 5스위트 28개 통과. Node UI 입력·PDF·탐험 14개 통과.
- check:fast는 정책 변경 때문에 전체 90개 스위트로 확장됨. 기존 main CI 실패 확인 후 광범위 로컬 반복을 중단했으므로 전체 통과로 표시하지 않는다.
- 최초 upstream 79d01e633의 Static guards 실패(대운 14 !== 12)는 후속 요청으로 해결했다. 다른 세션의 0e4b85d38 검사를 보존하여 bc1d7efab에 병합·main push했다. 로컬 사주 브라우저 검사 및 병합 후 check:pre-push 통과. 통합 CI는 run 39019552707에서 확인한다.
- 소스·미러 일치 확인. 운영 API·LLM·결제·DB 쓰기는 실행하지 않았다.
