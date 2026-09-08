# 전생 관상 웹툰 개편 이어하기

- cwd: `D:/Development/code-destiny/.codex-worktrees/past-life-webtoon`
- branch: `codex/past-life-webtoon`
- base: `357108ef0`
- PR: 생성 전. 서비스 구현과 로컬 검증 완료, 커밋·push·PR 전달 단계.
- 요청 전체: 관상 기반 3~6장 웹툰, 기승전결/프로필/근거/현재 연결/공유, 비용·성능 최적화, 기존 기능 보존. 사용자는 최종 구현·검증까지 원하며 목업만으로 완료가 아니다.

## 완료한 작업

`docs/design/past-life-webtoon/analysis.md`: 진입/사진/엔진/API/결제복귀/저장/공유/i18n/오류 추적, 문제, DTO/매핑/이미지전략/검증계획.

`docs/design/past-life-webtoon/mockup.html`: 가상 지도 제작자 예시, 3장면+대표 공유카드, 실제 창작 문구, 프로필/관상 단서/현재 연결. 버튼은 안내용 demo임을 명시. 아직 실제 분석 결과 연결이 아님.

`docs/design/past-life-webtoon/assets`: 480/800px WebP 6개, 프롬프트 provenance.md. 800px 97.5~113.5KiB, 480px 44.1~52.7KiB. 원본은 Codex generated_images에 보존.

`verify-plf-mockup.cjs`: 360/390/430/1440px 브라우저 검증. `mockup-verification.json` 및 captures/에 증거.

`PastLifeFaceUI.js`: 기존 계산을 그대로 둔 표시용 `plfBuildStory` DTO, 핵심 3화 웹툰, 프로필·얼굴 단서·현재 연결·공유 카드 구현. 기존 상세 9장면·3령·부적·유료 궁합은 펼침 영역에 보존. JSON/누락 입력과 이미지 실패 fallback, 지연 로드, 모달 초점 가둠·복원을 추가.

`fuctionassets/past-life-webtoon/`: 역할·시대를 잘못 단정하지 않는 공통 상징 장면 3종의 480/800px WebP. 첫 장만 eager이며 800px 각 120KiB 이하.

`js/share.js`: 전생 공유 contentId를 `openPastLifeFaceApp` 진입으로 연결. 결제·가격·인증·DB 계약은 변경하지 않음.

## 실행 증거

- `npm run verify:past-life-face`: PASS, 55종×27 수호령=1485 고유 조합, 핵심 3화·원문 상세 9장면, 객체/JSON/누락/오류 입력, 이미지 계약, mock 결제 궁합 렌더, 동시 스크립트 로드.
- `node verify-plf-mockup.cjs`: PASS, 실제 모듈 기준 네 폭 가로 넘침 없음, 핵심 3화 1,317자, 초기 src 이미지1개, 버튼44px 이상, CLS0, IO 없음/404/reduced-motion/초점 복원. 로컬 DPR1 결과로 운영 LCP/모바일 실제 네트워크 증거는 아님.
- `npm run check:fast -- --plan`: shared/critical 전체 검사 판정.
- `npm run check:fast`: PASS, lint 경고만, 타입 검사, Node 969개, Jest 2,422개, 결제·복귀·Worker·인코딩 가드 통과.
- `node docs/design/past-life-webtoon/serve.cjs`: 로컬 목업 서버 127.0.0.1:4187. 필요하면 재시작.
- 실 LLM/결제/운영DB/배포 호출 없음. 추가 이미지는 도구로 3회 제작했으며 테스트 LLM 호출과 무관.

## 다음 작업

1. 2026-09-09 사용자 요청으로 큰 디자인 변경은 방향과 성공 기준을 공유한 뒤 별도 승인 대기 없이 자율 구현한다. 사용자가 명시적으로 목업 승인을 요구한 경우에만 멈춘다.
2. 새 worktree를 만들지 말고 현재 격리를 계속 사용. 편집 전 worktree:status로 관련 파일 중첩 재확인.
3. 변경 파일만 커밋하고 push한 뒤 PR을 만들고 최신 CI 상태를 확인한다.
4. 조율 중인 PR #1844가 머지되고 스테이징 SHA가 확인될 때까지 이 PR은 머지하지 않는다. 새 main 기준 의존성/충돌과 CI를 다시 확인한 뒤 후속 전달한다.
5. 실기기 카메라·실제 카카오 파일 공유·운영 네트워크/LCP는 배포 가능한 환경에서 별도 확인한다. 실제 결제·운영 DB·운영 배포는 승인 없이 실행하지 않는다.

## 남은 위험

카메라 실기기, 카카오 실공유, 운영 LCP, 역할별 전용 이미지 매핑, CI/PR/스테이징은 미완료. 정적 공통 이미지는 역할별 시대·직업을 묘사하지 않아 현재 서사와 충돌하지 않게 설계했다. PR #1844 확인 전 머지 금지.

## 복사할 재개 지시

```text
cwd=D:\Development\code-destiny\.codex-worktrees\past-life-webtoon 에서 docs\handoff\2026-09-09-past-life-webtoon.md를 읽고 codex/past-life-webtoon 작업을 이어가라. 구현과 로컬 검증은 완료되었다. PR #1844의 머지·스테이징 SHA 확인 전에는 이 PR을 머지하지 말고, 그 뒤 새 main 기준 충돌·의존성·CI를 재확인해 전달하라. 운영 배포는 별도 승인 전 실행하지 마라.
```
