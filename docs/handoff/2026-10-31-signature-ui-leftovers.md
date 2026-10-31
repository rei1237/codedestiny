---
status: active
updated: 2026-10-31
next: "1번(신년운세 1280 상담 연도 칩·양력/음력 select)부터 개발 서버에서 계산값을 실측해 원인을 확인한다. 워크트리는 §지금 상태"
---

# 대표 상담 UI 남은 문제 4건 (범위 밖 이월분)

## 왜

- 사용자: "이번 범위 밖의 문제도 인수인계해서 다른 세션에서 진행 가능하도록해줘"
- 2026-10-31 운영 배포(`533008fc846d`) 때 보고만 하고 고치지 않은 4건이다. 출처는 `2026-10-30-signature-ui-followups-deploy.md` §처리 결과의 "남은 문제"다.

## 지금 상태

- 워크트리 `D:\Development\codedestiny-worktrees\signature-ui-leftovers-20261031-090826`, 브랜치 `wt/signature-ui-leftovers-20261031-090826`(origin/main `372de16d3` 기반). 이 문서 커밋만 있고 push하지 않았다.
- 운영은 `533008fc846d`다. 4건 모두 그 전부터 있던 문제이고 코드는 아직 손대지 않았다.

## 남은 작업 (4건)

| # | 문제 | 위치 | 끝났다는 기준 |
|---|---|---|---|
| 1 | 신년운세 1280: "상담 연도" 칩이 세로로 눌리고, 양력/음력 select가 약 140px로 높다 | `app/new-year-ai-consultation/NewYearAiClient.tsx` 폼 JSX `:2035-2092`, `.nyai-grid` `:2809`(2열), `.nyai-form label` `:2815`(display:grid), `.nyai-year-chips` `:973`(3열) | 1024·1280에서 칩의 연도·간지가 눌리지 않고, select 높이가 44~48px다. 360·390 첫 입력칸 y(1211·1107)가 나빠지지 않는다 |
| 2 | 신년운세 카테고리 칩(年 종합운 등)이 40px | 같은 파일 `.nyai-category-chip` `:2883`(`min-height: 40px`) | 360·1280에서 칩 높이 44px 이상. 줄 수가 늘어 첫 화면이 밀리면 수치를 기록한다 |
| 3 | 출생시간이 가운데 정렬이다(신년운세만 왼쪽으로 고쳤다) | 원인 `app/components/BirthTimeInput.module.css:2`(`.clock > .number`의 `text-align: center`). 신년운세 덮어쓰기 `NewYearAiClient.tsx:1431` | `<BirthTimeInput>`을 쓰는 34개 파일(`grep -rlE '<BirthTimeInput' app src`)에서 시간 칸이 옆 입력칸과 같은 정렬이다. 공용 CSS를 고치면 `:1431` 덮어쓰기는 지운다 |
| 4 | 네오 운영실 값 카드가 소개 블록·제작 고지보다 양옆 16px 안쪽에 있다 | `src/features/neo-war-room/NeoOperationRoomPage.tsx:2311-2319`, 공용 `.valueSection`(`app/components/expert-consulting/ExpertConsultationFrame.module.css`, `width: min(1160px, calc(100% - 32px))`), 감싸는 `.consultationValue`(`src/features/neo-war-room/neo-operation-room.module.css:1`, padding 24px) | 360·768·1280에서 카드 좌우 끝이 소개 블록·고지와 같은 x다. 다른 8개 화면의 값 카드 위치는 바뀌지 않는다 |

## 함정

- 1번 추정 원인(실측 전): `.nyai-grid` 2열에서 양력/음력 라벨과 상담 연도 필드가 같은 행에 놓인다. 키 큰 연도 필드에 맞춰 라벨이 늘어나고(grid stretch), 라벨 안 select까지 늘어난다. 연도 칩 3열은 반 폭에 들어가 눌린다. 고치기 전에 DevTools 계산값으로 확인한다.
- 3번은 공용 컴포넌트다. 입력칸 전체를 가운데로 둔 화면이 있으면 그 화면은 가운데로 남긴다. 화면마다 옆 칸 정렬을 보고 판단한다.
- 4번 `ExpertValueCards`는 네오 포함 9개 화면이 같이 쓴다. 공용 `.valueSection` 폭은 바꾸지 말고 네오 쪽에서 맞춘다.
- 전역 `label[for]` min-height 44px 규칙이 라벨 높이를 바꾼다(저장 프로필 카드 `03f44447b`에서 겪었다).
- `styles/*.css`를 고치면 `npm run sync:public`으로 public 미러를 맞춘다. 안 하면 `check:pre-push`의 `verify:public-mirror-fresh`가 막는다.

## 검증

- 개발 서버는 이 워크트리에서 `npm run dev`로 띄운다. 끝나면 프로세스 트리째 종료한다. 다른 세션 서버는 건드리지 않는다.
- Playwright 임시 스크립트는 scratchpad에 둔다. cwd=워크트리, `channel:'msedge'`, 한 번에 한 경로만 연다. 폭은 360·390·768·1024·1280이다.
- 기준: 탭 44px 이상, `--cd-*` 토큰 사용, 새 hex 금지, 텍스트 대비 4.5:1.
- `npm run check:fast`(headless shell 미설치로 browser 2건 실패는 기존 그대로), push 전 `npm run check:pre-push`(훅이 없어 직접 돌린다).
- 커밋은 항목별로 하고 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
- push와 운영 배포는 사용자가 요청할 때만 한다. 배포하면 롤백 대상(직전 운영 `533008fc846d`)과 run id를 이 문서에 적는다.

## 모르는 것

- 3번에서 일부 화면을 가운데 정렬로 남길지 판단이 갈리면 사용자에게 묻는다.
- 4건을 고친 뒤 운영 배포까지 할지는 아직 승인이 없다.
