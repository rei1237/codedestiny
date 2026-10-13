# 영냥이의 모자 · 나의 뇌구조

Mode: Experience → Read. 기존 사주·영냥이 세계를 유지하는 국소 확장.

## Direction contract

THESIS: 영냥이의 진짜 모자가 독자적인 여섯 기숙사로 안내하고, 입학 편지와 계산 근거로 몰입을 이어간다.

OWN-WORLD: 영냥이의 남색·금빛 토큰과 원본 고양이·모자, 기숙사별 손그림 공간. 사주 뇌구조는 기존 페르소나 토큰과 계산 면적을 보존한다.

STORY: 모자 초대 → 프로필 확인 → 배정 → 어떤 사람들이 모이는지 → 실제 근거 → 내 기숙사 이미지 저장.

FIRST VIEWPORT: 모자 배정식 그림과 짧은 초대 문구, 한 개의 시작 버튼. 모바일은 이미지 위·문구 아래.

FORM: 영냥이 방의 독립 무료 섹션, 기숙사 결과는 편지형 리포트. 기존 세계 확장으로 seed 없음.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Verification

구현 완료. 아래 Final review에 mock·화면 검증 결과와 한계를 기록한다.

## Final review · 2026-10-14

Verdict: PASS. 원본 영냥이 참조와 생성 일러스트 7종의 화풍·모자 정체성을 확인했다. 지정 visual_checker가 실제 모자 화면 및 저장 이미지, pig/neo 뇌구조의 360·390·1440px 화면을 검토했다. 뇌구조의 작은 칸 밀집은 비율만 남기는 방식으로 해결했고 두 번째 검토에서 넘침·잘림·겹침이 없었다.

- 모자: 본문 가로 넘침 없음. 주요 버튼 약 52px, 프로필 추가 45px. 모바일 본문 왼쪽 여백 21px. 저장 PNG에 계정·출생 정보 없음.
- 키보드: Enter로 배정실 열기·배정 실행, Space로 근거 펼치기, 결과 제목으로 포커스 이동 확인. 축소 모션에서 결과 애니메이션 없음.
- 대비: 기존 밤 팔레트의 보조문구/금빛/본문 대 배경 대비 각각 11.10/11.33/16.20:1.
- 뇌구조: 360px 최소 14px, 셀 넘침 없음. 기존 비율 유지, 전체 문구는 해설에 제공.
- 오류·세션: 503 오류 안내, 다시 시도, 로그아웃 시 이전 결과 제거. 모든 브라우저 API는 mock, 외부 네트워크 차단.
- 범위: 실제 운영 DB·기기 저장 권한·실결제·유료 LLM은 미검증. 서버 중복 잠금은 Worker 인스턴스 범위이며 영속 결과 저장은 없다.

실행 근거는 로컬 `C:/Users/user/.codex/visualizations/2026/10/13/01a136da-75b6-74d2-8edb-b239c84cdfa4/hat/`에 보존했다. 계산·권한 검사는 `__tests__/ui/yeongnyangi-hat.test.mjs`와 기존 뇌구조 boot 검사 25개 통과. 전체 게이트 결과는 전달 보고에서 별도로 구분한다.
