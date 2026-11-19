---
status: in-progress
updated: 2026-11-20
next: 3단계 마무리(데모 커밋·분석 발화 재측정·push·정리) → 3b 예화 재스타일·대비
---

# 무료 운세·타로·캐릭터 웹툰 결과 UX 개편 — 구현 계획 (3~8단계)

## 첫 행동
1. `git branch --show-current`(main)·`git status`·`git pull --ff-only`.
2. 이 문서의 "단계"에서 첫 미완료 항목을 연다. 그 단계의 원문 지시는 [단계별 프롬프트 원문](../prompts/2026-11-20-free-tarot-ux-revamp-stages.md)의 같은 번호 절이다. **원문은 참조용**이다(사용자 2026-11-20 "프롬프트 전체이니까 참조만해줘"). 아래 "원문과 저장소 규칙의 충돌"이 원문보다 앞선다.
3. 스펙 정본: [guided-step-flow-spec](../context/guided-step-flow-spec.md), [narrator-webtoon-result-spec](../context/narrator-webtoon-result-spec.md). 근거: [free-tarot-ux-audit](../context/free-tarot-ux-audit.md).

## 지금 상태
- 브랜치 main. 1·2단계 문서 커밋 `1a6e80eae`, `c93c999b7`, `858671988` push 완료.
- 3단계 로컬 커밋(push 전): `f4322b203` 컨트롤러(`lib/guided-flow/step-controller.mjs`), `d4c1fe4c5` 셸·훅·i18n(`app/components/guided-flow/`), `bd54671ef` 분석 이벤트 + verify ⑭.
- 옆 세션 미커밋(건드리지 말 것): `docs/ios/phase-reports/phase-4.md`, `.claude/skills/fire-your-seo-agency/`.

## 승인 상태 (원문·날짜)
- 2026-11-20 사용자: "권장안대로 승인, 구현 계획 진행해줘" → 1단계 감사, 2단계 스펙 D1~D13·N1~N7 의 **추천 열 확정**.
- 2026-11-20 사용자: "죽은 코드는 지우도록해 그리고 상관없어" → 7단계는 `_graveyard/` 격리가 아니라 **삭제**(3면 확인 후 별도 커밋). D11 은 현행 유지(영냥이 출석 게이트 유지).
- **승인 아님(각각 별도 RED 승인 필요)**: D8 하루 1회 서버 저장(DB), D10 연애 타로 무료화(결제 정책), D12 무료 사주 로그인 벽·동의 모달 해제(인증 경계), 결제 실행 파일 변경, 운영 승격, 과금 LLM 실호출.
- 원문 게이트 유지: 4·5·6·7단계는 **계획(재사용·매핑표·수정 파일 실제 경로·리다이렉트/삭제 목록) 보고 → 사용자 승인 → 구현**. 3·8단계는 바로 진행.

## 원문과 저장소 규칙의 충돌 (해소 결과)
| 원문 | 저장소 정본 | 따를 것 |
|---|---|---|
| "브랜치 작업" | CLAUDE.md 절대 규칙 3: main 직접, 브랜치·PR 없음 | main 직접, 작은 커밋 |
| 폐기 코드는 `_graveyard/` 격리, 삭제 금지 | `reference-basics.md:38` 죽은 코드는 지운다 + 사용자 2026-11-20 "죽은 코드는 지우도록해" | 3면 grep(deletion-auditor) 후 삭제, 대상별 별도 커밋, 롤백은 `git revert` |
| 전환 240ms·reduced 120ms·공개 600ms·글자 기본 크게 | 스펙 D2·D3·D4·D9 확정값 | 토큰 220ms, reduced 즉시+'다음' 상시, 350ms 간격(뒤집기 800ms), 기본 17px/크게 19px |
| 말풍선 타이핑 효과 | N7 확정: 없음 | 타이핑 없음, 페이드업만 |
| 연이 "따뜻·힐링" | `worker/yeongnyangi/prompts/persona/yeoni.ts` 정본 | 정본(답·근거 먼저, 무조건 긍정 금지) |
| 원문 ⑥ 로그인 없이 무료 결과 | D12 분리 | 6단계에서 사주 로그인 벽은 건드리지 않고 별도 RED 로 보고 |

## 작업 규칙과 함정
- 엔진(사주·타로·자미·점성·숙요·베다) 계산·무작위·정역·해석 원문은 읽기 전용. UI 는 기존 어댑터로만. `sajuAdapter.ts`(실재: `app/destiny-compass/_engine/adapters/`, `app/saju/animal-destiny/lib/`, `src/features/fortune-tea-house/lib/`)의 `calculateLocalResult()`·`normalizeSaju.ts` 손대지 않음.
- 사용자 문자열은 i18n 키(ko 정본 + en·ja·zh-CN·zh-TW 저작, 나머지 7개 로케일은 영어 복사 — 메모리 locale-i18n-pitfalls). 캐릭터 대사 템플릿도 키.
- 데스크톱 960px 회귀 금지. 애니메이션은 transform/opacity, 시간은 디자인 토큰만(`design-canon.md:45`).
- 저장 결과 포맷은 forward-fix-only: 기존 보관함·공유 링크 결과가 새 UI 에서 열려야 한다. 꿀꿀은 `/records/`, 영냥이는 `/yeongnyangi/library/` 분리 유지.
- 가격은 카탈로그 원본에서 읽는다(하드코딩 금지). 이용권·월정석·단건 용어 유지. 결제 동결 파일은 payment-freeze 절차.
- 새 분석 이벤트(`guided_*`, `result_cut_view`, `result_text_only_toggle`, `paid_guide_click`)는 `docs/analytics-kpi.md`·verify-analytics-events 인벤토리에 등록. verify ⑨ 는 `emit(` 래퍼를 못 잡으니 손으로도 대조.
- 정적 셸(index.html) 편집 시 `npm run sync:public` 후 미러 커밋. 검증은 `npm run check:fast` 1회, push 전 `npm run check:pre-push`.
- UI 작업은 headed 브라우저로 화면을 켜서 확인(메모리 ui-work-show-live-browser). 스크린샷 판정은 visual-checker 에이전트.
- 프로세스 종료는 PID 로만(`taskkill /IM` 금지). 스크래치는 `.tmp/` 에 두고 단계 끝에 지운다.
- 알려진 결함(보고만, 범위 밖): `index.html:17419` 가격 하드코딩, `CutReader.tsx` 말풍선 key 가 `line.text`(중복 대사 충돌), 자존감 타로 진입 불가(`index.html:31650` self-gated 목록 누락 후보), `/today/` 비로그인 안내 위치.

## 설계 요약 (스펙에서 확정된 것)
- 스텝 엔진: next/back/goTo, 단일 선택 450ms 자동 진행(재선택 시 리셋), 최소 대기 1.2s, 느린 대기 3s 문턱 대사, `?step=`·history state·새로고침 복원, 제목 포커스 + aria-live, 하단 고정 CTA(safe-area, 48px).
- 타로: 셔플 380ms×3 → 1.2s 진행(탭 스킵), 탭 선택→슬롯, 마지막 장 450ms 뒤 공개, 350ms 간격 뒤집기(탭 시 전부), 설정 객체 `TarotFlowConfig` 하나로 기능 차이 표현. 기준 = DailyTarot 골격 + TarotDrawRitual 단계·접근성 + 셸 78장 덱. 연애 타로 제외(D10).
- 웹툰 결과: `WebtoonCut`/`WebtoonLine`(`app/components/webtoon/CutReader.tsx`) 확장, 컷 opening/card/summary/step/closing, 원문 별도 보존, 글로만 보기, 면책 고정, 유료 안내 하단 1곳.

## 단계
- [ ] 3. 공통 스텝 플로우 엔진 — 위치 제안(재사용 유틸 먼저: `src/features/fortune-tea-house/lib/usePrefersReducedMotion.ts` 등) → 구현 → 개발 전용 데모(390·960px) → 단위 테스트(자동 진행 타이머·뒤로가기·reduced-motion·새로고침 복원) → perf:home 전후. 기존 기능에 연결하지 않음.
  - 3단계 남은 일(계획 §0): 미커밋 데모 `app/dev/guided-flow/{page.tsx,GuidedFlowDemo.tsx}` 커밋, 분석 이벤트 실제 발화 재측정(앞선 탐침 0건 — `cdTrack` 가로채기 경로부터 확인), check:fast → check:pre-push → main CI 1회 → push. 정리: 이전 dev 서버 PID 17632(PID 로만, 명령줄 확인 후), 워크트리 `D:\Development\codedestiny-worktrees\perf-guided-flow-20261120-033158` 를 main 체크아웃에서 `npm run worktree:remove -- <경로>`, `.tmp/` 내 이 작업 파일 삭제. perf:home 전 측정값: 성능 49, LCP 12127ms, TBT 185ms, CLS 0.145.
- [ ] 3b. 스텝 셸 달빛 예화 재스타일 + 대비(계획 §1·§2, GREEN 바로 진행). 대비 원인: `.flow` 에 표면 없이 분홍 `--cd-*` 글자 토큰 → `#0a0818` 위 제목 1.29:1. 브랜드 `data-brand` 꿀꿀/영냥이 사설 `--gf-*` 팔레트, 주아체 제목, 이중 테두리·꽃가지 마스크 재사용, `.cd-yehwa-button--primary`, 진행 막대 금빛. 검증: 새 `scripts/design/verify-guided-flow-contrast.cjs`(verify-home-funnel 패턴, 두 브랜드 × 360/390/430/960), 정적 테스트, measure:touch-targets, visual-checker.
- [ ] 3c. 서비스 전반 웨이브 계획 보고(계획 §3: A React 무료, B 정적 셸 무료, C 유료 입력 표현만; 결제·인증·DB 제외) → **사용자 승인 대기**. 5·6단계와 합쳐 진행.
- [ ] 4. 캐릭터 웹툰 결과 렌더러 — **계획 보고 후 승인 대기**(재사용/신규, 컷 데이터 구조, 수정 파일 경로).
- [ ] 5. 타로 UX 통합 — **계획 보고 후 승인 대기**(기능별 매핑표, 매핑 안 되는 고유 동작 목록, 기능 플래그 전환 방식).
- [ ] 6. 무료 운세 섹션 재구성 — **계획 보고 후 승인 대기**(화면 전/후, 리다이렉트 표, sitemap·SEO 동반 점검).
- [ ] 7. 레거시 정리(삭제) — **삭제 대상·제외 목록 보고 후 승인 대기**. `docs/context/legacy-tarot-free-ui.md` 기록 + CLAUDE.md 한 줄.
- [ ] 8. QA·성능·접근성 — `docs/context/free-tarot-ux-qa.md`.

## 결과 기록
(각 단계 에이전트가 커밋 SHA·검증 명령·출력 요약·남은 위험을 여기에 덧붙인다.)
