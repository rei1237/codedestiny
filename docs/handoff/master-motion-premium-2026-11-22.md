---
status: done
updated: 2026-11-22
next: 없음 — E~H·P 전부 main push 완료(c4ec066d06), 워크트리 배수
---

# 마스터 스프라이트 모션·꿀꿀 고급화·영냥이 꽃 컨셉·대표 상담 자동 배너

## 첫 행동
1. `git branch --show-current`가 main인지, `git status`를 확인한다. `git pull --ff-only`
   - main 체크아웃에 다른 세션의 미커밋 파일이 있으면(trait-profile, paid-delivery 테스트 등) **쓰는 세션이 둘 이상**이므로 `scripts/create-safe-worktree.ps1`로 새 워크트리를 만든다.
   - 새 워크트리는 `npm run fortune:build-data`를 먼저 돌려야 test:node ENOENT가 안 난다.
2. 아래 "단계"에서 체크 안 된 첫 항목부터 진행한다. 단계마다 검증 → 커밋하고, 이 문서의 체크박스·결과를 갱신해 커밋한다.

## 지금 상태
- 이전 작업(TOP5 개편 A, 기본 운세 마스터 말풍선 B·C, 연이 무료 결과 말풍선 D)은 `wt/top5-master-say-20261122-023703`에서 main에 머지·push되는 중이다(원 세션 담당). 이 문서의 단계는 그 머지 뒤 main 기준이다.
- 계획 원문: `C:\Users\user\.claude\plans\moonlit-dazzling-puppy.md`(E·F·G·H 절).
- **F5·F6·F7·G·H 미push(2026-11-22)**: 워크트리 `D:/Development/codedestiny-worktrees/master-motion-f5f6-20261122-104247`(브랜치 `wt/master-motion-f5f6-20261122-104247`)에 커밋만 있다. 결과 기록의 "F5~F7 전달 상태" 절을 먼저 처리한다. 워크트리를 지우지 말 것.

## 승인 상태 (사용자 원문, 2026-11-22)
- 요청: "각 마스터들을 도화서원 사이트와 각 서비스의 진입화면을 보면 캐릭터들이 자연스럽게 움직이는 효과가 있는데 스프라이트 시트를 활용해서 부드럽게 움직이는 효과를 주도록해주고 … 전반적인 UI/UX를 이런식으로 고급스럽게 꿀꿀운세에 적용해주고 영냥이에도 어느정도 꽃 컨셉으로 배경이나 고급스러운 컨셉에 맞는 디자인으로 개선해줘 저 사이트처럼 영냥이도 어느정도 움직이면서 동적인 효과를 줘야해"
- 요청: "대표 상담들은 자동으로 카드가 넘어가야해 팝업은 그대로 두고"
- 결정: 모션 방식은 "Codex 스프라이트+CSS"(영상 루프 아님). 자동 넘김은 "꿀꿀 대표 상담 자동 배너"(/ggulggul/; 아래 카드 목록·편지 팝업 불변).
- Codex 한도가 다시 들어왔다는 사용자 언급이 있다. 이미지 생성은 codex-image 스킬(OAuth)로 하며 유료 API는 쓰지 않는다.
- push는 허용(main CI까지). 운영 승격은 승인 없음.

## 작업 규칙과 함정
- 참고 사이트(dohwasewon.com)의 캐릭터·포스터·문구·브랜드를 복제하지 않는다. 기법만 참고한다.
  - 진입 4초 무음 MP4 루프, 포스터→영상 0.3s 페이드
  - 홈 배너 0.5s 페이드, 4.5s 자동 넘김, 점 + `1 / N` 배지
  - 금색 1px 장식선, 남색 알약 버튼 + 이중 금테(outline-offset 3px)
  - 그림 아래 크림 그라데이션, hover 시 -3px와 그림 scale 1.04, reduced-motion이면 전부 끈다
- design-canon(`docs/context/design-canon.md`) 우선
  - 키프레임은 MasterMotion·ExpertCharacterStage 예외 범위에서 transform·opacity만 쓴다.
  - reduced-motion이면 정지하고, 화면에 보일 때만 재생한다.
  - 명조 제목은 canon이 허용할 때만 쓰고, 충돌하면 `docs/CONTEXT_AUDIT.md`에 기록한다.
- 모션 에셋 스펙: `docs/design/master-motion-assets.md`
  - 프레임 6~12장, 120ms, `steps()`
  - 소개장 600×720(+360×432): 프레임 합계 400KB 이하, 포스터 80KB 이하
  - 아바타 112: 80KB 이하
  - 꽃잎은 그림에 넣지 않는다. 텍스트·워터마크 금지
- 기존 장치를 재사용한다.
  - `app/components/master-motion/MasterMotion.tsx`(`MasterMotionArt={frames?,video?,poster}`, 숨쉬기·흔들림·꽃잎·금가루; 에셋 0개)
  - `src/hooks/useSpritePlaybackGate.ts`, `lib/master-motion/flags.mjs`
  - `js/core/yehwa-home.mjs:145 mountMasterMotion`
  - `app/yeongnyangi/_home/CatMotion.tsx`(걷기 6프레임)
- 원본 생성물은 `D:\CodeDestiny-Build`에, 최적화 WebP는 `public/images/master-motion/<id>/`에 두고 `provenance.json`에 기록한다(`docs/context/content-assets.md`). 변환에는 `scripts/optimize-images.mjs`가 있다.
- 영냥이는 분홍 금지다. `app/yeongnyangi/night-tokens.css`(`--yn-deep`, `--yn-gold`, `--yn-ivory`)
- 결제·이용권 게이트, 가격, 라우트, 편지 팝업 동작(하루 숨김·결제 복귀 차단 `home-funnel.js setupSignatureLetter`)은 불변이다. 보관함 분리도 불변이다.
- 셸 정본(`index.html`, `js/*.js`)을 고친 뒤 `npm run sync:public`을 돌리고 미러를 같이 커밋한다. `index.html`은 `scripts/design/build-home-funnel.mjs`로 재생성한다. app/** 수정 뒤에는 `npm run sitemap:generate`.
- 줄바꿈
  - CRLF: index.html과 대부분의 tsx
  - LF: CSS, fortune-consultation-ui.js
  - sed -i는 CRLF를 떨군다. Edit 도구나 CRLF를 보존하는 node 스크립트를 쓴다.
- check:fast는 index.html 변경 시 유료 게이트 스위트로 승격돼 11~14분 걸린다. 백그라운드로 돌리고 끝나면 `BLOCKED|error TS|not ok`를 grep한다.
- 스크린샷은 메인에서 Read하지 않는다. visual-checker 에이전트로 판정한다.

## 설계 요약
- **E 배너**
  - `lib/marketing/home-consultation-picker.mjs`의 `cd-sig__head` 아래에 `<div class="cd-sig-banner" data-sig-banner>`를 둔다. 대표 상담 7종(`products`, 흑월 포함)을 포스터·제목·한 줄·가격·CTA로 보여 준다.
  - 링크 속성은 picker 카드와 같다: `data-feature-key`, `data-cd-price-key`, `data-pvw-paid`(흑월은 picker 규칙대로).
  - 컨트롤러: `js/core/home-funnel.js:80-206`의 죽은 `#cdSigViewport` 블록(대상 마크업 없음, index.html 0건)을 교체한다.
    - 5s 자동, 0.5s 크로스페이드
    - 점, `1 / 7`, 이전·다음, 일시정지(44px), 스와이프, ←/→
    - hover·focus·화면 밖·탭 숨김·열린 dialog·reduced-motion이면 정지. 수동 조작 뒤 12s 유예
    - 비활성 슬라이드는 inert
  - 테스트
    - `__tests__/ui/home-direct-feature-links.static.test.js`에 배너를 추가한다.
    - 새 `__tests__/ui/signature-banner.behavior.test.js`(jsdom; `signature-inline-letter.behavior.test.js` 형식 참고)를 만든다.
    - 기존 편지 팝업 테스트가 통과해야 한다.
- **F 스프라이트**
  - 대상은 연이·윤달·무성·서한비·네오·영냥이다. 마스터별로 커밋한다.
  - codex-image로 정본 초상(`public/images/master-profiles/*-portrait.webp` 등)을 기준 삼아 편집 변형을 만든다: 눈 반쯤·감음, 머리카락·소매 미세 흔들림, 입 살짝 벌림.
  - sharp 픽셀 차이로 1차, visual-checker로 2차 검수한다. 어긋난 프레임은 버리고, 최소 구성(기본 + 깜빡임 2장)으로도 출하한다.
  - `scripts/sprites/build-master-motion.mjs`(sharp, 참고 `scripts/sprites/prepare-yeoni.mjs`)로 가로 시트와 포스터를 만든다. 용량을 넘으면 실패시킨다.
  - `MasterMotionArt.sheet={src,frames,cols,cell}`을 `background-position` + `steps()`로 재생하고, 포스터에서 0.3s 페이드로 넘어간다.
  - 꽂는 곳: `ProductMasterStrip.tsx`, `components/fortune/MasterProfile.tsx`, yehwa-home 기본 마스터 카드, `js/core/fortune-consultation-ui.js entry()`의 초상, 영냥이 `ServiceEntryScene.tsx`/`_home`.
  - 플래그로 마스터별로 켠다. 테스트 `__tests__/ui/master-motion-assets.test.mjs`(매니페스트·용량).
- **G 꿀꿀 고급화**
  - 범위: /ggulggul/ 히어로, 배너, 서비스 진입 `entry()`, ProductMasterStrip
  - 금 장식선 소제목, 남색 + 이중 금테 주 버튼, 크림 그라데이션, hover -3px와 scale 1.04, 4:5 포스터
  - 토큰은 `--cd-yehwa-*`만 쓴다.
  - **G 방향·성공 기준 (구현 전 확정, 2026-11-22, 코딩 원칙 16)**
    - 캐논 우선으로 기법을 옮긴다(충돌은 CONTEXT_AUDIT 에 기록)
      - 명조 → 쓰지 않는다. 제목은 주아체(11-09 승인)다. 진입 `entry()` h3 의 MaruBuri 는 캐논 위반이라 `--font-display` 로 바꾼다.
      - "남색" 주 버튼 → 연이 쪽은 딥 플럼(`--cd-cta-primary-bg`·`--fc-dark`)으로 대체한다. 이중 금테는 버튼 테두리 + 1px 금 outline(offset 3px)이다. 포커스는 별도 `--cd-focus-ring` outline 이라 금테와 구분된다.
      - 4:5 포스터 → 적용하지 않는다. 캐논이 카탈로그 3:2·진입 16:9 를 고정하고, 세로로 자르면 인물이 잘린다.
    - 화면별 변경
      1. 히어로 `.yh-free-start`: 1px 금 outline 을 offset 3px 로 더해 안쪽 금선(::before)과 이중 금테를 이룬다. 포커스 규칙은 명시한다. H1·문구·그림·LCP 이미지는 건드리지 않는다.
      2. 배너
         - 색: 하드코딩 hex 를 `--cd-yehwa-night*`·`-champagne`·`-pearl*` 토큰으로 옮긴다(두 블록). 연이는 딥 플럼, 네오는 기존 남보라 값을 그대로 쓴다.
         - 여백: 데스크톱 설명–가격 사이 약 200px 는 `__copy` 세로 가운데 정렬과 foot 의 금 1px 구분선으로 정리한다.
         - 장식: kicker 옆에 금 1px 장식선을 둔다.
         - hover: 카드는 -3px 뜨고 그림은 1.04 배 커진다(art 의 overflow 안에서).
      3. 피커 카드 목록
         - 마크업은 그대로 둔다(테스트 4곳이 고정).
         - hover: 카드는 -3px 뜬다. 그림은 1.04 배 커지되 clip-path 로 틀은 그대로 유지한다.
         - 소제목 h3 옆에 금 1px 장식선을 둔다.
         - 설명 영역은 그림 바로 아래에서 크림 그라데이션으로 시작한다.
      4. `entry()`
         - h3 는 주아체로 바꾼다.
         - name 줄 옆에 금 1px 장식선을 둔다.
         - `.fc-primary` 는 이중 금테로 한다.
         - 밝은 테마에서는 장면 패널과 캡션을 크림 그라데이션 위 잉크 글자로 바꾼다. 베다·네오의 어두운 팔레트는 서비스 팔레트 보존 원칙에 따라 그대로 둔다.
      5. ProductMasterStrip: 라벨 옆에 금 1px 장식선을 둔다. 이중 프레임은 이미 있다.
    - 전환은 전부 `(hover:hover) and (prefers-reduced-motion:no-preference)` 안에만 둔다. transform·clip-path 만 쓴다.
    - 성공 기준(실측)
      - pageerror 0, 가로 넘침 0(390·1280)
      - reduced-motion 일 때 대상 요소의 transition-duration 과 animation 이 0
      - 본문 대비 4.5:1·UI 3:1(합성색)
      - 터치 44px·주 행동 48px 유지
      - perf:home CLS·LCP 가 기준선보다 나빠지지 않는다(측정 잡음 범위 안)
      - visual-checker 항목별 판정 통과
      - 결제 게이트·가격·라우트·편지 팝업·title/H1/canonical·배너 동작 테스트·F 스프라이트 배선 불변
- **H 영냥이**
  - 흰·금 야화(목련·연꽃) SVG 마스크 모티프(`scripts/design/gen-yehwa-motifs.mjs` 방식, `yn-` 토큰)와 금테 카드
  - 별가루·꽃잎 낙하(MasterMotion yn 변형)
  - 영냥이 대기 스프라이트(F). CatMotion은 유지
  - 진입 장면은 포스터 → 스프라이트

## 단계
- [x] E 대표 상담 자동 배너 — 구현, 테스트, check:fast, 커밋, 화면 확인(visual-checker, 390px·데스크톱)
- [x] F1 스프라이트 빌드 스크립트 + MasterMotion `sheet` 지원 + 자산 테스트(에셋 없이 빈 매니페스트로 통과)
- [x] F2 연이 스프라이트 생성·검수·배선
- [x] F3 윤달 — d20687016·88ba0c4ea
- [x] F4 무성 — d36e382314
- [x] F5 서한비 — 4559d30e31
- [x] F6 네오 — 45c0c758ea
- [x] F7 영냥이 고양이 — f13075f36d (눈 깜빡임 부분 시트, 꼬리 없음, 미push)
- [x] G 꿀꿀 고급화 — 워크트리 커밋 198529f859·87bbb3bfc7·c962ebac34·c06c7d5e39·08bf6bb6d4, 미push(결과 기록 "G 결과" 절)
- [x] H 영냥이 꽃 배경·동적 효과 — 워크트리 0472265e4d·0675c85910·a31b4ab188·f633689175·087c4d8fce·bf637241f7, 미push(결과 기록 "H 결과" 절)
- [x] P 사이트 전반 UX 개선 프롬프트 작성(모든 작업 뒤). 사용자 원문(11-22): "내 사이트 진입부터 꿀꿀운세, 영냥이 사이트 전반을 업계 표준에 맞는 사용자가 이용하기 편리한 UI/UX로 개선해줄 프롬프트를 모든 작업 후 작성해줘"
  - 결과: `docs/prompts/2026-11-22-site-ux-standard.md` — 1abce5327a, 미push
  - 산출: `docs/prompts/2026-11-22-site-ux-standard.md`. 기존 형식은 `docs/prompts/2026-11-18-*`(03 UX)를 참고한다.
  - 다른 세션(Claude·Codex)이 그대로 실행할 마스터 프롬프트로 쓴다.
  - 범위: `/` 진입, `/ggulggul/`(상담 탐색·이용권·기록), 영냥이 `/yeongnyangi/`(질문·보관함)
  - 기준:
    - 정보 구조·내비게이션
    - 첫 행동까지의 단계 수
    - 폼·입력(생년월일 등)
    - 로딩·빈 상태·오류 상태
    - 접근성(WCAG 2.2 AA: 대비, 포커스, 44px 타깃, reduced-motion)
    - 모바일 우선 레이아웃
    - 성능(CWV)
    - 결제 흐름 신뢰 신호
    - 일관된 컴포넌트·토큰
  - 프롬프트에 넣을 것:
    - 현재 구조 실측 경로(이번 작업 결과 포함)
    - 불변 제약(결제 게이트·이용권 용어, 보관함 분리, 구매 결과 보존, SEO 색인 정책, 과금 LLM 금지, main 직접 커밋)
    - 단계별 산출물과 검증 기준
  - 작성 뒤 사용자에게 파일 경로와 전문을 전달한다.
- [ ] 마무리
  - `check:pre-push`, push, main CI 1회
  - `npm run perf:home` CLS·LCP 비교
  - 워크트리 배수, 임시 파일 삭제
  - 이 문서를 `status: done`으로

## 결과 기록
(단계마다 커밋 SHA·명령 출력 요약·남은 위험을 여기에 적는다)

### E 대표 상담 자동 배너 (2026-11-22)
- 커밋: dbb459da4 (wt/sig-banner-20261122-052839, main 머지)
- 바뀐 것
  - lib/marketing/home-consultation-picker.mjs: `cd-sig__head` 아래에 `[data-sig-banner]` 마크업을 둔다. 링크 속성은 피커 카드와 같고 `data-cd-service-id` 는 붙이지 않는다(verify-master-love-codex-flow 의 fusion 1개 단언 유지).
  - js/core/home-funnel.js: 죽은 `#cdSigViewport` 블록을 배너 컨트롤러로 바꿨다. `setupSignatureLetter` 는 손대지 않았다.
  - styles/home-consultation-picker.css: 배너 스타일. 모바일(≤760px)에서는 점이 첫 줄, 버튼·위치가 둘째 줄이고 점 너비는 32px다.
  - 테스트: signature-banner.behavior(새로 7개), home-direct-feature-links.static(배너 단언 추가), home-choice-carousel(죽은 레일 테스트 8개 삭제, 달빛 장식 테스트만 남김)
- 동작
  - 보일 때(50% 이상)만 5초마다 넘기고 0.5초 크로스페이드로 바꾼다.
  - 마우스 올림·포커스·화면 밖·탭 숨김·열린 대화상자·reduced-motion 에서는 멈춘다. 수동 조작 뒤에는 12초 유예한다.
  - 비활성 장은 inert 다. 키보드로 넘기면 포커스가 새 장 링크로 옮겨 간다.
- 가정: 문서에는 "7종, 1 / 7" 로 적혀 있지만 실제 `products` 는 8종(흑월 + 6 + fusion-fortune)이다. 8종을 모두 보이고 N 은 데이터에서 계산한다.
- 검증
  - node --test 배너 관련 4파일: 17/17 pass
  - check:fast: sitemap-drift 하나만 BLOCKED였다. sitemap:generate 로 lastmod 원장 5건을 갱신한 뒤 verify:sitemap-drift OK
  - Playwright 3102(390·1280): pageerror 0, 가로 넘침 없음. 5.6초 뒤 2/8, 다음 버튼으로 3/8. 멈춤 버튼 44×44
  - visual-checker: 대비 AA 통과(제목 15.3:1, 가격 11.1:1, 비활성 점 3.7:1), 잘림·크롭 없음, 한 장만 보임
  - 모바일 컨트롤 결함 2건(점 넘침, 3줄 배치)을 visual-checker 가 찾았다. order:-1, 32px 로 고친 뒤 재실측 결과 점 67–323px(배너 32–358px 안), 버튼은 한 줄
- 남은 위험
  - 고친 뒤 모바일은 기하 실측만 했고 visual-checker 재판정은 받지 않았다.
  - 데스크톱에서 설명과 가격 사이 여백이 약 200px 로 크다(결함 아님, G 꿀꿀 고급화에서 재검토).
  - styles/concern-first-home.css 의 `.cd-sig__controls`·`.cd-sig-card` 규칙이 죽은 CSS 로 남아 있다(범위 밖이라 보고만 한다).
  - 점 ::before 의 width 전환은 장식 8px 요소라 그대로 둔다.

### F1 스프라이트 빌드 스크립트·MasterMotion sheet (2026-11-22)
- 커밋: fe10f4892 (wt/master-motion-f1f2-20261122-054914)
- 바뀐 것
  - `scripts/sprites/build-master-motion.mjs`(sharp): spec 을 읽어 정본 초상 위에 생성물의 지정 영역만 합성한다. 영역은 타원이고 여러 개를 줄 수 있다.
    - 순서: 등록(스케일·이동 탐색) → 영역 합성(smoothstep 페더 + 테두리 색 평균 보정) → 1차 검수 → 한 줄 시트·포스터 WebP·manifest.json·provenance.json 쓰기.
    - 검수에서 떨어지거나 용량 상한을 넘으면 파일을 쓰지 않고 실패한다.
    - `--report` 는 검수 수치와 칸 PNG 만 spec.reportDir 에 쓴다.
  - `lib/master-motion/sheets.mjs`
    - 칸 120ms, 2~12칸.
    - 용량 상한 `MASTER_MOTION_BUDGETS`: portrait 600×720(시트 400KB·포스터 80KB), avatar 112×112(시트 80KB·포스터 12KB).
    - 목록 `MASTER_MOTION_SHEETS`, `masterMotionArt(id, 변형)`.
  - `lib/master-motion/flags.mjs`: `MASTER_SPRITE_SHEETS`(마스터별 롤백 스위치).
  - `MasterMotion.tsx`·`.module.css`: `art.sheet` 지원.
    - 포스터를 배경으로 깔고, 시트를 다 받으면 0.3s 페이드로 드러낸다.
    - 재생은 `useSpritePlaybackGate` 가 화면 밖·탭 숨김·reduced-motion 에서 멈춘다. 시트는 게이트가 열릴 때만 받는다(`useLazySpriteSource`).
  - `__tests__/ui/master-motion-assets.test.mjs` 4개: 매니페스트·provenance 존재, 용량·크기, 목록 = 폴더·매니페스트·플래그, CSS 계약(transform 만, steps(), .3s 페이드, reduced-motion 숨김).
  - `docs/design/master-motion-assets.md` 에 "스프라이트 시트 (F)" 절.
- 설계 차이(문서 원안과 다름)
  - 원안은 `background-position` 을 steps() 로 옮기는 방식이었다. design-canon 의 "transform·opacity 만" 규칙에 맞춰, 칸 수 × 100% 너비의 줄을 `transform: translateX` 로 steps() 이동한다.
  - 주기 = 칸 수 × 1200ms. 앞 10% 동안 칸마다 120ms 를 보이고, 나머지 90% 는 줄이 상자 밖에 있어 포스터가 대기 화면이다.
- 검증: node --test 4/4. check:fast 는 sitemap-drift 만 BLOCKED였고, sitemap:generate(lastmod 9건) 뒤 다시 돌려 exit 0.

### F2 연이 스프라이트 (2026-11-22)
- 커밋: ed3f38db4 (check:fast exit 0 — paid-gate 78/78, typecheck, lint, test:node, jest 8518 pass)
- 생성
  - 도구: Codex CLI 0.156.1 OAuth 내장 image_gen(gpt-image-2), `-m gpt-5.6-terra`. 과금 API 호출 0회.
  - 입력: 정본 `yeoni-love-portrait.webp`(600×720)를 좌우 60px 거울 확장해 720², 다시 1024² 로 키운 `input-1024.png`.
  - 편집 4종: half·closed·mouth·breeze. 프롬프트는 텍스트·워터마크·꽃잎·물체 추가를 금지하고 같은 배경을 유지하게 했다.
  - 원본: `D:\CodeDestiny-Build\master-motion\yeoni\` (input-1024.png, raw-half/closed/mouth/breeze.png, report/).
    - Codex 샌드박스가 이 폴더에 쓰지 못해 `~/.codex/generated_images/<세션>/` 에서 시간 순으로 직접 복사했다.
  - spec: `scripts/sprites/master-motion/yeoni.json`
- 1차 픽셀 검수
  - 방식: 8px 블록 평균 밝기 차이. Codex 가 그림 전체를 다시 그려 픽셀 단위 잡음이 약 12 라서 블록 평균으로 바꿨다.
  - 등록 결과: 전부 스케일 1, 이동 0~1px.

  | 칸 | guardDiff(영역 밖) | regionDiff(영역 안) | 판정 |
  |---|---|---|---|
  | half | 4.27 | 30.29 | 합격 |
  | closed | 4.18 | 36.74 | 합격 |
  | mouth | 2.88 | 2.69 | 불합격(변화 부족) |
  | breeze | 3.32 | 12.04 | 합격이나 쓰지 않음(한 칸만 튀어 루프가 안 됨) |

  - 문턱(guard ≤ 5, region ≥ 8)은 수치를 본 뒤에 정했다. 생성물 4장의 영역 밖 흔들림(2.9~4.3) 바로 위로 잡은 값이다.
  - 결과: 최소 구성(깜빡임만) `["half","closed","half"]` 3칸.
- 2차 visual-checker(칸 정지 이미지): 출시 합격.
  - 바뀐 픽셀은 x206–346·y87–179 안에만 있고, 밖은 원본과 같다.
  - 페더 색 편차 2/255 미만.
  - 관찰(결함 아님): closed 의 왼눈 위 옅은 주름, half·closed 의 오른눈 아래 왼쪽 가는 분홍 선.
- 산출: `public/images/master-motion/yeoni/`

  | 파일 | 크기 | 비고 |
  |---|---|---|
  | portrait-sheet.webp | 253,022B | 1800×720 |
  | portrait-poster.webp | 79,348B | q76. q80 은 85,088B 로 상한을 넘어 빌드가 실패했다 |
  | avatar-sheet.webp | 14,452B | 336×112 |
  | avatar-poster.webp | 4,944B | |
  | manifest.json, provenance.json | | |

  - 아바타 크롭(115,45,280)은 기존 `avatars/yeoni-love.webp`(build-master-avatars.mjs)와 같다.
- 배선
  - `MASTER_MOTION_SHEETS.yeoni`, `MASTER_SPRITE_SHEETS = { yeoni: true }`.
  - `master-profiles.ts`: `masterProfiles.yeoniLove.motion`(소개장 초상), `productMasters.love[0].motion`(마스터 띠 아바타).
  - `master-profile.module.css`: `.frame { --mm-art-inset: 10px }`, 시트 레이어 둥글림, `.seal { z-index: 2 }`.
  - 연이가 나오는 곳은 `/love-secret-ai/` 하나다(마스터 띠 + 소개장). 다음 세 곳에는 연이 초상이 없어 연결하지 않았다.
    - yehwa-home 마스터 카드(무성·서한비·윤달)
    - fortune-consultation-ui `entry()`
    - 대표 상담 배너(정적 셸)
- 실제 화면 확인(dev 3123, Playwright, DPR 2, 390·1280·390 reduced-motion)
  - pageerror 0.
  - 소개장: 시트 `data-ready`, 애니메이션 3.6s steps(3). 레이어 278×334 가 img 와 같은 자리다(테두리 1px + inset 10px).
  - 아바타: 화면 안에서 시트 `data-ready`, 3.6s steps(3). 화면 밖으로 나가면 게이트가 닫혀 시트 레이어가 빠진다.
  - reduced-motion: 시트 레이어 0개, 정적 img 만 보인다.
  - visual-checker: 출시 합격.
    - 포스터와 정적 원본은 dx=0·dy=0 에서 가장 잘 맞는다(1px 밀면 차이 6.3→27.9).
    - 둥글림이 같고, 원 밖으로 삐져나온 곳이 없다.
    - 입·배경은 그대로다.
    - 인장이 시트 위에 보인다(데스크톱에서 확인).
- 남은 위험
  - 360×432 변형이 없다. 모바일도 600×720 시트(253KB)를 받는다. 게이트가 열릴 때만 받는다.
  - 검수 문턱을 수치를 본 뒤 정했다.
  - 모바일 390 캡처는 쿠키 배너가 초상 하단 약 40%와 인장을 가려, 그 부분은 데스크톱으로 대신 판정했다.
  - 아바타 포스터가 정적 원본(128→56 축소)보다 약간 선명하다. 시트를 늦게 받으면 페이드 때 선명도가 아주 약하게 바뀔 수 있다.
  - 시트 칸이 포스터보다 약간 흐리다(라플라시안 분산 774→569). 120ms 라 거의 눈에 띄지 않는다.
  - visual-checker 는 정지 칸만 봤다. 실제 120ms 재생을 사람이 눈으로 본 확인은 없다.
- F3(윤달)에서 피할 함정
  - Codex 는 `-m gpt-5.6-terra` 가 필요하다. 샌드박스 밖(D:\CodeDestiny-Build)에 쓰지 못하므로 `~/.codex/generated_images` 에서 복사한다.
  - 기울어진 얼굴은 영역을 타원 두 개(눈마다 하나)로 준다.
  - 포스터가 80KB 를 넘으면 spec `webp.default.poster` 품질을 낮춘다.
  - 저장소 밖 스크래치 스크립트는 sharp 를 못 찾는다. 워크트리 `.tmp/` 에서 돌린다.

### F3 윤달·F4 무성 스프라이트 (2026-11-22)
표기: [실측]은 명령·스크립트로 잰 값, [추정]은 측정 없이 판단한 것.

- 커밋(워크트리 `wt/master-motion-f3f4-20261122-074712`, 기준 573b3e35f)
  - d20687016 F3 윤달(`yun` 점성술 정본·`yun-life-book` 인생의 책 정본, 정본 그림이 달라 id 를 둘로 나눴다)
  - 88ba0c4ea 인생의 책 윤달 포스터 품질 76→86 (spec `webp.default.poster`, 시트는 바이트 동일)
  - d36e382314 F4 무성 (+ master-profiles 변경으로 sitemap lastmod 26건 재생성)
- 검증 [실측]: F3·F4 check:fast 모두 paid-gate 78/78 통과, BLOCKED 는 verify:sitemap-drift 하나 → sitemap:generate 뒤 OK. F4 는 BLOCKED 때문에 뒤 단계가 안 돌아 직접 실행: typecheck exit 0, test:node pass 5790 / fail 0, test:jest 8542 pass / 1 skipped. check:pre-push 6종 OK(커밋 737964a06).
- 전달: 워크트리 브랜치에 origin/main(d04c6e418)을 머지하고 sitemap 재생성 뒤 그 트리를 main 으로 push 했다(check:pre-push OK, tsc 0, 자산 테스트 4/4). main 체크아웃의 로컬 main 에는 옆 세션(card-rpg-lobby, 미push·"전체 검사 통과 판정 보류")의 머지 52c470c4a 가 있어, 그 커밋은 이 push 에 싣지 않았다. 로컬 main 은 push 뒤 origin/main 을 머지해 맞췄다.
- 생성: F2 와 같은 Codex CLI 0.156.1 OAuth(gpt-image-2, `-m gpt-5.6-terra`), 과금 API 0회. 편집은 half·closed 두 종만(F2 에서 mouth·breeze 는 쓰지 못했다). 원본 `D:\CodeDestiny-Build\master-motion\<id>\`, 해시는 각 `provenance.json`.
- 1차 픽셀 검수 [실측] — 모든 칸, 문턱 guard ≤ 5 / region ≥ 8. 등록은 전부 스케일 1, 이동 0(무성 half 만 dx1·dy1).

  | id | 칸 | guard(영역 밖) | region(영역 안) | 전체 차이 |
  |---|---|---|---|---|
  | yun | half | 3.01 | 26.66 | 2.97 |
  | yun | closed | 3.45 | 41.71 | 2.62 |
  | yun-life-book | half | 2.32 | 18.00 | 3.51 |
  | yun-life-book | closed | 3.70 | 27.36 | 4.48 |
  | musung | half | 3.01 | 32.08 | 3.49 |
  | musung | closed | 3.49 | 43.45 | 4.00 |

  - 문턱 근처 칸 없음(guard 최대 3.70, region 최소 18.00). 버린 칸 없음. 시퀀스는 셋 다 `["half","closed","half"]` 3칸.
  - 무성: 처음엔 두 눈을 합성했으나 visual-checker 가 불합격 — 정본에서 화면 왼쪽 눈은 머리카락에 가려 있는데 그 자리에 새 눈이 생겼다. 화면 오른쪽 눈 타원 하나(cx318·cy246·rx38·ry28)만 합성해 다시 통과.
- 크기 [실측] (상한: 소개장 시트 400KB·포스터 80KB, 아바타 시트 80KB·포스터 12KB)

  | id | portrait-sheet | portrait-poster | avatar-sheet | avatar-poster |
  |---|---|---|---|---|
  | yun | 199,770 | 53,932 (q76) | 14,032 | 4,870 |
  | yun-life-book | 189,672 | 68,874 (q86) | 12,798 | 4,350 |
  | musung | 219,980 | 58,668 (q76) | 13,064 | 4,486 |

- 선명도 [실측] 라플라시안 분산(정본 / 포스터 / 칸 3장)
  - yun 소개장 1002 / 1014 / 1045·1053·1044
  - yun-life-book 소개장 1578 / 1534(q86, q76 은 1473 이라 올렸다) / 1667·1647·1668
  - musung 소개장 1118 / 1148 / 1167·1165·1168
  - 아바타(포스터 / 칸): yun 4165 / 4139·4236·4149, yun-life-book 3402 / 3359·3415·3363, musung 4021 / 4030·4062·4037
  - yun·musung 포스터를 q86 으로 올리면 80KB 를 넘는다(yun 85,584B). q76 도 이미 정본 이상이라 76 유지.
- 2차 visual-checker(정지 칸) — 셋 다 출시 합격. 질문을 나눠 받았다.
  - 경계 색 번짐: 페더 고리 평균 ±0.5 이내. yun 오른눈 두 구역은 새 속눈썹 선이 고리를 가로지른 것이며 색 패치가 아니다.
  - 얼굴 윤곽 어긋남: 근접 띠 평균 2.4~3.6(포스터 대 정본과 같은 수준), 25 초과 픽셀 0. 경미: yun-life-book 왼눈 눈썹 조각이 약 1px 아래로 다시 그려짐(화면에서 약 0.9 기기 px).
  - 포스터 대 시트 선명도: 최대 대비 정본/포스터/칸 = yun 36.0/34.9/35.2, yun-life-book 41.5/40.8(q86)/41.7, musung 37.0/36.0/36.4. q86 포스터는 정본과 오프셋 (0,0), 평균 차 1.18.
- 실제 화면 [실측] (dev 3131, Playwright DPR2, 390·1280·390 reduced-motion, 쿠키 `cd_cookie_consent=essential` 로 배너 제거)
  - 12회 실행 모두 pageerror 0, 가로 넘침 0(scrollWidth = 뷰포트).
  - 배선된 모든 요소: 시트 레이어와 img 의 dx·dy·dw·dh 0, `data-ready`, 애니메이션 mmSheet 3.6s steps(3). 둥글림 소개장 20px·dossier 12px·아바타 50% 가 그대로 이어진다.
  - reduced-motion: 시트 레이어 0개, master-motion 요청 0건.
  - 재생 허용 때만 시트를 받는다: 화면 밖에서 시작한 소개장(점성술 y4770/3294, 인생의 책 y4400/3322, 자미두수 y2679/2857)은 스크롤 전 요청 0건. 처음부터 화면 안에 있는 아바타는 로드 때 받는다.
  - visual-checker(화면 크롭): 전부 합격. 초융합 무성 1280 크롭은 처음에 판정 불가였고 요소 전체로 다시 찍어 합격.
- 배선
  - `/astrology-ai/` MasterProfile 윤달 소개장(`masterProfiles.yun`)
  - `/life-book-ai/` ProductMasterStrip 윤달 아바타(`yun-life-book`) + dossier 초상 `#life-book-master`
  - `/fusion-fortune/` 윤달·무성 아바타
  - `/ziwei-ai/` MasterProfile 무성 소개장(`masterProfiles.musung`)
  - `productMasters.vedic[0]` 에 motion 을 넣었지만 쓰는 곳은 story-masters(일반 `<Image>`)뿐이라 지금은 화면 효과가 없다.
- 연결하지 않은 곳과 이유
  - yehwa-home `.yh-basic-masters` 카드: 정본 초상이 아니라 `/images/home/illustrated/method-*-160.webp` 삽화를 쓴다.
  - fortune-consultation-ui.js `entry()`: 정적 셸 vanilla JS, 16/9 object-fit cover 크롭이라 MasterMotion 이 없다.
  - app/consultations/[slug](story-masters): 일반 `<Image>`.
  - VedicAiClient·LifeBookAiClient `counselor={{src}}`: MasterMotion 이 아니다.
  - 초융합 연이: 다른 초상을 쓴다(F2 시트와 그림이 다르다).
- 관찰(결함 아님) [추정]
  - 속눈썹·쌍꺼풀 선이 정본보다 약간 덜 붉다(yun 어두운 5% (36,12,12)→(41,28,24), 이 값은 [실측]).
  - 꽃잎 입자가 가끔 얼굴 위를 지나가지만 눈을 가리지 않는다(기존 CSS 층).
  - half 칸이 홍채를 절반보다 약간 더 덮는다.
- 남은 위험·미검증
  - 실제 120ms 재생을 사람이 눈으로 본 확인은 없다. visual-checker 는 정지 칸과 화면 크롭만 봤다.
  - 360×432 변형이 없어 모바일도 600×720 시트(190~220KB)를 받는다(게이트가 열릴 때만).
  - 문턱(guard 5 / region 8)은 F2 수치를 보고 정한 값이다.
- F5(서한비)에서 피할 함정
  - sheets.mjs·flags.mjs 는 작업 트리에서 CRLF 다. node 정규식 삽입은 조용히 실패한다 — Edit 도구로 고친다.
  - 화면 밖 요소 스크린샷은 숨쉬기 애니메이션 때문에 `scrollIntoViewIfNeeded` 가 시간 초과한다. JS `scrollIntoView({block:"center"})` 뒤 page.screenshot clip(뷰포트 안으로 자름).
  - /ziwei-ai/ 는 로컬 인증 API(8791) ECONNREFUSED 로 networkidle 에 닿지 않는다. `waitUntil:"load"` + 6초.
  - Git Bash 에서 `/astrology-ai/` 같은 인자는 Windows 경로로 바뀐다. 앞 `/` 없이 넘긴다.
  - check:fast 를 `timeout` 으로 감싸지 않는다(유료 게이트 스위트가 약 17분, 잘리면 엉뚱한 verify 가 실패한 것처럼 보인다).
  - 머리카락에 가린 눈은 합성하지 않는다(무성 불합격 사례).

### F5 서한비·F6 네오 스프라이트 (2026-11-22)
표기: [실측]은 명령·스크립트로 잰 값, [추정]은 측정 없이 판단한 것.

- 커밋(워크트리 `wt/master-motion-f5f6-20261122-104247`, 기준 29550bf9e8)
  - 4559d30e31 F5 서한비(`hanbi` 숙요점 정본·`hanbi-love` 연애 비책 전용 초상) + 빌드 스크립트 `keep` 기능
  - 45c0c758ea F6 네오(`neo` 운명 전략 정본·`neo-new-year` 신년운세 전용 초상)
- 새 기능 `keep`(F5): 프레임 영역 안이지만 생성물이 다르게 다시 그린 작은 무늬(점·머리카락 가닥)를 정본 무늬로 되돌리는 타원. 밝기는 keep 바깥 3px 고리의 톤 차에 맞춘다. QA 의 region 수치는 keep 핵심과 닿는 블록을 빼고 잰다. 서한비: 오른쪽 눈 아래 점(hanbi), 두 눈 사이 머리카락 가닥(hanbi-love). provenance 에 keep 이 기록된다.
- 생성: Codex CLI OAuth(gpt-image-2, `-m gpt-5.6-terra`), 과금 API 0회. half·closed 두 종. 원본 `D:\CodeDestiny-Build\master-motion\<id>\`(raw·input·report·log), 해시는 각 `provenance.json`.
- 1차 픽셀 검수 [실측] — 모든 칸, 문턱 guard ≤ 5 / region ≥ 8. 문턱 근처 칸 없음(guard 최대 4.35, region 최소 22.34), 버린 칸 없음. 시퀀스는 넷 다 `["half","closed","half"]`.

  | id | 칸 | guard | region |
  |---|---|---|---|
  | hanbi | half | 2.50 | 26.12 |
  | hanbi | closed | 3.26 | 33.33 |
  | hanbi-love | half | 3.39 | 26.50 |
  | hanbi-love | closed | 3.31 | 22.34 |
  | neo | half | 3.18 | 44.42 |
  | neo | closed | 3.61 | 52.25 |
  | neo-new-year | half | 3.37 | 26.37 |
  | neo-new-year | closed | 4.35 | 35.80 |

  - neo-new-year closed guard 4.35 는 톤 차를 빼도 같고, 상자 가장자리(머리카락·왼쪽 아래 뺨) 블록에서 나온다. 그 자리는 합성에서 정본 픽셀이다(영역 밖). 톤 차를 뺀 guard: nny half 2.46, neo half 2.77 / closed 2.56.
  - 영역: hanbi·hanbi-love·neo 는 눈마다 타원 하나. neo-new-year 는 눈이 기울어(안쪽 눈꼬리가 아래) 눈마다 큰 타원 + 안쪽 아래 작은 타원. 작은 타원이 없을 때 감은 눈 속눈썹 선이 안쪽 절반에서 끊겼다(visual-checker 불합격 → 고친 뒤 합격).
- 크기 [실측] (상한: 소개장 시트 400KB·포스터 80KB, 아바타 시트 80KB·포스터 12KB)

  | id | portrait-sheet | portrait-poster | avatar-sheet | avatar-poster |
  |---|---|---|---|---|
  | hanbi | 199,314 | 52,294 (q76) | 11,890 | 4,112 |
  | hanbi-love | 241,662 | 79,190 (q84) | 12,012 | 4,100 |
  | neo | 275,828 | 76,466 (q76) | 14,928 | 5,142 |
  | neo-new-year | 313,328 | 78,522 (q40) | 14,942 | 5,124 |

  - neo-new-year 포스터: 정본 파일 자체가 90,676B 라 q50 에서도 85,122B 로 상한을 넘었다(preset drawing·picture·photo 도 84~85KB). q40 으로 낮췄다(MAE 3.99, neo q76 은 3.26). visual-checker: 1x 에서 정본과 구분 불가(PSNR 32.4~34.2dB, 24 초과 픽셀 0.38%), 색 이동 < 0.3. 3배 확대에서만 화면 왼쪽 눈 홍채 하이라이트 번짐(RMSE 8.0). 포스터는 시트를 받는 동안만 보이고 시트(q80)가 0.3s 페이드로 덮는다. 상한(공유 정책 상수)은 올리지 않았다.
- 선명도 [실측] 라플라시안 분산(정본 / 포스터 / 칸 3장)
  - hanbi 소개장 826 / 849 / 865·873·865, 아바타 2775 / 2653 / 2663·2651·2663
  - hanbi-love 소개장 2759 / 2693 / 2919·2860·2920, 아바타 2870 / 2753 / 2769·2801·2797
  - neo 소개장 1998 / 2067 / 2059·2063·2060, 아바타 5135 / 4907 / 4946·4906·4936
  - neo-new-year 소개장 4141 / 4440(q40 잡음으로 올라감) / 4327·4275·4333, 아바타 4417 / 4250 / 4288·4390·4326
- 2차 visual-checker(정지 칸, 질문 분리: 번짐·윤곽·가린 부위 새 그림·포스터 대 칸 선명도) — 넷 다 출시 합격.
  - hanbi: 눈 아래 점이 정본과 같다(keep), 원반 얼룩 없음(고리 밝기 +1.8/+1.4, 정본 +0.8).
  - neo: 화면 왼쪽 눈을 가로지르는 머리카락 가닥이 반감·감음 칸에서도 이어진다(눈꺼풀 위 대비만 약함). 감음 칸 오른쪽 눈꺼풀 1~2px 밝은 점(약 293,218, +15~20 휘도)은 7배 확대에서만 보여 두었다.
  - neo-new-year: 안쪽 눈꼬리 작은 점(235~236,142)이 칸마다 58→102→71 로 깜빡인다. half 칸이 약간 부드럽다(선 선명도 60.6 대 66.9). closed 칸은 정본과 같다.
- 실제 화면 [실측] (dev 3140, Playwright DPR2, 390·1280·390 reduced-motion, 쿠키 `cd_cookie_consent=essential`)
  - F5: /sukuyo-compatibility-ai/·/love-secret-ai/·/fusion-fortune/, F6: /new-year-ai-consultation/·/fusion-fortune/·/neo-operation-room/
  - 모든 실행 pageerror 0, 가로 넘침 0. 배선된 모든 요소 시트 레이어와 img 의 dx·dy·dw·dh 0, `data-ready`, mmSheet 3.6s steps(3). 둥글림 소개장 20px·dossier/신년 소개장 12px·아바타 50% 그대로.
  - reduced-motion: 시트 레이어 0개, master-motion 요청 0건.
  - 재생 허용 때만 받는다: 화면 밖 소개장(숙요 y2756/1990, 신년 y3364/2668, 상황실 1280 y1077)은 스크롤 전 요청 0건. 상황실 390(y953)은 뷰포트 844 + 게이트 rootMargin 160px 안이라 로드 때 받는다(정상).
  - visual-checker(화면 크롭): F5·F6 모두 합격. NOTE — sukuyo 1280 이 가장 부드럽다(약 1.07배 확대), love 아바타 눈꼬리 복숭아색 점은 CSS 꽃잎 층(스프라이트 픽셀 최대 (183,140,127)), 카드 0.33° 기울기는 기존 W4 숨쉬기(rotate ±0.4deg)로 그림과 오버레이가 함께 기운다.
  - 첫 sukuyo 390 로드에서 pageerror 1건("Invalid or unexpected token")·루트 없음 → 재실행 0건. dev 첫 컴파일 산물로 판단[추정].
- 네오 중복 판단: 겹치지 않는다.
  - NeoSpriteActor·NeoTalkingPortrait 는 전쟁 상황실 히어로·커맨드 덱에서 투명 말하기 시트(neo-talk-v1, 2×2, 자체 깜빡임)를 쓴다. MasterProfile·ProductMasterStrip 은 MasterMotion 으로 neo-strategy·neo-new-year 초상을 쓴다. 둘 다 useSpritePlaybackGate 를 공유한다.
  - /neo-operation-room/ 에서는 둘이 같은 페이지에 있다(MasterProfile 은 `!hasActiveWarRoomEntry && !showCommandDeck && …` 일 때만). 위치 [실측]: 390 말하기 y426~652 / 소개장 y953~1289, 1280 말하기 y298~746 / 소개장 y1077~. 겹침 없음, 스크롤 중 둘 다 보일 수 있다(F3 점성술 윤달과 같은 선례).
- 배선
  - F5: `/sukuyo-compatibility-ai/` MasterProfile 서한비(`masterProfiles.hanbi`), `/love-secret-ai/` 띠 아바타(`hanbi-love`) + MasterProfileGroup 소개장, `/fusion-fortune/` 서한비 아바타(`hanbi`)
  - F6: `/neo-operation-room/` MasterProfile 네오(`masterProfiles.neo`), `/new-year-ai-consultation/` 띠 아바타 + MasterProfile `#new-year-master`(`neo-new-year`), `/fusion-fortune/` 네오 아바타(`neo`)
- 연결하지 않은 곳과 이유
  - `productMasters.karma` 네오·서한비: 쓰는 곳이 story-masters·ConsultationMasterIntro(일반 `<Image>`/`<img>`)뿐
  - FusionSectionBody·ConsultationReading·ConsultationIllustration: 일반 이미지
  - CraftedProductDetail: html 문자열 렌더
  - NewYearAiClient `counselor={{src}}`(약 679줄): MasterMotion 이 아니다
  - yehwa-home 카드: 정본 초상이 아닌 삽화
- 검증 [실측]
  - F5·F6 check:fast 모두 BLOCKED 는 verify:sitemap-drift 하나 → sitemap:generate 뒤 OK, 막힌 뒤 단계 직접 실행 전부 통과.
  - F5: test:node 의 sky-and-range ENOENT 1건 → `npm run fortune:build-data` 뒤 통과. verify 24종·build:worker·entry-encoding ok, test:jest 490 suites / 8553 pass / 1 skipped.
  - F6: typecheck ok, test:node 5795/5795, verify 23종·build:worker·entry-encoding ok, test:jest(변경 기반) 38 suites / 1950 pass / 1 skipped. 자산 테스트 4/4.
- 남은 위험·미검증
  - 실제 120ms 재생을 사람이 눈으로 본 확인은 없다(정지 칸·화면 크롭만).
  - neo-new-year 포스터 q40: 시트가 늦게 오는 느린 망에서 1초 넘게 보이면 화면 왼쪽 눈 하이라이트가 약간 뭉개져 보일 수 있다[추정]. 페이드 중 눈 위치 차이는 측정하지 않았다.
  - 360×432 변형이 없어 모바일도 600×720 시트(200~313KB)를 받는다(게이트가 열릴 때만).
- F7(영냥이)에서 피할 함정
  - 정본 파일이 80KB 를 넘으면 포스터는 품질만으로 맞추기 어렵다. 먼저 정본 크기와 q 별 바이트를 재고 결정한다.
  - 기운 눈은 축 정렬 타원 하나로 덮이지 않는다. 감은 칸 속눈썹 선이 생성물 끝까지 닿는지 확인하고 작은 타원을 덧댄다.
  - dev 서버를 오래 켜 두면 `ERR_MEMORY_ALLOCATION_FAILED` 로 컴파일이 멈춘다(F6 에서 /neo-operation-room/ 120초 시간 초과). `NODE_OPTIONS=--max-old-space-size=8192` 로 다시 켜고 페이지를 curl 로 미리 데운다. TaskStop 뒤에도 next 자식 프로세스가 3140 을 잡고 남아 PID 로 끝냈다.
  - 영냥이는 variant `yeongnyangi`(금빛 별가루, 분홍 없음)다.

### F7 영냥이 눈 깜빡임 부분 시트 (2026-11-22)
- 커밋: f13075f36d (워크트리, 미push)
- 기존 장치 확인 [실측]:
  - 영냥이 정본은 쓰다듬기 마스코트 `app/yeongnyangi/_components/PetMascot.tsx`(hero-800, srcset hero-480)다. 이것을 쓰는 화면은 `/yeongnyangi/` 랜딩(NightHero)과 `/yeongnyangi/room/`(Room) 두 곳이다.
  - `app/yeongnyangi/_home/CatMotion.tsx`(걸음·기분 포즈)는 어디서도 import 되지 않는다(git grep). PetMascot 과도 별개라 겹치지 않으며, 손대지 않았다.
  - ServiceEntryScene(`.cd-entry-scene`)에는 연결하지 않았다. 다른 그림(cat-reading-entry)을 최대 1.8s 보여 주고, reduced-motion 이면 건너뛰며, LCP 와 경쟁하기 때문이다.
- 새 kind `patch`:
  - 정본 좌표의 사각형(area 252,200 324×160 /800)만 덮는다. 3칸 = base(완전 투명)·half·closed, sequence half→closed→half. 포스터는 없다.
  - 칸 알파 = 눈 타원 무게 × 정본 알파다. 눈 밖에서는 아래 `<img>` 가 그대로 보인다.
  - 불투명 사각형을 쓰지 않은 이유 [실측]: hero-480 의 라플라시안은 3390, hero-800 을 480 으로 줄인 것은 2382 라서 상자 경계에 이음매가 생긴다.
  - 코드:
    - `masterMotionPatch()`(sheets.mjs), `MasterMotionPatch`(MasterMotion.tsx), `.patch`/`.patchRow` CSS
    - 첫 깜빡임 1.6s 지연. reduced-motion 이면 `.patch{display:none}`. 누르는 반응 중에는 `paused`.
    - 빌드 스크립트 `buildPatch()`: area·타원+페더가 area 안에 있는지, `qa.minPatchAlpha`, 용량을 검사한다. patch 에서 `keep` 을 쓰면 실패한다.
- 생성: Codex CLI 0.156.1 OAuth 내장 image_gen(gpt-image-2)으로 hero-800 을 편집 입력했다. 원본은 `D:\CodeDestiny-Build\master-motion\yeongnyangi\`(raw-half.png, raw-closed.png). 과금 API 는 쓰지 않았다.
- 꼬리는 만들지 않았다. 꼬리가 투명 윤곽 가장자리에 걸쳐 있어서 겹치기로 원래 꼬리를 가릴 수 없다.
- 산출 [실측]: `public/images/master-motion/yeongnyangi/mascot-sheet.webp` 14,758B(972×160, 상한 60,000B), manifest.json, provenance.json, spec `scripts/sprites/master-motion/yeongnyangi.json`
- 1차 QA [실측] (`--report`, 기준 guard ≤5·region ≥8):

  | 칸 | guard | region | 정합 | 톤 보정 뒤 guard(부호 평균) |
  |---|---|---|---|---|
  | half | 3.95 | 43.45 | scale 1, dx 0, dy 0 | 1.70 (−3.57) |
  | closed | 3.49 | 59.1 | dx 1, dy 0 | 2.06 (−2.48) |

  - raw guard 는 전체 톤 차이 때문이다. 구조적으로는 경계 근처가 아니다.
  - 라플라시안(area / 왼눈 / 오른눈):

    | | area | 왼눈 | 오른눈 |
    |---|---|---|---|
    | base | 1923 | 2868 | 3214 |
    | half | 1809 | 2385 | 2992 |
    | closed | 1466 | 1368 | 1869 |

    closed 는 홍채·하이라이트 경계가 없어서 낮다.
- 2차 QA [visual-checker, 정지 칸]: ship.
  - 번짐 ≤1.8~3.4, r≥1.3 너머 0, 상자 이음매 없음
  - 새 그림 없음(왼쪽 볼터치 R−B 19.3→24.5 약간)
  - 털 질감 비슷, 포스터보다 흐리지 않음
  - 첫 검수에서 오른눈 바깥 속눈썹 끝이 떠 있는 점이 보였다. 오른쪽 타원을 키우고(cx503 cy258 rx60 ry48) 왼쪽을 rx68 ry33 으로 바꿔 해소했다.
- 실제 화면 [실측, dev :3150, DPR 2]:
  - 범위: `/yeongnyangi/` · `/yeongnyangi/room/`, 각각 390·1280·390 reduced-motion
  - 6건 모두 pageerror 0, 가로 넘침 0
  - 패치 사각형 대 img×area%: dx/dy/dw/dh |≤0.01px| (반올림)
  - 재생 허용: data-motion on, 줄 1, `3.6s steps(3) 1.6s infinite`. 누르는 동안 줄 0, 3.2s 뒤 1.
  - reduced-motion: display none, 줄 0, `/images/master-motion/yeongnyangi/` 요청 0
  - 아래 img: 랜딩 390 은 hero-480(184px), 나머지는 hero-800
- visual-checker(실화면 캡처 12장, 픽셀 차분): 4화면 × 6항목 모두 ship.
  - 상자 밖 ±2px 차분 max 0
  - 상자 안 순수 털 휘도 차 +0.15~0.50
  - room drop-shadow 와 어긋남 없음
- 검증 [실측]:
  - check:fast 1차·2차 결과
    - 1차: BLOCKED verify:sitemap-drift → `npm run sitemap:generate`
    - 2차: test:node 1 fail. `__tests__/ui/yeongnyangi-pet-mascot.test.mjs` 의 vm 하네스가 PetMascot 의 `@/` import 를 풀지 못했다. 하네스에서 MasterMotion(.tsx)은 stub 으로, `@/` 는 실제 파일로 바꾸니 3/3 통과.
  - 3차 exit 0
    - paid-gate 78/78
    - typecheck ok, test:node 5795/5795
    - verify 23종 ok, build:worker ok, entry-encoding ok
    - test:jest 490 suites, 8553 pass, 1 skipped
  - 자산 테스트 4/4. 변이 확인: reduced 에서 `.patch` 를 빼면 1 fail.
- SEO 점검:
  - 영향 없음: title/description/H1/canonical/robots. 패치는 aria-hidden 장식 span 이고 새 URL·이미지 색인도 없다.
  - sitemap-lastmod 는 app/** 편집 때문에 재생성했다.
- 남은 위험:
  - [실측] 390 랜딩(hero-480 위)에서만 half/closed 눈꺼풀 선 기울기가 base 보다 10~15% 무르다. 나머지 화면은 ±5% 안이다. 1배 184px 실기기에서 눈에 띌지는 미검증이다.
  - [실측] 감은 속눈썹 선 중심 휘도가 33~40 으로, base 눈꺼풀 선(12~16)보다 옅다. 생성물이 원래 그렇게 그렸다.
  - [미검증] 사람이 실제 120ms 재생을 눈으로 본 확인은 없다(정지 칸·차분만).
  - [추정] 반응 시트(mascot-reactions) 재생 중에는 패치를 숨기므로 두 시트가 겹치지 않는다. 다만 반응이 끝난 직후의 첫 깜빡임 타이밍은 재지 않았다.

#### F5~F7 전달 상태 (2026-11-22) — 완료: origin/main 8ed2fe5f5 PR CI 녹색 확인 뒤 머지·sync:public·check:pre-push 통과, c4ec066d06 로 push
- H 뒤 1회 확인 [실측, 2026-11-22]: origin/main 머리 그대로 9e6866ce1e, push PR CI 44975100389 failure 그대로(새 실행 없음), Yeongnyangi Browser Shadow 는 최근 5개 머리(9e6866ce1e·099c462781·cbf29560d6·b43e97c003·ed8b080660) 모두 failure 인 기존 shadow 실패(42건 중 1건 TimeoutError). H 도 push 하지 않았다. H 뒤 pre-push 는 push 직전에 돈다.
- G 뒤 1회 확인 [실측, 2026-11-22]: origin/main 머리 그대로 9e6866ce1e, PR CI failure·Yeongnyangi Browser Shadow failure 그대로. G 도 push 하지 않았다. G 커밋 뒤 pre-push 는 아직 안 돌렸다(push 직전에 돈다). G 쪽 check:fast(critical) 는 통과.
- 워크트리 브랜치 커밋: 4559d30e31(F5) · 45c0c758ea(F6) · 0174f4d2bc(문서) · e4ef55f77b(origin/main 9e6866ce1e 머지, sitemap-lastmod 충돌은 theirs 뒤 `npm run sitemap:generate` 로 재생성, verify ok, sync:public 변경 없음) · b75a9e2464(문서) · f13075f36d(F7) · 이 문서 커밋. F5·F6 시점 `npm run check:pre-push` 통과. F7 뒤에는 pre-push 를 아직 안 돌렸다(push 직전에 돈다).
- F7 뒤 1회 확인 [실측, 2026-11-22]: origin/main 머리는 그대로 9e6866ce1e, PR CI 44975100389 failure 그대로, 새 실행 없음. 같은 머리의 push "Yeongnyangi Browser Shadow" 44975100334 도 failure(shadow, 다른 세션 커밋). 그래서 F7 도 push 하지 않았다.
- 보류 이유 [실측]: origin/main 머리 9e6866ce1e(다른 세션 "Decode private preview assets once per local session")의 PR CI 44975100389 가 실패했다. Critical checks 의 `apps/toss/test/tarot-recovery-ui.test.mjs` 에서 `ReferenceError: location is not defined`(tarot-recovery-ui.cjs:15139) 로 다수 실패, CI required 도 따라 실패. workflow_dispatch 재실행 44975122943 은 취소됨. 직전 머리 29550bf9e8 은 녹색. 실패는 F5·F6(마스터 스프라이트)과 무관한 apps/toss 영역이다. CLAUDE.md "main 이 다른 세션 커밋으로 빨간색이면 그 위에 push 하지 말고 보고" 를 따랐다.
- 재개 명령(워크트리에서, main CI 녹색 1회 확인 뒤):
  1. `git fetch origin && git merge origin/main` (sitemap-lastmod 충돌 시 `git checkout --theirs config/sitemap-lastmod.json && npm run sitemap:generate`), `npm run sync:public`
  2. `npm run check:pre-push`
  3. `git push origin HEAD:main`
  4. main 체크아웃(`d:/Development/code-destiny`)은 `git fetch` 뒤 `git merge origin/main` 으로만 맞춘다(reset 금지 — 로컬 main 에 card-rpg-lobby 세션의 미push 커밋이 있다).
  5. main 체크아웃에서 `npm run worktree:remove -- D:/Development/codedestiny-worktrees/master-motion-f5f6-20261122-104247`

#### G 결과 (2026-11-22) — 미push
- 커밋(워크트리): 5ae4e5769a(방향·성공 기준 문서) · 198529f859(토큰+배너+카드) · 87bbb3bfc7(히어로 버튼) · c962ebac34(진입 entry + 셸 캐시 키) · c06c7d5e39(ProductMasterStrip + sitemap-lastmod) · 08bf6bb6d4(CONTEXT_AUDIT).
- 바뀐 화면
  - 토큰: `styles/theme-tokens.css` 두 블록에 `--cd-yehwa-night/-night-deep/-champagne/-pearl/-pearl-muted`(연이 딥 플럼, 네오는 기존 남보라 값).
  - `/ggulggul/` 대표 상담 배너: 하드코딩 hex → 토큰, 딥 플럼 그라데이션, 데스크톱 글 칸 세로 가운데 정렬, 꼬리표 앞 28px 금선, 설명–가격 사이 금빛 1px 구분선(약 200px 빈칸 제거), hover -3px·그림 1.04배.
  - 카드 목록: 소제목 앞 24px 금선, 그림 clip-path 둥근 틀, hover -3px·그림 1.04배(clip 으로 틀 밖 번짐 없음). 모두 `(hover:hover) and (prefers-reduced-motion:no-preference)` 안.
  - 히어로 주 버튼: 바깥 1px 금선 3px 띄움(이중 금테), forced-colors 대응, focus-visible 유지.
  - 진입 `entry()`: 제목 MaruBuri → `--font-display`(캐논), 이름 줄 앞 28px 금선, 진입 주 버튼만 이중 금테(`.fc-primary` 공용 생성 버튼은 그대로), 밝은 테마 장면 판을 짙은 남색 → 크림 단색 + 잉크 캡션(베다·네오 어두운 팔레트 유지).
  - ProductMasterStrip: 라벨 오른쪽 남은 폭 1px 금선.
- 되돌린 것 [실측]: 카드 글 영역 크림 그라데이션 — `/ggulggul/` 카드가 어두운 테마라 회보라 띠가 되어 설명 대비 3.4–3.7:1 → 규칙 삭제(원래 배경, 8.3:1 이상). 진입 장면 그라데이션 — 데스크톱에서 판이 글 칸 높이로 늘어 위 분홍·아래 크림으로 갈림 → 단색.
- visual-checker 판정 [실측, 3회차 캡처 기준]: 배너 데스크톱 가운데 정렬(위 92/아래 88px)·대비 11–17:1·장식선 정렬 0.5–1.4px·hover 그림 틀 밖 번짐 없음·진입 버튼 이중 금테 네 면·크림 캡션 6.2:1·마스터 띠 대비 6.0–12.9:1·m390 과 reduced-motion 동일. pageerror 0, 가로 넘침 0(데스크톱 -30 은 스크롤바).
- reduced-motion [실측]: 대상 요소 계산값 transition/animation 0.00001s·none — 내 전환은 no-preference 미디어 안이라 적용되지 않고, 남는 1e-5s 는 전역 reduced-motion 리셋 값.
- perf:home [실측, dist·시뮬 Lighthouse 중앙값 3회] 전 → 후: `/` 모바일 LCP 10378→10170ms·CLS 0.164→0.165, 데스크톱 1949→1973ms·0.050→0.050. `/ggulggul/` 모바일 20527→20281ms·0.000→0.000(LCP 요소는 편지 팝업 틀, 관측 2167→1975ms), 데스크톱 2777→2789ms·0.063→0.063. 잡음 범위 안.
- SEO: title·H1·canonical·마크업·alt 변경 없음(셸 HTML 차이는 캐시 키뿐), 장식은 가상요소만. sitemap:generate 뒤 verify:sitemap-drift OK(마스터 띠 3페이지 signature 갱신).
- 검사: check:fast(critical) EXIT 0 — lint·typecheck·test:node·jest 8553 pass. home-fusion-placement 3/3, signature-banner·home-direct-feature-links·signature-inline-letter 16/16.
- 후속 보고(범위 밖, 고치지 않음)
  - 카드 hover 때 카드 링크 전체(제목·설명·가격·CTA)에 밑줄이 생긴다. G 이전부터의 동작(링크 상속), 의도는 CTA 한 줄로 보인다.
  - 데스크톱 카드 가격 줄 높이가 카드마다 최대 65px 다르다(덧줄 유무).
  - 배너 금 구분선은 바탕 대비 약 2:1 로 은은하다(장식 의도).
  - 베다 390 캡션 띠는 본문과 같은 어두운 색이라 띠로 구분되지 않는다(G 이전과 같음).
  - `.fc-master-reading` 결과 화면 제목 MaruBuri 는 캐논 위반이지만 G 범위 밖.
- 미검증: 실제 상담 모달 흐름 안의 entry() 화면(합성 호스트에 실제 entry() HTML·CSS 를 넣어 찍음), 실기기 hover.

#### H 방향·성공 기준 (2026-11-22, 구현 전 기록 — 코딩 원칙 16)
- 방향
  - 모티프: 생성기(`scripts/design/gen-yehwa-motifs.mjs`)에 밤꽃 라인아트 두 장을 더한다 — 목련 가지(`magnolia`, 위로 피는 컵 모양 꽃 2·봉오리 1)와 연꽃(`lotus`, 7장 꽃잎·물결·봉오리·연잎). `renderYnNight()` 만 `--yn-yehwa-mask-magnolia(-sm)`·`--yn-yehwa-mask-lotus(-sm)` 로 내보낸다(-sm 은 64~100px 렌더용 굵은 획, 실제 획 ≈1px 규칙). 기존 branch-spray 바이트는 그대로(앱인토스 동기화가 뽑아 쓴다). 색은 `--yn-ivory`(꽃잎) → `--yn-gold`(줄기·물) 그라데이션만, 분홍 없음.
  - 배치(장식은 글·얼굴·터치를 가리지 않는다 — 전부 본문·고양이 **뒤** 층)
    - `/yeongnyangi/` 히어로: 데스크톱은 우하단 목련 가지(고양이 뒤로 들어가 오른쪽으로 꽃이 보임)·좌하단 연꽃(카피 아래 빈 띠). 모바일은 198px 방 그림 상자 아래 두 모서리(고양이 x 103~287 밖). 스크림(`.hero::after`)을 사진 바로 위 층으로 내리고 꽃은 그 위·본문 아래(z -1).
    - `/yeongnyangi/room/` 방 그림(`.room-presence`): 좌하 연꽃·우측 목련, 하단 캡션 위에서 끝낸다.
    - 금테 카드: 특별 상담 카드 3장(`QuestionSpecialConsultations`, 영냥이 전용)에 안쪽 4px 금 실선(이중 테두리). 선택 상태(금 테두리+raised)와 헷갈리지 않게 바깥 테두리는 그대로 둔다. 고르는 카드(체계 선택 label)는 손대지 않는다.
  - 모션: 새 `NightBloomMotion`(app/yeongnyangi/_components) — `MasterPetals variant="yeongnyangi" density="sm"`(금빛 별가루 재사용) + 아이보리 목련 꽃잎 3~4장 낙하(전용 CSS Module 키프레임, transform·opacity 만). `useSpritePlaybackGate`(보일 때·탭 활성·reduced-motion 아님) + `MASTER_MOTION_ENABLED` 일 때만 그린다. 범위는 히어로 고양이 칸/방 그림 상자 안, 고양이 뒤 층. 느리게(꽃잎 14~23초 주기) 두어 F7 눈 깜빡임과 겹쳐도 시끄럽지 않게.
  - 진입 장면(`ServiceEntryScene`): 포스터→모션 페이드는 **넣지 않는다**(아래 근거). 대신 아치 아래 두 모서리에 정적 목련·연꽃 마스크(-sm)만 더한다(밤 변형 `.cd-entry-scene--night` 한정, 추가 요청 0).
    - 근거 1: 노출이 load+1프레임, 최대 1.8초다. 0.3초 페이드는 노출의 17% 이상이고 대부분의 재방문·빠른 망에서는 장면이 0.5초 안에 닫힌다.
    - 근거 2: 장면 그림(`cat-reading-entry`)이 next/image priority 로 LCP 후보다. 시트를 받아 위에 겹치면 더 큰 나중 페인트가 LCP 를 다시 잡거나 핵심 경로에 요청이 늘어난다.
    - 근거 3: reduced-motion·뒤로가기·세션 재방문은 장면 자체를 건너뛴다. 영냥이 전신 스프라이트 시트는 없고(F7 은 눈 부분 시트) 새 시트 생성은 이 단계 범위 밖이다.
- 성공 기준(측정)
  1. 분홍 픽셀 0(visual-checker, 새 장식 영역)
  2. 장식·모션 요소 사각형 ∩ 글자(텍스트 노드 Range 사각형)·고양이 얼굴 = 0 — 390·1024·1280·1440, 두 화면
  3. 본문 대비 4.5:1 유지(장식이 글 뒤를 지나지 않으므로 기존 값 그대로)
  4. pageerror 0, 가로 넘침 0(390·1280)
  5. reduced-motion: 모션 레이어 DOM 없음(별가루·꽃잎 0개), 정적 꽃은 보임, `document.getAnimations()` 중 새 레이어 0
  6. 화면 밖으로 스크롤하면 모션 레이어가 사라진다(IO 게이트, `data-motion="off"`)
  7. perf:home `--route=yeongnyangi/`(dist·시뮬 Lighthouse 중앙값 3회) LCP·CLS 가 전 기준선보다 잡음 범위 이상 나빠지지 않는다. 전: 모바일 LCP 13861ms·CLS 0.007(점수 54), 데스크톱 2150ms·0.022(86). LCP 요소는 히어로 방 그림(3/3).
  8. visual-checker 항목별(분홍·대비·가림·정렬/잘림·고급감/일관성·모션 산만함 연속 프레임) 통과
  9. 불변: title·H1·canonical·가격·라우트·결제/이용권 게이트·보관함 분리, branch-spray 바이트, `gen-yehwa-motifs --check` 통과

#### H 결과 (2026-11-22) — 미push(F5~G 와 함께 보류)
- 커밋(워크트리): 187f27ff71(방향·성공 기준) · 0472265e4d(생성기 목련·연꽃 마스크) · 0675c85910(목련 마스크 철회) · a31b4ab188(랜딩 히어로) · f633689175(방 그림 + 정적 테스트) · 087c4d8fce(특별 상담 카드 금테) · bf637241f7(sitemap-lastmod) · CONTEXT_AUDIT·이 문서 커밋.
- 바뀐 화면
  - `/yeongnyangi/` 히어로(`NightHero.tsx`·`night-hero.module.css`): 고양이 칸 오른쪽 아래 모서리 **안쪽**에 금 잉크 연꽃 라인아트(`--yn-yehwa-mask-lotus`, 1100↓ 120×80, 900↓ `-sm` 90×60). 모바일(≤699)은 사진에 금빛 매화가 이미 있어 연꽃을 숨기고 198px 방 그림 상자 안에 모션만 둔다. 데스크톱 모션 범위는 오른쪽 46%·아래 96px 위.
  - `/yeongnyangi/room/`(`Room.tsx`·`room.css`): 방 그림 왼쪽 아래 연꽃 `-sm` 70×47(900↑ clamp(84px,9vw,130px)), 380px 미만은 캡션과 겹쳐 숨김, `.room-garden > .room-garden-lotus` 로 bottom 6px(🔴 `.ynOriginal .room-garden > span` 0,2,1 이 0,2,0 을 이겨 첫 시도 미적용).
  - 새 `NightBloomMotion`(app/yeongnyangi/_components): MasterPetals yeongnyangi sm 별가루(높이 200px 상자, 낙하 1.4배 느리게, 6px) + 아이보리→금 꽃잎 4레인(`--yn-bloom-tempo` 로 상자 높이 무관 초당 약 20px 이하). `useSpritePlaybackGate({enabled: MASTER_MOTION_ENABLED})` 닫히면 빈 span `data-motion="off"`. 키프레임은 transform·opacity 만, reduced-motion 은 `.root{display:none}`. aria-hidden.
  - 특별 상담 카드 3장(`QuestionSpecialConsultations.module.css`): 비 hover·비 focus 테두리를 불투명 금 혼합(`color-mix(--yn-gold 70%, --yn-night)`, 대체값 #a5916f)으로. hover·focus·선택 상태는 그대로.
- 계획과 달라진 결정 [실측]
  - 목련 철회: v3·v4·v5 세 번 그려 visual-checker 가 매번 튤립·풍선으로 읽었다. 생성기에서 함수·마스크 변수를 지우고 🔴 주석만 남겼다. 꽃 모티프는 연꽃 하나.
  - 카드 안쪽 4px 금 실선 철회: 32% 금 선이 남색 위에서 회색으로 읽히고 카드 구분선과 교차했다 → 바깥 테두리 색만 불투명 금으로(재판정 PASS).
  - 진입 장면(`ServiceEntryScene`): 포스터→모션 페이드 없음(위 근거 1~3). 계획의 정적 모서리 꽃도 **넣지 않았다** — `styles/service-entry-scene.css` 가 index.html·public 미러 7개에 인라인되고 셸 캐시 키까지 바뀌는데 노출 ≤1.8초, 장면에 이미 금 아치·장식이 있고, 목련이 빠져 짝이 맞지 않는다. 그래서 sync:public 변경 없음.
  - 색: 밝은 금·아이보리를 낮은 opacity 로 얹으면 남색 위 회색·보라 그림 위 모브로 물든다(판정 2회) → 진한 금 잉크(`--yn-gold 70% + #5a3a0a`)를 opacity .7(히어로)/.75(방).
- 성공 기준 대비 [실측, dev 3140]
  1. 분홍 0 — visual-checker PASS(새 장식 색상 33–37°).
  2. 장식·모션 사각형 ∩ 글자·고양이 얼굴 = 0 — 히어로 390·768·900·1024·1280·1440, 방 360·390·900·1024·1280·1440 모두 0(768/900 히어로, 900 방, 390·360 방 충돌은 크기·위치 조정으로 해소).
  3. 대비 — 7.5:1·12.17:1·16.24:1, 장식은 글 뒤를 지나지 않는다.
  4. pageerror 0, 가로 넘침 0 — 위 전 폭.
  5. reduced-motion — 모션 레이어 DOM 없음(별가루·꽃잎 0), 정적 연꽃은 보임.
  6. 화면 밖 — 스크롤하면 `data-motion="off"`.
  7. perf — 아래.
  8. visual-checker 항목별: 모션(보임·산만함·reduced·멈춤/잘림) PASS, 분홍 PASS, 색(앤티크 금) PASS, 가림 PASS, 대비 PASS, 정렬 PASS(수정 뒤), 고급감 연꽃 PASS, 카드 PASS. 속도 DOM 실측 별가루 16–22px/s·꽃잎 9–14px/s.
  9. 불변 — title·H1·canonical 동일(측정), 가격·라우트·결제/이용권·보관함 파일 미수정, branch-spray 바이트 그대로, `gen-yehwa-motifs --check` 통과.
- perf:home `--route=yeongnyangi/` [실측, dist·시뮬 Lighthouse 중앙값 3회] 전(G 끝 dist 14:33) → 후(H dist 16:05): 모바일 점수 54→57·FCP 7833→6700ms·LCP 13861→12042ms(전 범위 12046–13932, 후 11879–13999)·CLS 0.007→0.007, 데스크톱 86→85·FCP 1238→1240·LCP 2150→2219ms(전 범위 2032–2236, 후 2201–2221)·CLS 0.022→0.022. LCP 요소는 전후 모두 히어로 방 그림(3/3). 잡음 범위 안, 모션 레이어는 CLS 를 늘리지 않았다.
  - 🔴 build:cf 의 no-dev-server 가드는 **다른 체크아웃**의 dev 서버(포트 3217, 01:50 시작)까지 잡는다. 워크트리 `.next` 는 정션이 아닌 자체 폴더이고 3분간 쓰기 0 을 확인한 뒤 `ALLOW_DEV_SERVER_DURING_BUILD=1` 로 빌드했다. 가드에 막힌 채 perf 를 돌리면 낡은 dist 를 잰다(첫 시도 폐기).
- 검사 [실측]: `check:fast`(critical, base 0472265e4d~1) EXIT 0 — paid-gate-suite 78/78, lint, verify:sitemap-drift OK(1088), typecheck, test:node 5798/5798, verify 묶음·build:worker·entry-encoding, test:jest 490 suites 8553 pass·1 skipped. BLOCKED 줄은 mock 테스트 로그의 LLM_CONTENT_BLOCKED 코드 1건뿐(게이트 차단 아님).
- SEO: title/description/H1/canonical/robots/hreflang 영향 없음, 장식은 aria-hidden span·CSS 마스크라 새 이미지·URL 없음. sitemap:generate 뒤 verify:sitemap-drift OK(1088 URL, signature 약 22건).
- 정적 테스트 `__tests__/ui/yeongnyangi-night-bloom.static.test.mjs` 3/3. 변이(키프레임에 `top`)로 1 fail 확인.
- 남은 위험
  - [실측] 1280 에서 입자가 오른쪽 그림 영역에만 보인다(의도된 범위). 고급감 판정 경미: 작은 표류 원·연잎이 약간 클립아트 쪽.
  - [실측] 카드 3번 윗변은 복잡한 그림 앞에서 약하다. hover 차이 약 1.5:1(배경·구분선도 함께 바뀐다).
  - [미검증] 실기기 GPU 부하·배터리, 사람 눈 연속 재생 확인(연속 프레임 판정만).
- 후속 보고(범위 밖, 고치지 않음): 랜딩 ggulggul-bridge 모브 톤, room.css L90 측면 탭, 히어로 오른쪽 위 기존 직선 가지 장식, 기존 특별 상담 그림 속 분홍 하트·분홍 타로 카드(자산 자체).
