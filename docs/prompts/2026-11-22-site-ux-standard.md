<!-- 작성: 2026-11-22. 사용자 요청 원문: "그리고 내 사이트 진입부터 꿀꿀운세, 영냥이 사이트 전반을 업계 표준에 맞는 사용자가 이용하기 편리한 UI/UX로 개선해줄 프롬프트를 모든 작업 후 작성해줘"
형식 참조: docs/prompts/2026-11-18-03-app-ux-polish.md(역할·불변 규칙·Phase 0 감사·체크리스트·구현·완료 기준·보고).
저장소 규칙이 우선한다(CLAUDE.md, docs/context/design-canon.md). 이 문서와 충돌하면 저장소 문서를 따르고 충돌을 docs/CONTEXT_AUDIT.md 에 적는다. -->

# Code Destiny 웹 UI/UX 표준화 — 진입 `/` → 꿀꿀 운세 → 영냥이

> 이 문서는 구현 지시서다. 실행 주체는 Claude Code 또는 Codex 이고, 사용자는 결과 화면만 검수한다.
> 이 문서를 받은 에이전트는 먼저 아래 "0. 시작 전"을 실행하고, Phase 0 감사 결과를 근거로 방향과 성공 기준을 사용자에게 한 번 공유한 뒤(CLAUDE.md 코딩 원칙 16) 승인을 기다리지 않고 자율 구현한다. 사용자가 목업 승인을 명시적으로 요구한 경우에만 멈춘다.

## 0. 시작 전

1. `git branch --show-current`(main), `git status`(clean), `git pull --ff-only`. 다른 세션이 main 체크아웃에 미커밋 파일을 두고 있으면 `scripts/create-safe-worktree.ps1` 로 워크트리를 만들고, 거기서 `npm run fortune:build-data` 를 먼저 돌린다.
2. 세션 상태 파일(시작 훅이 경로를 알려 준다)에 목표, 이 문서 경로, 체크리스트, 실측값을 적는다. 단계마다 갱신한다.
3. 필독(해당 축만): `CLAUDE.md`, `docs/context/design-canon.md`(먼저), `docs/context/design-and-ui.md`(UI/UX Standards·CSS 수정 규칙·모바일 절), `DESIGN.md` §7·§8·§9, `docs/context/seo-and-adsense.md#변경-동반-seo-점검`. 결제 표시를 건드릴 때만 `docs/context/payment-gating.md` 와 `config/payment-freeze.json`. 결과 화면의 화자 레이어를 건드릴 때만 `docs/context/narrator-webtoon-result-spec.md`, 단계형 무료 운세를 건드릴 때만 `docs/context/guided-step-flow-spec.md`.
4. 저장소 전체를 읽지 않는다. `git grep`·`rg`·`git ls-files` 로 위치를 찾고, 단계당 5~15 파일을 목표로 한다.

## 1. 역할

다섯 명의 시니어 팀으로 일한다.

1. **프로덕트 디자이너(웹, 모바일 퍼스트)**: Nielsen 10 휴리스틱과 Baymard 폼·체크아웃 연구 결과를 판단 근거로 쓴다.
2. **접근성 전문가**: WCAG 2.2 AA 와 WAI-ARIA Authoring Practices(캐러셀·다이얼로그·콤보박스 패턴)를 맡는다.
3. **웹 퍼포먼스 엔지니어**: Core Web Vitals(LCP·INP·CLS), 이미지·스프라이트 전송량, 모션 비용을 맡는다.
4. **UX 라이터**: 연이·네오·꽃돼지·영냥이의 화자 어조(design-canon §2)를 지키면서 안내·오류·빈 상태 문구를 다듬는다.
5. **신뢰·결제 UX 담당**: 가격·이용권 표시의 명확성만 다룬다. 결제 로직과 게이트는 바꾸지 않는다.

목표는 두 가지다. 처음 온 사람이 `/` 에서 3탭 안에 원하는 상담의 입력 화면에 도착한다. 결과를 받은 사람은 언제든 1탭으로 자기 기록(꿀꿀 `/records/`, 영냥이 `/yeongnyangi/library/`)에 돌아간다.

## 2. 디자인 컨텍스트 (정본에서 옮김, 바꾸지 않는다)

- 꿀꿀 운세: 꽃빛 정원. 크림·로즈·샴페인 골드, 연꽃 속 연이, 가는 이중 테두리와 모서리 꽃가지. 토큰은 `styles/theme-tokens.css` `--cd-*`, 홈 블록 `.cdh` 는 `--cdh-*`.
- 영냥이: 밤의 점술방. `app/yeongnyangi/night-tokens.css` 의 `--yn-deep`·`--yn-gold`·`--yn-ivory`. **분홍 금지.** 밤 예화 마스크 `--yn-yehwa-mask-*` 와 홈 `--cd-yehwa-mask-*` 를 섞지 않는다.
- 네오는 퍼플 달빛 정체성을 유지한다.
- 서체: 제목·서비스명은 주아체, 조작·설명·가격·결과는 Pretendard(정본 `styles/brand-typography.css`, 2026-11-09 승인). 긴 결과는 모바일 17px·데스크톱 18px, 행간 1.8, 최대 38rem. 명조는 canon 이 허용한 자리에서만 쓴다.
- 반경 6단 `--cd-r-sm·control·md·card·section·pill` = 8·12·16·20·26·999px. 새 hex·`dark:`·`prefers-color-scheme` 을 들이지 않는다. `*.module.css` 에서 `--cd-*` 를 재선언하지 않는다.
- 모션: App Router 는 Tailwind 가 기본이다. 예외는 영냥이 CSS 키프레임, 그리고 `app/components/master-motion/`·ExpertCharacterStage·`js/core/yehwa-home.mjs` `mountMasterMotion` 래퍼다. 예외 안에서도 transform·opacity 만 쓰고, reduced-motion 이면 정지하며, 화면에 보일 때만 재생한다(`src/hooks/useSpritePlaybackGate.ts`).
- 주 행동 48px 이상, 탭 44px, 입력 16px, 가로 넘침 없음, safe-area. 장식은 얼굴·본문·터치를 가리지 않는다.
- 신규 화면은 몰입형이다. 전역 헤더·푸터를 붙이지 않는다.

## 3. 절대 불변 규칙

1. **과금 LLM 호출 금지.** 모든 검증은 mock 이다. 실호출이 필요하면 멈추고 정확히 1회 승인을 받는다.
2. **결제·이용권 게이트, 가격, 상품 구성, 월정석·꿀단지 이용권 용어는 바꾸지 않는다.** 결제 진입 주변의 "표시 명확성"만 다룬다. `config/payment-freeze.json` 고정 구간(`index.html` 의 `_cdChooseServicePaymentMode`·`_cdRunDirectKrwCheckout`·`_cdOpenPaidServiceGate`, `billing.js`, `payments.js`)에 닿는 변경은 payment-freeze 절차(`npm run verify:payment-freeze`, 필요 시 `--update` 와 사유 기록)와 `paid-gate-auditor` 에이전트 감사를 거친 RED 로 다룬다. 단건 결제는 사용자가 고른 뒤에만 뜬다.
3. **보관함 분리 유지.** 꿀꿀 기록은 `/records/`, 영냥이 기록은 `/yeongnyangi/library/`. 서로의 기록을 섞어 보이지 않는다. 구매 결과는 기간·만료·가격 변경 때문에 숨기지 않는다.
4. **라우트·기능·콘텐츠 삭제 금지**(요청 밖). 홈 `/` 구성(두 그림 카드 → 내 캐릭터 출석부 → 짧은 서비스 안내·기록 링크 → TOP5 → 필수 푸터)과 `/ggulggul/` 의 역할 분담을 바꾸지 않는다. 대표 상담 자동 배너와 편지 팝업(하루 숨김·결제 복귀 차단, `js/core/home-funnel.js` `setupSignatureLetter`)의 동작은 유지한다.
5. **수정 금지 파일**: `.env*`, `package-lock.json`, `.wrangler/`, `dist/`, `out/`, 마이그레이션 결과물, `worker/wrangler.toml` 구조.
6. 엔진 계산 코드와 결과 데이터 포맷은 바꾸지 않는다.
7. main 직접 개발. 브랜치·PR 을 만들지 않는다(워크트리는 `wt/*` 후 main 직접 머지). 운영 승격은 사용자의 명시적 1회 요청 때만.
8. 정적 셸 정본은 `index.html`·`js/*.js` 다. 고친 뒤 `npm run sync:public` 을 돌리고 미러를 같은 커밋에 넣는다. `index.html` 중 홈 펀널 구간은 `scripts/design/build-home-funnel.mjs` 로 재생성한다. `app/**` 를 고치면 `npm run sitemap:generate`.
9. 줄바꿈을 보존한다. `index.html`·대부분의 tsx 는 CRLF, CSS·`js/core/fortune-consultation-ui.js` 는 LF. `sed -i` 는 CRLF 를 떨구므로 쓰지 않는다.
10. 스크린샷은 메인 세션에서 직접 Read 하지 않는다. `visual-checker` 에이전트에 판정을 맡긴다.

## 4. 대상 여정 (코드에서 확인한 진입점)

| # | 여정 | 정본 위치 |
|---|---|---|
| J1 | `/` 진입: 연이·영냥이 그림 카드 선택 → 출석부 → TOP5 | `app/page.js`, `app/home-main.module.css`, `app/components/daily-card/*` |
| J2 | 꿀꿀 홈 `/ggulggul/`: 대표 상담 자동 배너, 고민별 카드, 편지 팝업 | `index.html`(정본), `lib/marketing/home-consultation-picker.mjs`, `js/core/home-funnel.js`, `styles/home-consultation-picker.css`, `styles/concern-first-home.css` |
| J3 | 운세 입력 폼 → 결과, 마스터 말풍선 | `index.html` 입력 구간(`#nameInput`·`#birthDate`·`#birthTimeText`·`#birthCountryInput`), `js/core/fortune-consultation-ui.js` `entry()`(158행), `lib/master-say/master-say.mjs`, `styles/fortune-consultation-entry.css` |
| J4 | 결제 진입(표시만) | 결제창 렌더러, `config/payment-freeze.json` — 바꾸기 전 `paid-gate-auditor` |
| J5 | 꿀꿀 기록 `/records/` | `app/records/page.tsx`·`RecordsClient.tsx`·`RecordFrame.tsx`·`view/` (noindex) |
| J6 | 영냥이 랜딩 `/yeongnyangi/` | `app/yeongnyangi/page.tsx`, `_home/*`(`CatMotion.tsx` 포함) |
| J7 | 영냥이 상담실 `/yeongnyangi/room/` → 결과 `/yeongnyangi/result/` | `app/yeongnyangi/room/page.tsx`, `result/ResultEntry.tsx` (room 은 noindex) |
| J8 | 영냥이 보관함 `/yeongnyangi/library/` | `app/yeongnyangi/library/LibraryEntry.tsx` (noindex) |

## 5. 이미 알려진 마찰 (2026-11-22 관찰·실측)

"관찰"은 이 세션의 마스터 모션·꿀꿀 고급화 작업 중 visual-checker 판정과 DOM 계측으로 본 것이다. "코드 확인"은 이 문서를 쓰며 grep 으로 확인한 것이다. Phase 0 에서 다시 재서 기준선으로 삼는다.

| ID | 위치 | 문제 | 근거 | 우선순위 후보 |
|---|---|---|---|---|
| K1 | `/` TOP5, 390px | 안내 문구 줄바꿈으로 16px 레이아웃 이동 | 관찰 | P1(CLS) |
| K2 | `/` TOP5 | 다섯 자리가 전부 "추천"(큐레이션 대체)일 때 약 60px 빈 공간 | 관찰 | P2 |
| K3 | 연이 이름표 | 대비 약 4.5:1, 경계값 | 관찰 | P1(반투명 합성색으로 재측정) |
| K4 | `/ggulggul/` 카드 hover | 링크 전체에 밑줄이 그어짐 | 관찰 | P2 |
| K5 | 데스크톱 카드 가격 줄 | 카드마다 가격 행 높이가 최대 65px 차이 | 관찰 | P2 |
| K6 | `.fc-master-reading` 제목 | 아직 `'MaruBuri','Noto Serif KR'` | 코드 확인 `styles/fortune-consultation-entry.css:109` | P2(canon 서체 계약) |
| K7 | 마스터 스프라이트 | 모바일도 600×720 소개장 시트를 내려받음, 360 변형 없음. 예: `public/images/master-motion/yeoni/portrait-sheet.webp` 253,022B, 같은 폴더 포스터 79,348B. 100KB 넘는 시트 8개(hanbi, hanbi-love, musung, neo, neo-new-year, yeoni, yun, yun-life-book) | 코드 확인(파일 크기), 스펙 `docs/design/master-motion-assets.md` 는 360×432 변형을 정의 | P1(모바일 LCP·전송량) |
| K8 | 쿠키(분석 동의) 배너 | 모바일에서 본문을 가림 | 관찰. 구현 `app/components/AnalyticsConsent.tsx` | P1 |
| K9 | `styles/concern-first-home.css` 27·30행 | `.cd-sig__controls`·`.cd-sig-card`(루트 클래스) 셀렉터가 현재 마크업에 없음. `.cd-sig-card__price` 는 `home-consultation-picker.mjs:62` 에서 쓰므로 살아 있음 | 코드 확인(`index.html` 의 class 속성에 `cd-sig-card__price` 만 27회) | P3. 지우기 전 `deletion-auditor` 3면 확인 |
| K10 | 스프라이트 눈 깜빡임 재생 | 사람 눈으로 본 자연스러움 | **미검증** | 실기기 확인 필요 |
| K11 | 모션 GPU·배터리 | 실기기 부하 | **미검증** | 실기기 확인 필요 |

추정(코드만 보고, 화면으로 확인하지 않음):
- 생년월일 `#birthDate` 는 `type="text" inputmode="numeric" maxlength="10"` 마스크 입력이다. 피커 대신 마스크를 쓰는 선택 자체는 표준에 맞지만, 인라인 오류 위치와 시간 모름 선택의 발견성은 화면으로 확인해야 한다.
- 대표 상담 배너는 `role="region" aria-roledescription="carousel"`, 슬라이드 `aria-label="n / N"`, 비활성 `inert`, 일시정지 상태에서만 `aria-live="polite"` 다(`home-consultation-picker.mjs:77-78`, `home-funnel.js:120`). APG 캐러셀 패턴의 정지·이전·다음 버튼이 키보드로 닿는지는 확인이 필요하다.

## Phase 0 — 감사 (읽기 전용, 커밋 없음)

1. 로컬 mock 서버로 J1~J8 을 360·390·430px 와 1280px 에서 따라간다. playwright 스크립트는 `.tmp/` 에 두고 작업이 끝나면 지운다. 스크린샷 판정은 `visual-checker` 에이전트에 맡긴다.
2. 기준선을 잰다.
   - 성능: `npm run perf:home`(dist 기준이므로 측정 전 빌드 상태를 확인), `npm run perf:app-route`, `npm run perf:interaction`, `npm run perf:lcp-budget`. 홈 측정은 `cd-boot-gate` 가 끝난 뒤의 값이다.
   - 터치·모바일: `npm run measure:touch-targets`, `npm run measure:mobile-routes`, `npm run measure:locale-text-fit`.
   - 대비: `npm run verify:hero-contrast`. 반투명 표면은 합성색으로 잰다. 색 판정은 sharp 픽셀 값으로 한다.
   - 키보드: 각 여정을 Tab 만으로 끝까지 갈 수 있는지, 포커스 링이 보이는지, 모달에서 Esc·뒤로가기로 닫히는지.
3. 문제마다 한 줄로 기록한다: 여정 | 문제 | 심각도 P0~P3 | 위반 기준(WCAG 조항·휴리스틱·CWV) | 근거(측정값 또는 `파일:줄`) | 개선안 | 위험도 GREEN/RED | 검증 명령.
   - P0: 여정을 끝낼 수 없음
   - P1: 전환이나 접근을 크게 막음, 또는 CWV 기준 초과
   - P2: 불편·불일치
   - P3: 다듬기·정리
4. 섹션 5의 K1~K11 을 같은 표에 넣고 실측값으로 갱신한다. **실측과 추정을 열을 나눠 표시한다.** "문제 없음" 같은 부정 단언에는 검색 범위와 근거를 적는다.
5. 감사표는 `docs/ux-audit/2026-11-22-site-ux-phase0.md` 같은 문서로 남기고 커밋한다(문서 전용 GREEN).
6. 방향과 성공 기준을 사용자에게 한 번 짧게 공유한다(추천안과 이유 먼저). 그 뒤 승인을 기다리지 않고 Phase 1 로 간다.

## 표준 체크리스트 (구현 기준과 합격선)

### A. 접근성 — WCAG 2.2 AA
- 대비: 본문 4.5:1, 큰 글씨와 UI 구성요소 3:1(1.4.3, 1.4.11). 고칠 때는 색상 계열을 그대로 두고 명도·채도만 바꾼다. 배경만 바꾸는 반쪽 오버라이드는 금지다. 합격선: K3 포함 모든 텍스트가 4.5:1 이상이고, 경계값(4.5~4.6)은 여유를 둬서 4.8:1 이상으로 올린다.
- 포커스: 모든 대화형 요소에 보이는 포커스(2.4.7), 포커스가 고정 요소에 가려지지 않음(2.4.11, K8 쿠키 배너 포함). 포커스 순서는 시각 순서와 같다.
- 타깃 크기: 최소 24×24 CSS px(2.5.8). 이 저장소 기준은 탭 44px, 주 행동 48px 다. `measure:touch-targets` 위반 0.
- 키보드: 카드 선택, 배너, 편지 팝업, 국가 콤보박스, 결제 진입까지 키보드만으로 완주한다. 키보드 함정 없음(2.1.2).
- 캐러셀(APG): 자동 넘김은 정지 버튼이 있고, 호버·포커스 중에는 멈추며, reduced-motion 이면 넘기지 않는다(2.2.2). 슬라이드 이동을 알리는 live region 은 정지 상태에서만 polite.
- 다이얼로그: `role="dialog"`(또는 `<dialog>`) + `aria-modal="true"` + 레이블, 열 때 포커스 이동, 닫을 때 원래 위치로 복귀, Esc 로 닫힘, 바깥 inert.
- 모션: `prefers-reduced-motion: reduce` 에서 스프라이트·꽃잎·배너 자동 넘김·패럴랙스가 모두 정지하고 포스터 1장만 보인다(2.3.3 권고).
- 이미지: 장식은 `alt=""`, 정보성 그림은 의미 있는 alt. 아이콘 버튼은 접근 가능한 이름이 있다.
- 폼: 모든 입력에 보이는 레이블(placeholder 만으로 대체하지 않음), 오류는 `aria-describedby` 로 연결하고 텍스트로 설명한다(3.3.1, 3.3.2). 이미 입력한 정보는 다시 묻지 않는다(3.3.7).

### B. 성능 — Core Web Vitals (모바일 p75 기준)
- LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. 실험실 값은 `perf:home`·`perf:app-route`·`perf:interaction` 으로, 필드 값은 `perf:crux` 로 확인한다(필드 값이 없으면 "필드 데이터 없음"으로 적는다).
- 이미지: LCP 후보 하나만 `fetchpriority="high"`(현재 `/` 첫 카드가 그렇다, `app/page.js:128`). 나머지는 `loading="lazy"`·`decoding="async"`, `width`·`height` 또는 `aspect-ratio` 로 자리를 확보한다.
- 스프라이트(K7): 모바일에는 360×432 시트, 데스크톱에는 600×720 을 `srcset`/`image-set` 이나 매니페스트 분기로 내린다. 화면 밖에서는 시트를 받지 않고 포스터만 보인다. 합격선: 390px 첫 화면 전송량에서 시트 바이트가 현재 대비 50% 이상 줄어든다. 에셋 예산은 `docs/design/master-motion-assets.md`(소개장 프레임 합계 400KB 이하, 포스터 80KB 이하, 아바타 80KB 이하)를 따른다. 원본은 `D:\CodeDestiny-Build`, 최적화본과 `provenance.json` 은 `public/images/master-motion/<id>/`.
- CLS: 비동기로 채우는 영역(TOP5, 가격, 배너, 쿠키 배너)은 최종 높이를 미리 잡는다. 줄바꿈으로 높이가 달라지면(K1) 최소 높이나 고정 줄 수로 막는다.
- 늦게 붙는 CSS 는 CLS 원인이다. 홈 셸 CSS 는 `npm run measure:shell-css` 로 확인한다.

### C. 모바일 퍼스트 (390px 기본)
- 360·390·430px 에서 가로 스크롤 0, 잘린 글자 0, 겹친 요소 0.
- 고정 하단 요소(쿠키 배너, 하단 CTA, 앱 탭)는 safe-area 를 반영하고 본문 마지막 행동을 가리지 않는다(K8). 쿠키 배너는 하단 시트로 줄이고 본문에 같은 높이의 여백을 준다. 동의 로직은 바꾸지 않는다.
- 입력 글자 16px 이상(iOS 확대 방지). 키보드가 올라와도 현재 입력 필드가 보인다.

### D. 폼 UX (J3)
- 레이블은 항상 보이고, 필수·선택을 표시한다.
- 생년월일: 숫자 키패드(`inputmode="numeric"`), 자동 하이픈 마스크, 양력·음력·윤달 토글, 미래 날짜·존재하지 않는 날짜에 대한 즉시 인라인 오류.
- 태어난 시간: "모름" 선택지가 입력 옆에 바로 보인다. `HH:MM` 마스크. 12지 시진 선택을 대안으로 둔다면 기존 구현을 먼저 찾는다(코딩 원칙 15).
- 출생지 콤보박스(`#birthCountryInput`): APG 콤보박스 패턴(화살표 이동, Enter 선택, Esc 닫기, 결과 수 안내).
- 오류는 제출 시 첫 오류로 포커스를 옮기고, 입력 중에는 필드를 떠날 때(blur) 검사한다. 입력값은 지우지 않는다.
- 저장된 프로필이 있으면 재사용을 먼저 제안한다. 기존 저장 장치를 찾아 쓰고 새 저장소를 만들지 않는다(코딩 원칙 6).

### E. 내비게이션과 길 찾기
- 모든 하위 화면에 "뒤로"가 있고, 브라우저 뒤로가기와 결과가 같다. 모달과 시트는 history 와 연동해서 뒤로가기로 닫히고 페이지를 떠나지 않는다.
- 꿀꿀 화면에서는 `/records/`, 영냥이 화면에서는 `/yeongnyangi/library/` 로 가는 고정 진입점이 1탭 거리에 있다. 서로의 보관함으로 연결하지 않는다.
- 서비스 경계를 분명히 한다. `/` 에서 고른 서비스 안에서는 그 서비스의 이름·색·화자가 일관되고, 다른 서비스로 넘어갈 때는 명시적인 링크로만 넘어간다.
- 공개 읽기형 화면(상세·가이드)은 필요하면 빵부스러기를 둔다. 기존 BreadcrumbList 구조화 데이터와 맞춘다. 몰입형 상담 화면에는 넣지 않는다.
- 결과에서 목록으로 돌아오면 스크롤 위치를 복원한다.

### F. 로딩·빈 상태·오류 상태 (LLM 생성은 결과가 안 나오는 것이 최악이다)
- 생성 대기: 화자 캐릭터와 단계 메시지로 진행감을 준다. 10초 넘게 대기하면 "기록에 저장되니 나중에 다시 와도 된다"는 안내와 보관함 링크를 보인다.
- 실패: 막다른 화면 없이 "다시 시도"와 "기록에서 보기"를 둔다. 401 만 재로그인으로 보내고, 그 밖의 오류는 재시도로 처리한다. 이미 결제·차감된 생성이 실패하면 추가 결제 없이 재시도된다는 사실을 문구로 알린다. 문구만 바꾸고 재시도·차감 로직은 바꾸지 않는다.
- 빈 상태: `/records/`·`/yeongnyangi/library/` 가 비었을 때 화자에 맞는 한 줄 안내와 대표 상담 1~2개로 가는 행동 버튼을 둔다.
- 스켈레톤은 최종 레이아웃과 같은 높이로 그려서 CLS 를 만들지 않는다.
- 분량이나 형식 상한을 건드리게 되면 CLAUDE.md 코딩 원칙 17 을 따른다(하한은 목표 하한의 약 80% 이하, 출력 토큰 여유, 형식은 거부 대신 교정).

### G. 신뢰와 결제 표시 명확성 (J4, 표시만)
- 카드와 결제창에서 같은 상품의 이름·가격·형식(이용권·월정석·단건)이 같은 말로 보인다. `npm run verify:payment-copy-dictionary`, `verify:payment-choice-parity`, `verify:payment-legal-copy` 가 통과한다.
- 가격 줄은 카드 높이와 무관하게 같은 기준선에 정렬한다(K5).
- "무엇을 받는지"(분량, 형식, 재열람 가능, 기간 제한 없음·자동결제 아님)를 결제 버튼 앞에 짧게 보인다. 사실·가격·정책의 의미는 바꾸지 않는다.
- 결제 대기·실패·취소 화면마다 다음 행동 버튼이 있다.
- 구매 결과는 기록 화면에서 추가 결제 없이 다시 열린다는 점을 결과 화면과 보관함에 적는다.

### H. 일관성 (꿀꿀 ↔ 영냥이, 컨셉은 분리 유지)
- 공통으로 맞출 것: 버튼 위계(주·보조·텍스트 3단), 반경 6단, 간격 스케일, 포커스 링 두께, 카드 hover 규칙(K4: 링크 전체 밑줄 대신 제목만 밑줄 또는 -3px 이동), 오류·빈 상태 구조, 보관함 진입 위치.
- 분리할 것: 색 토큰(`--cd-*` / `--yn-*`), 예화 마스크, 화자 어조, 영냥이 무분홍.
- 서체: K6 처럼 계약 밖 명조가 남은 곳은 Pretendard 또는 주아체로 정리한다. 명조를 유지하려면 canon 근거를 적고, 근거가 없으면 `docs/CONTEXT_AUDIT.md` 에 충돌을 기록한다.

### I. SEO 동반 점검 (변경마다)
- 영향받는 공개 URL 의 title·description·H1, canonical·hreflang, robots, sitemap, 이미지 alt, 광고 적합성을 확인한다. 해당 없는 항목은 "영향 없음"으로 적는다.
- `/records/`·`/yeongnyangi/library/`·`/yeongnyangi/room/` 의 noindex 는 유지한다.
- 키워드·날짜를 기계적으로 넣지 않는다.

## Phase 1~3 — 구현

**작업 단위**: 한 문제(또는 같은 파일의 같은 축 묶음) = 한 커밋. 커밋 하나를 되돌려도 다른 기능이 흔들리지 않아야 한다.

**단계마다 순서**
1. 대상 파일과 가장 가까운 기존 구현을 읽는다(코딩 원칙 15). 공유 모듈·공통 훅이면 `regression-scout` 로 영향 경로를 먼저 본다.
2. 위험도를 정한다.
   - GREEN: 문구, CSS, 마크업, 문서.
   - RED: 결제 표시 중 고정 구간에 닿는 것, 인증, 라우팅, 공유 동작, 삭제·리네임, 영향 불명.
   - RED 는 위험·검증·롤백을 먼저 적고 시작한다. 이미 승인된 범위는 다시 묻지 않는다.
3. 수정한다. 셸이면 `npm run sync:public` 후 미러를 함께 스테이징한다. `app/**` 면 `npm run sitemap:generate`.
4. 검증한다.
   - `npm run check:fast` 1회. `index.html` 변경은 유료 게이트 스위트로 승격돼 11~14분 걸리므로 백그라운드로 돌리고 `BLOCKED|error TS|not ok` 를 grep 한다. 계획만 보려면 `--plan`.
   - 축별: 대비 `verify:hero-contrast`, 터치 `measure:touch-targets`, 모바일 상세 `verify:mobile-detail-nonintrusive`, 성능 `perf:home`·`perf:app-route`·`perf:interaction`, 결제 표시 `verify:payment-freeze`·`verify:payment-copy-dictionary`·`verify:payment-choice-parity`, 카탈로그 `node --test __tests__/ui/home-catalogue-coverage.test.js`, 홈 로케일 `node scripts/design/verify-home-entry-locale.cjs`(mock 서버 + `HOME_ENTRY_TEST_URL`).
   - 화면: 360·390·430px 와 1280px 스크린샷을 찍고 `visual-checker` 에 변경 전후 비교를 맡긴다. 데스크톱 회귀 0 을 확인한다.
5. `git status` 와 `git diff --stat` 을 보고 검증한 파일만 커밋한다. `git add .` 를 쓰지 않는다. Conventional Commits, 끝에 공동 저자 줄.
6. 회귀가 나면 덧대지 않는다. 미커밋이면 `git reset --hard HEAD`(공유 체크아웃이면 쓰지 않고 해당 파일만 되돌린다), 나쁜 커밋이면 `git revert <sha>`. 같은 구조로 다시 시도하지 않고 원인과 새 접근을 상태 파일에 적는다.

**우선순위**
- Phase 1 (P0·P1, 전환과 접근을 막는 것): K1 CLS, K3 대비, K7 모바일 스프라이트 변형, K8 쿠키 배너, 키보드로 완주 못 하는 여정, 폼 인라인 오류, 생성 실패 막다른 화면.
- Phase 2 (P2, 불편과 불일치): K2 TOP5 빈 공간, K4 hover, K5 가격 줄 정렬, K6 서체, 보관함 1탭 진입, 빈 상태, 스크롤 복원, 꿀꿀↔영냥이 버튼·포커스 일관성.
- Phase 3 (P3, 정리와 다듬기): K9 죽은 CSS(먼저 `deletion-auditor`, 미러 포함 3면 grep, 별도 커밋), 마이크로 카피, 모션 세부.

**안정 시점마다**: `npm run check:pre-push` → `git push origin HEAD:main`(워크트리면 main 에 머지한 뒤 push). push 직후 CI 를 기다리지 않는다. 다음 push 나 최종 보고 직전에 main CI 결과를 한 번 확인한다. 스테이징 검증은 라우팅을 바꿨거나 결제·로그인 표시를 크게 바꿨을 때만 `npm run verify:staging -- --sha=<40자리>` 로 한다. 운영 승격은 하지 않는다.

## 측정 지표 (변경 전후 비교)

| 지표 | 목표 | 측정 |
|---|---|---|
| LCP(모바일, `/`·`/ggulggul/`·`/yeongnyangi/`) | ≤ 2.5s | `perf:home`, `perf:app-route`, 필드는 `perf:crux` |
| INP | ≤ 200ms | `perf:interaction`, `perf:tap-cost` |
| CLS | ≤ 0.1, TOP5·배너·쿠키 배너 각각 0.01 이하 | `perf:home`, playwright layout-shift |
| 390px 첫 화면 스프라이트 바이트 | 현재 대비 −50% 이상 | 네트워크 로그 |
| 터치 타깃 위반 | 0 | `measure:touch-targets` |
| 대비 위반(4.5:1 / 3:1) | 0 | `verify:hero-contrast`, sharp 픽셀 측정 |
| 키보드 완주 여정 | J1~J8 전부 | 수동 + playwright |
| `/` → 입력 화면 탭 수 | ≤ 3 | 수동 |
| 결과 → 보관함 탭 수 | 1 | 수동 |

## 완료 기준

- [ ] Phase 0 감사표가 커밋됐고 K1~K11 이 실측값으로 갱신됐다.
- [ ] P0·P1 이 0건이거나, 남은 항목마다 사유와 후속 계획이 있다.
- [ ] 위 측정 지표를 변경 전후로 표에 채웠다. 측정 못 한 칸은 "미검증"으로 적었다.
- [ ] 360·390·430px·1280px 에서 J1~J8 시각 회귀 0(visual-checker 판정).
- [ ] 결제 관련 verify 와 `verify:payment-freeze` 가 통과했고, 고정 구간을 건드렸다면 절차와 사유를 기록했다.
- [ ] 보관함 분리, noindex, 영냥이 무분홍, 서체 계약, 모션 예외 범위가 유지된다.
- [ ] K10·K11(실기기 눈 깜빡임, GPU·배터리)은 사용자가 실기기로 확인하도록 보고에 남겼다.
- [ ] main CI 녹색. 내 임시 파일(`.tmp/`, `*.log`, 스크래치)을 지웠고, 워크트리를 썼다면 배수했다(`npm run worktree:remove -- <경로>`).

## 보고 형식 (한국어)

1. 요약: 무엇이 좋아졌는지 세 줄.
2. 변경 파일과 의도(`파일:줄`), 커밋 SHA 목록.
3. 지표 변경 전후 표. 실측과 추정을 구분한다.
4. 실행한 명령과 출력 요지. 실행하지 않은 검증은 "미검증"으로 적는다.
5. 남은 위험과 범위 밖에서 발견한 결함(고치지 않고 보고만).
6. 다음 단계: 누가, 무엇을, 어떤 순서로.
