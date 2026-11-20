---
status: in-progress
updated: 2026-11-21
next: 5단계 3c-A5 영냥이 출석 운세 셸 이전(출석 게이트 현행 유지, 승인 대기 없이, 게이트·결제·로그인·DB·라우팅 경계 불변, 회귀 확인 후에만 push) — A4 에서 미룬 시코젠 포바일루 검토 포함 (W1 공용 출생 입력 완료 2026-11-21)
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
  - [ ] 3c-A5. 웨이브 A 마무리(플래그 정리 계획·건너뛴 흐름 재검토) 보고 → **사용자 승인 대기**.
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
  - main CI(push 전 1회): MAINCI_RESULT
- 롤백: `lib/guided-flow/flags.mjs` 의 해당 `GUIDED_BIRTH_*_ENABLED = false`(흐름별), 전체는 `git revert a9be008d1`(연결만) 또는 W1 커밋 전부.
- 남은 위험·후속:
  1. 셸 sticky CTA 가 실제로는 붙지 않음(기존 결함): 호스트 래퍼(`SeoLandingTemplate.jsx` main, 동물·별빛 포옹 페이지 래퍼)의 `overflow-hidden` 이 sticky 기준을 바꿔, 시각·확인 단계처럼 긴 단계에서 360×844 첫 화면에 "다음/확인"이 하단 내비(cd-mnav) 뒤에 놓임(무료 사주 시각·확인, 별빛 포옹 시각). 스크롤하면 누를 수 있음. 셸 CSS(`bottom: var(--cd-mnav-offset)`)는 맞음. 고치려면 공용 래퍼를 `overflow-x-clip` 류로 바꿔야 해 범위 밖 — 셸 공통 후속.
  2. A3 랜딩 안내 문구는 옛 순서를 설명하고, A3 순서가 바뀜(이름·성별 먼저).
  3. 날짜 범위가 1900~오늘로 좁아짐.
  4. 시진 칩 값의 야자시(23:30~) 경계.
  5. 숫자 칸 날짜는 `birthDateTextInputProps` 대신 `normalizeBirthDateInput` 으로 검증.
  6. 기존: `scripts/test-mobile-platform-journeys.mjs` 가 A3 이전 동물 입력을 기대.
  7. "3단계 vs 1/6" 문구(셸 공통, 기록만).
