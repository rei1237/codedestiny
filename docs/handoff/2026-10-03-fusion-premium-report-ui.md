---
status: active
updated: 2026-10-03
next: 최신 main과 작업 상태를 확인하고 mock 결과 화면을 재현한 뒤 초융합 리포트 UI를 별도 세션에서 수정한다.
---

# 초융합 프리미엄 리포트 UI

## 왜

사용자 요청: 이 세션의 초융합 수정을 중단하고, 별도 세션에서 수정할 수 있는 프롬프트와 인수인계를 남긴다. 달빛 예화에 어울리는 고급 리포트 표지·장별 위계·모바일 가독성이 목표다.

## 지금 상태

- 작업 위치: `D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209`, 현재 브랜치 `wt/ggulggul-home-art-20261003-181209`. PR 없음.
- 기준 홈 커밋: `947c10e8665992d100e79597b601e65929b677c7`. 초융합 관련 4파일의 이번 미커밋 수정은 전부 원복했고 현재 초융합 코드는 미수정이다.
- 이 문서는 수정 재개용이다. 홈 커밋의 main 반영·CI·배포 완료를 뜻하지 않는다.

## 남은 작업

- [ ] 결과 화면 1종을 mock으로 재현하고 표지·장별 구분·읽기 폭·문단 간격의 현재 문제를 확인한다.
- [ ] 달빛 예화와 기존 명조 글꼴을 활용해 리포트 첫인상과 장별 위계를 개선한다. 실제 구현은 `ThreadRow`/`ThreadBubble` 대화 UI이므로 문서형 레이아웃이라고 가정하지 않는다.
- [ ] `FusionResultRail`/`FusionResultDock`의 목차, 섹션 앵커, PDF 내보내기 표시와 긴 결과의 지연 렌더링을 보존한다.
- [ ] 360/390/430px와 데스크톱 1종에서 장문·목차 이동·PDF 상태를 확인한다. 시각 개선과 기능 회귀 없음이 완료 기준이다.

## 정본 예시

`app/fusion-fortune/FusionResultThread.tsx:45` — 결과의 첫 메시지부터 장별 본문을 구성하는 진입점.

연관 정본: `fusion-thread.tsx:163`, `FusionResultRail.tsx:19`, `FusionResultDock.tsx:20`, `fusion-fortune.module.css`, `_lib/toc.ts`(모두 같은 디렉터리).

## 함정

`FusionFortuneClient.tsx:2432`의 dev preview는 폼 제출 흐름 안에 있다. 개발 모드에서 `?preview=success`로 접근한 뒤 유효한 폼을 제출해야 결과가 나온다. URL 접근만으로 결과가 안 보인다고 API를 실호출하지 않는다. 계산·결과 데이터·과금·복구 계약은 변경하지 않는다. 공통 경계는 [CLAUDE.md](../../CLAUDE.md)와 [디자인 정본](../context/design-canon.md)을 따른다.

## 검증

```powershell
git status --short
git log -1 --oneline
npm run check:fast -- --plan
npm run check:fast
npm run verify:handoff-contract
```

다음 세션에서 변경 범위에 맞춰 실행한다. 이 문서 작성은 UI 수정·회귀 검사 통과의 증거가 아니다.

## 모르는 것

표지의 확정 문구·장식 강도와 최종 결과 시안은 미확정이다. 새 세션에서 현재 화면을 근거로 방향을 설명하고 요청 범위 안에서 결정한다.

## 새 세션 실행 프롬프트

```text
현재 인수인계 작업 디렉터리: D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209
문서: D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209\docs\handoff\2026-10-03-fusion-premium-report-ui.md
기준 홈 커밋: 947c10e8665992d100e79597b601e65929b677c7
이 문서와 CLAUDE.md를 읽고 최신 main의 커밋·동시 작업·미커밋 상태부터 확인해 작업 위치를 정해줘. 이전 초융합 변경 4파일은 원복됐다. mock preview 결과를 폼 제출로 재현하고, 달빛 예화의 고급 리포트 표지와 장별 위계·모바일 가독성을 개선해줘. ThreadRow/Bubble, 목차 Rail/Dock, PDF·앵커 계약을 보존해줘. 실 LLM·실결제·운영 DB 호출은 허용하지 않는다. 관련 검증 후 저장소 전달 규칙을 따르고 미실행 CI·배포를 완료로 보고하지 마.
```
