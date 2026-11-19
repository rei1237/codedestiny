---
status: in-progress
updated: 2026-11-20
next: 웨이브 A 나머지 16개 매핑표 보고 → 사용자 승인 대기
---

# 무료 운세·타로·캐릭터 웹툰 결과 UX 개편 — 구현 계획 (3~8단계)

## 첫 행동
1. `git branch --show-current`(main)·`git status`·`git pull --ff-only`.
2. 이 문서의 "단계"에서 첫 미완료 항목을 연다. 그 단계의 원문 지시는 [단계별 프롬프트 원문](../prompts/2026-11-20-free-tarot-ux-revamp-stages.md)의 같은 번호 절이다. **원문은 참조용**이다(사용자 2026-11-20 "프롬프트 전체이니까 참조만해줘"). 아래 "원문과 저장소 규칙의 충돌"이 원문보다 앞선다.
3. 스펙 정본: [guided-step-flow-spec](../context/guided-step-flow-spec.md), [narrator-webtoon-result-spec](../context/narrator-webtoon-result-spec.md). 근거: [free-tarot-ux-audit](../context/free-tarot-ux-audit.md).

## 지금 상태
- 브랜치 main. 3·3b 완료, push `555117b3d`(2026-11-20). 3c-A1 완료, push `bb4a65b7d`(2026-11-20). 1·2단계 문서 커밋 `1a6e80eae`, `c93c999b7`, `858671988` push 완료.
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
- [x] 3. 공통 스텝 플로우 엔진 — 위치 제안(재사용 유틸 먼저: `src/features/fortune-tea-house/lib/usePrefersReducedMotion.ts` 등) → 구현 → 개발 전용 데모(390·960px) → 단위 테스트(자동 진행 타이머·뒤로가기·reduced-motion·새로고침 복원) → perf:home 전후. 기존 기능에 연결하지 않음.
  - 3단계 남은 일(계획 §0): 미커밋 데모 `app/dev/guided-flow/{page.tsx,GuidedFlowDemo.tsx}` 커밋, 분석 이벤트 실제 발화 재측정(앞선 탐침 0건 — `cdTrack` 가로채기 경로부터 확인), check:fast → check:pre-push → main CI 1회 → push. 정리: 이전 dev 서버 PID 17632(PID 로만, 명령줄 확인 후), 워크트리 `D:\Development\codedestiny-worktrees\perf-guided-flow-20261120-033158` 를 main 체크아웃에서 `npm run worktree:remove -- <경로>`, `.tmp/` 내 이 작업 파일 삭제. perf:home 전 측정값: 성능 49, LCP 12127ms, TBT 185ms, CLS 0.145.
- [x] 3b. 스텝 셸 달빛 예화 재스타일 + 대비(계획 §1·§2, GREEN 바로 진행). 대비 원인: `.flow` 에 표면 없이 분홍 `--cd-*` 글자 토큰 → `#0a0818` 위 제목 1.29:1. 브랜드 `data-brand` 꿀꿀/영냥이 사설 `--gf-*` 팔레트, 주아체 제목, 이중 테두리·꽃가지 마스크 재사용, `.cd-yehwa-button--primary`, 진행 막대 금빛. 검증: 새 `scripts/design/verify-guided-flow-contrast.cjs`(verify-home-funnel 패턴, 두 브랜드 × 360/390/430/960), 정적 테스트, measure:touch-targets, visual-checker.
- [ ] 3c. 서비스 전반 웨이브 계획 보고(계획 §3: A React 무료, B 정적 셸 무료, C 유료 입력 표현만; 결제·인증·DB 제외) → **사용자 승인 대기**. 5·6단계와 합쳐 진행.
  - [x] 3c-A1. 웨이브 A 1차: `/today/` 오늘의 세 장 + `/tarot/healing/` 공통 셸 이전(플래그 2개), push `bb4a65b7d`(2026-11-20). 결과는 아래 "3c-A1 결과".
  - [ ] 3c-A2. 웨이브 A 나머지 16개 매핑표 보고 → **사용자 승인 대기**.
- [ ] 4. 캐릭터 웹툰 결과 렌더러 — **계획 보고 후 승인 대기**(재사용/신규, 컷 데이터 구조, 수정 파일 경로).
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
