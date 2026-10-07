# 연이·네오 질문 상담 — 순차 구현 상태

status: in_progress

## 먼저 전달하는 단계

사용자의 2026-10-07 추가 지시에 따라 결과를 받는 즉시 이해받는 경험을 최우선으로 구현했다. 영냥이·연이·네오의 최초/후속 상담에 같은 근거 기반 공감 규칙을 적용하고, 최종 사주 강약 판정에 따른 현실 조언을 연결했다.

- 구현 main SHA: `ea66f9eb89e763ba79aff1a6504fbe85efe47d5a` (push 완료).
- 검증: `npm run check:fast -- --plan --committed-head --base=e8513e1f99cc45f97b42e68a4dde2634ea1097d9`, 같은 인자의 `npm run check:fast` 통과.
- Node 2,940개, Jest 5,178개 / 346 suites 통과. 공감·persona·후속 저장 집중 검사 21개 통과.
- 199개 상담 스냅샷에서 요청 프롬프트만 변경. 식별값·준비된 분석·검증 본문·manifest 불변 확인.
- `verify:fortune-chat-reading`, `verify:guardian-fortune-failure` mock 통과.
- CI: https://github.com/rei1237/codedestiny/actions/runs/37618578015 (해당 SHA의 결과 확인 대상).
- 실제 LLM 문장 품질, 실결제·실환불·운영 DB·운영 승격은 실행하지 않았다.

설계와 체계별 근거는 `docs/context/grounded-consultation-recognition.md`가 정본이다. 신약을 이기적인 인격으로 규정하지 않는다. 감당 가능한 도움과 상호협력을 제안하고 거절할 선을 함께 둔다. 신강은 시간·돈·역할·보상·상대 조건을 비교하되 무조건 남을 따라 하라고 지시하지 않는다. 종격 후보/확정 종격과 근거 누락에는 일반 강약 조언을 붙이지 않는다.

## 아직 완료하지 않은 원래 계획

원래 `/fortune-chat` 상품·무료 종료·UI·에셋 작업은 다음 워크트리에 미검증 변경으로 보존되어 있다. main에 합치지 않았으며 사용할 수 있는 완성본으로 보고하지 않는다.

- 작업 디렉터리: `D:\Development\code-destiny\.codex-worktrees\fortune-chat-question-20261007-195906`
- 브랜치: `wt/fortune-chat-question-20261007-195906` (동시 쓰기 세션 때문에 공식 안전 워크트리 예외 사용).
- 상태 메모: `.tmp/fortune-chat-question/state.md`
- 변경 영역: 네 등급 카탈로그/서버 라우트/구매 증빙 식별, 신규 무료 권한 차단, 질문 우선 UI, 공통 질문/후속/타로 상태 재사용.
- 자산: `docs/design/fortune-chat-assets/` 원본 두 장 및 `public/images/fortune-chat/rooms/` WebP. 실제 화면 검수·SVG 장식·에셋 명세는 미완료.
- 아직 확인할 핵심: fishId 필수 서버 검증, 기존 무료 예약 보존, 구형 경로·정적 셸·번역의 무료 안내 제거, 결과/기록 persona 렌더링, 계정 전환·늦은 응답 방어, 결제/횟수 회귀, 모바일 360/390/430/768/1440 실제 렌더링.
- UI WIP는 아직 typecheck 전이다. 특히 TarotCardPick의 spread 입력과 conversation/record 타입을 점검한다.

## 바로 다음 작업

먼저 위 워크트리의 `git status --short`와 상태 메모를 읽는다. main의 공감 완료 커밋을 가져올 때 미커밋 UI/결제 변경을 보존한다. 다음 독립 단계는 네 상품의 서버 계약·지원 제한·무료 종료를 mock으로 완성하는 것이다. 새 계산기나 저품질 경로를 만들지 않는다. UI와 결제 상태를 한꺼번에 완료 처리하지 않는다. 각 단계 검증 → 작은 커밋 → main 병합/push → 해당 SHA CI 확인을 유지하며 PR이나 운영 승격은 하지 않는다.

다른 세션의 main 미추적 파일 및 워크트리는 이 작업 소유가 아니므로 변경·삭제하지 않는다. 공감 검증용 워크트리는 해당 단계 CI 확인 후 배수한다. 원래 작업 워크트리는 미완료 작업이 있어 보존한다.

## CI 보완

첫 코드 SHA의 CI는 빌드·타입·Critical checks가 통과했으나 사이트맵 드리프트로 실패했다. 다른 세션이 main에 합친 사이트맵 갱신 뒤 로컬 955 URL 정합성을 확인했다. 이어 공통 public 미러 CI에서 16개 셸 파일의 캐시 지문 불일치가 발견되어 깨끗한 검증 워크트리에서 sync:public을 실행했다. 16개 파일은 build-해시를 제거하면 이전 내용과 모두 동일함을 비교했다. 상품·가격·문구·동작 변경은 없으며 CI 전달을 위한 생성물 동기화다. main의 미추적 output/ 백업 때문에 발생한 별도 로컬 타입 검사 실패는 해당 파일을 수정하지 않고 깨끗한 워크트리 검증으로 분리했다.
