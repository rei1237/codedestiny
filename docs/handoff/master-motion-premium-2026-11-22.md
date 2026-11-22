---
status: in-progress
updated: 2026-11-22
next: F5 — 서한비 스프라이트(F2~F4와 같은 절차 — Codex 편집 생성 → spec → build --report(모든 칸 수치 기록) → visual-checker(정지 칸 + 실제 화면) → 배선)
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
- [x] E 대표 상담 자동 배너 — 구현, 테스트, check:fast, 커밋, 화면 확인(visual-checker, 390px·데스크톱)
- [x] F1 스프라이트 빌드 스크립트 + MasterMotion `sheet` 지원 + 자산 테스트(에셋 없이 빈 매니페스트로 통과)
- [x] F2 연이 스프라이트 생성·검수·배선
- [x] F3 윤달 — d20687016·88ba0c4ea
- [x] F4 무성 — d36e382314
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
