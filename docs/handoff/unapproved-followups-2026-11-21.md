---
status: in-progress
updated: 2026-11-21
next: 5. R5 자미 (조건부, 결제 감사 먼저)
---

# 미승인 후속 항목 — 권장안으로 진행 (2026-11-21)

## 첫 행동
- 이 문서의 frontmatter `next` 단계부터 진행한다. 계획 원문: `C:\Users\user\.claude\plans\pasted-content-id-8e9a-0-elegant-unicorn.md`.
- 항목마다 새 워크트리(`powershell -File scripts/create-safe-worktree.ps1 -Slug <주제>`) → `npm run fortune:build-data` → 구현·검증 → `git push origin HEAD:main` → 다른 체크아웃에서 `npm run worktree:remove -- <경로>`.

## 지금 상태
- 브랜치: main 직접 머지(워크트리 `wt/*` 경유). 단계별 커밋 SHA 는 아래 "단계" 결과에 적는다.
- 1단계 기준 origin/main: e85f70c69. 1단계 착지 push 0a6c5beea(2026-11-21).

## 승인 상태
- 사용자 원문(2026-11-21): "승인 받지 않은 부분에 대해서는 권장안으로 진행해줘" — 위 계획의 "실행" 항목 1~5 를 RED 실행 승인으로 기록한다. 다시 묻지 않는다.
- 사용자 원문(2026-11-21, 호출 세션 경유): "가장 권장 사항으로 검사 성공되도록해주고 나머지 변경 진행 후 운영에 반영해줘" — 검사 실패는 정석 수정으로 통과시킨다. 운영 승격은 단계 에이전트가 하지 않고 호출 세션이 별도로 다룬다.
- 함께 적용(사용자, 2026-11-21): "빠르게 진행 … 회귀는 없도록 너무 꼼꼼하지 않아도돼", "서비스 기능에 회귀는 없어야해".
- 승인 밖: 운영 승격, 과금 LLM 실호출, 실결제·운영 DB 쓰기. 아래 "하지 않음" 표.

## 하지 않음 (권장안 = 실행 없음, 기록만)
| 항목 | 권장안 | 근거 |
|---|---|---|
| D1 칩 마크업 삭제 | 롤백 경로로 유지. 플래그가 안정되면 별도 삭제 | 7단계 승인 범위, 스펙 D1 |
| D8 하루 1회 서버 저장 | 계정 ID 로컬 키(현행) 유지. DB 쓰기 없음 | 스펙 D8 추천 "서버 저장은 별도 RED" |
| D10 연애 타로 무료화 | 유료 5,000원 유지 | 스펙 D10 추천 "이번 통합에서 제외" |
| 유료 비회원 결제 | 하지 않음. 유료와 저장은 로그인 유지 | W2 결정 "저장·유료는 로그인" |
| 운영 승격 | 하지 않음. 명시적인 1회 요청 때만 | CLAUDE.md 절대 규칙 3 |
| 과금 LLM 실호출 | 하지 않음. mock만 | CLAUDE.md 절대 규칙 1 |

## 작업 규칙과 함정
- 로컬 main 체크아웃(d:\Development\code-destiny)에서는 편집·pull·reset·stash 금지(옆 세션 공유, origin 보다 뒤처짐). 워크트리에서만.
- `js/destiny-profile.js` 를 바꾸면: `npm run sync:public` → `node scripts/restamp-paid-runtime-pins.mjs`(독립 페이지 22곳 + vedic-astrology.html + billing-client.ts + verify-paid-gate 상수) → `node scripts/verify-payment-freeze.mjs --update` → `verify:payment-choice-parity`·`verify:paid-gate-ui`·`verify:payment-freeze` PASS 확인. 순서는 sync 먼저, restamp 다음.
- `app/**` 를 바꾸면 `npm run sitemap:generate`(원장 서명만 갱신되는 것이 정상).
- Bash heredoc 은 백슬래시를 한 겹 먹는다 — 테스트의 정규식은 `includes` 나 `String.raw` 로.
- 브라우저 클릭은 동의 배너·하단 내비가 가로챈다 → `el.click()`(evaluate)로.
- 알려진 무관 실패: jest 가 옆 세션 `__tests__/fortune/daily-scroll-copy.test.mjs`("must contain at least one test")를 잡는다 — 보고만.
- 금지: 엔진 계산, 결제 실행 파일, .env*, package-lock, wrangler 구조, 리다이렉트 추가. `.claude/skills/fire-your-seo-agency/`·옆 세션 워크트리·`D:\Development\Temp\yeongnyangi-*` 손대지 않음.

## 설계
- 1(R5 숙요·베다): 서양 점성술(1172b1c71·81cc9e199) 계약을 기능 표로 일반화. `lib/guided-flow/astro-draft.mjs` `BIRTH_DRAFT_TARGETS{astro,sukuyo,vedic}`(키·셸 진입·되돌아올 랜딩), `writeBirthDraft`. React `AstroGuidedEntry kind=`(숙요는 장소 단계 없음). 셸 `_dpGuidedBirth` 표, 기능별 되돌이 방지 키. astro 키·주소는 불변.
- 2~5: 계획 원문 그대로(R3 링크만, L1 `FREE_READING_GUEST_ENABLED`, R1 `/free/` `FREE_LIST_PAGE_ENABLED`, 자미는 paid-gate-auditor 감사 후 조건부).

## 단계
- [x] 0. 이 문서 작성(1단계와 함께 커밋, fc2deb290)
- [x] 1. R5 숙요·베다 가이드 진입 (`GUIDED_SUKUYO_ENABLED`, `GUIDED_VEDIC_ENABLED`)
  - 커밋: fc2deb290(랜딩·초안·i18n 12로케일·이 문서), a988b810e(셸 진입·미러·핀·동결·테스트), 머지 551c4bb59, 0a6c5beea(restamp 가 vedic-astrology.html 핀을 건너뜀 — sync:public 과 같은 줄을 서로 덮어써 mirror-fresh 가 수렴하지 않았다). push 0a6c5beea.
  - 건너뜀 없음: 숙요·베다 모두 점성술과 같이 프로필 게이트만 거친다(로그인·결제·DB 추가 접촉 없음). 숙요는 장소 단계 없음.
  - 플래그: `lib/guided-flow/flags.mjs` 와 `js/destiny-profile.js` 의 `var GUIDED_SUKUYO_ENABLED`·`var GUIDED_VEDIC_ENABLED`(값 일치 테스트 `__tests__/ui/sukuyo-vedic-guided-entry.test.mjs`).
  - 실측: 대상 node 테스트 25/25, check:fast exit 0(test:node 5676/0, jest 489 통과), verify:payment-freeze·payment-choice-parity·paid-gate-ui PASS, check:pre-push exit 0(머지 뒤). 브라우저 360·960: /sukuyo/·/vedic/ 제목·H1·canonical·robots 불변, 가로 넘침 0, pageerror 0, 스텝 → `/ggulggul/?action=cdHomeSukuyoEntry|cdHomeVedicEntry` 초안 기록, 셸이 폼 채움·초안 소비, 초안 없으면 `?step=name` 1회. visual-checker 차단 결함 없음(대비 8.4~15.3:1).
  - 롤백: 두 곳 플래그 false → `npm run sync:public` → `node scripts/restamp-paid-runtime-pins.mjs` → `node scripts/verify-payment-freeze.mjs --update`. 또는 `git revert a988b810e fc2deb290`(0a6c5beea 는 유지해도 무해).
  - 미검증: 숙요·베다 저장→로그인→결과 실브라우저 경로(vm 테스트로만), 스테이징, 앱 런타임, 실제 지오코딩.
  - 후속(보고만): 360 에서 1단계 입력이 클릭 뒤 접힘 아래, 동의 배너가 스텝 일부를 가림(기존).
- [x] 2. R3 궁합 링크 통합 (301 없음)
  - 커밋: 765b3607b(링크·매핑 3곳 + sitemap 원장 재생성). 결과 push 는 이 문서 갱신 커밋과 함께.
  - 정본: `/ggulggul/?action=cdOneStepFreeSajuEntry&section=compatCard`(무료 칩 `freePromo.item.compat` 이 이미 쓰던 경로).
  - 근거(dev 서버 실측, 처음 온 방문자): `?action=runCompat` 은 G_PILLARS 가 없으면 `runCompat()` 이 조용히 return(js/saju-engine.js `async function runCompat`) → 폼·결과·안내 모두 안 보이는 빈 셸. 랜딩 폼 제출도 같은 막다른 곳. 정본 경로는 랜딩 인계로 셸 폼이 채워짐 → 분석 → 개인정보 동의 → 사주 결과 → 궁합 카드(`#compatRunBtn`) → 상대 입력 → 무료 궁합 결과(카드 본문 207→5,995자, 결제창·대화상자 0). 셸 head 의 `cd-free-saju-entry-route` 는 `section=` 이 있으면 셸에 남는다(`/saju/free/` 로 보내지 않음, 기존 테스트).
  - 바꾼 곳: `lib/seo-landing-pages.js` `/compatibility`·`/saju/compatibility` 의 `ctaHref`(랜딩 폼 submitHref 겸 CTA), `app/components/HomeServiceSections.tsx` `MAIN_ACTION_ROUTE_MAP["/compatibility"]`(이전 `/index.html?action=runCompat` 은 301→302 두 번 거쳐 같은 막다른 곳).
  - 유지(바꾸지 않음): `/saju/compatibility/` 로 가는 내부 링크 전부 — 색인 랜딩(사이트맵 0.96)으로 가는 콘텐츠 링크이고, 이제 그 랜딩의 CTA 가 정본으로 보낸다. 링크를 셸로 돌리면 색인 랜딩의 내부 링크만 줄어든다. `runCompat` 액션·디스패치·`#compatRunBtn data-action`·레거시 구매 잇기는 손대지 않음(옛 딥링크·셸 내부 버튼은 그대로 동작, 결과 없는 진입은 기존과 같음). 리다이렉트·라우팅·결제·로그인·DB 접촉 없음 → 건너뛴 부분 없음.
  - SEO: `/compatibility/`·`/saju/compatibility/` title·H1·canonical(자기 자신)·robots(index) 실측 불변, 가로 넘침 0. URL 추가·삭제 없음 → sitemap URL 집합 불변(원장 서명 갱신, lastmod 는 /nakshatra/·/tarot/mindscan/ 2건만 앞선 main 커밋 몫으로 갱신). hreflang·noindex·이미지 영향 없음. 정본 셸 URL 은 기존과 같이 비색인 셸 액션.
  - 실측: 대상+임포터 node 테스트 83/83, verify-mobile-entry-actions 통과, check:fast exit 0(test:node 5681/0, jest 8447 통과·1 skip). 브라우저 360·960, visual-checker: 차단 결함 0(960 결과의 「내 절기 리듬」 "불러오지 못했어요" 는 로컬 dev 에 /api 워커가 없어서 — 진입 경로와 무관, 미검증).
  - 롤백: `git revert 765b3607b`.
  - 후속(보고만): 정본 경로가 결과까지 간 뒤 궁합 카드로 자동 스크롤되지 않는다(360 scrollY 6279·카드 top 4349, 960 4316·5179 — 무료 칩도 같은 기존 동작). 동의 모달 제목 "이/용" 줄바꿈(keep-all 없음), 360 쿠키 배너가 랜딩 폼을 가림, 960 탭바 손잡이가 업셀 제목에 겹침 — 모두 기존.
- [x] 3. L1 `/today/`·`/manse/` 비로그인 무료 결과 (`FREE_READING_GUEST_ENABLED`)
  - 커밋: 0b1e65215(코드·테스트·가드·sitemap 원장). 플래그 `lib/guided-flow/flags.mjs` `FREE_READING_GUEST_ENABLED = true`(React/lib 전용, 정적 셸 미러 없음 → sync:public 불필요). 경계 `app/_lib/free-reading-access.ts` 에 `freeReadingGuestAllowed()`(불리언 true 일 때만) 추가, `hasFreeReadingSession` 은 그대로.
  - /today/: "무료로 시작" 뒤 세션 확인은 유지하고, 비로그인(또는 확인 실패)이면 플래그가 켜져 있을 때만 결과를 연다. 계산 API `/api/fortune/today-hub` 는 원래 공개(`credentials:"omit"`, 워커 라우트 인증 없음, jest 라우트 테스트 16/16 비인증 통과) → 워커 변경 없음, 비회원 서버·DB 쓰기 없음. 이어보기(`usePaidResume`)·계정 전환 초기화(`useReadingIdentityReset`)·유료 경로 불변. 비한국어 11개 로케일 heroLead 끝 문장 "로그인 후 무료" → "로그인 없이 무료"(플래그 끔이면 원문, ko UI 는 고정 문구라 화면 변화 없음).
  - /manse/: 결과는 W2 셸 흐름(`/ggulggul/?action=cdOneStepFreeSajuEntry`, 동의 → 십성 탭 포함 결과)이라 이미 비회원 개방 → 안내 문구만 "십성 배치는 로그인 없이 무료 기본 풀이에서 이어 보고(보관함 저장은 로그인 후)" 로(두 플래그 모두 켜졌을 때만). ctaHref 불변. 건너뛴 페이지 없음.
  - 가드: `verify-paid-gate-ui-regression.mjs` 에 경계 플래그 단언·/today/ 만 게스트 통과 허용(다른 무료 결정 계산 페이지는 `freeReadingGuestAllowed(` 금지) 추가. 새 테스트 `__tests__/ui/free-reading-guest-l1.test.mjs` 5건. 변이(`if (true)`)로 가드·테스트 모두 실패 확인.
  - 실측: 관련 node 테스트 34/34, 가드 PASS, 플래그 끔 동일성(브라우저 /today/ 게이트 유지·결과 없음, /manse/ 옛 문구), check:fast exit 0(test:node 5693/0, jest 8447 통과·1 skip). 브라우저 360·960(mock dev, today-hub 응답은 mock dev 501 이라 page.route 스텁): 비회원 /today/ 결과 표시·로그인 모달 0·today-hub 요청 쿠키 없음·가로 넘침 0·pageerror 0; /manse/ → 셸 → 동의 → 십성 탭 결과, 로그인 모달 0. visual-checker 조건부 PASS(차단 결함 0).
  - SEO: /today/·/manse/ title·H1·canonical(자기)·robots(index) 실측 불변. URL 집합 불변, 원장 서명 갱신(free-reading-access.ts 를 import 하는 /saju-fpti/·/saju/destiny-bias/·/saju/destiny-meeting-place/ lastmod 2026-11-21). hreflang·noindex·이미지 영향 없음.
  - 롤백: `FREE_READING_GUEST_ENABLED = false` 또는 `git revert 0b1e65215`.
  - 위험: 가입 전환 감소 가능(W2 와 같은 정책 위험).
  - 후속(보고만): `lib/seo/free-saju-landing.mjs`(/saju/free/) 가 4체계 오늘의 운세를 아직 "로그인 후 무료" 로 안내(보수적 낡은 문구), 세션 확인 중 "로그인 확인 중" 라벨 잠깐 보임, 360 쿠키 배너가 내용 가림, 360 만세 결과 탭 줄 "억부" 잘림(스크롤 탭, 기존). /today/ 는 별도 동의 모달이 없고 시작 버튼이 유지되는 단계.
- [x] 4. R1 `/free/` 무료 목록 단독 페이지 (`FREE_LIST_PAGE_ENABLED`)
  - 커밋 9298bd0f1(기능), 머지 c40de0ffb(origin/main 머지·sync:public·sitemap:generate 재생성) → main push. check:pre-push exit 0.
  - 플래그 `FREE_LIST_PAGE_ENABLED`(lib/guided-flow/flags.mjs) 켬: /free/ 색인·사이트맵 등재, /ggulggul/ 무료 배너 끝에 "무료 운세 한 페이지로 모아 보기" 링크(한국어 전용). 기존 "무료 운세 전체 보기"와 문구를 구분.
  - 롤백: `FREE_LIST_PAGE_ENABLED=false` → `npm run sync:public` → `npm run sitemap:generate`.
  - 배너 빈 공간(360): 새로 생긴 것이 아님. 배너 1211px 중 새 링크 몫은 58px이고, 빈 공간처럼 보인 것은 고정 내비 때문에 생긴 캡처 착시(visual-checker 실측). 대비 9.04:1, 360·960 통과.
  - 후속(미처리): 2027-02-12 무료 프로모션 종료 때 /free/·배너 링크 처리 / 360 상담 캐러셀 모달 닫기 버튼 잘림(이번 범위 밖).
- [ ] 5. R5 자미 (조건부, 결제 감사 먼저)
- [ ] 마무리: `docs/context/free-tarot-ux-qa.md` 플래그 표·미승인 목록 갱신, 워크트리·임시 파일 정리, main CI 1회 확인, 한국어 최종 보고
## F2 후속 결함 수정 (2026-11-21, 사용자 "나중에 고칠것 … 전부 이번 세션에서 고치도록해")
- 워크트리 `wt/f2-followups-20261121-145951`(기준 ffcc1e263). 항목별 커밋, 롤백은 해당 커밋만 `git revert`.
- [x] `/astrology/` 히어로 CTA → 같은 페이지 스텝 입력(`#astro-guided-entry`), 리다이렉트 없음: 1116f5b0c + 20928b5f3. 🔴 1116f5b0c 는 화면 무변이었다 — 히어로는 SeoLandingTemplate heroForm 이 아니라 `FortuneLandingHero` 가 그린다. `startHref` 선택 prop(미지정 시 기존 href) 으로 보정. 플래그 끔 줄 무변, vedic 등 다른 랜딩 href 무변(렌더 실측).
- [x] 자존감 랜딩 href `/ggulggul/?action=openTarotSelfEsteemModal`: 002793a11.
- [x] 마음 스캔: 홈 카드가 `/tarot/mindscan/` 직행(4eba58cb4). 셸 `startMindScanTarot` 은 무변 — 비회원에게 confirm→로그인을 띄우는 설계이고 헤드리스 QA 가 confirm 을 자동 닫아 "아무것도 안 연다" 로 보였다. `/tarot/crystal-soul/` 도 같은 패턴(보고만).
- [x] W3 TOP5: 실패 시 운영진 추천 목록으로 484px 유지(ce873aace, 셸·/ 둘 다 실측 484px), DB 장애 5분 backoff + 503 `public, max-age=60`(d55643af8), `verify-public-api-edge-cache` 에 라우트·변이 5개 추가. `source:"sales"` 는 무변(보고만).
- [x] 생성 스냅샷 `/tarot/mingri/play` 제거: payment-p0-inventory·purchase-journey inventory 를 생성기로 재생성(ae7d01834). 건너뜀: `docs/seo/PAGE_INVENTORY.md`·`docs/mobile-platform/inventory.*` 는 2026-09-08 일회성 스냅샷으로 scripts/ 에 생성기가 없다(수기 편집 금지라 그대로).
- [x] CutReader key: 이미 29ca06503 에서 고쳐져 있음(변경 없음).
- [x] W1 출생 입력: 날짜 1900~오늘은 이미 `dateFromParts`·테스트에 있음. 야자시: 자시 칩 대표값 23:30→00:00(엔진은 시계 23시 이후를 다음 날 일진으로 본다, 엔진 무수정) + 23:30~자정은 직접 입력 안내 12로케일(a7ce20dd6). `scripts/test-mobile-platform-journeys.mjs` 동물 구간을 스텝 흐름으로 갱신(964b5feed, 로컬 dev PASS). 후속(보고만): 같은 스크립트 찻집 구간은 `data-cup-id` UI 가 소스에서 사라져 별도로 낡음.
- [x] L1 잔여: /saju/free "로그인 없이 무료" 묶음으로(79d1289bc, FREE_RESULT_GUEST_ENABLED 전제), /today/ "로그인 확인 중" 깜빡임 제거(b743fa859), 360 만세 바로가기 '억부' 잘림(86c8279e1, 400px 이하 탭 기준 폭 52px, scroll 360→328=client, 960 무변).
- 보고만(무변): `__tests__/fortune/daily-scroll-copy.test.mjs`(옆 세션 소유), `source:"sales"` 공개 범위, `index.html` 가격 하드코딩, 숙요·베다 히어로도 셸 경유 패턴.
- 검증: 대상 테스트(node/jest) 통과, dev 360/960 실측 + visual-checker(점성 진입·TOP5 대체·/today·시각 안내 대비 9.73:1·바로가기 탭) PASS, check:fast·check:pre-push 는 아래 마무리 줄.

## F1 후속 결함 수정 (2026-11-21, 사용자: "나중에 고칠것 중 이/용에서 줄이 바뀌는것은 바꿔야겠고 전부 이번 세션에서 고치도록해")
- 워크트리 wt/f1-ui-defects-20261121-142039 → main 직접 머지. 결제 실행 파일·L1 파일(/today/·/manse/·free-reading-access.ts) 무접촉.
- [x] 1. 동의 모달 제목 "이/용" 단어 중간 줄바꿈 — `#privacyConsentTitle` keep-all·balance (8a7fb1198). 360 두 줄("수집" 뒤), 960 한 줄.
- [x] 2. 360 하단 고정 CTA·셸 하단 내비 겹침 — guided-flow.module.css `main:has(.flow){overflow:clip}`(@supports) (43bf15f95). CTA 584–653, 내비 660~.
- [x] 3. 동물 랜딩 "3단계" vs "1/6" — guidedFlow.json 7단계 문구 (b9498d422).
- [x] 4. 낮은 대비·달빛 명칭 — 홈 진입 맥락 #242139, 초대 안내 #74475a·"초대 링크로"(index.html 2곳 + i18n 12개) (8a7fb1198), FLP seo 알파 0.9 (fd1cc05c5). 점선 슬롯·테두리 버튼은 3:1 통과라 유지.
- [x] 5. 단계 제목 포커스 노란 상자 → 금빛 밑줄 `.title:focus-visible` (43bf15f95).
- [x] 6. 360 숙요·베다·점성술 시작 뒤 입력칸 접힘 아래 — 단계 전환 시 루트가 화면 밖이면 scrollIntoView(start), `.flow` scroll-margin-top (43bf15f95, jsdom 가드 580307c67). 배너 열림에서도 입력 280–329 < 배너 332.
- [x] 7. 쿠키 배너가 스텝·/compatibility 폼 가림 — AnalyticsConsent 가 열린 동안 `--cd-consent-offset`·body padding-bottom·`html.cd-consent-open`, CTA 는 그동안 흐름 배치 (43bf15f95). /compatibility 제출 버튼 bottom 318 < 배너 332(스크롤 뒤).
- [x] 8. 960 탭바 손잡이 ↔ 업셀 제목 — 정원 블록에 `html:has(#cdMobileBottomNav){scroll-padding-bottom:calc(28px + nav-h)}`(실측 110px), 네비 숨김이면 0 (f557d64d0). 임의 수동 스크롤로 고정 바 밑에 오는 것은 고정 바 고유 동작.
- [x] 9. compatCard 진입 결과 뒤 궁합 카드 자동 스크롤 — `_dpRevealHomeSection` 결과 도착 뒤 8초 동안 카드 top 유지, 휠·터치·키·포인터 시 해제 (f557d64d0). 카드 top 360=14, 960=0 (전 4349/5179). 같은 장치를 쓰는 다른 section 칩도 동일 적용.
- [x] 10. 360 다크 카드 직각·무테 — 건너뜀: guided-flow.module.css 가 48rem 이상에서만 테두리·둥근 모서리를 주는 풀블리드 설계(의도).
- 검증: 대상 node 테스트 22/22, verify-guided-flow-contrast OK, check:fast exit 0(test:node 5688/0, jest 8447 통과·1 skip), check:pre-push exit 0(머지 7f0da2017 뒤). dev 360·960 실측 + visual-checker(재촬영본) 차단 결함 0.
- 롤백: 항목별 `git revert <SHA>`(f557d64d0 은 revert 뒤 sync:public → restamp → payment-freeze --update).
- 후속(보고만): 동물 페이지는 제목과 입력 사이 내용 때문에 360 배너 열림 시 입력이 배너 아래(452) — 6번 대상 밖. 남은 대비 실패는 free-tarot-ux-qa.md 3번.

## F3 후속 그림·대비·동물 배너 (2026-11-21)

사용자 원문 F1 절과 같음("…전부 이번 세션에서 고치도록해", "회귀는 없도록 너무 꼼꼼하지 않아도돼").

- [x] A. 없는 표정 그림 — 6장 중 1장 해결
  - 연이 greet: remaster `public/images/novel/remaster/v2/yeoni/wave.webp` 를 소설 모바일 파이프라인과 같은 설정(400×600 inside, WebP q84·alphaQuality 100·effort 6)·이름 규칙(`yeon-` + sha256("pig pigV2|/images/novel/remaster/v2/yeoni/wave.webp") 앞 10자)으로 뽑은 `public/images/novel/mobile/yeon-20ac944e7a.webp`(400×472, 28,728B). `lib/webtoon-result/narrator.mjs` greet 등록, `MISSING_EXPRESSION_ART.yeoni = ['worry']`. 대체 장치 유지. visual-checker PASS(같은 캐릭터·캔버스, 다만 talk 와 자세가 비슷함). `content/novel/mobile-assets.json` 에는 넣지 않았다(소설 파이프라인이 다시 쓰는 파일). 커밋 b6ea399f4.
  - 미생성 5장(연이 worry, 영냥이 explain·worry·cheer·serious): Codex CLI 0.156.1 은 ChatGPT OAuth 로그인(API 키 과금 아님)이지만 설정 기본 모델 gpt-6.1-terra 는 ChatGPT 계정 미지원, gpt-6-astra 는 사용 한도 초과(21:06 리셋, 추가는 크레딧 구매), gpt-6.1-sol·gpt-5.5 미지원 → 외부 차단. 대체 표정 그대로.
  - 재시도: 한도 리셋 뒤 `codex exec … -m gpt-6-astra -s workspace-write --skip-git-repo-check -i <참조 PNG…>` 로 흰 배경 1장씩 생성(참조: 연이는 remaster v2 yeoni 표정들, 영냥이는 `public/assets/yeongnyangi/moods/*`). 후처리 — 연이: 흰색→알파 키잉 후 위 400×600 inside q84 설정·이름 규칙으로 `public/images/novel/mobile/`. 영냥이: 흰색 평탄화 → trim → 336×280 contain + 여백 → 360×300 흰 배경 WebP q80, `public/assets/yeongnyangi/moods/` README 출처 기록. 그다음 narrator.mjs 등록·`MISSING_EXPRESSION_ART` 에서 제거. 기존 그림은 덮어쓰지 않는다. visual-checker 2회 실패면 대체 유지.
- [x] B. 낮은 대비 — 커밋 40d310b9c
  - 푸터 사업자 정보 2.24:1: 원인은 본문 div 인라인 `color:#aaa`. index.html 라이트 `#70445c`, neo `rgba(214,196,255,.9)` → 픽셀 6.8~15.1:1(visual-checker PASS). sync:public 미러 7개.
  - 비교 "/" 구분자 1.24:1: `SeoLandingTemplate.jsx`·`FreeFeatureDetail.tsx` 브레드크럼 구분자 `--cd-border` → `--cd-text-muted`, 5.1~5.5:1(PASS).
  - 동물 페이지 머리 부제 2.22:1·"Saju Animal Oracle" 3.37:1: F1 측정기 오탐(어두운 body 위에 합성하고 main 배경 그라디언트를 무시). 픽셀 실측 7.85:1·5.12:1 → 수정 없음.
  - ✦ 1.8:1: aria-hidden 장식이라 유지(기록만).
- [x] C. 360 동물 페이지 쿠키 배너가 1단계 입력을 가림(입력 y=452, 배너 top 392) — 커밋 b04f757ea
  - `GuidedFlowShell.tsx` 단계 전환 effect: F1 scrollIntoView 뒤 `html.cd-consent-open` 이고 첫 입력칸 아래 끝이 `innerHeight - --cd-consent-offset` 보다 아래면 그만큼 `scrollBy`. 결과 360: 입력 323~372(배너 392 위), 960: 변화 없음(입력 370~421, 배너 441).
  - 절충: 360 에서 배너가 열린 동안 단계 제목·1/7 진행이 sticky 헤더 밑으로 가고 힌트 "비워 두고…" 가 배너 경계에 반쯤 걸림. 배너를 닫으면 사라짐.
- 검증: 대상 node 테스트 64/64, dev 서버 360/960 visual-checker, `npm run check:fast` 통과(jest 489 스위트·8447 통과), sitemap:generate(1087 URL). SEO: 공개 URL title/description/H1/canonical/robots 변화 없음 — 영향 없음.
- 롤백: `git revert <SHA>`(b6ea399f4 그림, 40d310b9c 대비 — 되돌린 뒤 `npm run sync:public`, b04f757ea 배너 스크롤).
- 후속(보고만): 960 에서 배너가 "다음" 버튼 오른쪽 절반을 가림(기존), 360 배너 열린 동안 제목 가림(위 절충), 연이 greet 가 talk 와 비슷해 보임.
