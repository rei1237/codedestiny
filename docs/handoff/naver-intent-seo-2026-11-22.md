---
status: in-progress
updated: 2026-11-23
next: 5단계 — npm run sitemap:generate && npm run llms:generate && npm run rss:generate, diff 검토, 커밋
---

# 네이버 검색 의도 SEO 라운드 인수인계

## 첫 행동
1. `cd /d/Development/codedestiny-worktrees/naver-intent-seo-20261122-003824 && git status --short && git log --oneline -6`
2. 아래 "단계"의 첫 미완료 체크박스부터 진행. 플랜 정본: `C:\Users\user\.claude\plans\goofy-singing-lake.md`
3. 세션 상태 파일: `d:\Development\code-destiny\.claude\state\b91f156e.md` (체크박스 함께 갱신)

## 지금 상태
- 워크트리: `D:\Development\codedestiny-worktrees\naver-intent-seo-20261122-003824`, 브랜치 `wt/naver-intent-seo-20261122-003824`, base `7b0a35ce1`
- 커밋: 1bf2e5d24(0 IndexNow) · 78f23a78d(1) · 12478b130(sitemap ledger) · b54a8d36b(aliasKo 순서) · d3fb7956e(2 계산형 4종) · b17a75a3b(tsc) · 6cd8d6325(ledger) · c877f5d71(3 년생별 한 줄+ledger) · 09c0ab099(4a sinsal-rules) · 4d83ea6eb(2단계 '무료 사주' 가드 수정) · 25cbbbf77(jest 수집 제외)
- 미커밋 없음(25cbbbf77 기준 clean). `npm run check:fast -- --base=7b0a35ce1` 25cbbbf77 에서 exit=0(paid-gate 78/0, test:node fail 0, jest 490 passed).
- 3단계 실측: build:cf exit=0, dist/fortune/today/rat·tomorrow/rat·today/tiger 에 `birth-year-heading` 1개·년생 7줄 SSR, en/ja rat·aries 에는 없음, weekly 는 sky 없어 미표시(설계대로).
- 2단계 검증 실측: build:cf exit=0, verify:internal-link-depth OK(1092), 새 4쪽 dist H1=1·noindex 0, sitemap/llms/hub-shell --check OK
- `node scripts/verify-seo-entity-registry.mjs --built` 는 FAIL 2건 "Fusion Fortune Service JSON-LD/Visible FAQ is missing from the hub" — 이번 변경과 무관(범위 밖, 최종 보고에 후속 과제로)
- main 은 7b0a35ce1 이후 다른 세션 커밋 169개 이상 전진(11/22 fetch). 머지 시 충돌 주의.

## 승인 상태 (다시 묻지 않는다)
- 2026-11-21 사용자 선택: 신규 페이지 "계산형 4종 (Recommended), 띠 운세 년생별 한 줄, 신살·상충 해설 글", 배포 "함께 배포 (Recommended)" — 완료 시 main HEAD 를 운영 승격.
- 단, 승인 시점 HEAD 7b0a35ce1 이후 다른 세션 커밋이 main 에 올랐으므로(이미 169개+) **dispatch 직전 사용자에게 한 번 재확인**한다(메모리 promotion-scope-reask-after-approval). 확인과 dispatch 는 한 명령.
- 추가 요청 원문: "화개살 도화살 역마살 이런 주요 인기 신살들도 seo에서 검색되도록해줘야해" → 신살마다 한 쪽.

## 작업 규칙과 함정
- Bash cwd 는 매 호출 메인으로 돌아간다 → 항상 `cd /d/Development/codedestiny-worktrees/naver-intent-seo-20261122-003824 && ...`
- 메인 체크아웃에 다른 세션 dev 서버가 떠 있다. build:cf 는 `ALLOW_DEV_SERVER_DURING_BUILD=1 npm run build:cf`(워크트리는 .next 공유 안 함). 그 서버를 죽이지 않는다.
- build:cf 와 check:fast 를 동시에 돌리지 않는다. 로그는 스크래치 `D:\Development\Temp\claude\40e1d9fc07e84b89\b91f156e-95b4-4892-a0c8-b0325ecd0ded\scratchpad\`.
- check:fast 는 커밋 뒤 `npm run check:fast -- --base=7b0a35ce1`(critical ~35단계).
- build:cf 가 rss.xml·insights/rss.xml(+public) 를 다른 세션 글 변경으로 재생성한다 → 내 변경이 아니면 `git checkout --` 로 되돌리고, 5단계에서 rss:generate 로 함께 커밋.
- 줄끝: SignFortuneView.tsx·entity-registry.mjs·generate-llms-txt.mjs·build-fortune-hub-shell.mjs 는 CRLF(Edit 도구는 보존). 새 파일은 LF.
- build-fortune-hub-shell.mjs 추출기는 sign-profiles.ts 에서 nameKo→nameEn→symbol→rangeLabel 연속 순서를 요구.
- 노드 테스트는 scripts/lib/mock-test-config.mjs NODE_TEST_PATTERNS 에 명시해야 CI 가 돈다. 🔴 `__tests__/ui`·`release` 밖의 node:test 파일은 jest.config.cjs testPathIgnorePatterns 에도 넣어야 한다(안 넣으면 jest "must contain at least one test" 실패, 25cbbbf77).
- `__tests__/ui/saju-bundle-copy.static.test.js` 가 고객 노출 "무료 사주" 문구를 막는다 → 새 글·허브에 쓰지 말 것.
- check:fast 실행 중에 app/** 를 고치면 sitemap-drift 가 헛실패한다(서명이 작업 트리 기준). 실행 중에는 트리를 건드리지 않는다. TS 로드는 scripts/lib/load-ts-module.mjs `loadTsModule`.
- 금지: 엔진(localSajuCalculator·manse-shinsal.js·KASI·normalizeSaju) 수정, 새 FAQ/HowTo JSON-LD, seo-title.mjs 페이지 제목 변경(D+30), 새 CI 스텝, 키워드 반복, 과금 LLM, .env*/package-lock/dist 수정. 미추적 `.claude/skills/fire-your-seo-agency/`·다른 세션 파일 손대지 않음.
- web-fetch 로 네이버 SERP 조회는 거부됨 — 재시도 금지.
- 🔴 `__tests__/ui/phase3-insight-content.test.mjs` 는 모든 insights 글의 50자 이상 `<p>` 문단 완전 중복을 막는다 → 글마다 끝맺는 고지문을 따로 쓴다(공용 NOTE 상수로 실패, e72c0b160). renderRuleTableHtml 의 basis 줄도 `<p>` 이므로 4c 에서 같은 basis(괴강·백호, 귀문·원진)가 50자를 넘지 않는지 확인.
- 글 본문을 고친 뒤에는 sitemap-lastmod 서명이 바뀐다 → `npm run sitemap:generate` 결과(config/sitemap-lastmod.json)를 함께 커밋(85e2abd1f).
- insights 글의 `faq` 필드는 4개 고정 슬러그에서만 FAQPage 가 되고 화면에는 안 보인다 → 4b 는 faq 필드 없이 본문 h2/h3 로 질문을 둔다. 4c 도 같게.
- 기존 /saju/natal-chart 레지스트리가 primary "사주 12신살", secondary "사주 명식","12신살","별신살","사주 신살 보기" 를 점유 → 신살 허브는 이 키워드를 쓰지 말 것(예: primary "신살 종류", secondary "신살 뜻","신살표").

## 설계
### 3단계 (년생별 한 줄)
- `app/fortune/[period]/[sign]/SignFortuneView.tsx`(CRLF): 조건 `locale === "ko" && profile.kind === "animal" && sourceVm.sky` 일 때 `birthYearLines({ rangeLabel: profile.rangeLabel, ilchin: sourceVm.sky.ilchin, dateKey: vm.dateKey })` 목록 섹션. 각 줄 "1986년생(병인) · 식신 — 문구", 라벨 `BIRTH_YEAR_LINE_LABEL`, 1월~입춘 전 출생은 앞 해 띠라는 안내 + `/fortune/tti-age/` 링크. 관계·점수 섹션 근처.
- 검증: build:cf 뒤 `dist/fortune/today/rat/index.html`·`dist/fortune/tomorrow/rat/index.html` 에 6줄 이상 SSR, 다른 로케일 무변경. 커밋 → check:fast.

### 4a 신살 규칙 모듈
- 새 `lib/saju/sinsal-rules.mjs`(LF): 데이터 표 + `renderRuleTableHtml(name)`(insights contentHtml 에 넣을 `<table>` 문자열).
- 정본 규칙(엔진 실측):
  - 삼합 그룹 申子辰/寅午戌/巳酉丑/亥卯未 → 도화 酉/卯/午/子, 역마 寅/申/亥/巳, 화개 辰/戌/丑/未. /saju/ 엔진은 일지·년지 두 기준, /manse/ 는 도화만 일지·년지, 역마·화개는 12신살 행(연지 기준).
  - 12신살(manse-shinsal TWELVE_NAMES 순서 겁·재·천·지·년·월·망신·장성·반안·역마·육해·화개, 시작 지지 water(申子辰)=巳, fire(寅午戌)=亥, wood(亥卯未)=申, metal(巳酉丑)=寅).
  - 양인(양간만): 甲卯 丙午 戊午 庚酉 壬子. 홍염(일간): 甲午 乙午 丙寅 丁未 戊辰 己辰 庚戌 辛酉 壬子 癸申. 천을귀인: 甲戊庚→丑未, 乙己→子申, 丙丁→亥酉, 辛→寅午, 壬癸→卯巳.
  - 괴강 庚辰 庚戌 壬辰 戊戌. 백호 甲辰 乙未 丙戌 丁丑 戊辰 壬戌 癸丑 (원국 4기둥+운 간지 대조).
  - 공망(일주 旬): 甲子旬 戌亥, 甲戌旬 申酉, 甲申旬 午未, 甲午旬 辰巳, 甲辰旬 寅卯, 甲寅旬 子丑.
  - 귀문관살 쌍 子酉 丑午 寅未 卯申 辰亥 巳戌. 원진살 쌍 子未 丑午 寅酉 卯申 辰亥 巳戌. 상충(육충) 子午 丑未 寅申 卯酉 辰戌 巳亥.
  - 상문살: 사이트 엔진이 계산하지 않음 → 민속 통설(년지 기준 두 칸 앞, 조객은 두 칸 뒤)이라 밝히고 만세력에 안 나온다고 적는다.
- 대조 테스트 `__tests__/saju/sinsal-rules.test.mjs`: `js/core/saju/manse-shinsal.js` 를 globalThis 로 로드(IIFE, `global.CdManseShinsal = {build, twelveName, gongmangBranches}`; build 입력 `{h,d,m,y:{g:천간,j:지지}}`, 출력 `{twelve:[{key,label,name}], extras:[{name,positions}]}`) → 60일주×12년지 전수로 도화·홍염·천을·양인·공망·괴강·백호·귀문·원진·12신살 일치. localSajuCalculator(3739-3790, 3570-3640, 2024) 상수는 테스트 고정값으로 묶고 주석에 줄 번호. mock-test-config 에 배선.

### 4b·4c 허브 + 13쪽
- 허브 `app/saju/sinsal/page.js`(app/saju/ten-gods/page.js 패턴, generatePageMetadata): title "신살 뜻과 종류 | 도화살·역마살 기준표", 직답 "신살은 원국 간지 조합에 붙인 이름표이며 길흉을 단정하지 않습니다.", 12신살 표(연지 기준), 개별 글 전체 링크, 살풀이 짧은 절. /saju/ 와 /manse/ 에서 링크 1개씩(링크 깊이 MAX_HOPS=2). 레지스트리·coreRoutes·llms 등록. 인덱스 정합 5곳(static-canonical-route-map, generate-sitemap, siteSeo.ts, public/_headers, verify-adsense-readiness) 확인.
- 개별 글: 새 `app/insights/sinsal-articles.mjs` → `app/insights/seed-articles.js` 의 MERGED_INSIGHT_ARTICLES 에 병합(패턴: app/insights/search-intent-articles.mjs — `article()` 헬퍼, `useOriginalContent: true`, category '사주', author 'CODE DESTINY 편집팀', publishedAt/updatedAt '2026-11-22'). `app/insights/seo-titles.js` INSIGHT_SEO_TITLES 에 슬러그별 완성 제목(대상 키워드 앞, 표시폭 ≤60). insights 글은 레지스트리 등록 불필요.
- 4b 5쪽: 양인살(5,150) · 상문살(2,660) · 도화살(H2 "도화살 사주 특징") · 역마살 · 화개살. 4c 8쪽: 홍염살 · 천을귀인 · 괴강살 · 백호살 · 공망 · 귀문관살 · 원진살 · 상충(5,940). 원진·상충은 /compatibility/tti/ 링크.
- 글 구성: 굵은 직답(~40자) → renderRuleTableHtml 규칙표 + "이 사이트의 기준" 한 줄 → 년생 예시 → 현대적 해석(강점·주의) → 흔한 오해 → 학파별 차이 → 내 원국에서 확인(/manse/ 표시 위치, /saju/ 링크) → 고지 → 보이는 FAQ(faq 필드는 기존 글 형식, 새 FAQPage JSON-LD 추가 금지 — 기존 렌더러가 faq 로 JSON-LD 를 만드는지 확인하고, 만든다면 faq 필드 대신 본문 h2/h3 로). 한 편씩 따로 쓰고 템플릿 반복 금지, SSR 본문 1800자 이상.
- 검증: 대조 테스트, build:cf(AdSense 1800자·제목폭 게이트), verify:internal-link-depth, `npm run rss:generate` 에 새 글.

### 5~7
- 5: `npm run sitemap:generate && npm run llms:generate && npm run rss:generate`, diff 검토, 커밋.
- 6: 메인 체크아웃에서 `git pull --ff-only` → `git merge wt/naver-intent-seo-20261122-003824`(충돌 해결, 생성물은 재생성) → `npm run sync:public` 필요 여부 확인 → `npm run check:pre-push` → push → main CI 1회 확인 → **사용자 재확인(169+ 다른 세션 커밋 포함)** → `gh workflow run cloudflare-pages-deploy.yml --ref main -f mode=production` → IndexNow 로그(“Non-public sitemap URL rejected” 없음, 200/202) → Yeti UA curl(200·canonical·H1 1·직답·noindex 없음·JSON-LD 파싱, /fortune/tomorrow/rat/ 설명에 "오늘" 없음).
- 7: RemoteTrigger 로 D+7/14/30 측정 예약, 서치어드바이저 수동 체크리스트(허브+상위 5쪽 수집 요청, 사이트맵·rss 제출 확인), 상태 파일·이 문서 done, 메인에서 `npm run worktree:remove -- 'D:\Development\codedestiny-worktrees\naver-intent-seo-20261122-003824'`, 임시 파일 삭제. 범위 밖 보고: 일일 띠 문구 반복, /ggulggul/ SSR placeholder, og:image 다양성, "…" 설명 151건, /neo-operation-room/ sitemap 포함, 토정비결, 새 페이지 AdSense 적격성, registry --built Fusion Fortune FAIL.

## 단계
- [x] 0 IndexNow (1bf2e5d24)
- [x] 1 정확도 (78f23a78d, b54a8d36b)
- [x] 2 계산형 4종 (d3fb7956e, 4d83ea6eb) — check:fast --base=7b0a35ce1 exit=0 (25cbbbf77)
- [x] 3 년생별 한 줄 (c877f5d71)
- [x] 4a sinsal-rules + 대조 테스트 (09c0ab099, 25cbbbf77) — 만세력 엔진 1440케이스·12신살 144칸·공망 60일주 전수 + 사주 엔진 상수 고정 대조, 변이 시 실패 확인
- [x] 4b 허브 + 5쪽 (b40b85fa5 글 5쪽, 4307fe6d7 허브·레지스트리·sitemap·llms·/saju·/manse 링크, e72c0b160 고지문 중복 수정, 85e2abd1f 원장) — build:cf exit=0, verify:internal-link-depth OK, dist 6쪽 H1=1·noindex 0·직답 확인, check:fast --base=7b0a35ce1 통과. 슬러그: yangin-sal-meaning·sangmun-sal-meaning·dohwa-sal-saju·yeokma-sal-meaning·hwagae-sal-meaning. 허브 레지스트리 primary "신살 종류"(natal-chart 와 비충돌). 허브는 AdSense 목록 밖(2단계와 동일 정책)
- [x] 4c 8쪽 (6d23b276c 글 8쪽·seo-titles·sinsal-rules basis 문구 구분, f666a4979 허브 "그 밖의 신살" 8링크, 8bf6c248c sitemap·원장) — build:cf exit=0, dist 8쪽 H1=1·title·noindex 0·직답 strong·FAQPage 0, 허브 dist 8링크, 원진·상충 /compatibility/tti/ 링크, verify:internal-link-depth OK, verify:sitemap-drift OK, check:fast --base=7b0a35ce1 exit=0. 슬러그: hongyeom-sal-meaning·cheoneul-gwiin-meaning·goegang-sal-meaning·baekho-sal-meaning·gongmang-meaning·gwimun-gwan-sal-meaning·wonjin-sal-meaning·sangchung-yukchung. 비공백 본문 1807~1951자. rss 는 빌드 잡음이라 되돌림(5단계에서 생성). 사이트맵은 KST 날짜 넘김(11-23)으로 daily URL lastmod 가 함께 바뀜
- [ ] 5 생성물
- [ ] 6 머지·push·CI·운영(재확인 후)
- [ ] 7 측정·정리
