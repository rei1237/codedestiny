---
status: in-progress
updated: 2026-11-21
next: 6단계 무료 운세 섹션 재구성 — 계획 보고 후 승인 대기(화면 전/후, 리다이렉트 표, sitemap·SEO 동반 점검). 3c-A5 완료 2026-11-21
---

# 무료 운세·타로·캐릭터 웹툰 결과 UX 개편 — 구현 계획 (3~8단계)

## 첫 행동
1. `git branch --show-current`(main)·`git status`·`git pull --ff-only`.
2. 이 문서의 "단계"에서 첫 미완료 항목을 연다. 그 단계의 원문 지시는 [단계별 프롬프트 원문](../prompts/2026-11-20-free-tarot-ux-revamp-stages.md)의 같은 번호 절이다. **원문은 참조용**이다(사용자 2026-11-20 "프롬프트 전체이니까 참조만해줘"). 아래 "원문과 저장소 규칙의 충돌"이 원문보다 앞선다.
3. 스펙 정본: [guided-step-flow-spec](../context/guided-step-flow-spec.md), [narrator-webtoon-result-spec](../context/narrator-webtoon-result-spec.md). 근거: [free-tarot-ux-audit](../context/free-tarot-ux-audit.md).

## 지금 상태
- 브랜치 main. 3·3b 완료, push `555117b3d`(2026-11-20). 3c-A1 완료, push `bb4a65b7d`(2026-11-20). 3c-A2 완료, 머지 `36543dc2a` push(2026-11-20). 3c-perf(가이드 셸 CSS 회귀 수정) 완료, 수정 `ebfd32bfd`·머지 `7eb4991b7`·원장 `bde984e7c` push(2026-11-20). 1·2단계 문서 커밋 `1a6e80eae`, `c93c999b7`, `858671988` push 완료.
- 3단계 로컬 커밋(push 전): `f4322b203` 컨트롤러(`lib/guided-flow/step-controller.mjs`), `d4c1fe4c5` 셸·훅·i18n(`app/components/guided-flow/`), `bd54671ef` 분석 이벤트 + verify ⑭.
- 4단계 완료, push `8be666800`(2026-11-21, 워크트리 `wt/webtoon-result-20261120-232459` 에서 main 직접 머지).
- 옆 세션 미커밋(건드리지 말 것): `.claude/skills/fire-your-seo-agency/`.

## 승인 상태 (원문·날짜)
- 2026-11-20 사용자: "권장안대로 승인, 구현 계획 진행해줘" → 1단계 감사, 2단계 스펙 D1~D13·N1~N7 의 **추천 열 확정**.
- 2026-11-20 사용자: "a2 진행" → 3c-A2 실행(직업 스타일·무료 사주 간편 폼·휴먼 디자인·숙요 달력·자미 명반 이전 시도 + 오늘의 세 장 "어제 카드 마저 보기" 복구). 로그인·결제·DB 닿는 흐름과 스텝 흐름 아닌 것은 건너뜀.
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
- [x] 3. 공통 스텝 플로우 엔진 — 위치 제안(재사용 유틸 먼저: `src/features/fortune-tea-house/lib/usePrefersReducedMotion.ts` 등) → 구현 → 개발 전용 데모(390·960px) → 단위 테스트(자동 진행 타이머·뒤로가기·reduced-motion·새로고침 복원) → perf:home 전후. 기존 기능에 연결하지 않음.
  - 3단계 남은 일(계획 §0): 미커밋 데모 `app/dev/guided-flow/{page.tsx,GuidedFlowDemo.tsx}` 커밋, 분석 이벤트 실제 발화 재측정(앞선 탐침 0건 — `cdTrack` 가로채기 경로부터 확인), check:fast → check:pre-push → main CI 1회 → push. 정리: 이전 dev 서버 PID 17632(PID 로만, 명령줄 확인 후), 워크트리 `D:\Development\codedestiny-worktrees\perf-guided-flow-20261120-033158` 를 main 체크아웃에서 `npm run worktree:remove -- <경로>`, `.tmp/` 내 이 작업 파일 삭제. perf:home 전 측정값: 성능 49, LCP 12127ms, TBT 185ms, CLS 0.145.
- [x] 3b. 스텝 셸 달빛 예화 재스타일 + 대비(계획 §1·§2, GREEN 바로 진행). 대비 원인: `.flow` 에 표면 없이 분홍 `--cd-*` 글자 토큰 → `#0a0818` 위 제목 1.29:1. 브랜드 `data-brand` 꿀꿀/영냥이 사설 `--gf-*` 팔레트, 주아체 제목, 이중 테두리·꽃가지 마스크 재사용, `.cd-yehwa-button--primary`, 진행 막대 금빛. 검증: 새 `scripts/design/verify-guided-flow-contrast.cjs`(verify-home-funnel 패턴, 두 브랜드 × 360/390/430/960), 정적 테스트, measure:touch-targets, visual-checker.
- [ ] 3c. 서비스 전반 웨이브 계획 보고(계획 §3: A React 무료, B 정적 셸 무료, C 유료 입력 표현만; 결제·인증·DB 제외) → **사용자 승인 대기**. 5·6단계와 합쳐 진행.
  - [x] 3c-A1. 웨이브 A 1차: `/today/` 오늘의 세 장 + `/tarot/healing/` 공통 셸 이전(플래그 2개), push `bb4a65b7d`(2026-11-20). 결과는 아래 "3c-A1 결과".
  - [x] 3c-A2. `/saju/free/` 무료 사주 간편 폼 공통 셸 이전(`GUIDED_FREE_SAJU_ENABLED`) + `/today/` "어제 카드 마저 보기" 복구. 직업 스타일·휴먼 디자인·숙요 달력·자미 명반은 사유와 함께 건너뜀. 머지 `36543dc2a` push(2026-11-20). 결과는 아래 "3c-A2 결과".
  - [x] 3c-perf. 가이드 셸이 소개 카드 CSS 를 import 해 `/saju/free/` 에 83KB 렌더 차단 공용 청크가 실리던 회귀 수정. 수정 `ebfd32bfd`, 머지 `7eb4991b7`·원장 `bde984e7c`(2026-11-20). 결과는 아래 "3c-perf 결과".
  - [x] 3c-A3. 12운성 동물(`/saju/animal-destiny/`) 입력 단계만 공통 셸 이전(`GUIDED_ANIMAL_DESTINY_ENABLED`). 운명 편향·연애 시뮬레이션·인연 장소·운명 나침반은 로그인/결제 게이트 때문에 건너뜀. 기능 `f6b5f2d86`(2026-11-21). 결과는 아래 "3c-A3 결과".
  - [x] 3c-A4. 별빛 포옹(`/yeon-star-hug/`) 입력만 공통 셸 이전(`GUIDED_STAR_HUG_ENABLED`). 심리 테스트·프롬프트 허브·크리스탈·FPTI·오라클(룬)은 게이트·DB·공유 러너 때문에 건너뜀, 시코젠은 A5로 미룸. 기능 `0042e6025`, main 머지 `fae848a18`(2026-11-21). 결과는 아래 "3c-A4 결과".
  - [x] 3c-A5. 영냥이 방 출석 운세 16종(`/yeongnyangi/room/`)을 공통 셸로 이전(`GUIDED_YN_FREE_FORTUNE_ENABLED`, 출석 게이트 현행). 시코젠 포바일루는 전체 화면 포털·크롬 라우트 설정 때문에 건너뜀. 기능 `2b2025761`(2026-11-21). 결과는 아래 "3c-A5 결과".
- [x] 4. 캐릭터 웹툰 결과 렌더러 — 2026-11-21 완료(플래그 `GUIDED_WEBTOON_RESULT_ENABLED`, `/today/` 오늘의 세 장 결과). 아래 "4단계 결과".
- [ ] 5. 타로 UX 통합 — **계획 보고 후 승인 대기**(기능별 매핑표, 매핑 안 되는 고유 동작 목록, 기능 플래그 전환 방식).
- [ ] 6. 무료 운세 섹션 재구성 — **계획 보고 후 승인 대기**(화면 전/후, 리다이렉트 표, sitemap·SEO 동반 점검).
- [ ] 7. 레거시 정리(삭제) — **삭제 대상·제외 목록 보고 후 승인 대기**. `docs/context/legacy-tarot-free-ui.md` 기록 + CLAUDE.md 한 줄.
- [ ] 8. QA·성능·접근성 — `docs/context/free-tarot-ux-qa.md`.

## 결과 기록
(각 단계 에이전트가 커밋 SHA·검증 명령·출력 요약·남은 위험을 여기에 덧붙인다.)

### 3·3b 결과 (2026-11-20)
- 커밋: `df5b9d92f` 데모, `dff3a6cb5` 예화 재스타일(CSS·셸·정적 테스트 `__tests__/ui/guided-flow-yehwa.static.test.mjs`), `97d2a70ef` 데모 브랜드 전환(`/dev/guided-flow/?brand=ggulggul|yeongnyangi`), `384084092` 대비 검사 `scripts/design/verify-guided-flow-contrast.cjs`, 병합 `555117b3d`(origin `d5f17a232` 흡수). push 완료(스테이징까지, 운영 승격 없음).
- 대비(`GUIDED_FLOW_ORIGIN=http://127.0.0.1:<port> node scripts/design/verify-guided-flow-contrast.cjs`, 2브랜드 × 연이·네오 × 360/390/430/960, 조상 배경 알파 합성): 전후 최솟값

| 요소 | 전(꿀꿀 분홍) | 후 꿀꿀 | 후 영냥이 | 기준 |
|---|---|---|---|---|
| 제목·히어로·뒤로 | 1.29 | 13.24~15.30 | 13.20~14.95 | 4.5 |
| 진행 글자·부제 | 2.52 | 8.42~9.73 | 9.04~10.25 | 4.5 |
| 눈썹 캡션 | 3.00 | 10.26 | 9.23 | 4.5 |
| 블록 경계(네오) | 1.90 | 3.23 | 4.02 | 3 |
| 진행 트랙(네오) | 1.44 | 3.23 | 3.55 | 3 |
| 진행 채움 대 트랙 | 4.12 | 3.67 | 3.56 | 3 |
| 선택지 테두리 / 빈 원 | — | 3.23 / 8.42 | 4.02 / 9.04 | 3 |
| 선택 상태 테두리 / 글자 | — | 11.86 / 11.22 | 10.46 / 10.92 | 3 / 4.5 |
| 시작 CTA 글자 | 6.59 | 11.86 | 13.69 | 4.5 |

  전: 실패 40건 → 후: 0건("guided flow contrast ok"). 정적 테스트는 변이(--cd-* 재선언+hex)에 2건 실패로 무는 것 확인.
- 분석 발화(탐침: init 스크립트로 `window.cdTrack` 선정의 + exposeFunction): 완주 시 guided_step_view·guided_step_complete(advance cta/auto)·guided_flow_complete, 이탈 시 guided_flow_abandon 모두 발화. 앞선 0건 원인 추정: 분석 동의 배너가 클릭을 가로채 진행이 안 됨(실측 로그로 확인, 원인 단정은 아님).
- 기타 검증: controller+정적 테스트 15/15, `verify-analytics-events` 통과, `verify:hero-contrast` 통과, `typecheck` 0 오류, `measure:touch-targets` 390×844 두 브랜드 — 셸 안 44px 미달 0(미달 3개는 사이트 하단 내비 손잡이·링크·푸터 정책 링크). `check:fast` 는 무관 테스트 `yeongnyangi-v7-checkpoint-import`(부하 중 60s spawn 타임아웃, 단독 재실행 통과)에서 멈춤. `check:pre-push` 는 옆 세션 미커밋 때문에 공유 체크아웃에서 판정 불가 → 깨끗한 임시 워크트리(555117b3d)에서 통과. main CI(d5f17a232) 녹색 확인 후 push.
- visual-checker: 포커스 링·색 외 선택 표시·폰트·영냥이 플로우 내 분홍 없음 통과. 지적 중 반영: 빈 원 2.71 → --gf-muted(8.42), 한국어 음절 줄바꿈 → keep-all. 오탐: 진행 막대 "없음"(DOM 실측 y172~178, 6px, 채움 101px 존재). 셸 밖(보고만): 데모 페이지가 꿀꿀 헤더·하단 내비 아래에 있어 영냥이에서도 꿀꿀 크롬이 보임(실제 영냥이 화면은 자체 셸), 960px 랜딩 캡션을 하단 내비 손잡이가 덮음, 요소 스크린샷에서 히어로 초승달 일부가 고정 헤더 아래.
- 남은 위험·미검증: perf:home 후 측정 미실행(셸은 `app/dev` 에서만 import — 운영 경로 영향 없음은 정적 근거). 영냥이 밤 마스크 CSS(`yehwa-night.generated.css` 12.6KB)를 셸이 import 하므로 웨이브에서 셸을 실제 화면에 붙일 때 번들 크기 확인 필요. 960 네오 스크린샷 판정 없음(대비 스크립트는 960 네오 포함).

### 3c-A1 결과 (2026-11-20) — `/today/` 오늘의 세 장 + `/tarot/healing/`
- 승인: 2026-11-20 사용자 "권장안대로 진행해줘" → 웨이브 A 1차(오늘 세 장·힐링 타로)를 공통 셸로 이전. 흐름마다 롤백 플래그 1개, `daily_tarot_*` 유지 + `guided_*` 추가. 영냥이 데일리 제외. 승인 아님: 셸/자존감 진입 라우팅, `app/_lib/free-reading-access.ts`·`hasFreeReadingSession`·`use-reading-identity-reset.ts`, 결제·인증·DB, 운영 승격.
- 커밋(워크트리 `wt/tarot-wave-a1-20261120-050512` → main 빨리감기, push `bb4a65b7d`, 스테이징까지):
  - `1db2ba6c3` 플래그 `lib/guided-flow/flags.mjs`(`GUIDED_DAILY_TAROT_ENABLED`·`GUIDED_HEALING_TAROT_ENABLED`, 둘 다 true — 롤백은 false 한 줄), 셸 `className`/`titleAs`, 영냥이 밤 예화 CSS import 를 셸에서 데모(`GuidedFlowDemo.tsx`)로 이동.
  - `2f67788ca` `app/today/DailyTarotGuided.tsx` + i18n 12로케일 + TodayHubClient 플래그 dynamic 교체.
  - `c370bea64` `app/components/SunHealingTarotGuided.tsx`(원본 `SunHealingTarot.tsx` 는 결과 본문·공유를 named export 로만 분리) + `TarotHealingClient.tsx` 플래그 교체.
  - `1ee383a89` 문서: `docs/analytics-kpi.md`(guided_* 에 daily_tarot `flow_id=yeoni-daily-three`, healing `feature_id=healing_tarot`·`surface=tarot_healing`·`flow_id=sun-healing-four`; `daily_tarot_*` 행 신설), `guided-step-flow-spec.md` §1-2 CTA 여백 10px(12px 토큰 없음) 정정.
  - `ef6221285` sitemap 원장 서명(today·healing), `3b20ff29b` 데일리 단계 history `replace`(아래 함정), `d737bf726` 힐링 결과 종이 표면(아래 visual-checker).
  - `c102b30c0`(dev 페이지 robots meta 2개 수정)은 옆 세션의 `198a289eb`·`2146fc0aa`(page.dev.tsx + pageExtensions)가 같은 문제를 먼저 고쳐 `7a7848dfd` 로 되돌린 뒤 병합. 그 CI 적색 원인은 이 문서 3단계 데모(`df5b9d92f`)였다.
- 함정(코드에 없는 결정): `/today/` 패널은 `accessGranted` 뒤에 있고 `useReadingIdentityReset` 이 모든 `popstate` 에서 접근을 초기화한다. 데일리 단계가 history 를 push 하면 브라우저 뒤로가기가 패널 전체를 지운다 → pick·reveal·result 는 `history:'replace'`, shuffle·reading 은 `none`. 정적 테스트(`__tests__/ui/guided-tarot-flags.static.test.mjs`)가 STEPS 마다 replace|none 과 리셋 훅의 `'popstate'` 존재를 문다. 힐링은 push 그대로(뒤로 = reveal→landing, 재마운트 없음).
- 검증(실측):
  - 헤디드 워크스루(chrome 채널, `/api/auth/me` 목, 360·960, 플래그 on/off): today 셔플→22장 선택→`?step=reveal`→결과 "오늘의 세 장", 저장 `cd:yeoni:daily-three:v1` = `{"version":1,"date":"2026-11-20","deck":[22],"picks":[0,5,10],"revealed":3}`(형식 동일). healing 셔플→reveal→"오늘의 회복 리딩". 가로 넘침 0. off 는 두 경로 모두 원본(가이드 마크업 0). 콘솔 오류는 목 401/501 뿐.
  - 터치 타깃(플로우 안 단계별 직접 측정, 360·960): today landing/pick(24)/result, healing landing/reveal/result 모두 44px 미달 0. `measure:touch-targets` 는 healing 360 미달 0, `/today/` 는 networkidle 타임아웃(세션 필요)이라 위 직접 측정으로 대체.
  - 대비: `GUIDED_FLOW_ORIGIN=http://127.0.0.1:25416 node scripts/design/verify-guided-flow-contrast.cjs` → "guided flow contrast ok: 2 brand(s) x 2 theme(s) x 4 widths". 힐링 결과 본문은 계산 스타일 합성 측정 최솟값 4.55(배지), 미달 0.
  - visual-checker 1차: 힐링 결과 카드 글자 1.14~1.65:1(원본 `bg-white/86` 류가 투명으로 계산돼 밤 셸 위에 어두운 잉크), 360 테두리 6겹으로 본문 열 130px, reveal 캡션 "황제 (역방향) · 역방향" 중복 → `d737bf726`: `.paperBody`(--gf-paper #fff2df), 겹 한 단 제거(본문 열 166px), stone-500 안내 4.34→잉크, 루틴 1열, 캡션 중복 제거. 2차 판정 대비 통과(본문 9.30, 배지 4.55).
  - 테스트: `check:fast`(tests 5487 fail 0, smoke:core 116/116), sitemap drift OK(1086 URL), `check:pre-push` 통과(병합 뒤 트리), 데모 페이지 테스트+플래그 테스트 7/7. main CI `2146fc0aa` 녹색 확인 후 push.
- perf:home(mobile, 3회 중앙값, 소음 큼, 원본 `D:\Development\Temp\code-destiny-perf\`):

| 경로 | Perf | FCP ms | LCP ms | TBT ms | CLS | 비고 |
|---|---|---|---|---|---|---|
| `/today/` 전→후 | 56→51 | 4377→6553 | 12402→11365 | 344→362 | 0.006→0.032(최대값은 양쪽 0.032) | 페이지 청크 133KB→74KB |
| `/tarot/healing/` 전→후 | 46→67 | 7911→3913 | 11215→5567 | 438→209 | 0.024→0.024 | |

- 예화 격리: `2489f509c69a9e96.css`(영냥이 밤 마스크)는 today·healing·ggulggul HTML 에서 참조 0. react-loadable 매니페스트상 체크아웃 CheckoutClient(기존)만 사용. 가이드 청크 CSS 는 `3eaf4321d1a8c5e8.css`(19KB)·`2353309c3c306e31.css`.
- SEO 동반 점검: SSR·H1·title/description 변경 없음(패널은 `ssr:false`, 랜딩 제목 `titleAs h2`), canonical·hreflang·robots·sitemap URL 변경 없음(원장 서명만 갱신), 내부 링크·이미지·광고 영향 없음. dev 데모는 옆 세션 수정으로 운영 빌드에서 제외.
- 남은 위험: 힐링은 새로고침 시 결과 유지 안 됨(원본과 같음). 데일리 가이드는 새 날에 "어제 카드 마저 보기" 선택지가 없음. 가이드 데일리는 웹만(토스 소유자는 원본). 데일리 브라우저 뒤로 = 페이지 이탈(단계별 뒤로 없음, 원본과 같음). 힐링 카드 뒷면은 단색 표면. 힐링 결과 360 카드 본문 열 약 160px(원본 구조의 이미지 옆 배치 유지, 보고만). 원본 `bg-white/86` 류가 투명으로 계산되는 것은 원본 화면에도 해당(밝은 배경이라 안 보임, 범위 밖 보고). `/today/` FCP·CLS 측정 소음.

### 3c-A2 결과 (2026-11-20) — `/saju/free/` 가이드 이전 + `/today/` 어제 카드 복구
- 승인: 사용자 2026-11-20 "a2 진행".
- 커밋(워크트리 `wt/guided-wave-a2-20261120-175421`, 기준 `34f58616f`): `4e4024696` fix(today) 어제 카드 마저 보기 복구(controller.restore, `.newDay` CSS, 12개 로케일, 테스트), `82f0470fb` test 원본 FreeSajuForm 동작 고정(이전 전), `77e4de87c` feat `FreeSajuGuided.tsx`·`FreeSajuEntry.tsx`(FLOW_ID `free-saju-chart`: date→calendar→time(선택)→computing→result, 플래그 `GUIDED_FREE_SAJU_ENABLED=true`, `guidedFlow.freeSaju` 12개 로케일, `docs/analytics-kpi.md`), `30325bd05` sitemap 원장 재서명. main 머지 `36543dc2a`, push `4f954a814..36543dc2a`.
- 건너뜀(사유): 직업 스타일 = `login()`·usePaidResume·authFetch·서버 저장 결과. 휴먼 디자인 = 차트 API requireAuth, 해석 DB 조회. 숙요 달력 = 월 탐색기라 선형 스텝 아님. 자미 명반 = `AdvancedZiweiSectionV2.tsx` 가 `docs/payments/payment-p0-inventory.json` 에 있고 유료 ZiweiDeepPdfPanel 을 마운트.
- 엔진·저장 키·URL·쿼리 변경 없음. 롤백: `lib/guided-flow/flags.mjs` 의 `GUIDED_FREE_SAJU_ENABLED=false`(원본 폼으로 복귀).
- 헤디드 실측(360·960): 플래그 켬 — 진입→결과 정상, 가로 넘침 0, 44px 미만 0, 결과에서 새로고침 시 `?step=result` "내 명식" 복원, 페이지 오류 0. 플래그 끔 — 원본 폼 렌더, 넘침 0, 오류 0. `/today/` — 새 날에 "어제 카드 마저 보기" 버튼 노출(360·960), 누르면 "세 장을 펼쳐요"로, 저장 날짜 유지.
- visual-checker: 가이드 켬/끔 PASS(라벨 9.73:1, 버튼 11.86:1, 기둥 15.30:1, 시작 버튼 281×48·590×48). today newday PASS(9.66:1, 버튼 약 158×46), today-360 재개 PASS.
- `GUIDED_FLOW_ORIGIN=http://127.0.0.1:31152 node scripts/design/verify-guided-flow-contrast.cjs` → "guided flow contrast ok: 2 brand(s) x 2 theme(s) x 4 widths".
- 관련 테스트 8파일 46/46 통과, typecheck exit 0.
- `node scripts/check-changed.mjs --profile=fast --skip-build --base=34f58616f`(critical 자동 승격): node 테스트 5537/5537, verify:* 통과. test:jest 는 두 번 모두 워커 exitCode=143(SIGTERM)으로 BLOCKED — 1차 `payments-v2.config-compat.test.js`, 2차 `admin-content-single-write-path.test.js`. 각각 단독 실행 2/2, 10/10 통과 → 부하로 인한 외부 종료로 판단(변경과 무관).
- `npm run check:pre-push`(머지 후 main) exit 0, sitemap:check OK(URL 1086). push 전 main CI(`4f954a814`) 성공, iOS Shell Build 만 진행 중.

| 경로(모바일, 3회 중앙값) | 성능 | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|
| `/saju/free/` 전(`34f58616f`) | 58 | 3415 | 11455 | 412 | 0.020 |
| `/saju/free/` 후(`30325bd05`) 1차/2차 | 39/41 | 7332/7391 | 12461/12358 | 798/693 | 0.019 |
| `/today/` 전 | 58 | 2635 | 13295 | 518 | 0.004 |
| `/today/` 후 1차/2차 | 47/50 | 6580/6557 | 11304/11590 | 479/369 | 0.032 |

- 성능 해석: `/today/` 는 전후 리소스·렌더 차단 CSS 목록이 같고 시뮬레이션 FCP 가 이봉형(전 `/saju/free/` 단독도 2559~7243) → FCP 차이는 코드 탓으로 볼 수 없음. `/saju/free/` 의 실제 차이는 렌더 차단 CSS 청크 `2353309c3c306e31.css`(83KB, A1 에서 생긴 가이드 CSS+ServiceIntroSection 묶음) 1개 추가. 부트업 스크립트 비용은 전후 같음, TBT 차이는 롱태스크 분할.
- SEO 동반 점검: `/saju/free/` title·description·H1("무료 사주·운세 모음", SeoLandingTemplate) 변경 없음, 가이드 랜딩은 h2, canonical·hreflang·robots·sitemap URL 변경 없음(원장 재서명만), 내부 링크·이미지·광고 영향 없음. `/today/` 는 원장 재서명만.
- 남은 위험: (1) `/saju/free/` 렌더 차단 CSS 청크 → 성능 점수 하락, 후보는 CSS 분리(힐링 `ssr:false` 도 청크를 참조하므로 단순 ssr:false 로는 안 풀림). (2) 가이드 무료 사주는 생년월일을 탭 범위 sessionStorage 스냅숏에 둠(원본은 저장 안 함). (3) 원본 폼(플래그 끔)의 기존 작은 타깃: SELECT 39px, INPUT 약 43px — 범위 밖 보고. (4) jest 143 종료는 부하 의심, CI 에서 재확인 필요. (5) dev 전용: Next "N" 배지 겹침, 하단 "다음" 바가 카드 아래 가장자리와 겹침(글자 가림 없음). (6) A3 대상은 게이트 경계가 섞여 있어 매핑표 단계에서 흐름별로 판정해야 함.

### 3c-perf 결과 (2026-11-20) — 가이드 셸 렌더 차단 CSS 회귀

- 원인(실측): `app/components/guided-flow/GuidedFlowShell.tsx` 가 히어로 장식(crest·halo·moon·sprig) 네 개를 위해 `app/components/ServiceIntroSection.module.css` 와 `service-intro/yehwaIntroMasks.generated.module.css` 를 import 했다. Next 가 이를 홈 CSS 와 묶어 84.8KB 공용 청크(`2353309c…css`) + 19.6KB 청크를 `/saju/free/` 에 렌더 차단 `<link>` 로 실었다. `/saju/free/` 렌더 차단 CSS 합: HEAD 1,027,780B → 수정 954,469B(두 청크 대신 31.2KB 가이드 청크) / 플래그 끔 923,308B.
- 수정: 장식 규칙 네 개를 `guided-flow.module.css` 로 옮기고(값 동일, 마스크의 `#000` 만 `black` — 정적 테스트가 hex 금지), 셸 전용 마스크 모듈 `app/components/guided-flow/guidedHeroMasks.generated.module.css`(덩굴·맺음 가지 두 장, 값은 소개 카드 마스크와 바이트 동일)을 생성기 `scripts/design/gen-yehwa-motifs.mjs` 에서 내도록 추가. 생성물 손편집 없음(`--check` up to date). 롤백은 `git revert ebfd32bfd`. 플래그는 세 개 모두 켬 유지.
- 성능(같은 기계, `scripts/measure-home-lighthouse.mjs --preset=mobile`, 중앙값):

| 빌드 | 경로 | 회수 | Perf | FCP ms | LCP ms | TBT ms |
|---|---|---|---|---|---|---|
| 수정 전 HEAD | /saju/free/ | 3 | 40 | 7328 | 12659 | 729 |
| 수정 후 | /saju/free/ | 3 | 41 | 7241 | 12000 | 701 |
| 플래그 끔(원본 폼) | /saju/free/ | 3 | 48 | 7173 | 12073 | 404 |
| 수정 후 | /saju/free/ | 5 | 41 (40–45) | 7235 | 12007 | 702 |
| 플래그 끔(원본 폼) | /saju/free/ | 5 | 41 (35–47) | 7292 | 12038 | 691 |
| 수정 전 HEAD | /today/ | 3 | 49 | 6552 | 11313 | 398 |
| 수정 후 | /today/ | 3 | 48 | 6564 | 11382 | 456 |
| 플래그 끔 | /today/ | 3 | 47 | 6621 | 11626 | 475 |
| 수정 전 HEAD | /tarot/healing/ | 3 | 47 (30–77) | 6170 | 7984 | 371 |
| 수정 후 | /tarot/healing/ | 3 | 51 | 7497 | 9500 | 327 |
| 플래그 끔 | /tarot/healing/ | 3 | 49 | 7624 | 9663 | 366 |

  참고(이 문서의 과거 값, 다른 시점·환경): A1 전 `/today/` 56·FCP 4377·LCP 12402·TBT 344, A1 전 `/tarot/healing/` 46·FCP 7911·LCP 11215·TBT 438, A2 전 `/saju/free/` 58·FCP 3415·LCP 11455·TBT 412, A2 전 `/today/` 58·FCP 2635. 오늘 같은 기계의 플래그 끔 빌드 FCP 가 약 7.2s 라 A2 전 58·FCP 3.4s 는 재현되지 않음 → 환경 잡음으로 판단. 판정은 같은 기계 플래그 끔 대비 동률(5회 중앙값 41 대 41).
- 검증: `verify-guided-flow-contrast.cjs` 통과(2 브랜드 × 2 테마 × 4 폭). 관련 테스트 39/39(daily-tarot-guided.behavior, guided-flow-dev-page, guided-flow-yehwa.static, guided-step-controller, guided-tarot-flags.static, home-yehwa-motifs.static) + free-saju-form·sun-healing-tarot behavior 8/8. 전후 스크린샷(꿀꿀·영냥이 데모, `/saju/free/`, 360·960) 픽셀 비교: 히어로 전부 0 차이, 장식 computed style 동일. visual-checker 8쌍 PASS(차이는 헤더 로고 래스터 노이즈뿐, 최대 4레벨). check:fast(base origin/main), check:pre-push 통과.
- SEO 동반 점검: URL·title·description·H1·canonical·robots·sitemap 영향 없음(CSS 이동만).
- 남은 위험: (1) Lighthouse 잡음이 큼(TBT 443–1056 범위). (2) `/tarot/healing/` 은 자체 ServiceIntroSection 때문에 `2353309c` 청크를 원래부터 실음(이번 변경과 무관, 기존). (3) 가이드 청크 31KB 가 `/saju/free/` 렌더 차단 CSS 로 남지만 성능은 동률. (4) `.flow` 의 영냥이 `--si-mask-*` 덮어쓰기는 헤더 `.masks` 에 가려 원래부터 효과 없음(동작 불변, 정리 후보). (5) 수정 전 HEAD 5회 측정은 안 함.

### 4단계 결과 (2026-11-21) — 캐릭터 웹툰 결과 렌더러

- 게이트 메모: 이 문서는 4단계를 "계획 보고 후 승인 대기"로 적었지만, 호출 세션 지시("구현 진행", N1~N7 승인)에 따라 플래그 뒤에서 바로 구현했다. 저장 형식·URL·엔진은 바꾸지 않았다.
- 만든 것
  - 화자 레이어 `lib/webtoon-result/narrator.mjs`: 결정적 템플릿(시드 `날짜:선택`), 표정 매핑, 같은 표정 3연속 금지 평활화(순차 적용 — 세 번째 같은 표정을 바꾼다는 가정), 대사 길이 교정(라틴 100자·CJK 60자, 거부 대신 자르기), 경고 카드(M18 등)는 serious.
  - 클라이언트 래퍼 `app/components/webtoon/NarratorWebtoon.tsx` + `narrator-webtoon.module.css`: 글로만 보기·글자 크기(48px 버튼, aria-pressed, localStorage `cd:webtoon:text-only:v1`·`cd:webtoon:font:v1`), 스크롤 진행 막대, IntersectionObserver 등장 모션(reduced-motion·IO 없음이면 정지), 이미지 후보 폴백, 이벤트 `result_cut_view`·`result_text_only_toggle`(docs/analytics-kpi.md 등록). 화자 팔레트: 연이 `--cd-nav-*`, 영냥이 `--yn-*`(새 hex·dark:·--cd-* 재선언 없음). sticky 툴바는 GlobalHeader 아래(66px/모바일 60px + safe-area).
  - CutReader(서버 컴포넌트 유지): 3단계 미결 해소 — key 를 `index-src`·줄 인덱스로(line.text 충돌 제거), source/label 줄, tone `guided`. reduced-motion 훅을 `app/hooks/usePrefersReducedMotion.ts` 로 공용화(차실 훅은 재수출).
  - 연결: `app/today/DailyTarotGuided.tsx` 결과 단계가 플래그 켜짐이면 연이 웹툰 + 에너지·사이 절 + ResultTail(유료 블록·PublicInsightCard·endingNote·FreeQuestionNext 그대로), 꺼짐이면 원래 마크업. i18n `guidedFlow.webtoon` 12개 로케일(ko·en·ja·zh-cn·zh-tw 저작, 나머지 en 복사). 데모 `/dev/webtoon-result/?narrator=`(page.dev.tsx, noindex, dev 전용).
- 커밋: `29ca06503` 훅 공용화·CutReader key, `e3eb63bce` 화자 레이어·i18n·테스트, `de993c7e3` 래퍼·플래그·/today/ 연결·KPI 문서, `7b156336e` 데모, `0205655c1` 원장, 머지 `7041074e6`, `8be666800` 로케일 sitemap lastmod(KST 날짜 넘어감). push 2026-11-21. 시각 결함 수정(툴바 sticky 오프셋·영냥이 선택 상태)은 `de993c7e3` 에 포함.
- 검증(실행함)
  - `node --test __tests__/ui/narrator-webtoon.test.mjs __tests__/ui/guided-tarot-flags.static.test.mjs` 15/15, `daily-tarot-guided.behavior` 4/4(결과 단언을 웹툰 컷·면책 문장으로 갱신).
  - check:fast: lint·sitemap-drift·typecheck·paid-gate-suite(78/0) 통과, test:node 1건 실패 — `yeongnyangi-v7-checkpoint-import.test.mjs` 60s 타임아웃(부하; 단독 재실행 2/2 통과, 이번 변경과 무관). 이전 회차의 `sky-and-range` 실패는 워크트리에 gitignore 된 `fortune/data` 가 없어서였고 `npm run fortune:build-data` 뒤 통과.
  - check:pre-push(머지 뒤 커밋 트리) 통과. main CI 는 push 전 1회 확인(직전 완료 PR CI success, 최신 진행 중).
  - 시각: dev 서버 + playwright, 데모 두 화자 × 360·960 + 글로만 보기 + 실제 `/today/?step=result`(브라우저 안에서만 `/api/auth/me` mock) 360·960. 7컷·숨은 컷 0·깨진 이미지 0·가로 넘침 0·버튼 48px. visual-checker: 본문 대비 15.3:1(연이)·14.95:1(영냥이), 면책 9.7:1, UI 외곽선 3.2~3.7:1. 지적 2건(영냥이 선택 버튼 1.13:1, 360 에서 sticky 툴바가 헤더 밑에 가림)은 수정 후 실측 재확인(툴바 top 60/66px, 헤더 아래 클릭 가능; 선택 상태 금 채움).
- SEO 동반 점검: 영향 없음. 결과는 `/today/` 안의 ssr:false 클라이언트 영역이라 title·description·H1·canonical·hreflang·robots·URL 불변. 데모는 dev 전용·noindex. sitemap 원장만 재생성.
- 미룬 것(스펙 범위, 저장 형식 불변): 유료 챕터 리더 적용, 이미지 저장·카카오 공유, 화자 선택 영속화.
- 없는 표정 그림(보고만): 연이 greet·worry, 영냥이 explain·worry·cheer·serious — `EXPRESSION_ART` 에서 가까운 표정 그림으로 대체(목록은 `MISSING_EXPRESSION_ART`).
- 남은 위험: (1) 실제 사용자 화면은 로그인 게이트 뒤라 실 세션 확인은 스테이징에서. (2) 롤백: `lib/guided-flow/flags.mjs` 의 `GUIDED_WEBTOON_RESULT_ENABLED = false`(원래 결과 마크업), 또는 `de993c7e3` revert. (3) 영냥이 화자는 데모에서만 쓰임 — 영냥이 서비스 연결은 5단계 이후.
- 회귀 점검 (2026-11-21, 사용자 요청 "이 변경으로 인해서 기존 기능들의 회귀가 없어야해" — push 뒤 사후 점검, 회귀 시 revert 전제)
  - 전체 node 스위트 `node scripts/run-mock-tests.mjs node`: 5577 중 5576 통과. 1건 `sky-and-range` 는 워크트리에 `fortune/data`(gitignore 생성물)가 없어서 실패했고, `npm run fortune:build-data` 뒤 7/7 통과(환경 원인).
  - jest(`run-mock-tests.mjs jest`): CutReader·reduced-motion 훅·결과 렌더러 소비 스위트 11개 272/272. apps/toss `node --test test/*.test.mjs` 1766/1766(워크트리에 `apps/toss/node_modules` 정션 필요).
  - 플래그 끔: `__tests__/ui/daily-tarot-guided.behavior.test.mjs` 에 테스트 추가(esbuild 로 `flags.mjs` 를 `GUIDED_WEBTOON_RESULT_ENABLED=false` 로 바꿔 빌드). 끔이면 원래 결과 '오늘의 세 장'·'자리별 읽기'이고 `[data-narrator]` 가 없음, 켬이면 연이 웹툰 → 5/5 통과.
  - 경계 불변: 4단계 커밋 diff 에 records·library(보관함 재열람)·결제·이용권·인증·worker·API·라우트 파일이 없다. 새 페이지는 dev 전용 `app/dev/webtoon-result/page.dev.tsx` 뿐이고, DailyTarotGuided 의 storage·router·href 는 바뀌지 않았다. 새 속성 `data-line`·`data-cut-index`·`data-source` 를 잡는 기존 CSS·JS 셀렉터는 0개(rg). 훅 본문은 그대로 옮기고 다시 내보냈다.
  - before/after 화면: before=`9f17a69fe`, after=`0f92a7d74`, dev 서버, reduced-motion, 10페이지(love-secret·entry-webtoon·fortune/today/aries·heukwol·saju/crystals·fortune-tea-house·today·tarot/healing·saju/free·yeongnyangi) × 360·960 = 20장. 상태·H1·title·canonical·robots·텍스트 해시가 20/20 같다. 픽셀은 0% 가 17장이다. 차이가 난 3장은 visual-checker 판정으로 회귀가 아니다.
    - heukwol-360(22%): 늦게 로드되는 웹툰 이미지가 캡처 순간에 로드됐는지의 차이이고, 패널 좌표와 높이는 같다. 같은 커밋을 재촬영해도 13.5% 차이가 난다.
    - today 360/960(0.15%·0.07%): Next dev "N" 배지 차이. 재촬영끼리는 0%.
### 3c-A3 결과 (2026-11-21) — 12운성 동물 이전, 4개 흐름 건너뜀

요청 원문(2026-11-21): "그리고 이 변경으로 인해서 기존 기능들의 회귀가 없어야해" → 플래그 끔 원본·경계 diff·전후 화면 비교 후에만 push.

| 흐름 | 경로·정본 | 판정 | 사유 |
|---|---|---|---|
| 12운성 동물 | `/saju/animal-destiny/` `AnimalDestinyPage.tsx` | **이전** (`GUIDED_ANIMAL_DESTINY_ENABLED`) | 입력(히어로+입력 카드)만 셸로 교체: 생년월일 → 양/음/윤달 → 시각(선택) → 성별(선택 안 함 포함) → 이름(선택) → 계산 → 원래 결과 화면. 결과·다시 하기·유료 풀이(store.calculate → loadPaid → `/api/saju/section`, 로그인/잠금 표시) 그대로 |
| 운명 편향 | `/saju/destiny-bias/` `DestinyBiasClient.tsx` | 건너뜀 | compute() 안 로그인 게이트(hasFreeReadingSession), usePaidResume, useFreeReadingGuard(popstate 취소가 셸 history 와 충돌), 세션 초안·최근 결과 저장. 이미 자체 단계형 |
| 연애 시뮬레이션 | `/saju/love-simulation/` `LoveSimulationEngine.tsx` | 건너뜀 | 제출 경로가 `signedIn` 필수(onLogin), usePaidResume(LOVE_CODE_FEATURE_KEY), useFreeReadingGuard |
| 인연 장소 | `/saju/destiny-meeting-place/` | 건너뜀 | 제출 경로에 usePaidResume(FEATURE_KEY)·useFreeReadingGuard, 유료(5,000원) 이력 |
| 운명 나침반 | `/destiny-compass/` `CompassApp.tsx` | 건너뜀 | usePaidResume 4개 grant·심층 리포트 유료, 선형 폼이 아닌 RPG 지도 여정, compat-result-archive 저장 |

- 커밋: 기능 `f6b5f2d86`, 원장 `515a5519a`, origin/main 머지 `39783288c`, 원장 재생성 `e7dfda82a` (+ 이 문서 커밋, main 머지).
- 파일: 새 `app/saju/animal-destiny/components/AnimalDestinyGuided.tsx`(ssr:false 동적 로드), `AnimalDestinyPage.tsx`(플래그 3항·히어로/입력/로딩 게이트·useBackNavigation enabled), `lib/guided-flow/flags.mjs`, `public/i18n/*/guidedFlow.json` 12개(`animalDestiny` 블록, ko/en/ja/zh-CN/zh-TW 저작·나머지 7개 영어), `docs/analytics-kpi.md`, 테스트 `__tests__/ui/animal-destiny-guided.behavior.test.mjs`(4건, 실제 zustand 스토어)·`guided-tarot-flags.static.test.mjs`(A3 정적 1건).
- 검증(실측):
  - `npm run check:fast`: lint·sitemap·paid-gate-suite 78/0 통과. test:node 3건 실패 → sky-and-range 는 워크트리 `fortune/data` 부재(`npm run fortune:build-data` 뒤 통과), yeongnyangi v7 golden·invariance 는 부하 타임아웃(단독 재실행 9/9). 첫 실행은 verify:sitemap-drift 차단 → `sitemap:generate` 원장 커밋.
  - `npm run typecheck` 0 오류. node --test 동물/관련 69/69, guided+animal+calendar-authority+pricing 94/94, jest run-mock-tests 3 스위트 535/535, verify-analytics-events 통과.
  - 대비: `verify-guided-flow-contrast.cjs` "2 brand(s) x 2 theme(s) x 4 widths" ok. visual-checker 픽셀 대비 최저 8.42:1(본문), 입력 테두리 3.23:1, CTA·다음 48px, 선택은 테두리 2px+체크 아이콘.
  - 플래그 끔/켬(임시 false, 복구 후 clean): `/saju/animal-destiny/` title·H1 "운명의 동물 도감"·canonical·robots 동일, 360/960 가로 넘침 없음, 끔은 원본 입력 카드. visual-checker sharp 비교: 위 490px(H1 카드 포함)·푸터 차이 0, 바뀐 곳은 히어로/입력 자리뿐. `/saju/free/`·`/today/` 360/960 차이 0px(360 /today/ 88px 는 dev "N" 배지).
  - 렌더 차단 CSS: SSR 링크(layout·AnimalDestinyPage 청크·page.css) 켬/끔 동일. 늘어난 42,088B(dev)는 지연 로드되는 AnimalDestinyGuided 청크뿐, ServiceIntroSection 청크 없음.
  - 실제 페이지 걷기 360/960: ?step=result 도달, 원래 결과·"다른 생년월일로 테스트하기" 표시, 넘침 없음.
  - 경계 diff: records·library·결제·이용권·월정석·auth·worker·api·라우트·리다이렉트·wrangler·.env·package-lock 변경 0. 페이지 diff 에 href/router/storage/fetch/loadPaid 변경 없음, 가이드 컴포넌트에 router/fetch/api/Storage 직접 사용 없음.
  - SEO: page.tsx 무변경(H1·title·canonical·robots 동일), 가이드 패널은 ssr:false·랜딩 h2, sitemap 원장만 재생성. 그 외 항목 영향 없음.
- 롤백: `lib/guided-flow/flags.mjs` 의 `GUIDED_ANIMAL_DESTINY_ENABLED = false` 또는 `git revert f6b5f2d86`.
- 남은 위험: (1) 가이드 흐름은 생년월일을 탭 범위 sessionStorage 스냅숏에 둠(원본은 스토어 메모리만). (2) 결과에서 뒤로 가면 `?step=time` 으로 감(결과는 닫힘, A2 와 같은 history 패턴). (3) 저장된 프로필은 시각·이름만 미리 채움(선택 단계는 select 가 자동 진행하므로 제외). (4) 360 에서 다크 카드가 직각·무테(셸 정본이 48rem 미만 풀블리드 설계, A2 와 동일 — 부모 20px 여백 때문에 떠 보임, 셸 공통 후속 과제). (5) 랜딩 안내 "3단계" 문구와 진행 표시 "1/6" 불일치 가능 — 문구 정리 후속. (6) dev 결과 화면의 "전체 풀이를 불러오지 못했어요" 는 로컬에 `/api` 워커를 띄우지 않은 탓으로 추정(원본도 같은 loadPaid 경로, 미검증). (7) check:fast 부하 타임아웃 반복.

### 3c-A4 결과 (2026-11-21) — 별빛 포옹 이전, 나머지 건너뜀·미룸

요청 원문(2026-11-21): "그리고 이 변경으로 인해서 기존 기능들의 회귀가 없어야해" → 플래그 끔 원본·경계 diff·전후 화면 비교 후에만 push.

| 흐름 | 경로·정본 | 판정 | 사유 |
|---|---|---|---|
| 별빛 포옹(연이의 마음 별자리) | `/yeon-star-hug/` `YeonStarHugClient.tsx` | **이전** (`GUIDED_STAR_HUG_ENABLED`) | 무료·게이트 없음. 히어로만 셸로 교체: 감정 → 생년월일·시각·이름(선택, 저장 프로필 선택) → 별자리 확인(생년월일 자동 매칭) → 고민 한 줄(선택, 예시 문장) → 읽는 중 → 원래 입력 패널+결과. 값의 정본은 원본 상태, 리딩은 원본 `runConsultation` 1회. 읽기 전용 astro fetch 는 원본 `applyProfileAndAstro` 안에 그대로 |
| 크리스탈 | `/saju/crystals/start/` | 건너뜀 | 저장 프로필 카드 필수(없으면 `/#dpMasterCard` 리다이렉트), `loadServerCrystalRecord`/`saveServerCrystalRecord`(authFetch, DB 쓰기), 이어하기·후속 분기 |
| FPTI | `/saju-fpti/` | 건너뜀 | useFreeReadingGuard(popstate 취소가 셸 history 와 충돌), usePaidResume, hasFreeReadingSession, 유료 `/api/fpti/deep-report` |
| 프롬프트 허브 | `/fortune/prompt-hub/` | 건너뜀 | PromptHubLoginGateModal, useCoinGate, usePaidResume, `/api/honey/attendance` 호출 |
| 심리 테스트 | `/psychotest/` | 건너뜀 | 22개 맞춤 문항 렌더러(이미 한 화면 한 문항). TestPlayer 를 토스 미니앱과 공유(toss prop·뒤로 처리·결과 저장) → 회귀 위험 큼 |
| 오라클: 룬 | — | 건너뜀 | useCoinGate(유료) |
| 오라클: ifa·royal-tea·hwatu-life | 정적 셸 FeatureLandingPage | 웨이브 B | React 흐름 아님. `hwatu-life/play` 는 리다이렉트 |
| 오라클: 시코젠 포바일루 | — | **A5 로 미룸** | 전체 화면 createPortal 의식 UI 가 셸 sticky CTA 와 충돌. 설계 검토 필요 |

- 커밋: 기능 `0042e6025`, 머지 `0238051cc`, 원장 `6c46a8817`, 두 번째 머지 `fae848a18`(push, `2951df80c..fae848a18`) + 이 문서 커밋.
- 파일: 새 `app/yeon-star-hug/YeonStarHugGuided.tsx`(ssr:false 동적 로드), `YeonStarHugClient.tsx`(CRLF; 플래그 3항, 히어로 null, 그리드는 결과 단계에서만, `guidedSetters` 가 원본 검증·정규화 통과), `lib/guided-flow/flags.mjs`, `public/i18n/*/guidedFlow.json` 12개(`starHug` 블록, ko/en/ja/zh-CN/zh-TW 저작·나머지 7개 영어), `docs/analytics-kpi.md`(`feature_id=yeon_star_hug`), 테스트 `__tests__/ui/star-hug-guided.behavior.test.mjs`(3건)·`guided-tarot-flags.static.test.mjs`(A4 정적 1건), `config/sitemap-lastmod.json`.
- 검증(실측):
  - `npm run check:fast` exit 0(세 번째 실행): lint, sitemap, typecheck 0 오류, test:node 5593/0, 유료·verify 단계, build:worker, jest 488 스위트 8382 통과/1 건너뜀. 앞선 실행: verify:sitemap-drift 차단 → `sitemap:generate`; sky-and-range 실패는 워크트리 `fortune/data` 부재(`npm run fortune:build-data` 뒤 7/7).
  - 대상 테스트 node --test 14/14(머지 뒤 12/12 재확인). `npm run check:pre-push` 두 머지 뒤 모두 exit 0.
  - 실제 페이지 걷기(dev, 켬) 360/960: 감정 → 생년월일 → 별자리(자동 황소자리) → 고민 → `?step=result`, 원래 결과(이름 표시), 가이드 제목 없음, 가로 넘침·페이지 오류 0, 새로고침 시 결과 복원.
  - 플래그 끔(임시 false, 복구 후 clean) 360/960: 원본 화면, title "연이 별빛 상담 | 꿀꿀 운세", H1 "연이의 마음 별자리"(page.tsx, 켬에서도 동일), canonical·robots 켬/끔 동일, 넘침 없음.
  - 렌더 차단 CSS: SSR 켬/끔 모두 layout.css 하나 933,935B 동일. 가이드 CSS(~40KB dev)는 동적 import 로 지연 로드, ServiceIntro CSS 없음.
  - visual-checker(off/on 360/960 + 단계 화면): 본문 대비 최저 5.95:1(예시 문장), 나머지 8.4~13.2:1, UI 테두리 3.23:1·진행 막대 3.67:1, CTA·선택지 48px, FAQ·푸터 등 아래 영역 픽셀 동일(360 1,492줄·960 994줄), 결과 화면에 단계 UI 잔존 없음. 지적된 "본문 왼쪽·위 밀림"은 재측정 결과 Playwright 가 쿠키 배너에 가린 버튼을 누르려 `overflow-x-hidden` main 을 스크롤한 측정 착시: JS 클릭·`focus()` 는 (0,0), 배너를 닫으면 모든 단계 main scroll (0,0). 원본(끔)도 같은 main 구조. 히어로 일러스트·빈 결과 안내 카드가 랜딩에서 빠진 것은 의도(셸 랜딩이 대체, 결과 단계에서 원본 그리드 표시).
  - `verify-guided-flow-contrast.cjs` 는 이번에 미실행(셸 CSS 무변경; visual-checker 픽셀 대비로 대신).
  - 경계 diff: records·library·결제·이용권·월정석·auth·worker·api·라우트·리다이렉트·wrangler·.env·package-lock·page.tsx 변경 0. 부모 diff 에 href/router/storage/fetch 없음, 가이드 컴포넌트에 router/fetch/api/Storage 없음.
  - SEO: page.tsx 무변경(H1·title·canonical·robots 동일), 가이드 랜딩 h2·ssr:false, sitemap 원장만 재생성. 그 외 항목 영향 없음.
  - main CI(push 전 1회): `4296cfaf1` PR CI success. push 뒤 CI 는 다음 push 전 1회 확인.
- 롤백: `lib/guided-flow/flags.mjs` 의 `GUIDED_STAR_HUG_ENABLED = false` 또는 `git revert 0042e6025`.
- A3 후속 "3단계 vs 1/6": 기록만. progressSteps 가 wait 단계를 세므로 고치면 모든 흐름의 셸 동작이 바뀜 → 셸 공통 후속 과제.
- 남은 위험: (1) 생년월일·이름이 탭 범위 sessionStorage 스냅숏에 남음(원본은 메모리). (2) 결과에서 뒤로 가면 별자리 단계로 감(replace history, A2·A3 와 같은 패턴). (3) 가이드에서는 기본 감정(calm)을 미리 고르지 않아 사용자가 직접 골라야 함. (4) 시각 입력은 원본 BirthTimeInput 이 아니라 네이티브 time input. (5) 감정·별자리·예시 문장 라벨은 원본 데이터 그대로 한국어만. (6) check:fast 부하 타임아웃 반복 가능.

### 3c-A5 결과 (2026-11-21) — 영냥이 출석 운세 16종 이전, 시코젠 건너뜀

요청 원문(2026-11-21): "서비스 기능에 회귀는 없어야해" + "영냥이 출석 게이트 현행" → 새 플래그, 끔·게스트·잠김은 원본 그대로. 출석·멸치·열기·읽기 호출·결과 본문은 원본이 맡는다.

| 흐름 | 경로·정본 | 판정 | 사유 |
|---|---|---|---|
| 영냥이 출석 운세 16종 | `/yeongnyangi/room/` `app/yeongnyangi/_components/FreeFortune.tsx` | **이전** (`GUIDED_YN_FREE_FORTUNE_ENABLED`) | 16종이 열린 로그인 사용자에게만: 랜딩 → 분야(16종, 2열/넓으면 4열) → 질문(선택, 분야 단서 `details`, 출생 분야는 위 프로필 필요) → 읽는 중(원본 `read` 1회) → 결과(원본 상자 안 원본 `Reading`/시간 질문 상담 + 아래 "다른 분야 고르기"). 오늘 이미 읽은 분야·시간 질문(horary)은 원본처럼 질문 폼 없이 결과로 |
| 오라클: 시코젠 포바일루 | — | 건너뜀 | 전체 화면 createPortal(z 2147483000)과 AppChrome CHROMELESS 라우트 목록(크롬·라우트 설정 변경) 필요, 단계별 CTA·모달이 셸 sticky CTA 와 충돌, 연이 핑크 의식 UI |

- 출석 게이트 불변: 출석 막대·멸치 잔고·"멸치 N마리 건네기"·열기·`/api/yeongnyangi/*` 호출은 원본 그대로. 플로우판(`FreeFortuneGuided.tsx`)은 fetch·authFetch·`/api` 0(정적 테스트로 고정). 401 이면 원본 `fail` 이 게스트로 바꿔 플로우판이 내려가고 원본 게스트 화면.
- 파일: 새 `app/yeongnyangi/_components/FreeFortuneGuided.tsx`(ssr:false 동적 로드)·`FreeFortuneGuided.module.css`(새 hex 0, `--gf-*`/`--yn-*` 만), `FreeFortune.tsx`(CRLF 유지; 플래그 3항, `read` 가 boolean 반환, guided 일 때 칩·폼 대신 결과 단계에서만 원본 결과, 섹션 `width:100%` — guided 일 때만), `lib/guided-flow/flags.mjs`, i18n `ynFreeFortune` 12개(ko/en/ja/zh-CN/zh-TW 저작, 나머지 영어), `docs/analytics-kpi.md`(flow_id `yn-free-fortune`, feature_id `yn_free_fortune`, surface `yeongnyangi_free`).
- 함정(코드에 없는 것):
  - `.ynOriginal button{border:0;background:none;color:inherit}`(0,1,1)가 셸 선택지·주 버튼 모듈 클래스(0,1,0)를 이긴다 → 슬롯 범위 덮어쓰기(`.slot button[aria-pressed]`, `.slot :global(.cd-yehwa-button--primary)`).
  - `.ynOriginal .free-fortune` 스타일(모바일 margin 14 등)이 그 클래스 붙은 모든 요소에 번진다 → 슬롯은 그 클래스를 쓰지 않는다.
  - 원본 상자는 폭 지정 없이 내용 폭(max-width 940, margin auto)이라 칩 줄이 빠지면 960 에서 619px 로 줄었다(visual-checker FAIL) → guided 일 때만 `width:100%;box-sizing:border-box`. 셸 기본 `--gf-max` 40rem 도 슬롯에서 `max-width:none`.
  - JSDOM 테스트는 동작 줄이기(matchMedia true)라 선택 자동 넘김이 없다 → 고른 뒤 "다음".
- 커밋: 기능 `2b2025761`, origin/main 머지, 원장 `4924038de`·`131107013`·`dba901959` + 이 문서 커밋. `git push origin HEAD:main` 로 착지(이 문서 커밋 포함). push 후 CI 는 다음 push 전 1회 확인
- 검증(실측):
  - 테스트 node --test: yn-free-fortune-guided 4/4(정상 흐름·실패 시 질문 복귀·이미 읽은 분야/시간 질문 바로 결과·프로필 없으면 막힘), guided-tarot-flags.static 11/11(A5 추가), 기존 yeongnyangi-free-fortune 3/3. tsc 0 오류.
  - `npm run check:fast -- --base=origin/main`: 첫 실행은 sitemap 원장 드리프트만 차단(app 편집 → 서명 5개), `sitemap:generate` 후 재실행 exit 0(critical 승격, jest 489 스위트/8435 통과·1 skipped). 유료 게이트 묶음 78/0.
  - `npm run check:pre-push`: origin/main(1dbb5450e) 재머지 후 커밋 트리에서 통과(exit 0). 머지로 들어온 W2 `FREE_RESULT_GUEST_ENABLED` 게스트 문구 줄과 자동 병합, 머지 후 A5 테스트 15/15·기존 3/3 재통과
  - 실제 페이지(dev, `/api/yeongnyangi/*` mock, 쿠키 배너 닫음, headed) 360/960 × 열림·잠김·게스트 × 켬/끔: 켬+열림만 플로우판(랜딩 1, 원본 칩 0), 잠김·게스트는 켬/끔 모두 원본 칩. 켬 걷기 분야 → 타로 → 질문 → 읽기 → `?step=result`, 원본 Reading 본문 표시.
  - visual-checker: 잠김·게스트 켬/끔 픽셀 차이 0(4쌍). 원본 상자 폭 켬=끔(960 24–920, 360 0–344), 플로우 카드·결과 행동 카드도 같은 폭(수정 후 재판정 PASS). 대비 최저 9.04:1(placeholder), 선택지 테두리 4.04:1, CTA 11.29:1 이상. 선택 상태(굵은 금 테두리+체크) 확인. 핑크 없음.
  - 렌더 차단 CSS(dev 첫 HTML stylesheet 합): 켬/끔 동일 3개 1,648,846B. 플로우 CSS 는 동적 import 로 뒤에 로드.
  - 경계 diff: worker·api·결제·이용권·월정석·auth·records·`/yeongnyangi/library/`·라우트·리다이렉트·wrangler·.env·package-lock 변경 0.
  - SEO: `/yeongnyangi/room/` 는 noindex. page·metadata·H1·canonical·robots 무변경, 랜딩 제목 h2·ssr:false, sitemap 원장 서명만 재생성. 그 외 항목 영향 없음.
  - main CI(push 전 1회): push 전 1회 확인: PR CI `a7157025e` success, 재머지 직전 main 머리 `1dbb5450e` PR CI success(gh run watch 44841172563 exit 0)
- 롤백: `lib/guided-flow/flags.mjs` 의 `GUIDED_YN_FREE_FORTUNE_ENABLED = false` 또는 `git revert 2b2025761`.
- 남은 위험·후속:
  1. 360 에서 아래쪽 줄 분야를 고르면 450ms 자동 넘김 전까지 sticky "다음" 이 그 칩 아래 절반을 가린다(셸 공통 동작).
  2. 분야를 바꾸면 원본이 그날 읽기를 비동기로 불러오므로, 이미 읽은 분야는 질문 화면이 잠깐 보였다가 결과로 넘어갈 수 있다.
  3. 새로고침하면 고른 분야·단계는 스냅숏으로 복원되지만 질문 글은 빈다(정본은 원본 draft 메모리, 원본도 새로고침하면 빈다). 질문 글은 sessionStorage 에 남지 않는다.
  4. 360 칩 라벨 길이 차이로 1~2줄 높이가 섞인다("기본 운세"·"사주/명리학").
  5. 동작 확인은 mock 기준. 스테이징 실응답(출석·읽기)은 미검증.

### W1 공용 출생 입력 결과 (2026-11-21)

요청 원문(2026-11-21): "서비스 기능에 회귀는 없어야해" → 흐름별 새 플래그, 끔이면 기존 가이드 입력 그대로. 결과·저장·엔진·URL 불변.

- 만든 것: `app/components/guided-flow/birth/`(GuidedBirthSteps.tsx·birth-steps.ts·guided-birth.module.css). 이름(선택) → 성별 → 생년월일(연·월·일 숫자 칸, 자동 넘김·즉시 검증) → 양력·음력·윤달 → 시각(12지 시진 칩 + 직접 입력 + "시간을 몰라요") → 장소(선택, BirthPlaceInput, 비우면 서울 경도) → 확인 요약(항목별 수정). SavedBirthProfilePicker·birthTimeInput 재사용. 셸 보강: `step-controller.mjs` `mergeAnswers`, `GuidedFlowShell` `ctaLabels`.
- 연결(장소 단계는 세 곳 모두 생략): A2 `/saju/free/`(`GUIDED_BIRTH_FREE_SAJU_ENABLED`), A3 `/saju/animal-destiny/`(`GUIDED_BIRTH_ANIMAL_DESTINY_ENABLED`), A4 `/yeon-star-hug/`(`GUIDED_BIRTH_STAR_HUG_ENABLED`). 셋 다 `true`. 각 호스트는 `STEPS = FLAG ? BIRTH_STEPS : LEGACY_STEPS`.
- 개발 데모: `/dev/guided-flow/birth/`(`page.dev.tsx`, dev 서버에서만, noindex, `?brand=yeongnyangi`).
- i18n: `public/i18n/*/guidedFlow.json` 12개 `birth` 블록(ko/en/ja/zh-CN/zh-TW 저작, 나머지 7개 영어).
- 커밋: `71fae3587` 준비, `2bd5d766d` 묶음, `a9be008d1` 연결, `9745946a6` 데모, `3eb09f6db` 수정 버튼 테두리 대비, origin/main 머지, 사이트맵 원장 커밋 + 이 문서.
- 검증(실측):
  - 테스트 node --test: guided-birth-steps 5/5, free-saju-form 6/6, animal-destiny-guided 6/6, star-hug-guided 5/5, guided-tarot-flags.static 10/10(불린 플래그·LEGACY_STEPS 계약), guided-flow-dev-page 3/3, guided-step-controller 통과. `npx tsc --noEmit` exit 0.
  - `npm run check:fast -- --base=<origin/main 머지 기준>` exit 0(세 번째 실행): lint, typecheck, test:node 5620/0, 유료 게이트 묶음 78/0, build:worker, jest 8427 통과/1 건너뜀. 앞선 실행 차단 2건: (1) verify:sitemap-drift → `sitemap:generate` 원장 커밋, (2) sky-and-range 는 워크트리에 `fortune/data` 가 없어서 → `npm run fortune:build-data` 뒤 7/7. 브랜치 위 기본 check:fast 는 HEAD 기준이라 "변경 없음" 으로 끝나므로 `--base` 필요.
  - 대비(합성 측정): 출생 묶음 2브랜드 × 연이/네오 × 360/390/430/960 전부 통과(본문 4.5·UI 3). 꿀꿀 확인 요약 수정 버튼 테두리 2.79 → 금 테두리로 10.26. `verify-guided-flow-contrast.cjs` "guided flow contrast ok: 2 brand(s) x 2 theme(s) x 4 widths".
  - 실제 걷기(dev, 360/960, 쿠키 배너 닫음): 세 흐름 모두 켬/끔에서 `?step=result` 도달, pageerror 0. 결과 본문 텍스트 켬/끔 동일 — 비로그인 6/6, 로그인(저장 프로필 있음) 6/6. 저장 프로필 선택 시 A3·A4 는 확인 요약으로 바로 이동, 별빛 포옹 결과에 "저장달/1988". 무료 사주는 원본처럼 프로필 선택기 없음.
  - visual-checker(before=끔/after=켬, 360/960, 비로그인·로그인): 결과 화면 12쌍 동일·깨짐 없음, 랜딩 동일, 입력 단계 넘침·잘림 없음, 대비 8.36~9.73:1. 가로 넘침: scrollWidth = 화면 폭(360/960).
  - 렌더 차단 CSS(dev, 첫 HTML stylesheet 합): 켬/끔 동일 — `/saju/free/` 1,047,800B(5개), `/saju/animal-destiny/` 970,406B(3개), `/yeon-star-hug/` 933,935B(1개).
  - 경계 diff(`git diff origin/main...HEAD --stat`): 결제·이용권·월정석·auth·records·library·worker·api·라우트·리다이렉트·wrangler·.env·package-lock 변경 0.
  - SEO: 공개 page.tsx·metadata·H1·canonical·robots 무변경, 데모는 dev 전용·noindex·사이트맵 밖, 사이트맵 원장만 재생성. 그 외 항목 영향 없음.
  - main CI(push 전 1회): **빨강, 남의 커밋 때문** → W1 은 push 하지 않음. `b354e1e0c`(paid-retry 머지) Critical checks `verify:mongo-query-index-shapes` 실패(`worker/lib/fusion-fortune-recovery-task.js:85,156` 선두 키 불일치), `0531128af`(W4 문서) Static guards `verify:pig-sprite-crop` 실패(`app/components/master-motion/MasterMotion.module.css:76` `calc(100% / var(--mm-n))`). origin/main `96b4a4564` 에서도 로컬 재현. W1 은 두 파일을 건드리지 않음. 브랜치 `wt/guided-birth-w1-20261121-033459` 는 커밋 완료·origin/main 머지 완료 상태로 남김 — main 이 초록이 되면 그 브랜치를 main 에 ff 머지·push.
  - 착지(2026-11-21): main 녹색(PR CI 44821709664, eb947a11f) 확인 뒤 origin/main 재머지·대상 테스트 47/47·check:pre-push 통과, `3b4a4500e` 로 main push. 워크트리 배수.
- 롤백: `lib/guided-flow/flags.mjs` 의 해당 `GUIDED_BIRTH_*_ENABLED = false`(흐름별), 전체는 `git revert a9be008d1`(연결만) 또는 W1 커밋 전부.
- 남은 위험·후속:
  1. 셸 sticky CTA 가 실제로는 붙지 않음(기존 결함): 호스트 래퍼(`SeoLandingTemplate.jsx` main, 동물·별빛 포옹 페이지 래퍼)의 `overflow-hidden` 이 sticky 기준을 바꿔, 시각·확인 단계처럼 긴 단계에서 360×844 첫 화면에 "다음/확인"이 하단 내비(cd-mnav) 뒤에 놓임(무료 사주 시각·확인, 별빛 포옹 시각). 스크롤하면 누를 수 있음. 셸 CSS(`bottom: var(--cd-mnav-offset)`)는 맞음. 고치려면 공용 래퍼를 `overflow-x-clip` 류로 바꿔야 해 범위 밖 — 셸 공통 후속.
  2. A3 랜딩 안내 문구는 옛 순서를 설명하고, A3 순서가 바뀜(이름·성별 먼저).
  3. 날짜 범위가 1900~오늘로 좁아짐.
  4. 시진 칩 값의 야자시(23:30~) 경계.
  5. 숫자 칸 날짜는 `birthDateTextInputProps` 대신 `normalizeBirthDateInput` 으로 검증.
  6. 기존: `scripts/test-mobile-platform-journeys.mjs` 가 A3 이전 동물 입력을 기대.
  7. "3단계 vs 1/6" 문구(셸 공통, 기록만).

## W4 마스터 모션 결과 (2026-11-21)

요청 원문: "각 전문가, 대표 상담에서 설정된 마스터들이 움직이거나 주변에 꽃이 휘날리는 효과를 주도록해줘 현재 이미지 생성은 어렵기 때문에 바로 안되더라도 후속으로 진행가능하도록해주면 좋겠다" / "서비스 기능에 회귀는 없어야해"

- 커밋: c038f3980 (코드·미러·문서), 이 기록 커밋은 그 다음.
- 만든 것: `app/components/master-motion/MasterMotion.tsx`(+module.css), `lib/master-motion/flags.mjs`(`MASTER_MOTION_ENABLED`), 홈 `js/core/yehwa-home.mjs` 의 `mountMasterMotion`(같은 이름 상수, 스타일은 JS 로 늦게 주입 — 렌더 차단 CSS 불변), 후속 그림 규격 `docs/design/master-motion-assets.md`.
- 적용: ProductMasterStrip 아바타(꽃잎 3), MasterProfile 소개장·초상(꽃잎 6; 대표 상담 3종 연애 비책·신년운세·인생의 책 + 전문가 상담 소개장), ExpertCharacterStage inline·loading(기존 breathe 재사용, 겹침 없음; result 는 PDF 캡처라 제외), 홈 기본 마스터 카드 4장(꽃잎 4씩).
- 동작: transform·opacity 키프레임만, JS 애니메이션 루프 없음, useSpritePlaybackGate(화면 안·탭 보임·reduced-motion 아님)일 때만 꽃잎 DOM 생성, absolute·pointer-events:none·aria-hidden. 영냥이 변형(금빛 별가루, 분홍 없음)은 구현했으나 이번 대상 화면은 전부 꿀꿀 쪽이라 아직 쓰는 곳 없음.
- 후속 그림 훅: `motion?: { frames?, video?, poster }` — MasterProfileData·ProductMaster 타입, 레지스트리 `components/fortune/master-profiles.ts` 주석. 빠진 표정 그림: 연이 greet·worry, 영냥이 explain·worry·cheer·serious.
- 검증(실측, dev 서버 360·960, 쿠키 배너 닫음):
  - 플래그 OFF: 마스터 모션 요소 0, reduce 기준 화면과 픽셀 차이 0~0.15%(이미지 로딩 잡음).
  - 플래그 ON+reduce: 꽃잎 0, 기준 화면과 픽셀 차이 0~0.105% → 레이아웃 동일.
  - 플래그 ON+no-preference: 꽃잎 DOM love 6/12·newyear 6·lifebook 6·astro 3·홈 16; CLS 는 OFF 와 같음(기존 값, 모션 기인 없음).
  - visual-checker 18장 PASS(꽃잎이 초상 밖·글자·배지 위로 넘치지 않음, 이동 ≤2px). 홈 꽃잎은 8px 라 캡처에서 못 잡았으나 계산 스타일로 표시 확인(on, opacity .85, 분홍→금).
  - 렌더 차단 CSS: index.html·yehwa-home.css 변경 0줄(sync 가 바꾼 것은 og 이미지 build 해시뿐). App Router 는 MasterMotion.module.css 3,984B(해당 라우트 청크).
  - diff 경계: 결제·이용권·보관함·인증·라우트 파일 변경 없음.
  - check:fast : critical 승격, paid-gate 78/0·lint·typecheck·sitemap(ledger 재생성 후)·남은 26단계(test:jest 포함) 통과. test:node 1건 실패는 fortune/data/daily-2026-11-21.json 부재(발행 cron 산출물, git 미추적) — 날짜 의존 기존 실패, 이 변경과 무관 / check:pre-push 통과(머지 후 커밋 트리).
  - 미검증: perf:home 전후(dist 빌드 필요 — 이 작업에서는 돌리지 않음), 실기기 저사양 합성 비용.
- 롤백: `lib/master-motion/flags.mjs`·`js/core/yehwa-home.mjs` 의 `MASTER_MOTION_ENABLED=false`(+ `npm run sync:public`) 또는 c038f3980 `git revert`.
- 남은 위험: 저사양 기기 합성 비용; 꽃잎이 그려질 때 컴포지팅 레이어로 소개장 목록 글자 AA 가 서브픽셀→그레이스케일로 바뀜(가독성 영향 없음); 후속 그림이 들어오면 용량·디코딩 재측정.

### W4 CI 수선 (2026-11-21) — verify:pig-sprite-crop

- 원인: c038f3980 의 `MasterMotion.module.css` `.frames img { width: calc(100% / var(--mm-n)) }`. `--mm-n` 이 TSX 인라인 style 에서만 정해지고 같은 CSS 파일에 단위 없는 선언이 없어, 가드가 나눗셈 우변의 단위 없음을 증명하지 못해 실패(구형 엔진의 길이÷길이 무효화 사고 방지 가드 — 가드는 정상 대상, 수정하지 않음).
- 수선: `.frames` 에 `--mm-n: 1;` 단위 없는 기본값 선언. 인라인 style 이 같은 요소에서 덮으므로 프레임·CSS 모션 동작 불변. `sitemap:generate` 로 원장 서명 9개 갱신(lastmod 날짜 변동 없음).
- 검증: verify:pig-sprite-crop OK(스타일시트 299개), check:fast --base=origin/main, check:pre-push.

## W2 비회원 무료 결과 (2026-11-21)

승인 원문(2026-11-21, AskUserQuestion): "무료 결과만 비회원 (권장)" — 무료 결과는 로그인 없이, 개인정보 동의 유지, 보관함 저장·유료 풀이는 로그인. 요청 원문: "서비스 기능에 회귀는 없어야해".

- 커밋: W2 코드·미러 커밋과 이 기록 커밋(아래 git log 의 `feat(saju): W2 …` 다음).
- 사전 확인: 정적 무료 사주 결과는 클라이언트 계산(KASI 공개 데이터, 서버 인증·DB 쓰기 없음). React `/saju/free/`(FreeSajuGuided·computeFreeSaju)는 원래 비회원 사용 가능.
- 구현: `js/saju-engine.js` `var FREE_RESULT_GUEST_ENABLED = true;` + `lib/guided-flow/flags.mjs` 같은 이름 상수(단위 테스트가 두 값 일치 강제). `ensureSajuResultSession` 은 세션 확인(`/api/auth/me`)을 그대로 하고, 켬이면 guest·unavailable 도 통과. 비회원 결과 뒤엔 `guestResult` 표시가 붙은 입력 초안(기존 `cd:saju-login-draft:v1`, 1시간)을 남기고, 결과가 보이는 동안 열리는 공용 로그인 모달(`__cdOpenLoginRequiredModal`)의 복귀 주소를 `?action=cdOneStepFreeSajuEntry` 로 바꿔 로그인 뒤 같은 결과를 다시 계산해 보여 준다(돌아온 비회원에게는 안내 문구 없이 입력만 복원). `free_saju_started.signed_in` 은 실제 세션 상태. 저장·상세·유료 잠금(`_dpGateLockFeature`, unlockPremiumFeature, 결제창)은 손대지 않음.
- 문구: `FreeFortune.tsx`, `/yeongnyangi/1000-won-fortune/`, `/compare/fortune-apps/` 의 "로그인 후 결과" 문구를 플래그 조건으로 바꿈.
- 검증(실측):
  - 단위 `__tests__/ui/saju-result-login.test.mjs` 14/14(플래그 끔 기존 7건 그대로 + 켬 7건).
  - E2E `npm run verify:saju-result-login`(CI 배선 유지): 끔 360/390/430/1280 로그인 벽·취소 복원·mock 로그인 재개 그대로, 켬 360/960 비회원 결과 표시·초안 `guestResult`·로그인 모달→`next` 에 action→복귀 뒤 같은 결과·초안 삭제.
  - visual-checker(쿠키 배너 닫음, 360·960 전후 8장) 전부 PASS: 끔 로그인 모달 잘림 없음, 켬 비회원 결과 카드·탭·코스믹 영역이 끔(mock 로그인 재개) 결과와 같은 레이아웃, 모달·배너·가로 넘침 없음, 로그인 복귀 뒤 같은 결과. 첫 캡처는 로딩 오버레이(결과 표시 뒤 약 2초) 중에 찍혀 실패 → E2E 대기 조건을 상태 문구·오버레이 해제까지로 고쳐 재캡처.
  - diff 경계: 결제·이용권·보관함·워커·인증·라우팅 파일 변경 없음.
  - check:fast(critical 승격): paid-gate 78/0·lint·sitemap(원장 서명만 갱신, lastmod 불변) 통과. 처음 걸린 `saju-bundle-copy` 가드(주석의 "무료 사주" 표기)는 "무료 만세력"으로 고쳐 통과. test:node 남은 실패는 W2 무관: `sky-and-range`(fortune/data/daily-*.json 부재, build-data 로 생성 후 해소)·`yeongnyangi-v7-golden`·`v7-checkpoint-import`(60초 타임아웃 — 스크립트 단독 47초 성공, 병렬 세션 node 33개 부하). check:pre-push 통과.
  - SEO: 결과는 비공개 상태 화면이라 noindex/robots 변경 없음. 공개 페이지 문구 2곳만 바뀜(title·description·H1·canonical 불변). `/compare/fortune-apps/` 의 `SEO_SERVICE_SCOPES_UPDATED` 날짜는 올리지 않음.
- 롤백: 두 상수 `FREE_RESULT_GUEST_ENABLED=false` + `npm run sync:public`(끄면 초안 형식·이벤트·모달이 이전과 같음) 또는 W2 커밋 `git revert`.
- 남은 위험: 회원가입 전환 감소; 무료 사주 `fortune_login_required` 가 거의 0(docs/analytics-kpi.md 에 기록); 코인·결제 401 내부 `_cdPromptLogin`·AI 상담 `redirectToLoginForFortune` 은 결과 복귀 주소로 바뀌지 않음(원래 주소로 복귀); mock 환경 결과 화면 하단 "일시적인 오류" 토스트는 플래그 끔에서도 동일(기존, W2 무관 — 미조사).
- push 보류(2026-11-21): main PR CI(44815999399, 8e676e4be)가 Static guards "sprite crops" 가드로 red — `app/components/master-motion/MasterMotion.module.css:76` `calc(100% / var(--mm-n))`(W4 c038f3980). W2 무관. W4 수정으로 main 이 녹색이 된 뒤 이 브랜치를 main 에 머지·push 하고 워크트리를 배수한다.
- 착지(2026-11-21): W4 수선 뒤 main 녹색 확인, W1(`3b4a4500e`)·W3 포함 origin/main 재머지(handoff·CONTEXT_AUDIT·flags.mjs 충돌은 양쪽 유지, sitemap 원장은 재생성), 대상 테스트·check:pre-push 통과 뒤 이 기록이 든 머지 커밋으로 main push. 워크트리 배수.

## W3 메인 인기 TOP5 결과 (2026-11-21)

요청 원문: "도화서원처럼 내 서비스의 메인 화면에도 실제 인기 순위 TOP5가 나오도록해주고" / "서비스 기능에 회귀는 없어야해". 승인(2026-11-21): "최근 30일 실제 구매 수 (권장)".

- 커밋: c83762154(API·워커·테스트), fa256e125(섹션·미러), 05ee18768(문서·원장), b0d5126f7(높이·셸 썸네일·폭 수선), 21248891f(원장). origin/main 머지 후 push 3a8cc40ff. 이 기록 커밋은 그 다음.
- 만든 것
  - `GET /api/popular-services`(`worker/routes/popular-services.js`, `worker/index.js` 지연 라우트): `ops_revenue_facts` 읽기 전용 aggregate(xpState counted·refundState none·netKRW>0·paidAt 최근 30일·등록 featureKey 만) → featureKey 별 건수 → 3건 이상만 `source:"sales"`, 부족분은 큐레이션 순서로 `"curated"` 채움. 응답 `{asOf, windowDays:30, items:[{featureKey, rank, source}]}` — 건수 비공개. DB 쓰기·새 컬렉션 없음.
  - 캐시: `readCmsThroughCache` 키 `popular-services:v1:<KST 날짜>`(하루 스냅샷, isolate 메모+caches.default, TTL 1일·stale 3일), 실패 시 전날 키 stale 폴백, 그것도 없으면 503 `{ok:false, items:[]}` no-store. 성공 `public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400`.
  - 등록부 `js/core/popular-services.mjs`(15개 대표·유료 상담, 이름·주소·그림은 service-registry 와 같게 — 드리프트 테스트 있음), 렌더러 `js/core/popular-top5.mjs`(`POPULAR_TOP5_ENABLED`, 높이 484px 예약, 스타일은 늦게 주입), `/` 는 `app/components/PopularTop5.tsx`(HomeCardDeck 아래), `/ggulggul/` 는 `yehwa-home.mjs` 가 `.yh-situations` 뒤에 끼움. 판매 자리 순위 숫자, 부족분 "추천" 배지 + "최근 30일 구매 기준 · M월 D일 기준" 라벨, 섞이면 안내 한 줄. 한국어 셸·웹에서만(해외 로케일·앱 셸 미표시).
  - 분석: `popular_top5_click {rank, source, service_id, surface}` — docs/analytics-kpi.md. 기존 `select_item`·`home_section_click` 위임 리스너와 겹치지 않게 그 속성들을 쓰지 않음.
  - 문서: docs/CONTEXT_AUDIT.md(design-canon §5 와의 충돌·해소), docs/context/design-canon.md 예외 한 문장.
- 검증(실측)
  - 워커 테스트 8/8(판매 순위·건수 비노출·전부 추천·당일 캐시·503·전날 stale·405·필터·등록부 드리프트), UI 테스트 3/3, 홈 UI 103/103.
  - build:worker + verify:worker-size OK(gzip 6.23 MiB / 10 MiB).
  - paid-gate-auditor PASS(verify-payment-freeze 통과), regression-scout 지적 5건(분석 3중 발화·해외 노출·앱 셸·cdTrack 정규식·주석 경로) 모두 수정.
  - dev 서버 360·960(쿠키 배너 숨김, API mock): 판매·추천·실패·플래그 OFF. 높이 모든 상태 484px(첫 측정에서 섞인 경우 482px 로 늘어 452→484 로 올림). 실패 시 섹션 없음(fail-closed). 플래그 OFF 요청 0·섹션 0. scrollWidth 가로 넘침 없음.
  - 플래그 OFF ↔ W3 이전 베이스(0531128af) 픽셀: `/` 360·960 차이 0. `/ggulggul/` 은 실행마다 페이지 높이가 두 값 중 하나로 바뀌는 기존 비결정성(베이스도 같음) — 같은 높이끼리는 차이 0.
  - 렌더 차단 CSS 바이트 ON = OFF(`/` 링크 2개 1,150,452B, `/ggulggul/` 47개 2,070,484B + 인라인 2,061,557B).
  - SEO: H1·title·canonical ON/OFF 동일(`/`·`/ggulggul/`). 새 공개 URL 없음(API 는 sitemap 대상 아님).
  - visual-checker 2차 PASS(ggulggul 썸네일 44×29 → 44×44, 셸 폭 640 → 930 맞춤, 배지 정렬 수선 뒤). 대비 9.6:1·7.9:1·7.4:1.
  - diff 경계: 결제·이용권·보관함·인증·라우팅 파일 변경 없음(새 API 라우트만).
  - check:fast: test:node 1건 실패 = fortune/data/daily-2026-11-21.json 부재(W4 와 같은 날짜 의존 기존 실패). check:pre-push 통과(최종 머지 트리).
  - 기존 실패(베이스에서도 동일, 이 변경과 무관): `scripts/design/verify-yehwa-home.mjs` 가 없어진 `.yh-entry[data-cd-service-id="saju"]` 를 기다리다 시간 초과, `__tests__/ui/home-service-separation.test.cjs` 의 `.yh-concerns` 0개.
  - 미검증: perf:home(dist 빌드 필요, 돌리지 않음), 스테이징 실응답(빈 DB 면 전부 "추천" 예상), 실데이터 순위.
- main CI: push 전 확인 시 73f61631 진행 중(직전 8e676e4b 실패는 W4 sprite-crop 가드, 0f8009f2b 로 수선됨). 내 push 3a8cc40ff 의 CI 는 미확인.
- 롤백: `js/core/popular-top5.mjs` 의 `POPULAR_TOP5_ENABLED=false` + `npm run sync:public`(섹션·요청 모두 사라짐, API 는 남아도 호출 없음) 또는 위 커밋들 `git revert`.
- 남은 위험: API 실패 시 예약한 484px 가 접혀 아래 내용이 한 번 올라감(첫 화면 아래); DB 장애 동안 503 no-store 라 요청마다 aggregate 재시도; `verify-public-api-edge-cache` 목록에 새 라우트 미포함; `source:"sales"` 는 3건 이상 판매를 함의(정책상 공개 허용 범위 확인 필요); curated 만일 때 약 60px 빈 여백(예약 높이 때문, 의도).

## 영냥이 홈 무료 배너 제거 (Codex 48fbf2277 적용) (2026-11-21)

요청 원문: "코덱스에서 수정한 영냥이 화면에서는 무료 라이트 운세 화면이 없도록한 변경도 적용해줘" / "서비스 기능에 회귀는 없어야해".

- 적용: Codex 클론 `D:\Development\Temp\yeongnyangi-no-promo-20261120` 의 48fbf2277 을 cherry-pick -x(작성자 유지) → c92607bda. `app/yeongnyangi/_home/FortuneHome.tsx` 에서 `<FreePromoBanner variant="yeongnyangi" compact/>` 와 import 제거, `__tests__/ui/free-promo.test.mjs` 갱신. sitemap 원장은 충돌 → `sitemap:generate` 로 재생성(영냥이 5개 URL 서명만 변경, lastmod 변화 없음).
- 유지: `FreePromoBanner` 컴포넌트, `/`(app/page.js)·`/ggulggul/`(정적 셸 `.cdh-promo`)·SeoLandingTemplate 배너, Room.tsx `<FreeFortune/>` 16종 무료 운세. 로케일 영냥이 홈은 `LocalizedFortuneHome` 이라 원래 배너가 없었다(서명만 바뀜). Codex "moonlit room and mascot" 커밋은 적용하지 않음.
- 분석: 배너에 노출·클릭 이벤트가 없어 analytics-kpi.md 변경 없음.
- 검증: 관련 node 테스트 41/41, check:fast --base=origin/main 통과(첫 회 fortune/data 날짜 파일 부재 1건 → fortune:build-data 뒤 통과), dev 서버 360·960 전후 visual-checker PASS(배너만 사라지고 레이아웃 정상, 가로 넘침 없음). `/`·`/ggulggul/` 배너 남아 있음 확인. title·H1·canonical 전후 동일.
- 롤백: `git revert c92607bda`.

## 6단계 계획 (2026-11-21) — 무료 운세 한 목록

승인 범위(호출 세션 전달, 사용자 2026-11-20/21): 4~8단계는 단계별 승인 없이 진행하되 **라우팅·리다이렉트·삭제·결제·로그인·DB 변경은 사용자 승인 먼저**, "서비스 기능에 회귀는 없어야해". 그래서 6단계는 두 갈래로 나눈다.

### 지금 만드는 것 (리다이렉트·삭제·결제·로그인·DB 변경 없음)
- 목록 카드화: 홈 `/`(app/page.js)와 SeoLandingTemplate 무료 랜딩에 같이 쓰는 `FreePromoBanner` 의 "무료 운세 전체 보기" 펼침(지금은 이름+화살표 칩 23개)을 카드 목록으로 바꾼다. 카드 = 고정 비율(3:2) 포스터 + 기능명 + 한 줄 설명 + "무료" 배지 + 소요 시간(표시용 추정), 카드 전체가 링크(48px 이상). 링크 주소·`data-cd-free-promo-item`·`aria-current` 는 칩과 같다(`freePromoItemHref`). 무료 기간은 배너 상단 한 곳(기존 `until`)만.
- 표시 데이터: `lib/marketing/free-promo.mjs` 에 항목별 포스터·한 줄 설명·분(`FREE_PROMO_CATALOG`), 무료 판정은 계속 `free-fortune-policy.mjs`. 포스터는 기존 `public/images/service-introductions/*-320.webp` 를 쓰고, 없는 사주 재미 항목·궁합·일 스타일은 기존 `public/fuctionassets/*` 원본에서 320px 썸네일을 만든다(`public/images/free-list/`).
- 롤백 플래그 `GUIDED_FREE_LIST_ENABLED`(`lib/guided-flow/flags.mjs`). false 면 칩 마크업 그대로(오늘과 동일).
- i18n: 새 키 `freePromo.desc.<id>`·`freePromo.freeBadge`·`freePromo.minutes` (ko·en·ja·zh-CN·zh-TW 저작, 나머지 7개 en 복사), `i18n/authored/freePromo-02.json` → `public/i18n/*.json`.
- 손대지 않음: 정적 셸 `/ggulggul/` 배너(`templates/home-funnel.html` → `index.html` `.cdh-promo`), 기능별 흐름 내부, 결과 화면, 워커·API·결제·이용권·인증·DB·보관함·라우트·sitemap 대상 URL.

### 건너뛰는 것 (이유)
- 기능별 플로우 신규 이전: React 무료 흐름(`/today/`·`/tarot/healing/`·`/saju/free/`·12운성 동물·별빛 포옹·영냥이 출석)은 3c 웨이브에서 이미 공통 셸이다. 정적 셸 자미·숙요·베다·점성(`cdHome*Entry` 공통 프로필 폼)·셸 3장 타로는 프로필 저장 로그인과 셸 러너를 공유하고 5단계(타로 통합) 계획이 아직 승인 전이라 이번에 옮기지 않는다.
- 정적 셸 `/ggulggul/` 무료 목록 카드화: 아래 승인 목록 R1(요약 카드 축소)과 함께 다룬다(같은 화면을 두 번 바꾸지 않기 위해).

### 사용자 승인이 필요한 것 (실행하지 않음)
| # | 대상 URL / 화면 | 변경 | 이유 | 위험 | 롤백 |
|---|---|---|---|---|---|
| R1 | 새 공개 URL `/free/`(가칭) + 홈 `/` 배너·`/ggulggul/` "지금 무료로 시작"·"엔진별 기본 풀이"·#cdQuickServices | 목록 단독 페이지 신설, 기존 세 영역을 그 페이지로 가는 요약 카드 1장으로 축소 | 원문 6-1 "한 화면 한 경로", 감사 A1(같은 무료 기능이 5군데 노출) | 새 색인 URL·sitemap·원장·hreflang 12로케일, 홈 첫 화면 구성 변경(전환·perf:home), 정적 셸 미러 7개 | 페이지·요약 카드 플래그 false 또는 커밋 revert, sitemap 재생성 |
| R2 | `/?action=cdOneStepFreeSajuEntry`(section 없음)·`/ggulggul/?action=cdOneStepFreeSajuEntry` | React 가이드 흐름 `/saju/free/` 로 클라이언트 매핑 | 무료 사주 진입 형식 셋(감사 A2) | 셸 결과의 섹션(재미 카드·궁합)과 결과 범위가 다름 → 같은 결과가 아님, 외부 링크 동작 변화 | 매핑 표 한 줄 제거 |
| R3 | `/compatibility` → `/index.html?action=runCompat`·`?section=compatCard`·`/saju/compatibility/` | 내부 링크를 한 곳으로 모으고 나머지 301/클라이언트 매핑 | 궁합 링크 3분산(감사 A2) | `/compatibility` 는 지금 SEO 랜딩(색인, hreflang) — 301 시 색인 이동 | `_redirects`/매핑 한 줄 revert |
| R4 | `/tarot/<slug>` 운영 301→302 이중 리다이렉트, `/tarot/mingri`·`?action=openTarotModal`·`cdHomeTarotEntry`·`/tarot/mingri/play` | canonical 하나로 수렴 | 감사 A2 | 5단계 타로 통합 결정에 의존, 워커 `public/_worker.js` 라우팅 | 워커·`_redirects` revert |
| R5 | `/ggulggul/?action=cdHome{Ziwei,Sukuyo,Vedic,Astro}Entry` | 새 플로우로 매핑 | 원문 6-3 | 대상 React 가이드 흐름이 아직 없음 → 흐름을 먼저 만든 뒤에만 의미 | — |
| L1 | `/today/`·`/manse/` 비로그인 결과 | 로그인 없이 무료 기본 결과 | 원문 6-4, 감사 결함 #3 | 인증 경계(`app/_lib/free-reading-access.ts`), D12/W2 와 같은 RED | 플래그 false |
| D1 | `FreePromoBanner` 칩 마크업·`.chips` CSS | 삭제 | 플래그 안정 뒤 죽은 코드 | 7단계 삭제 목록에 넣고 3면 확인 | `git revert` |
