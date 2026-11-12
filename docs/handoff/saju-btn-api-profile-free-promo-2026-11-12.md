---
status: active
updated: 2026-11-12
next: "B4 운영 workflow 실행(자동 모드 분류기가 Production Deploy로 거부 — 사용자 허용/직접 실행 필요) → 운영 확인 → 마무리"
---

# 사주 보기 버튼·API 링크·홈 타일 프로필 진입 수정 + 3개월 무료 마케팅

## 첫 행동
1. 워크트리 `D:\Development\codedestiny-worktrees\saju-btn-api-profile-20261112-111149`(브랜치 `wt/saju-btn-api-profile-20261112-111149`)에서 `git status`, `git log --oneline -3`, `git fetch origin main`.
2. 아래 단계에서 체크되지 않은 첫 항목부터 진행한다.

## 지금 상태
- 기준: origin/main `ba28330a5` (운영은 37258e3e9, 비LLM 62키 무료화가 이미 운영 중).
- 공유 체크아웃 `D:\Development\code-destiny`는 다른 세션의 `feat/world-cast-page` + 미커밋 30여 파일. **절대 건드리지 않는다**(전환·stash·reset 금지).
- 다른 세션의 `docs/handoff/release-closeout-2026-11-12.md`(가디언 두 번째 승격)가 active. 배포 락은 공유되므로 운영 승격이 겹치지 않게 `gh run list`로 진행 중 Release run을 먼저 본다.

## 승인 상태 (원문·날짜)
- 2026-11-12 사용자: "무료 만세력 보기 버튼은 사주 보기 버튼으로 이름을 변경해야하고 현재 클릭해도 사주 화면으로 이동이 안되는 버그가 있는데 정확한 원인 파악 후 이런 문제가 없도록 수정해서 이건 중요한 문제이므로 빠르게 운영 배포해줘" → 릴리스 A·B 운영 승격 승인(계획 승인 포함).
- 2026-11-12 사용자 결정:
  - 무료 범위: 기존 62키 유지 + 누락된 비LLM 정적 기능만 보강. 라이트 사주·사주 대운(section_summary·section_daewun·saju_lifetime_bundle)·가디언·LLM은 유료 유지.
  - 기한: "2027-02-12까지 무료" + 카운트다운 표시. **자동 유료 전환 없음**(표시 전용, 접근 판정에 날짜 쓰지 않음).
  - 내 API 관리: 프로필 카드에서 **완전히 제거**.
  - 프로필 진입 실패 경로: **홈의 무료 운세 타일**.

## 작업 규칙과 함정
- `scripts/design/build-home-funnel.mjs --check`는 sync:public 뒤에도 "needs regeneration"을 낸다(미조사, check:fast는 통과). 브랜치는 origin/main보다 28커밋 뒤(2026-11-12 기준) — push 전 rebase onto origin/main 후 미러·사이트맵 재생성.
- 저장소 CLAUDE.md: 브랜치·PR 없이 main에 직접 머지(워크트리 → `git push origin HEAD:main` 형태, fast-forward 아니면 rebase onto origin/main), 결제 변경 RED, 실LLM·실결제 금지, 가격 변경은 PAYMENT_POLICY.md 먼저, 미러(public/*)는 공식 생성기(`npm run sync:public` 등)로만, `check:fast` → commit → `check:pre-push` → push.
- 운영 승격은 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`만. 로컬 wrangler·deploy:production 금지.
- `/manse` 랜딩 폼 핸드오프(`cd:seo-landing-entry:v1`)는 저장 시 ctaHref의 action과 셸에서 실행되는 action이 같아야 적용된다.
- 홈 `/` 정본은 app/page.js, `/ggulggul/` 정적 셸 정본은 루트 `index.html`.

## 설계 / 확인된 원인
1. /manse "무료로 만세력 보기" (`lib/seo-landing-pages.js` manse `ctaHref: /ggulggul/?action=checkPrivacyAndCalculate`): 이 액션은 입력 화면을 열지 않아(`js/core/home-funnel.js:355`는 cdOneStepFreeSajuEntry만 revealInput) checkPrivacyAndCalculate가 숨은 폼 안에서 성별 미선택 오류·동의/로그인 게이트에 걸려 아무 변화 없이 멈춘다. 동일 href가 다른 랜딩에도 있다.
   - 수정: ctaHref → `/ggulggul/?action=cdOneStepFreeSajuEntry`, 라벨 "사주 보기". 핸드오프 적용 시 cdOneStepFreeSajuEntry(`js/destiny-profile.js` ~11039)가 캐시 프로필보다 폼 입력을 우선. 랜딩 폼 성별 필수. revealInput 안전망에 checkPrivacyAndCalculate 추가. 가이드 CTA·칩의 "무료로 만세력 보기/만세력 보기" → "사주 보기" + 사주 셸 액션. SEO 제목·H1 "무료 만세력"은 유지.
2. 내 API 관리: `index.html` `<template id="dpListSheetTemplate">` 푸터 하드코딩(2c71d2253). 링크 삭제 후 미러 재생성.
3. 홈 타일 프로필 진입: `window.cdHomeFortuneEntry`(destiny-profile.js ~11195)가 로컬 캐시만 보고 없거나 `syncStatus==='pending'`이면 "프로필을 설정해 주세요". `cdSajuTabEntry`(~11291)의 `_dpLoadFromServer` 폴백이 없고, `_dpResumeHomeEntry`는 1회성 `cd:destiny-profile-server-ready`에 의존. → mock 브라우저 재현 후 확정, 서버 로드 폴백 + 유효 출생정보면 pending 허용.
4. 프로모션: 단일 상수 `endsAt: "2027-02-12T23:59:59+09:00"`(표시 전용). 홈 상단 배너(D-N, 무료 운세 바로가기, 공유 버튼 Web Share/링크 복사), 무료 타일·결과 "3개월 한정 무료" 뱃지, 결과 하단 공유 CTA, React 랜딩 배너. 문구는 "2027년 2월 12일 이후 유료 전환 예정".

## 단계
### 릴리스 A (긴급)
- [x] A1 사주 보기 버튼 수정 + 테스트 — manse·love ctaHref → cdOneStepFreeSajuEntry, 라벨 "사주 보기"(H1 유지), 가이드 CTA 6곳·칩 3곳·calendar 보조 CTA, 랜딩 성별 필수, 핸드오프 적용 표시(`__cdSeoLandingEntryHandoffApplied`) → cdOneStepFreeSajuEntry가 캐시보다 폼 입력 우선, home-funnel 안전망에 checkPrivacyAndCalculate. mock 브라우저(360/390/1280): 회원은 랜딩 입력(1990-01-15)으로 결과 화면, 게스트는 동의 모달 → 기존 로그인 필요 시트(입력 1시간 보관).
- [x] A2 내 API 관리 제거 + 미러 재생성 — 회원 프로필 시트 푸터 링크는 "달빛 이용권 상점으로"·"이용권 · 결제 내역 보기"만(mock 확인). i18n 키 footer.businessApiManage는 남김.
- [x] A3 홈 타일 프로필 진입 재현·수정 + 회귀 테스트 3개 — 재현(mock 브라우저, 로그인 쿠키): ① 첫 /api/profile 실패 시 저장 프로필이 있어도 "자미두수를 보려면 프로필을 설정해 주세요" + 영구 미진입 ② pending 카드는 토스트 후 서버 응답 뒤에야 열림, 서버 다운이면 미진입 ③ 콜드 탭(응답 지연)은 토스트·생성 흐름 후 자동 진입. 수정: `_dpHomeEntryProfileReady`(유효 생년월일이면 pending 허용, resume에도 적용) + 세션 힌트가 있으면 `_dpLoadFromServer` 먼저, 서버에도 없을 때만 토스트·생성. 재검: 6개 시나리오 모두 의도대로(무프로필만 생성 안내). 하네스는 세션 스크래치(repro-home-tile.mjs) — 저장소에 두지 않음.
  - 함정: destiny-profile.js가 바뀌면 독립 정적 페이지·billing-client.ts·verify-paid-gate-ui-regression.mjs의 `destiny-profile.js?v=build-…` 핀을 verify:payment-choice-parity가 알려 주는 값으로 직접 바꾸고, billing-client.ts 변경은 `node scripts/verify-payment-freeze.mjs --update`로 config/payment-freeze.json을 같은 커밋에(선례 17682ff33). sync:public은 free-fortune-policy.js/.mjs 줄끝만 건드리므로 `git checkout --`로 되돌린다.
- [x] A4 check:fast, mock 화면 360/390/1280 확인, 커밋, check:pre-push, main push — check:fast 통과(rebase 전). 커밋 1657f067c(A1)·a028d6cfa(A2·A3)·838bf60f2(문서)·f25a99a69(rebase 뒤 미러·사이트맵 재생성), main push f7baafd1f..f25a99a69. check:pre-push는 verify:public-mirror-fresh만 실패하고 나머지 단계는 통과. 이 실패는 origin/main에서도 똑같이 재현된다. sync:public이 free-fortune-policy.js/.mjs 줄끝만 바꿔 git status가 더러워지는 Windows 환경 문제로, 이 변경 탓이 아니다.
  - 함정: 공용 컴포넌트(guide-cta-targets·SeoLandingBirthForm)를 고치면 sitemap 서명이 대량(439 라우트)으로 바뀐다. `npm run sitemap:generate` 결과를 같은 커밋에 담는다. direct-fortune-entry.behavior.test.js의 vm 컨텍스트에는 `_dpHasSessionHint` 목이 필요하다(추가함). fortune 테스트는 `npm run fortune:build-data`(gitignore 산출물)가 먼저 있어야 한다.
- [x] A5 main CI 확인 → 운영 workflow 실행 → 운영 SHA·핵심 화면 읽기 전용 확인 — 146e2e24b·16dfa794f PR CI success(f25a99a69의 PR CI 실패는 146e2e24b로 해소, Yeongnyangi Browser Shadow 실패는 WebKit internal error로 이전부터 반복되는 shadow 실패). 운영 승격은 가디언 세션의 run 43153119183(staging) → 43159125113(release success) at 16dfa794f. 운영 확인(읽기 전용): /api/version·/version.json gitSha 16dfa794fc49(Worker·Pages 일치, environment production), /manse/ 버튼 "사주 보기" + submitHref `/ggulggul/?action=cdOneStepFreeSajuEntry`, H1 "무료 만세력으로 내 명식 확인하기" 유지, checkPrivacyAndCalculate 0건, /ggulggul/ "내 API 관리" 0건, 운영 destiny-profile.js(build-4094553c6542)에 홈 타일 서버 로드 폴백·랜딩 인계 우선 포함, 홈 / 200. 미검증: 운영에서 실제 로그인 계정으로 홈 타일 진입(실계정 없이 불가 — mock 브라우저 6개 시나리오와 운영 번들 코드 포함 여부로만 확인).
  - 2026-11-12 조정(가디언 릴리스 세션 user-9d 통보): f25a99a69의 CI 실패 verify-guide-feature-cta는 1657f067c의 가이드 CTA href(`/ggulggul/?action=`) 때문이다. 검증기가 `/?action=`만 허용했다. 그쪽이 146e2e24b로 고쳐 push한다(같은 수정 금지). **운영 승격은 그쪽이 가디언 2차 승격(승인됨)으로 그 SHA에서 실행하며 Release A(1657f067c·a028d6cfa)를 포함한다. 별도 운영 workflow를 돌리지 않는다.** 이쪽은 그 push 뒤 main CI 녹색 확인 → 그쪽 보고 뒤 운영 SHA·/manse/·홈을 읽기 전용으로 확인. 미push 수정이 있으면 그 커밋 위로 rebase한 뒤 push.

### 릴리스 B (마케팅)
- [x] B0 "무료 만세력 보기" → "사주 보기" (78cbf6835, check:fast 통과, **아직 push 안 함** — B3에서 같이 push). 가이드 CTA 3곳(/saju/guide·/fortune/date·/compare/saju-vs-ziwei) href → `/ggulggul/?action=cdOneStepFreeSajuEntry`, /fortune/2027·[sign] 칩 "사주 보기"·보조 링크 "사주 원국 살펴보기"(href /saju 유지), seo-landing saju ctaLabel, first-visit-copy ko openWithProfile, 홈 #run-btn + home.input.submit 12언어, 홈 엔트리 카드 라벨(href `/saju/free/`는 home-entry-card-ownership 테스트 계약이라 유지). SEO 제목·H1·메타 유지.
  - 남김(보고): 푸터 링크(SiteFooterHub), SeoLandingTemplate DEFAULT_RELATED_LABELS "/saju" 앵커, yeongnyangi domain-registry freeEntry, 마케팅 ctaLabel(featureMarketing.saju.fallbackCta, shellRuntime.f6/f2632, feature-marketing-copy.generated.json).
- [x] B1 감사 — **추가 없음**. worker/lib/light-fortune-catalog.js의 62키 밖 22키(physiognomy-compatibility, physiognomy-pastlife-compatibility, physiognomy-ogwan-mole-deep, tarot-year-fortune, tarot-reunion-reading, tarot-crystal-soul-reading, tarot-numerology-reading, maya-prompt-generator, tarot-ijik, royal-tea-oracle, ifa-oracle, neville-meditation, cosmic-soul-meditation, openJuyukModal, openKemetModal, stonehenge-runes-single/triad/deep/yearly, fortune-prompt-hub-generate, dream-prompt-generator, mbti-animal-compat)는 service-registry에서 methods:["ai"] 3,000원이거나 프롬프트 생성기이고, 11-11 감사가 타로·룬·주역·명상·관상·꿈·MBTI를 의도적으로 제외했다. 사용자 결정 후보로 보고만(특히 royal-tea·ifa·kemet 오라클, maya·fortune-prompt-hub 생성기).
- [x] B2 프로모션 상수 + 홈 배너·뱃지·공유 CTA·React 랜딩 배너, 12언어 i18n 키(ko 우선) — 2c5d48c36(rebase onto origin/main 0193aa999 뒤, B0=e6e9bc740·문서=08adcc79d). 문구(호출자 지시로 강화): 뱃지 "3개월 한정" / 제목 "지금만 전부 무료" / "2027년 2월 12일 이후 유료 전환 예정" + D-N / 범위 "만세력·자미두수·별자리 등 기본 풀이가 대상이에요. AI 상담과 라이트 사주·대운 풀이는 제외돼요." / CTA "무료 운세 보러 가기"(→ `/ggulggul/#cdQuickServices`, 셸에서는 스크롤) / 공유 "친구에게도 무료일 때 알려주기". 타일 씰 6개 "3개월 한정 무료"(모바일 카드 padding-top 34px로 메달 겹침 0).
  - 함정: `__tests__/ui/saju-bundle-copy.static.test.js`가 비한국어 사전의 "free saju/Four Pillars" 류를 막는다 → 초안의 "사주·자미두수·별자리"를 "만세력(Manseryeok/万年暦/万年历…)·자미두수·별자리"로 바꿈. `home-banner-typography.test.mjs`의 hero 정규식 lookahead를 `cdh-(?:promo|free)`로 확장(배너가 무료 섹션 앞에 끼므로).
  - build-home-funnel `--check` 상시 실패 원인: 생성기는 `?v=build-000000000000` 자리표시자(pass-duet.js·consultation-method-guide.css)를 내고 sync:public 뒤 단계가 실제 해시로 찍는다 → 찍힌 index.html과 늘 다름. CI·package 스크립트 어디에서도 `--check`를 부르지 않아 CI 실패는 없음(origin/main도 동일). 고치려면 비교 시 `?v=build-[0-9a-f]{12}`를 정규화 — 범위 밖으로 보고만.
  - 초안(검토 끝, 그대로 옮기면 됨) `D:/Development/Temp/free-promo-drafts-20261112/`:
    - `free-promo.mjs` → lib/marketing/free-promo.mjs: FREE_PROMO(endsAt 표시 전용)·FREE_PROMO_COPY_KO·freePromoDaysLeft(KST 달력: 2026-11-12 → 92, 마감일 0=D-DAY, 이후 null)·freePromoDayLabel. 함수 본문은 ES5(셸이 toString으로 인라인).
    - `free-promo-shell.mjs` → lib/marketing/free-promo-shell.mjs: renderFreePromoShellBanner() — #cdhFreePromo, data-ends·data-share-path, h2 없음, 인라인 스크립트로 D-N·만료 시 숨김·CTA는 #cdQuickServices/#cdhFreeTitle로 스크롤·Web Share → 클립보드 + showToast.
    - `freePromo-01.json` → i18n/authored/freePromo-01.json, 이어서 `node scripts/i18n-merge-authored.mjs --core --file freePromo-01.json`.
    - `FreePromoBanner.tsx` → app/components/FreePromoBanner.tsx. 짝 CSS `free-promo-banner.module.css`는 새로 작성(banner/badge/title/until/dday/note/actions/cta/share/status, --cd-* 토큰).
  - 배선: scripts/design/build-home-funnel.mjs에서 quickHtml 앞에 renderFreePromoShellBanner(); FREE_CARDS 씰 `data-cd-trans="home.simpleHome.freeBadge">무료` → `data-cd-trans="freePromo.tileBadge">3개월 한정 무료`(넘침 확인). `.cdh-promo` CSS는 styles/home-funnel.css `#cdHomeFunnel` 아래 --cdh-* 토큰. app/page.js는 HomeCardDeck 뒤, `!IS_APP_BUILD`일 때만. SeoLandingTemplate은 breadcrumb 바로 뒤, 경로 /saju·/saju/free·/manse·/ziwei·/astrology·/vedic·/sukuyo만.
  - 결과 화면 공유 CTA: 공통 결과 푸터 훅이 없어(grep result-footer 0건) **추가하지 않고 보고**.
  - 순서: sync:public → free-fortune-policy.js/.mjs(루트·public) 줄끝 변경은 `git checkout --`로 되돌림 → `npm run sitemap:generate`(빠뜨리면 verify:sitemap-drift 실패).
  - 테스트: freePromoDaysLeft 단위 1개(D-92·D-DAY·null) + ko 문구 패리티(authored ko == FREE_PROMO_COPY_KO, index.html data-ends == FREE_PROMO.endsAt).
- [x] B3 검증·커밋·push — `__tests__/ui/free-promo.test.mjs` 3개(카운트다운 KST·ko 패리티/12언어/index.html·정책 파일 비참조). check:fast 통과. main push 0193aa999..2c5d48c36, PR CI 43168424991 success. check:pre-push의 verify:public-mirror-fresh는 free-fortune-policy 줄끝 문제로 실패(origin/main도 동일, 기존 문제) → 남은 단계(sitemap-drift·llms-txt·seo-entity-registry·repo-hygiene) 수동 통과. mock 화면 /·/ggulggul/·/saju/·/saju/free/ × 360/390/1280: 가로 넘침 0, 배너 D-92, 씰 6개 겹침 0, 390 공유 → 클립보드에 shareText+URL. 콘솔 오류는 기존(/ 영냥이 webp 404·HomeInstallEntry hydration hidden)·로컬 환경(폰트 CORS·beacon CSP·mock 501)뿐.
- [ ] B4 운영 workflow → 운영 확인 — 2026-11-12 시도: 경쟁 Release 런 43168802072(bc952a0e6 staging) 종료 뒤 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production`을 실행하려 했으나 Claude Code 자동 모드 분류기가 [Production Deploy]로 거부. 사용자가 직접 실행하거나 권한 규칙을 추가한 뒤 재개. 확인 대상: /api/version·/version.json SHA가 2c5d48c36 이후, 운영 /·/ggulggul/·/saju/·/manse/ 배너(D-N)·"사주 보기" 버튼(읽기 전용).
- [ ] 마무리: 이 문서 done, 워크트리 배수(`npm run worktree:remove -- <경로>`를 다른 체크아웃에서), 임시 파일 삭제

## 범위 밖(보고만)
- `_dpOpenFortuneType`의 무필터 storage 이벤트 무효화(olympus/flower 조용한 실패), Next 페이지 guard 재설정.
- 2027-02-12 도래 시 연장/유료 전환 결정은 사용자.
