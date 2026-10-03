---
status: active
updated: 2026-10-03
next: 최신 main과 현재 보관함·프로필·레벨 정본을 확인하고 구현 없이 화면별 개선 계획을 제안한다.
---

# 보관함·프로필·레벨 UI 계획

## 왜

사용자 요청: 보관함·프로필·레벨 UI를 개선하기 위한 계획을 별도 세션에서 작성한다. 현재 요청은 구현이 아니며, 기존 데이터와 혜택 정책을 바꾸지 않고 정보 구조와 가독성을 정리한다.

## 지금 상태

- 작업 위치: `D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209`, 현재 브랜치 `wt/ggulggul-home-art-20261003-181209`. PR 없음.
- 기준 홈 커밋: `947c10e8665992d100e79597b601e65929b677c7`. 이 주제의 구현은 시작하지 않았다.
- 다음 세션은 최신 main을 확인한 뒤 계획한다. 이 문서는 main 반영·CI·배포 완료의 근거가 아니다.

## 남은 작업

- [ ] 보관함·프로필·레벨 3영역의 실제 진입점과 상태를 읽기 전용으로 확인한다. 로그인/비로그인, 프로필 없음/있음, 기록 없음/있음을 구분한다.
- [ ] 보관함은 기록의 목적지와 이어보기를, 프로필은 현재 선택·전환·편집을, 레벨은 계정 진행도와 조건부 혜택을 각각 명확히 보여주는 배치를 제안한다.
- [ ] 모바일 360/390/430px에서 제목·요약·주요 행동이 읽히는 구성을 제안하고 기존 컴포넌트 재사용 지점을 적는다.
- [ ] 화면별 변경안·정본·유지 계약·검증 계획·미확정 사항을 한 보고서로 정리한다. 코드를 수정하지 않은 구체적인 계획 전달이 완료 기준이다.

## 정본 예시

`js/destiny-profile.js:9079` — `renderMasterCard`가 현재 프로필 카드를 렌더한다.

같은 파일의 `renderProfileList:9804`, `_dpBuildLevelStrip:8631`, `CDLevel:8527`을 이어 확인한다. XP·레벨·보상은 `worker/routes/rpg.js`의 계정 범위 `__account__`가 정본이다.

## 함정

- `templates/home-funnel.html`의 `#cdLibrarySheet`는 상담 기록·영냥이 상담·프로필·결제 내역 4개 목적지 메뉴다. 여러 결과가 모인 통합 목록이 이미 있다고 설명하지 않는다.
- `app/yeongnyangi/_components/Library.tsx:59`의 `recover`는 `requests/{id}/generate`를 호출한다. 단순 조회로 취급하거나 실제 계정에서 눌러 확인하지 않는다.
- 레벨은 프로필별이 아니라 계정 단위다. 월정석 보상에는 레벨 외 가입 14일과 단계별 현금 결제 실적 조건이 있다(`worker/routes/rpg.js:136`, `:918`). 레벨만 오르면 자동 지급된다고 약속하거나 혜택을 새로 만들지 않는다.
- 결제·인증·DB와 레벨 계산·혜택 정책은 유지한다. 공통 규칙은 [CLAUDE.md](../../CLAUDE.md), 정책 확인은 [결제 경계](../context/payment-gating.md)를 따른다.

## 검증

```powershell
git status --short
git log -1 --oneline
rg -n 'renderMasterCard|renderProfileList|_dpBuildLevelStrip|window.CDLevel' js/destiny-profile.js
npm run verify:handoff-contract
```

계획 단계에서는 소스와 mock 화면을 대조한다. 구현 승인 전 코드 검사 통과나 기능 완성을 보고하지 않는다.

## 모르는 것

통합 보관함으로 확장할지, 기존 목적지 안내를 다듬을지는 미확정이다. 데이터 통합을 전제하지 말고 두 범위의 차이와 필요한 작업을 계획에 명시한다.

## 새 세션 실행 프롬프트

```text
현재 인수인계 작업 디렉터리: D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209
문서: D:\Development\codedestiny-worktrees\ggulggul-home-art-20261003-181209\docs\handoff\2026-10-03-library-profile-level-ui.md
기준 홈 커밋: 947c10e8665992d100e79597b601e65929b677c7
이 문서와 CLAUDE.md를 읽고 최신 main과 동시 작업 상태부터 확인해줘. 보관함·프로필·레벨 3영역의 UI 개선 계획만 작성하고 코드는 수정하지 마. 현재 보관함은 4개 목적지 메뉴이며 계정 레벨 정본과 조건부 월정석 정책을 보존해줘. 실제 화면은 mock으로 확인하고 영냥이 recover 생성 API, 실 LLM·실결제·운영 DB는 호출하지 마. 화면별 제안·재사용 정본·검증 기준·미확정 사항을 구체적으로 정리해줘.
```
