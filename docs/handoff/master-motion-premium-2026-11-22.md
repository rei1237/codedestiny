---
status: in-progress
updated: 2026-11-22
next: E — /ggulggul/ 대표 상담 자동 배너(home-consultation-picker.mjs + home-funnel.js 죽은 #cdSigViewport 블록 교체)
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
- **H 영냥이**
  - 흰·금 야화(목련·연꽃) SVG 마스크 모티프(`scripts/design/gen-yehwa-motifs.mjs` 방식, `yn-` 토큰)와 금테 카드
  - 별가루·꽃잎 낙하(MasterMotion yn 변형)
  - 영냥이 대기 스프라이트(F). CatMotion은 유지
  - 진입 장면은 포스터 → 스프라이트

## 단계
- [ ] E 대표 상담 자동 배너 — 구현, 테스트, check:fast, 커밋, 화면 확인(visual-checker, 390px·데스크톱)
- [ ] F1 스프라이트 빌드 스크립트 + MasterMotion `sheet` 지원 + 자산 테스트(에셋 없이 빈 매니페스트로 통과)
- [ ] F2 연이 스프라이트 생성·검수·배선
- [ ] F3 윤달
- [ ] F4 무성
- [ ] F5 서한비
- [ ] F6 네오
- [ ] F7 영냥이 고양이
- [ ] G 꿀꿀 고급화
- [ ] H 영냥이 꽃 배경·동적 효과
- [ ] P 사이트 전반 UX 개선 프롬프트 작성(모든 작업 뒤). 사용자 원문(11-22): "내 사이트 진입부터 꿀꿀운세, 영냥이 사이트 전반을 업계 표준에 맞는 사용자가 이용하기 편리한 UI/UX로 개선해줄 프롬프트를 모든 작업 후 작성해줘"
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
